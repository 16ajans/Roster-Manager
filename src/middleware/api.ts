import express from 'express'
import { router as self } from './api/self'
import { router as discord } from './api/discord'
import { router as verify } from './api/verify'

export const router = express.Router()

router.use('/self', self)
router.use('/discord', discord)
router.use('/verify', verify)