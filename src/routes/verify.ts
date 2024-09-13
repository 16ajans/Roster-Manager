import express from 'express'
import path from 'path'
import { dirRoot } from '../drivers/fs'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('pages/verify', {
      title: 'CVRE Roster Manager | Verify',
      user: req.session.user
    })
  })

router.use('/docs', express.static(path.join(dirRoot, 'verifications'), {
  setHeaders: (res) => {
    res.set({
        'Content-Disposition': 'inline'
      })
    },  
    maxAge: '1d'
  }))