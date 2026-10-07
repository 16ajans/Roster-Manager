import { Prisma, State } from '@prisma/client'
import { DiscordAPIError, GuildMember } from 'discord.js'
import { prisma } from './db'
import { fetchAllGuildMembers, fetchGuildMember, roleEditable, sendRoleChangeDM } from './bot'

// Discord roles are managed as deltas: routes snapshot the roles their
// affected members *should* have before a write, then applyRoleDelta()
// recomputes after the write and only adds/removes the difference. Roles a
// mod assigned by hand are never touched unless the app's own criteria for
// that role flip from met to unmet. The admin resync is the exception: it
// aligns everyone to the database outright.
//
// Criteria:
//   VERIFIED_ROLE_ID (global)  player status is ACCEPTED
//   division.player_role       verified, with an ACCEPTED assignment on a team in the division
//   division.manager_role      manages a team in the division with at least one such player

const verifiedRoleId = process.env.VERIFIED_ROLE_ID || null

export type RoleSnapshot = Map<string, Set<string>>

const qualifyingAssignment = {
    status: State.ACCEPTED,
    player: { status: State.ACCEPTED }
} satisfies Prisma.AssignmentWhereInput

async function computeRoles(discordIds: string[]): Promise<RoleSnapshot> {
    const roles: RoleSnapshot = new Map(discordIds.map((id) => [id, new Set<string>()]))
    if (discordIds.length === 0) {
        return roles
    }
    const [players, teams] = await Promise.all([
        prisma.player.findMany({
            where: { discord: { in: discordIds }, status: State.ACCEPTED },
            include: {
                Assignment: {
                    where: { status: State.ACCEPTED },
                    include: { team: { include: { division: true } } }
                }
            }
        }),
        prisma.team.findMany({
            where: {
                manager: { discord: { in: discordIds } },
                Assignment: { some: qualifyingAssignment }
            },
            include: { manager: true, division: true }
        })
    ])
    for (const player of players) {
        const set = roles.get(player.discord)
        if (verifiedRoleId) {
            set?.add(verifiedRoleId)
        }
        for (const assignment of player.Assignment) {
            if (assignment.team.division.player_role) {
                set?.add(assignment.team.division.player_role)
            }
        }
    }
    for (const team of teams) {
        if (team.division.manager_role) {
            roles.get(team.manager.discord)?.add(team.division.manager_role)
        }
    }
    return roles
}

// Call before a write, with every member whose roles the write could change.
export async function snapshotRoles(discordIds: Iterable<string | undefined>) {
    const ids = [...new Set(discordIds)].filter((id): id is string => !!id)
    return computeRoles(ids)
}

// Call after the write. Never rejects: role sync failures are logged rather
// than surfaced to whoever made the change.
export async function applyRoleDelta(before: RoleSnapshot) {
    try {
        const after = await computeRoles([...before.keys()])
        for (const [discordId, prev] of before) {
            const next = after.get(discordId) ?? new Set<string>()
            const added = [...next].filter((role) => !prev.has(role))
            const removed = [...prev].filter((role) => !next.has(role))
            if (added.length > 0 || removed.length > 0) {
                await applyToMember(discordId, added, removed, true)
            }
        }
    } catch (error) {
        console.error('Role sync failed:', error)
    }
}

async function applyToMember(discordId: string, added: string[], removed: string[], notify: boolean) {
    try {
        const member = await fetchGuildMember(discordId, true)
        if (member) {
            await updateMember(member, added, removed, notify)
        }
    } catch (error) {
        logRoleFailure(discordId, error)
    }
}

// Only acts on (and reports) roles whose state actually changes.
async function updateMember(member: GuildMember, added: string[], removed: string[], notify: boolean) {
    const toAdd = added.filter((role) => !member.roles.cache.has(role))
    const toRemove = removed.filter((role) => member.roles.cache.has(role))
    if (toAdd.length > 0) {
        await member.roles.add(toAdd)
    }
    if (toRemove.length > 0) {
        await member.roles.remove(toRemove)
    }
    if (notify && (toAdd.length > 0 || toRemove.length > 0)) {
        await sendRoleChangeDM(member.id, toAdd, toRemove)
    }
    return { added: toAdd.length, removed: toRemove.length }
}

function logRoleFailure(discordId: string, error: unknown) {
    if ((error as DiscordAPIError).code === 50013) { // Missing Permissions
        console.error(`Missing permissions to update roles for ${discordId}; check the bot has Manage Roles and sits above the managed roles.`)
    } else {
        console.error(`Failed to update roles for ${discordId}:`, error)
    }
}

// The player plus every manager of a team they're assigned to.
export async function relatedToPlayer(where: Prisma.PlayerWhereUniqueInput) {
    const player = await prisma.player.findUnique({
        where,
        include: { Assignment: { include: { team: { include: { manager: true } } } } }
    })
    if (!player) {
        return []
    }
    return [player.discord, ...player.Assignment.map((assignment) => assignment.team.manager.discord)]
}

// The manager plus every player assigned to the team(s).
export async function relatedToTeams(where: Prisma.TeamWhereInput) {
    const teams = await prisma.team.findMany({
        where,
        include: { manager: true, Assignment: { include: { player: true } } }
    })
    return teams.flatMap((team) => [
        team.manager.discord,
        ...team.Assignment.map((assignment) => assignment.player.discord)
    ])
}

// Admin repair tool: make every guild member's managed roles (Verified plus
// all division roles) match the database exactly, including stripping them
// from members the app doesn't know about. Silent, so a backfill doesn't DM
// the whole league.
export async function resyncAllRoles() {
    const [divisions, players, managers] = await Promise.all([
        prisma.division.findMany({ select: { player_role: true, manager_role: true } }),
        prisma.player.findMany({ select: { discord: true } }),
        prisma.user.findMany({ where: { Team: { some: {} } }, select: { discord: true } })
    ])
    const configured = new Set([verifiedRoleId, ...divisions.flatMap((division) => [division.player_role, division.manager_role])]
        .filter((role): role is string => !!role))
    // Roles the bot can't assign would fail for every member; skip and report them.
    const managed = new Set([...configured].filter(roleEditable))
    const desired = await snapshotRoles([...players, ...managers].map((row) => row.discord))
    const members = await fetchAllGuildMembers()

    const summary = {
        members: members.length,
        updated: 0,
        rolesAdded: 0,
        rolesRemoved: 0,
        failed: 0,
        skippedRoles: [...configured].filter((role) => !managed.has(role))
    }
    for (const member of members) {
        const want = [...desired.get(member.id) ?? []].filter((role) => managed.has(role))
        const unwanted = [...managed].filter((role) => !want.includes(role))
        try {
            const result = await updateMember(member, want, unwanted, false)
            if (result.added > 0 || result.removed > 0) {
                summary.updated++
                summary.rolesAdded += result.added
                summary.rolesRemoved += result.removed
            }
        } catch (error) {
            summary.failed++
            logRoleFailure(member.id, error)
        }
    }
    return summary
}
