import express, { NextFunction, Request, Response } from 'express'
import { userAuth } from '../../auth'
import { prisma } from '../../../drivers/db'
import { verifUpload } from '../../../drivers/filesystem'
import { Player, State } from '@prisma/client'
import { fetchGuildMember, fetchUser } from '../../../drivers/bot'

export const router = express.Router()

const getPlayers = async function (req: Request, res: Response, next: NextFunction) {
    const players = await prisma.player.findMany({
        where: {
            managerId: req.session.user?.id,
            NOT: {
                discord: req.session.user?.discord
            }
        }
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
    .get('/', userAuth, getPlayers)
    .post('/', userAuth, verifUpload.single('verification'), async (req, res, next) => {
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
    .put('/:playerID', userAuth, verifUpload.single('verification'), async (req, res, next) => {
        const player = await prisma.player.findUnique({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
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
                managerId: req.session.user?.id
            },
            data
        })
        next()
    }, getPlayers)
    .delete('/:playerID', userAuth, async (req, res) => {
        await prisma.player.delete({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
            }
        })
        res.send("<p>Player registration deleted.</p>")
    })

    .get('/register', userAuth, async (req, res) => {
        res.render('components/manage/players-register')
    })
    .get('/:playerID', userAuth, async (req, res) => {
        const player = await prisma.player.findUnique({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
            }
        }) as Player
        const user = fetchUser(player.discord)
        const member = fetchGuildMember(player.discord)
        Promise.all([user, member]).then(results => {
            res.render('components/manage/players-register', {
                player,
                user: results[0],
                member: results[1]
            })
        })
    })