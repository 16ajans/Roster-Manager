import express from 'express'
import { router as self } from './api/self'
import { router as teams } from './api/manage/teams'
import { router as players } from './api/manage/players'
import { router as discord } from './api/discord'
import { router as verify } from './api/verify'

export const router = express.Router()

router.use('/self', self)
router.use('/manage/teams', teams)
router.use('/manage/players', players)
router.use('/discord', discord)
router.use('/verify', verify)