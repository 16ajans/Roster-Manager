import express from 'express'
import type { RequestHandler } from "express";
import { prisma } from '../drivers/db'
import {
  authorizationURL,
  getTokenResponse,
  getCurrentUser,
  revokeToken,
  getGuildRoles,
} from '../drivers/discord'
import { fetchGuildMember } from '../drivers/bot';

const adminRoleID = process.env.ADMIN_ROLE_ID as string

export const userAuth: RequestHandler = (req, res, next) => {
  if (req.session.user?.auth) next()
  else res.sendStatus(401)
}

export const adminAuth: RequestHandler = async (req, res, next) => {
  if (req.session.user?.auth) {
    if (req.session.user.admin) next()
    else res.sendStatus(403)
  } else res.sendStatus(401)
}

export const router = express.Router()

router.get('/login', async (req, res) => {
  res.redirect(authorizationURL)
})

router.get('/callback', async (req, res) => {
  if (req.query.error) {
    res.render('error', {
      error: req.query.error_description
    })
    return
  }

  const tokenResponse = await getTokenResponse(req.query.code as string)
  const discordUser = await getCurrentUser(tokenResponse.access_token)

  try {
    await fetchGuildMember(discordUser.id)
  } catch (err) {
    res.redirect('not-joined')
    return
  }

  const roles = await getGuildRoles(tokenResponse.access_token)

  req.session.user = await prisma.user.upsert({
    where: {
      discord: discordUser.id
    },
    update: {
      avatar: discordUser.avatar,
      auth: tokenResponse.access_token,
      roles
    },
    create: {
      discord: discordUser.id,
      avatar: discordUser.avatar,
      auth: tokenResponse.access_token,
      roles
    }
  })

  req.session.user.admin = req.session.user.roles.includes(adminRoleID)

  req.session.save(() => {
    res.redirect('/account')
  })
})

router.get('/logout', async (req, res) => {
  if (req.session.user?.auth) {
    revokeToken(req.session.user.auth)
    
    prisma.user.update({
      where: {
        id: req.session.user.id
      }, 
      data: {
        auth: null
      }
    })   
  }
  req.session.destroy(() => {
    res.redirect('/')
  })
})

router.get('/not-joined', async (req, res) => {
  res.render('not-joined')
})