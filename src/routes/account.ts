import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
  res.render('pages/account', {
    title: 'CVRE Roster Manager | Account',
    user: req.session.user
  })
})