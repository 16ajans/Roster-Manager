import path from 'path';
import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import compression from 'compression'
import morgan from 'morgan'

process.env['dirRoot'] = path.resolve(__dirname, '..')
const adminRoleID = process.env.ADMIN_ROLE_ID as string
const production = process.env.NODE_ENV as string == 'production'

import { prismaSession } from './drivers/db'

import { adminAuth, router as auth } from './middleware/auth'
import { router as api } from './middleware/api'
import { client } from './drivers/bot';
import { Events } from 'discord.js';

const app = express()

app.disable("x-powered-by")
if (!production) {
  app.use(morgan('dev'))  
}
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
app.use(express.static(path.join(process.env.dirRoot, 'public'), {
  maxAge: '7d'
}))
app.use('/verifications', adminAuth, express.static(path.join(process.env.dirRoot, 'verifications'), {
 setHeaders: (res) => { res.set({
      'Content-Disposition': 'inline'
    })},  
  maxAge: '1d'
}))

app.use('/auth', auth)
app.use('/api', api)

app.get('/', async (req, res) => {
  res.render('dashboard', {
    title: 'CVRE Roster Manager | Dashboard',
    user: req.session.user,
    production
  })
})
app.get('/account', async (req, res) => {
  if (req.session.user?.auth) {
      res.render('account', {
      title: 'CVRE Roster Manager | Account',
      user: req.session.user,
      production
    })
  } else {
    res.redirect('/auth/login')
  }
})
app.get('/admin', async (req, res) => {
  if (req.session.user?.auth) {
    if (req.session.user.roles.includes(adminRoleID)) {
      res.render('admin', {
        title: 'CVRE Roster Manager | Admin',
        user: req.session.user,
        production
      })
    } else {
      res.redirect('/account')
    }
  } else {
    res.redirect('/auth/login')
  }

})
app.get('/help', async (req, res) => {
  res.render('help', {
    title: 'CVRE Roster Manager | Help'
    })
})

client.once(Events.ClientReady, () => {
  app.listen(process.env.PORT)
})
