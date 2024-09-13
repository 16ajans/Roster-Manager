import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('pages/divisions', {
      title: 'CVRE Roster Manager | Divisions',
      user: req.session.user
    })
  })