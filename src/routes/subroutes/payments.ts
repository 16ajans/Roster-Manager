import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('subpages/payments', {
        title: 'CVRE Roster Manager | Admin | Payments',
        user: req.session.user
    })
})