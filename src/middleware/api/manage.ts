import express from 'express'
import { userAuth } from '../auth'
import { prisma } from '../../drivers/db'

export const router = express.Router()

router
    .get('/players', userAuth, async (req, res) => {
        const players = await prisma.player.findMany({
            where: { AND: [
                {
                    managerId: req.session.user?.id
                },
                { NOT: {
                    discord: req.session.user?.discord
                }}
            ]}
        })
        if (players.length === 0) {
            res.render('components/manage/players-empty')
        } else {
            res.render('components/manage/players-list', {
                players
            })
        }
    })