# CVRE Roster Manager

A web app for managing esports league rosters: divisions, teams, and player
registrations, with Discord OAuth login and a Discord bot for role/identity
sync. Built with Express, Pug, Prisma (PostgreSQL), and discord.js.

## Features

- **Discord OAuth login** — users authenticate via Discord; the bot hydrates
  Discord identity (username, avatar) for display.
- **Divisions** — top-level groupings of teams, each with a division admin,
  min/max player limits, and open/closed registration.
- **Teams & players** — teams belong to a division and have a manager; players
  register and are assigned to a team.
- **Assignment verification workflow** — player-to-team assignments move
  through `AWAITING` → `REVIEW` → `ACCEPTED`/`REJECTED` states for admin
  approval.
- **Admin controls** — division admins manage their division's teams,
  players, and pending verifications.

## Prerequisites

- Node.js 18+
- A PostgreSQL database
- A [Discord application](https://discord.com/developers/applications) with
  OAuth2 configured, and a bot token for the same application

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `example.env` to `.env` and fill in the values (see
   [Environment variables](#environment-variables) below):

   ```bash
   cp example.env .env
   ```

3. **Set up the database**

   Run the initial migration to create the schema and generate the Prisma
   client:

   ```bash
   npm run initmigrate
   ```

   For subsequent schema changes, use:

   ```bash
   npm run migrate
   ```

4. **Build and run**

   ```bash
   npm run build
   npm run serve
   ```

   The app starts once the Discord bot client is ready, then listens on
   `PORT` (default `3000`).

## Available scripts

| Script | Description |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run serve` | Run the compiled app from `dist/index.js` |
| `npm run lint` | Run ESLint |
| `npm run initmigrate` | Create and apply the initial Prisma migration |
| `npm run migrate` | Create and apply a new Prisma migration |

## Environment variables

See `example.env` for a template. Key variables:

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Port the server listens on |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret used to sign session cookies |
| `DISCORD_OAUTH_ID` / `DISCORD_OAUTH_SECRET` | Discord OAuth2 application credentials |
| `DISCORD_OAUTH_REDIRECT_URI` | OAuth2 redirect URI registered with Discord |
| `DISCORD_OAUTH_SCOPES` | OAuth2 scopes requested (e.g. `identify guilds.members.read`) |
| `DISCORD_BOT_TOKEN` | Bot token for the same Discord application |
| `GUILD_ID` | Discord server (guild) ID the bot operates in |
| `ADMIN_ROLE_ID` | Discord role ID granted admin access in the app |

## Project structure

```
src/
  drivers/     # Prisma client, Discord bot client, filesystem helpers
  middleware/  # Auth (session/role guards) and Discord identity hydration
  routes/      # Express routers: account, dashboard, divisions, players, teams, verify
prisma/
  schema.prisma  # Data model: Division, Team, Player, Assignment, User, Session
views/         # Pug templates
public/        # Static assets
```

## License

MIT — see [LICENSE](./LICENSE).
