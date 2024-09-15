import path from 'path';
import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import compression from 'compression'
import morgan from 'morgan'
import { Events } from 'discord.js';

import { prismaSession } from './drivers/db'
import { dirRoot } from './drivers/fs';
import { client as bot } from './drivers/bot';

import { adminAuth, router as auth, userAuth } from './middleware/auth'
import { router as discord } from './middleware/discord'

import { router as account } from './routes/account'
import { router as dashboard } from './routes/dashboard'
import { router as divisions } from './routes/divisions'
import { router as players } from './routes/players'
import { router as teams } from './routes/teams'
import { router as verify } from './routes/verify'

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))  
}
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week, ms
    },
    secret: process.env.SESSION_SECRET as string,
    resave: true,
    saveUninitialized: false,
    store: prismaSession,
  })
)
app.use(compression())
app.disable("x-powered-by")

app.set('view engine', 'pug')

app.use(express.static(path.join(dirRoot, 'public'), {
  maxAge: '7d'
}))

app.use('/auth', auth)
app.use('/discord', userAuth, discord)

app.use('/account', userAuth, account)
app.use('/divisions', adminAuth, divisions)
app.use('/players', userAuth, players)
app.use('/teams', userAuth, teams)
app.use('/verify', adminAuth, verify)

app.get('/help', async (req, res) => {
  res.render('help', {
    title: 'CVRE Roster Manager | Help'
    })
})

app.use('/', async (req, res, next) => {
  if (!req.session.user?.auth) {
    res.render("pages/public")
  } else {
    next()
  }
}, userAuth, dashboard)

bot.once(Events.ClientReady, () => {
  app.listen(process.env.PORT)
})