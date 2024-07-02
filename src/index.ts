import path from 'path';
import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import compression from 'compression'

import { prismaSession } from './drivers/db'

import { router as auth } from './middleware/auth'
import { router as api } from './middleware/api'

const app = express()

app.disable("x-powered-by")
app.use(compression())
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: process.env.SESSION_SECRET as string,
    resave: true,
    saveUninitialized: false,
    store: prismaSession,
  })
)
app.set('view engine', 'pug')
app.use(express.static(path.join(path.resolve(__dirname, '..'), 'public'), {
  maxAge: '7d'
}))

app.use('/auth', auth)
app.use('/api', api)

app.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'CVRE Roster Manager | Dashboard',
    user: req.session.user
  })
})
app.get('/account', (req, res) => {
  if (req.session.user?.auth) {
      res.render('account', {
      title: 'CVRE Roster Manager | Account',
      user: req.session.user
    })
  } else {
    res.redirect('/auth/login')
  }
})

app.listen(process.env.PORT)