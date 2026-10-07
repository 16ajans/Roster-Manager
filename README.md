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
- **Discord role sync** — the bot grants and revokes roles as roster status
  changes, and DMs members a summary of what changed (see
  [Discord roles](#discord-roles)).
- **Public team listing** — a read-only roster overview at `/public`,
  viewable with or without logging in.
- **CSRF protection** — session-bound CSRF tokens (via `lusca`) guard every
  mutating request, wired into htmx requests automatically.
- **Environment banner** — a "Development Environment" banner shows
  automatically outside production, or on any hostname starting with
  `dev.`/`dev-` (handy for staging subdomains).

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

## Continuous integration

Every push and pull request against `main` runs `prisma generate`, lint,
and build via GitHub Actions (`.github/workflows/ci.yml`).

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
| `VERIFIED_ROLE_ID` | Optional Discord role ID granted to verified players |

## Discord roles

| Role | Configured in | Held while |
| --- | --- | --- |
| Verified | `VERIFIED_ROLE_ID` | the player's verification is `ACCEPTED` |
| Division player role | division settings | verified **and** on an accepted roster spot in that division |
| Division manager role | division settings | managing a team in that division with at least one such player |

Roles are applied as deltas: each change computes what the affected members
should hold before and after, and only adds or removes the difference. Roles
assigned by hand are left alone unless an app criterion for that same role
stops being met. Editing a player's name, school, or verification document
resets their verification, so their roles come off until re-approved.

Admins can use **Resync Discord Roles** on the Divisions page to backfill or
repair drift. It only adds roles and sends no DMs.

The bot needs the **Manage Roles** permission, and its highest role must sit
above every role it manages. Roles it can't assign are marked in the division
role pickers.

## Project structure

```
src/
  constants.ts # Shared app/branding config (name, URL, colors, links, etc.)
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
