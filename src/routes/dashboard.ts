import express, { RequestHandler } from 'express'
import { prisma } from '../drivers/db'
import { noUpload, verifUpload } from '../drivers/fs'
import { State } from '@prisma/client'
import { hydrateOne } from '../middleware/discord'

export const router = express.Router()

router.get('/', async (req, res) => {
  res.render('pages/dashboard', {
    title: 'CVRE Roster Manager | Dashboard',
    user: req.session.user
  })
})

const renderSelf: RequestHandler = async (req, res) => {
  const player = await prisma.player.findUnique({
    where: {
      discord: req.session.user?.discord
    }
  })
  if (!player) {
    res.send("<button hx-get=\"/self/create\" hx-swap=\"outerHTML\">Register</button>")
  } else {
    res.render('fragments/dashboard/self', {
      player
    })
  }
}

router.get('/self', renderSelf)
  .get('/self/create', async (req, res) => {
    res.render('fragments/dashboard/create', {
      discord: req.session.user?.discord
    })
  })
  .post('/self/create', verifUpload.single('verification'), async (req, res, next) => {
    let state: State = State.AWAITING
    let doc: string | undefined = undefined
    if (req.file) {
      state = State.REVIEW
      doc = req.file.filename
    }
    await prisma.player.create({
      data: {
        name: req.body.name as string,
        school: req.body.school as string,
        discord: req.body.discord as string,
        manager: {
          connect: {
            id: req.session.user?.id
          }
        },
        doc,
        status: state
      }
    })
    next()
  }, renderSelf)
  .get('/self/edit', async (req, res) => {
    const player = await prisma.player.findUnique({
      where: {
        discord: req.session.user?.discord
      }
    })
    res.render('fragments/dashboard/edit', {
      player
    })
  })
  .put('/self', verifUpload.single('verification'), async (req, res, next) => {
    const player = await prisma.player.findUnique({
      where: {
        discord: req.session.user?.discord
      }
    })
    if (!player) {
      res.sendStatus(404)
      return
    }
    const data: {
      name?: string;
      school?: string;
      doc?: string;
      status?: State;
    } = {}
    if (player.name != req.body.name) {
      data.name = req.body.name
    }
    if (player.school != req.body.school) {
      data.school = req.body.school
    }
    if (Object.keys(data).length > 0) {
      data.status = State.AWAITING
    }
    if (req.file) {
      data.doc = req.file.filename
      data.status = State.REVIEW
    }
    await prisma.player.update({
      where: {
        discord: req.session.user?.discord
      },
      data
    })
    next()
  }, renderSelf)
  .delete('/self', async (req, res) => {
    await prisma.player.delete({
      where: {
        discord: req.session.user?.discord
      }
    })
    res.send("<p hx-get='/self' hx-trigger='load delay:5s'>Registration deleted.</p>")
  })

const renderSelfTeams: RequestHandler = async (req, res) => {
  const player = await prisma.player.findUnique({
    where: {
      discord: req.session.user?.discord
    },
    include: {
      Assignment: {
        include: {
          team: {
            include: {
              division: true,
              manager: true
            }
          }
        }
      }
    }
  })
  if (!player) {
    res.send("<p hx-get='/self/team' hx-trigger='htmx:afterRequest from:#selfReg' hx-target='#selfTeam'>Not yet registered.<br>Please use the above button to register yourself before trying to join a team.</p>")
  } else {
    const assignments = player.Assignment
    for (const assignment of assignments) {
      await hydrateOne(assignment.team.manager)
    }
    res.render("fragments/dashboard/team-list", {
      assignments
    })
  }
}

router.get('/self/team', renderSelfTeams)
  .get('/self/team/join', async (req, res) => {
    const divisions = await prisma.division.findMany()
    res.render('fragments/dashboard/join', {
      divisions
    })
  })
  .post('/self/team/join', noUpload, async (req, res, next) => {
    await prisma.assignment.create({
      data: {
        alt_tag: req.body.alt_tag,
        scoresaber: req.body.scoresaber,
        team: {
          connect: {
            id: req.body.teamId
          }
        },
        player: {
          connect: {
            discord: req.session.user?.discord
          }
        },
        status: State.REVIEW
      }
    })
    next()
  }, renderSelfTeams)
  .delete('/self/team/:assignmentID', async (req, res) => {
    await prisma.assignment.delete({
      where: {
        id: req.params.assignmentID
      }
    })
    res.send("<p hx-on::after-settle=\"setTimeout(() => { this.remove() }, 5000)\">Left team.</p>")
  })


  .post('/self/team/options', noUpload, async (req, res) => {
    if (!req.body.divisionId || (req.body.divisionId as string).length < 1) {
      res.render('fragments/dashboard/team-options', {
        teams: []
      })
      return
    }
    const teams = await prisma.team.findMany({
      where: {
        divisionId: req.body.divisionId,
        Assignment: {
          none: {
            player: {
              is: {
                discord: req.session.user?.discord
              }
            }
          }
        }
      }
    })
    res.render('fragments/dashboard/team-options', {
      teams
    })
  })