import express from 'express'
import { userAuth } from '../auth'
import { prisma } from '../../drivers/db'
import { State } from '@prisma/client'
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
        let state: State = State.AWAITING
        let doc: string | undefined = undefined
        if (req.file) {
            state = State.REVIEW
            doc = req.file.filename
        }
        const player = await prisma.player.update({
            where: {
                discord: req.session.user?.discord as string,
            },
            data: {
                name: req.body.name as string,
                school: req.body.school as string,
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