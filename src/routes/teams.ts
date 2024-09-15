import express, { RequestHandler } from 'express'
import { prisma } from '../drivers/db'
import { noUpload } from '../drivers/fs'

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
      division: true
    }
  })
  if (!team) {
    res.sendStatus(404)
    return
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
        division: true
      }
    })
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
  .post('/create', noUpload, async (req, res) => {
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
        }
      },
      include: {
        division: true
      }
    })
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
        division: true
      }
    })
    if (!team) {
      res.sendStatus(404)
      return
    }
    res.render('fragments/teams/edit', {
      team,
      divisions
    })
  })
  .put('/:teamID', noUpload, async (req, res, next) => {
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
      }
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