import express, { RequestHandler } from 'express'
import { prisma } from '../drivers/db'
import { logoUpload, noUpload } from '../drivers/fs'
import { State } from '@prisma/client'
import { hydrateMany, hydrateOne } from '../middleware/discord'
import { ChangeAction, sendAssignmentChangeDM } from '../drivers/bot'

export const router = express.Router()

router
  .get('/', async (req, res) => {
    res.render('pages/teams', {
      title: 'CVRE Roster Manager | Teams',
      user: req.session.user
    })
  })

const renderTeam: RequestHandler = async (req, res) => {
  const team = await prisma.team.findUnique({
    where: {
      id: req.params.teamID,
      managerId: req.session.user?.id
    },
    include: {
      division: true,
      manager: true,
      Assignment: {
        include: {
          player: true
        }
      }
    }
  })
  if (!team) {
    res.sendStatus(404)
    return
  }
  await hydrateOne(team.manager)
  for (const assignment of team.Assignment) {
    await hydrateOne(assignment.player)
  }
  res.render('fragments/teams/team', {
    team
  })
}

router
  .get('/list', async (req, res) => {
    const teams = await prisma.team.findMany({
      where: {
        managerId: req.session.user?.id
      },
      include: {
        division: true,
        manager: true,
        Assignment: {
          include: {
            player: true
          }
        }
      }
    })
    for (const team of teams) {
      await hydrateOne(team.manager)
      for (const assignment of team.Assignment) {
        await hydrateOne(assignment.player)
      }
    }
    res.render('fragments/teams/list', {
      teams
    })
  })
  .get('/create', async (req, res) => {
    const divisions = await prisma.division.findMany({})
    res.render('fragments/teams/create', {
      divisions
    }
    )
  })
  .post('/create', logoUpload.single('logo'), async (req, res) => {
    let logo: string | undefined = undefined
    if (req.file) {
      logo = req.file.filename
    }
    const team = await prisma.team.create({
      data: {
        name: req.body.name as string,
        locale: req.body.locale as string,
        manager: {
          connect: {
            id: req.session.user?.id
          }
        },
        division: {
          connect: {
            id: req.body.divisionId
          }
        },
        logo
      },
      include: {
        division: true,
        manager: true,
        Assignment: {
          include: {
            player: true
          }
        }
      }
    })
    await hydrateOne(team.manager)
    for (const assignment of team.Assignment) {
      await hydrateOne(assignment.player)
    }
    res.render('fragments/teams/new-team', {
      team
    })
  })
  .get('/:teamID', renderTeam)
  .get('/:teamID/edit', async (req, res) => {
    const divisions = await prisma.division.findMany()
    const team = await prisma.team.findUnique({
      where: {
        id: req.params.teamID,
        managerId: req.session.user?.id
      },
      include: {
        division: true,
        manager: true,
        Assignment: {
          include: {
            player: true
          }
        }
      }
    })
    if (!team) {
      res.sendStatus(404)
      return
    }
    await hydrateOne(team.manager)
    for (const assignment of team.Assignment) {
      await hydrateOne(assignment.player)
    }
    res.render('fragments/teams/edit', {
      team,
      divisions
    })
  })
  .put('/:teamID', logoUpload.single('logo'), async (req, res, next) => {
    const team = await prisma.team.findUnique({
      where: {
        id: req.params.teamID,
        managerId: req.session.user?.id
      }
    })
    if (!team) {
      res.sendStatus(404)
      return
    }
    const data: {
      name?: string;
      locale?: string;
      division?: {
        connect: {
          id: string
        }
      },
      logo?: string
    } = {}
    if (team.name != req.body.name) {
      data.name = req.body.name
    }
    if (team.locale != req.body.locale) {
      data.locale = req.body.locale
    }
    if (team.divisionId != req.body.divisionId) {
      data.division = {
        connect: {
          id: req.body.divisionId
        }
      }
    }
    if (req.file) {
      data.logo = req.file.filename
    }
    await prisma.team.update({
      where: {
        id: req.params.teamID,
        managerId: req.session.user?.id
      },
      data
    })
    next()
  }, renderTeam)
  .delete('/:teamID', async (req, res) => {
    await prisma.team.delete({
      where: {
        id: req.params.teamID,
        managerId: req.session.user?.id
      }
    })
    res.send("<p hx-on::after-settle=\"setTimeout(() => { this.remove() }, 5000)\">Team deleted.</p>")
  })

router.get("/:teamID/add-player", async (req, res) => {
  const team = await prisma.team.findUnique({
    where: {
      id: req.params.teamID
    }
  })
  const players = await prisma.player.findMany({
    where: {
      managerId: req.session.user?.id,
      Assignment: {
        none: {
          team: {
            id: req.params.teamID
          }
        }
      }
    }
  })
  await hydrateMany(players)
  res.render("fragments/teams/add-player", {
    team,
    players
  })
})
  .post("/:teamID/add-player", noUpload, async (req, res, next) => {
    const assignment = await prisma.assignment.create({
      data: {
        team: {
          connect: {
            id: req.params.teamID
          }
        },
        player: {
          connect: {
            id: req.body.playerId
          }
        },
        alt_tag: req.body.alt_tag,
        scoresaber: req.body.scoresaber,
        status: State.ACCEPTED
      },
      include: {
        player: true
      }
    })
    next()
    sendAssignmentChangeDM(assignment.player.discord, assignment.player.discord, req.session.user?.discord as string, req.params.teamID, ChangeAction.CREATE)
  }, renderTeam)
  .delete("/:teamID/player/:assignmentID", async (req, res, next) => {
    const assignment = await prisma.assignment.delete({
      where: {
        id: req.params.assignmentID
      },
      include: {
        player: true
      }
    })
    next()
    sendAssignmentChangeDM(assignment.player.discord, assignment.player.discord, req.session.user?.discord as string, req.params.teamID, ChangeAction.DELETE)
  }, renderTeam)
  .put('/:teamID/player/:assignmentID/:newState', async (req, res, next) => {
    if (req.params.newState === "ACCEPTED") {
      const assignment = await prisma.assignment.update({
        where: {
          id: req.params.assignmentID
        },
        data: {
          status: State.ACCEPTED
        },
        include: {
          player: true
        }
      })
      sendAssignmentChangeDM(assignment.player.discord, assignment.player.discord, req.session.user?.discord as string, req.params.teamID, ChangeAction.CREATE)
    } else {
      const assignment = await prisma.assignment.delete({
        where: {
          id: req.params.assignmentID
        },
        include: {
          player: true
        }
      })
      sendAssignmentChangeDM(assignment.player.discord, assignment.player.discord, req.session.user?.discord as string, req.params.teamID, ChangeAction.REJECT)
    }
    next()
  }, renderTeam)