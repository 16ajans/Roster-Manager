import path from 'path';
import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import csrf from 'lusca'
import compression from 'compression'
import morgan from 'morgan'

import { Events } from 'discord.js';

import { prisma, prismaSession } from './drivers/db'
import { dirRoot } from './drivers/fs';
import { client as bot } from './drivers/bot';

import { adminAuth, router as auth, userAuth } from './middleware/auth'
import { router as discord, hydrateOne } from './middleware/discord'

import { APP_LOGO_URL, APP_NAME, APP_URL, BRAND_COLOR_HEX, DISCORD_INVITE_URL, LEAGUE_URL, SESSION_MAX_AGE_MS, STATIC_ASSET_CACHE_MAX_AGE } from './constants'

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
      maxAge: SESSION_MAX_AGE_MS,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    secret: process.env.SESSION_SECRET as string,
    resave: true,
    saveUninitialized: false,
    store: prismaSession,
    proxy: true
  })
)
app.use(csrf())
app.use(compression())
app.disable("x-powered-by")

app.set('view engine', 'pug')
app.locals.brand = {
  appName: APP_NAME,
  appUrl: APP_URL,
  appLogoUrl: APP_LOGO_URL,
  colorHex: BRAND_COLOR_HEX,
  leagueUrl: LEAGUE_URL,
  discordInviteUrl: DISCORD_INVITE_URL,
}

app.use(express.static(path.join(dirRoot, 'public'), {
  maxAge: STATIC_ASSET_CACHE_MAX_AGE
}))

app.use('/auth', auth)
app.use('/discord', userAuth, discord)

app.use('/account', userAuth, account)
app.use('/divisions', adminAuth, divisions)
app.use('/players', userAuth, players)
app.use('/teams', teams)
app.use('/verify', adminAuth, verify)

app.get('/help', async (req, res) => {
  res.render('help', {
    title: `${APP_NAME} | Help`
  })
})

app.use('/', async (req, res, next) => {
  if (!req.session.user?.auth) {
    const divisions = await prisma.division.findMany({
      include: {
        Team: {
          include: {
            division: true,
            manager: true,
            Assignment: {
              include: {
                player: true
              }
            }
          }
        }
      }
    })
    await Promise.all(
      divisions.flatMap((division) =>
        division.Team.flatMap((team) => [
          hydrateOne(team.manager),
          ...team.Assignment.map((assignment) => hydrateOne(assignment.player))
        ])
      )
    )
    res.render("pages/public", {
      divisions,
      title: APP_NAME
    })
  } else {
    next()
  }
}, userAuth, dashboard)

bot.once(Events.ClientReady, () => {
  app.listen(process.env.PORT)
})