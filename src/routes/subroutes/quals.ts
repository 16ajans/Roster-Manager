import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('subpages/quals', {
        title: 'CVRE Roster Manager | Admin | Quals',
        user: req.session.user
    })
})