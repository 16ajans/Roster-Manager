import express from 'express'
import { prisma } from '../drivers/db'
import {
  authorizationURL,
  getTokenResponse,
  getCurrentUser,
  revokeToken
} from '../drivers/discord'

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