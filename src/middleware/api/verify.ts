import express from 'express'
import { adminAuth } from '../auth'
import { State } from '@prisma/client'
import { prisma } from '../../drivers/db'

export const router = express.Router()

router
    .get('/', adminAuth, async (req, res) => {
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
        res.render('components/verify', {
            players
        })
    })
    .put('/:playerID/:newState', adminAuth, async (req, res) => {
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
        res.render('components/verify-card', {
            player
        })
    })
    .delete('/:playerID', adminAuth, async (req, res) => {
        await prisma.player.delete({
            where: {
                id: req.params.playerID
            }
        })
        res.send("<p>Player Registration deleted.</p>")
    })