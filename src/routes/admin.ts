import express from 'express'
import { router as verify } from './subroutes/verify'
import { router as quals } from './subroutes/quals'
import { router as payments } from './subroutes/payments'
import { router as orphans } from './subroutes/orphans'

export const router = express.Router()

router.get('/', async (req, res) => {
    res.render('pages/admin', {
        title: 'CVRE Roster Manager | Admin',
        user: req.session.user
    })
})

router.use('/verify', verify)
router.use('/quals', quals)
router.use('/payments', payments)
router.use('/orphans', orphans)