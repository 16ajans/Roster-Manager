import express from 'express'
import { prisma } from '../../drivers/db'
import { State } from '@prisma/client'
import { hydrateOne } from '../../middleware/discord'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('subpages/payments', {
        title: 'CVRE Roster Manager | Admin | Payments',
        user: req.session.user
    })
})

router
    .get('/list', async (req, res) => {
        const query: State[] = []
        if (req.query.UNPAID === "on") {
            query.push(State.AWAITING)
        }
        if (req.query.PAID === "on") {
            query.push(State.ACCEPTED)
        }
        const teams = await prisma.team.findMany({
            where: {
                paid: {
                    in: query
                }
            },
            include: {
                division: true,
                manager: true
            }
        })
        // await hydrateMany(players)
        for (const team of teams) {
            await hydrateOne(team.manager)
        }
        res.render('fragments/payments/list', {
            teams
        })
    })
    .put('/:teamID/:newState', express.urlencoded({ extended: true }), async (req, res) => {
        let param: State = State.AWAITING
        if (req.params.newState === "PAID") {
            param = State.ACCEPTED
        }
        const team = await prisma.team.update({
            where: {
                id: req.params.teamID
            },
            data: {
                paid: param
            },
            include: {
                manager: true,
                division: true
            }
        })
        await hydrateOne(team.manager)
        res.render('fragments/payments/changed', {
            team
        })
    })