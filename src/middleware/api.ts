import express from 'express'
import { router as self } from './api/self'

export const router = express.Router()

router.use('/self', self)