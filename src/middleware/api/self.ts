import express from 'express'
import { userAuth } from '../auth'
import { prisma } from '../../drivers/db'
import { Player, State } from '@prisma/client'
import { verifUpload } from '../../drivers/filesystem'

export const router = express.Router()

router
    .get('/', userAuth, async (req, res) => {
        const player = await prisma.player.findUnique({
            where: {
                discord: req.session.user?.discord
            },
            include: {
                manager: true
            }
        })
        if (player === null) {
            res.render('components/self-empty')
        } else {
            res.render('components/self-player', {
                player
            })
        }
    })
    .post('/', userAuth, verifUpload.single('verification'), async (req, res) => {
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
                discord: req.session.user?.discord as string,
                manager: {
                    connect: {
                        id: req.session.user?.id
                    }
                },
                doc,
                status: state
            },
            include: {
                manager: true
            }
        })
        res.render('components/self-player', {
            player
        })
    })
    .put('/', userAuth, verifUpload.single('verification'), async (req, res) => {
        let player = await prisma.player.findUnique({
            where: {
                discord: req.session.user?.discord as string,
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
            if (player.doc) {
                data.status = State.REVIEW
            } else {
                data.status = State.AWAITING
            }
        }
        if (req.file) {
            data.doc = req.file.filename
            data.status = State.REVIEW
        }
        player = await prisma.player.update({
            where: {
                discord: req.session.user?.discord as string,
            },
            data,
            include: {
                manager: true
            }
        })
        res.render('components/self-player', {
            player
        })
    })
    .delete('/', userAuth, async (req, res) => {
        await prisma.player.delete({
            where: {
                discord: req.session.user?.discord as string
            }
        })
        res.render('components/self-empty')
    })

router 
    .get('/register', userAuth, async (req, res) => {
        const player = await prisma.player.findUnique({
            where: {
                discord: req.session.user?.discord
            },
            include: {
                manager: true
            }
        })
        if (player === null) {
            res.render('components/self-register')
        } else {
            res.render('components/self-register', {
                player
            })
        }
    })