import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('pages/teams', {
      title: 'CVRE Roster Manager | Teams',
      user: req.session.user
    })
  })