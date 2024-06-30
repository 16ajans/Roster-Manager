import axios from 'axios'

const client_id = process.env.DISCORD_OAUTH_ID
const client_secret = process.env.DISCORD_OAUTH_SECRET
const redirect_uri = process.env.DISCORD_OAUTH_REDIRECT_URI
const scopes = process.env.DISCORD_OAUTH_SCOPES
const guild_id = process.env.GUILD_ID

const instance = axios.create({
  baseURL: 'https://discord.com/api'
})

export const authorizationURL = encodeURI(
  'https://discord.com/api/oauth2/authorize' +
    '?response_type=code' +
    `&client_id=${client_id}` +
    `&scope=${scopes}` +
    `&redirect_uri=${redirect_uri}` +
    '&prompt=none'
)

export async function getTokenResponse (code: string) {
  const res = await instance.post(
    '/oauth2/token',
    {
      client_id: client_id,
      client_secret: client_secret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect_uri
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  return res.data
}

export async function revokeToken (token: string) {
  const res = await instance.post(
    '/oauth2/token/revoke',
    {
      client_id: client_id,
      client_secret: client_secret,
      token
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  return res.data
}

export async function getCurrentUser (token: string) {
  const res = await instance.get('/users/@me',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )
  return res.data
}

export async function getGuildRoles (token: string) {
  const res = await instance.get(
    `/users/@me/guilds/${guild_id}/member`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )
  return res.data.roles
}
