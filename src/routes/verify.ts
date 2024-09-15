import express from 'express'
import path from 'path'
import { dirRoot } from '../drivers/fs'
import { prisma } from '../drivers/db'
import { sendVerifDM } from '../drivers/bot'
import { State } from '@prisma/client'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('pages/verify', {
      title: 'CVRE Roster Manager | Verify',
      user: req.session.user
    })
  })

router.use('/docs', express.static(path.join(dirRoot, 'verifications'), {
  setHeaders: (res) => {
    res.set({
        'Content-Disposition': 'inline'
      })
    },  
    maxAge: '1d'
  }))

  router
    .get('/list', async (req, res) => {
        const query: State[] = []
        if (req.query.REJECTED === "on") {
            query.push(State.REJECTED)
        }
        if (req.query.AWAITING === "on") {
            query.push(State.AWAITING)
        }
        if (req.query.REVIEW === "on") {
            query.push(State.REVIEW)
        }
        if (req.query.ACCEPTED === "on") {
            query.push(State.ACCEPTED)
        }
        const players = await prisma.player.findMany({
            where: {
                status: {
                    in: query
                }
            },
            include: {
                manager: true
            }
        })
        res.render('fragments/verify/list', {
            players
        })
    })
    .put('/:playerID/:newState', express.urlencoded({ extended: true }), async (req, res) => {
        let param: State = State.REJECTED
        if (req.params.newState === "ACCEPTED") {
            param = State.ACCEPTED
        }
        const player = await prisma.player.update({
            where: {
                id: req.params.playerID
            },
            data: {
                status: param
            },
            include: {
                manager: true
            }
        })
        res.render('fragments/verify/changed', {
            player
        })
        if (param == State.ACCEPTED) {
            sendVerifDM(player.manager.discord, player.discord, true)
        } else {
          sendVerifDM(player.manager.discord, player.discord, false, req.session.user?.discord, req.body.reason)
        }
    })
    .delete('/:playerID', async (req, res) => {
        await prisma.player.delete({
            where: {
                id: req.params.playerID
            }
        })
        res.send("<p>Player registration deleted.</p>")
    })