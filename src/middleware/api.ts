import express from 'express'
import { router as self } from './api/self'
import { router as discord } from './api/discord'

export const router = express.Router()

router.use('/self', self)
router.use('/discord', discord)