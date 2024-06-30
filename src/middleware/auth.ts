import express from 'express'
import type { RequestHandler } from "express";
import { prisma } from '../drivers/db'
import {
  authorizationURL,
  getTokenResponse,
  getCurrentUser,
  revokeToken,
  getGuildRoles
} from '../drivers/discord'

const adminRoleID = process.env.ADMIN_ROLE_ID

export const userAuth: RequestHandler = (req, res, next) => {
  if (req.session.user?.auth) next()
  else res.sendStatus(401)
}

export const adminAuth: RequestHandler = async (req, res, next) => {
  if (req.session.user?.auth) {
    const roles = await getGuildRoles(req.session.user.auth)
    if (roles.includes(adminRoleID)) next()
    else res.sendStatus(403)
  } else res.sendStatus(401)
}

export const router = express.Router()

router.get('/login', (req, res) => {
  res.redirect(authorizationURL)
})

router.get('/callback', async (req, res) => {
  const tokenResponse = await getTokenResponse(req.query.code as string)
  const discordUser = await getCurrentUser(tokenResponse.access_token)

  req.session.user = await prisma.user.upsert({
    where: {
      discord: discordUser.id
    },
    update: {
      avatar: discordUser.avatar,
      auth: tokenResponse.access_token
    },
    create: {
      discord: discordUser.id,
      avatar: discordUser.avatar,
      auth: tokenResponse.access_token
    }
  })

  req.session.save(() => {
    res.redirect('/')
  })
})

router.get('/logout', (req, res) => {
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