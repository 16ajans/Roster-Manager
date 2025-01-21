import express from 'express'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('subpages/orphans', {
        title: 'CVRE Roster Manager | Admin | Orphans',
        user: req.session.user
    })
})