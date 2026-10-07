import express, { RequestHandler } from 'express'
import { prisma } from '../drivers/db'
import { noUpload } from '../drivers/fs'
import { APP_NAME } from '../constants'
import { listGuildRoles, roleName } from '../drivers/bot'
import { applyRoleDelta, relatedToTeams, resyncAllRoles, snapshotRoles } from '../drivers/roles'

export const router = express.Router()

router.use((req, res, next) => {
  res.locals.roleName = roleName
  next()
})

router
  .get('/', async (req, res) => {
    res.render('pages/divisions', {
      title: `${APP_NAME} | Divisions`,
      user: req.session.user
    })
  })

const renderDivision: RequestHandler = async (req, res) => {
  const division = await prisma.division.findUnique({
    where: {
      id: req.params.divisionID
    },
    include: {
      admin: true
    }
  })
  if (!division) {
    res.sendStatus(404)
    return
  }
  res.render('fragments/divisions/division', {
    division
  })
}

router
  .get('/list', async (req, res) => {
    const divisions = await prisma.division.findMany({
      include: {
        admin: true
      }
    }
    )
    res.render('fragments/divisions/list', {
      divisions
    })
  })
  .get('/create', async (req, res) => {
    res.render('fragments/divisions/create', {
      roles: listGuildRoles()
    })
  })
  .post('/roles/resync', async (req, res) => {
    let summary
    try {
      summary = await resyncAllRoles()
    } catch (error) {
      console.error('Role resync failed:', error)
      res.render('fragments/divisions/resync-result', { message: 'Resync failed: could not list server members. Make sure the Server Members Intent is enabled for the bot in the Discord Developer Portal (see server logs).' })
      return
    }
    let message = `Checked ${summary.members} server members; updated ${summary.updated} (${summary.rolesAdded} roles added, ${summary.rolesRemoved} removed).`
    if (summary.failed > 0) {
      message += ` ${summary.failed} members failed to update (see server logs).`
    }
    if (summary.skippedRoles.length > 0) {
      message += ` Skipped roles the bot can't assign: ${summary.skippedRoles.map(roleName).join(', ')}.`
    }
    res.render('fragments/divisions/resync-result', { message })
  })
  .post('/create', noUpload, async (req, res) => {
    if (req.body.open) {
      req.body.open = true
    } else {
      req.body.open = false
    }
    const division = await prisma.division.create({
      data: {
        name: req.body.name as string,
        description: req.body.description as string,
        open: req.body.open as boolean,
        min_players: parseInt(req.body.min_players),
        max_players: parseInt(req.body.max_players),
        manager_role: (req.body.manager_role as string) || null,
        player_role: (req.body.player_role as string) || null,
        admin: {
          connect: {
            discord: req.session.user?.discord
          }
        }
      },
      include: {
        admin: true
      }
    })
    res.render('fragments/divisions/new-division', {
      division
    })
  })
  .get('/:divisionID', renderDivision)
  .get('/:divisionID/edit', async (req, res) => {
    const division = await prisma.division.findUnique({
      where: {
        id: req.params.divisionID,
      },
      include: {
        admin: true
      }
    })
    if (!division) {
      res.sendStatus(404)
      return
    }
    res.render('fragments/divisions/edit', {
      division,
      roles: listGuildRoles()
    })
  })
  .put('/:divisionID', noUpload, async (req, res, next) => {
    const division = await prisma.division.findUnique({
      where: {
        id: req.params.divisionID
      },
      include: {
        admin: true
      }
    })
    if (!division) {
      res.sendStatus(404)
      return
    }
    const data: {
      name?: string;
      description?: string;
      manager_role?: string | null;
      player_role?: string | null;
      min_players?: number;
      max_players?: number;
      open?: boolean
    } = {}
    if (division.name != req.body.name) {
      data.name = req.body.name
    }
    if (division.description != req.body.description) {
      data.description = req.body.description
    }
    const managerRole = (req.body.manager_role as string) || null
    const playerRole = (req.body.player_role as string) || null
    if (division.manager_role != managerRole) {
      data.manager_role = managerRole
    }
    if (division.player_role != playerRole) {
      data.player_role = playerRole
    }
    if (division.min_players != req.body.min_players) {
      data.min_players = parseInt(req.body.min_players)
    }
    if (division.max_players != req.body.max_players) {
      data.max_players = parseInt(req.body.max_players)
    }
    if (req.body.open) {
      data.open = true
    } else {
      data.open = false
    }
    // Changing a division's roles moves its managers and players from the
    // old role to the new one.
    const rolesChanged = 'manager_role' in data || 'player_role' in data
    const roles = await snapshotRoles(rolesChanged ? await relatedToTeams({ divisionId: division.id }) : [])
    await prisma.division.update({
      where: {
        id: req.params.divisionID
      },
      data
    })
    applyRoleDelta(roles)
    next()
  }, renderDivision)
  .delete('/:divisionID', async (req, res) => {
    prisma.division.delete({
      where: {
        id: req.params.divisionID
      }
    }).then(() => {
      res.send("<p hx-on::after-settle=\"setTimeout(() => { this.remove() }, 5000)\">Division deleted.</p>")
    }).catch((error) => {
      if (error.code === "P2025") {  // record not found
        res.sendStatus(404)
      } else if (error.code === "P2003") {  // foreign key constraint
        res.setHeader('HX-Retarget', 'body').render('error', {
          error: 'This division still has teams assigned to it and cannot be deleted.'
        })
      } else {
        console.error(error)
        res.setHeader('HX-Retarget', 'body').render('error', {
          error: 'An unexpected error occurred while deleting the division.'
        })
      }
    })
  })