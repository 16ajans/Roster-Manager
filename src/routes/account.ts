import express from 'express'
import { APP_NAME } from '../constants'

export const router = express.Router()

router.get('/', async (req, res) => {
  res.render('pages/account', {
    title: `${APP_NAME} | Account`,
    user: req.session.user
  })
})