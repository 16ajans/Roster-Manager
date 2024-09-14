import express from 'express'
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
      req.body.min_players = null
    }
    if (req.body.max_players === "") {
      req.body.max_players = null
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