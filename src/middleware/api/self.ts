import express, { Request } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { mkdir } from 'node:fs/promises'
import { userAuth } from '../auth'
import { prisma } from '../../drivers/db'
import { State } from '@prisma/client'

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    await mkdir(`verifications/`, { recursive: true })
    cb(null, `verifications/`)
  },
  filename: function (req, file, cb) {
    cb(null, `${req.session.user?.discord}.${file.mimetype.split('/')[1]}`)
  }
})
function fileFilter (req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
    if (req.get('content-length') as unknown as number > 9000000) {
        cb(null, false)
    } else if (!file.mimetype.startsWith('image') && file.mimetype !== 'application/pdf') {
        cb(null, false)
    } else {
        cb(null, true)
    }
}

export const router = express.Router()
const upload = multer({ storage, fileFilter })

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
    .post('/', userAuth, upload.single('verification'), async (req, res) => {
        let state: State = State.AWAITING
        if (req.file) {
            state = State.REVIEW
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
    .put('/', userAuth, upload.single('verification'), async (req, res) => {
        const player = await prisma.player.update({
            where: {
                discord: req.session.user?.discord as string,
            },
            data: {
                name: req.body.name as string,
                school: req.body.school as string,
                status: State.REVIEW
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