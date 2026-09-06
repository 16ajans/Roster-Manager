export const APP_NAME = 'CVRE Roster Manager'
export const APP_URL = 'https://cvre.app'
export const APP_LOGO_URL = `${APP_URL}/images/CVRE.png`
export const BRAND_COLOR = 0x703893
export const BRAND_COLOR_HEX = '#703893'

export const LEAGUE_URL = 'https://cvreleague.com/'
export const DISCORD_INVITE_URL = 'https://discord.gg/JXbmZjp'

// Fallback recipient for bot notifications when no specific admin is attached
// (e.g. rejections with no admin on the assignment).
export const FALLBACK_ADMIN_SNOWFLAKE = '144973321749004289'

export const DM_EMBED_AUTHOR = {
  name: 'CVRE Roster Integration',
  url: APP_URL,
  iconURL: APP_LOGO_URL,
}

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 1 week
export const STATIC_ASSET_CACHE_MAX_AGE = '7d'
export const UPLOAD_CACHE_MAX_AGE = '1d'
