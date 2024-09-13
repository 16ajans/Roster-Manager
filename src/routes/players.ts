import express, { RequestHandler } from 'express'
import { verifUpload } from '../drivers/fs'
import { prisma } from '../drivers/db'
import { hydratePlayer, hydratePlayers } from '../middleware/discord'
import { Player, State } from '@prisma/client'

export const router = express.Router()

router
  .get('/', async (req, res) => {
    res.render('pages/players', {
      title: 'CVRE Roster Manager | Players',
      user: req.session.user
    })
  })

const renderPlayer: RequestHandler = async (req, res) => {
  const player = await prisma.player.findUnique({
    where: {
      id: req.params.playerID,
      OR: [
        { managerId: req.session.user?.id },
        { discord: req.session.user?.discord }
      ]
    }
  }) as Player
  await hydratePlayer(player)
  res.render('fragments/players/player', {
    player
  })
}

router
  .get('/list', async (req, res) => {
    const players = await prisma.player.findMany({
        where: {
          OR: [
            { managerId: req.session.user?.id },
            { discord: req.session.user?.discord }
          ]
        }
      })
    await hydratePlayers(players)
    res.render('fragments/players/list', {
      players
    })
  })
  .get('/create', async (req, res) => {
    res.render('fragments/players/create')
  })
  .post('/create', verifUpload.single('verification'), async (req, res) => {
    let state: State = State.AWAITING
    let doc: string | undefined = undefined
    if (req.file) {
        state = State.REVIEW
        doc = req.file.filename
    }
    const player = await prisma.player.create({
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
    await hydratePlayer(player)
    res.render('fragments/players/new-player', {
      player
    })
  })
  .get('/:playerID', renderPlayer)
  .get('/:playerID/edit', async (req, res) => {
    const player = await prisma.player.findUnique({
      where: {
        id: req.params.playerID,
        OR: [
          { managerId: req.session.user?.id },
          { discord: req.session.user?.discord }
        ]
      }
    }) as Player
    await hydratePlayer(player)
    res.render('fragments/players/edit', {
      player
    })
  })
  .put('/:playerID', verifUpload.single('verification'), async (req, res, next) => {
    const player = await prisma.player.findUnique({
      where: {
          id: req.params.playerID,
          OR: [
            { managerId: req.session.user?.id },
            { discord: req.session.user?.discord }
          ]
      }
  }) as Player
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
          id: req.params.playerID,
          OR: [
            { managerId: req.session.user?.id },
            { discord: req.session.user?.discord }
          ]
      },
      data
  })
  next()
  }, renderPlayer)
  .delete('/:playerID', async (req, res) => {
    await prisma.player.delete({
      where: {
          id: req.params.playerID,
          OR: [
            { managerId: req.session.user?.id },
            { discord: req.session.user?.discord }
          ]
      }
    })
    res.send("<p hx-on::after-settle=\"setTimeout(() => { this.remove() }, 5000)\">Player registration deleted.</p>")
  })