import 'dotenv/config'
import express from 'express'
import session from 'express-session';
import compression from 'compression'
import pug from 'pug'

import { prismaSession } from './drivers/db'

import { router as auth } from './middleware/auth'


const app = express().disable("x-powered-by")

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

app.use('/auth', auth)

app.get('/', (req, res) => {
  res.send(req.session.user)
})

app.listen(process.env.PORT)