import express, { RequestHandler } from 'express'
import { prisma } from '../drivers/db'
import { noUpload } from '../drivers/fs'

export const router = express.Router()

router
  .get('/', async (req, res) => {
    res.render('pages/divisions', {
      title: 'CVRE Roster Manager | Divisions',
      user: req.session.user
    })
  })
  
const renderDivision: RequestHandler = async (req, res) => {
  const division = await prisma.division.findUnique({
    where: {
      id: req.params.divisionID
    },
    include: {
      admin: true
    }
  })
  if (!division) {
    res.sendStatus(404)
    return
  }
  res.render('fragments/divisions/division', {
    division
  })
}

router
  .get('/list', async (req, res) => {
    const divisions = await prisma.division.findMany({
        include: {
          admin: true
        }
      }
    )
    res.render('fragments/divisions/list', {
      divisions
    })
  })
  .get('/create', async (req, res) => {
    res.render('fragments/divisions/create')
  })
  .post('/create', noUpload, async (req, res) => {
    if (req.body.open) {
      req.body.open = true
    } else {
      req.body.open = false
    }
    if (req.body.min_players === "") {
      req.body.min_players = undefined
    }
    if (req.body.max_players === "") {
      req.body.max_players = undefined
    }
    const division = await prisma.division.create({
        data: {
          name: req.body.name as string,
          description: req.body.description as string,
          open: req.body.open as boolean,
          min_players: req.body.min_players as number,
          max_players: req.body.max_players as number,
          manager_role: req.body.manager_role as string,
          player_role: req.body.player_role as string,
          admin: {
            connect: {
                discord: req.body.admin_discord
            }
          }
        },
        include: {
          admin: true
        }
    })
    res.render('fragments/divisions/new-division', {
      division
    })
  })
  .get('/:divisionID', renderDivision)
  .get('/:divisionID/edit', async (req, res) => {
    const division = await prisma.division.findUnique({
      where: {
        id: req.params.divisionID,
      },
      include: {
        admin: true
      }
    })
    if (!division) {
      res.sendStatus(404)
      return
    }
    res.render('fragments/divisions/edit', {
      division,
    })
  })
  .put('/:divisionID', noUpload, async (req, res, next) => {
    const division = await prisma.division.findUnique({
      where: {
          id: req.params.divisionID
      },
      include: {
        admin: true
      }
    })
    if (!division) {
      res.sendStatus(404)
      return
    }
    const data: {
      name?: string;
      description?: string;
      manager_role?: string;
      player_role?: string;
      min_players?: number;
      max_players?: number;
      open?: boolean
      admin?: {
        connect: {
          discord: string
        }
      }
    } = {}
    if (division.name != req.body.name) {
      data.name = req.body.name
    }
    if (division.description != req.body.description) {
      data.description = req.body.description
    }
    if (division.manager_role != req.body.manager_role) {
      data.manager_role = req.body.manager_role
    }
    if (division.player_role != req.body.player_role) {
      data.player_role = req.body.player_role
    }
    if (division.min_players != req.body.min_players) {
      if (req.body.min_players === "") {
        data.min_players = undefined
      } else {
        data.min_players = req.body.min_players
      }
    }
    if (division.max_players != req.body.max_players) {
      if (req.body.max_players === "") {
        data.max_players = undefined
      } else {
        data.max_players = req.body.max_players
      }
    }
    if (req.body.open) {
      data.open = true
    } else {
      data.open = false
    }
    if (division.admin.discord != req.body.admin_discord) {
      data.admin = {
        connect: {
          discord: req.body.admin_discord
        }
      }
    }
    await prisma.division.update({
        where: {
            id: req.params.divisionID
        },
        data
    })
    next()
  }, renderDivision)
  .delete('/:divisionID', async (req, res) => {
    prisma.division.delete({
      where: {
          id: req.params.divisionID
      }
    }).then(() => {
      res.send("<p hx-on::after-settle=\"setTimeout(() => { this.remove() }, 5000)\">Division deleted.</p>")
    }).catch((error) => {
      if (error.code === "y") {
        res.sendStatus(404)
      } else {  // foreign key constraint, etc.
        res.setHeader('HX-Retarget', 'body').render('error', {
          error
        })
      }
    })
  })