import express, { NextFunction, Request, Response } from 'express'
import { userAuth } from '../auth'
import { prisma } from '../../drivers/db'
import { verifUpload } from '../../drivers/filesystem'
import { State } from '@prisma/client'

export const router = express.Router()

const getPlayers = async function (req: Request, res: Response, next: NextFunction) {
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
    next()
}

router
    .get('/players', userAuth, getPlayers)
    .post('/players', userAuth, verifUpload.single('verification'), async (req, res, next) => {
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
        }, getPlayers)
    .get('/players/:playerID', userAuth, async (req, res) => {
        const player = await prisma.player.findUnique({
            where: {
                id: req.params.playerID
            }
        })
        res.render('components/manage/players-register', {
            player
        })
    })
    .put('/players/:playerID', userAuth, async (req, res) => {
        res.send("urgh")
    })
    .get('/players/register', userAuth, async (req, res) => {
        res.render('components/manage/players-register')
    })
    .get('/teams', userAuth, async (req, res) => {
        const teams = await prisma.team.findMany({
            where: {
                    managerId: req.session.user?.id
                }
        })
        if (teams.length === 0) {
            res.render('components/manage/teams-empty')
        } else {
            res.render('components/manage/teams-list', {
                teams
            })
        }
    })