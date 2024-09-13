import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('pages/dashboard', {
      title: 'CVRE Roster Manager | Dashboard',
      user: req.session.user
    })
  })