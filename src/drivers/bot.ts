import { Client, DiscordAPIError, EmbedBuilder, Events, GatewayIntentBits, Guild, GuildMember, GuildResolvable, UserResolvable } from 'discord.js'
import { prisma } from './db'
import { APP_URL, BRAND_COLOR, DM_EMBED_AUTHOR, FALLBACK_ADMIN_SNOWFLAKE } from '../constants'

export enum ChangeAction {
    CREATE,
    DELETE,
    REJECT
}

export const client = new Client({ intents: [GatewayIntentBits.Guilds] })
let guild: Guild

client.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`)
    guild = client.guilds.resolve(process.env.GUILD_ID as GuildResolvable) as Guild
    fetchUser(FALLBACK_ADMIN_SNOWFLAKE).then(user => {
        if (user) {
            user.send(`Roster Bot up @ ${(new Date).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}!`)
        }
    })
})

export async function fetchGuildMember(userSnowflake: UserResolvable, force = false) {
    try {
        // Without the GuildMembers intent the member cache never sees role
        // updates, so callers that diff roles pass force to hit the API.
        return await guild.members.fetch({ user: userSnowflake, force });
    } catch (error) {
        if ((error as DiscordAPIError).code === 10007) { // Unknown Member
            return null;
        }
        throw error; // Re-throw unexpected errors
    }
}

// Every member of the guild, with current roles. Listing members requires the
// Server Members Intent to be enabled for the bot in the Developer Portal.
export async function fetchAllGuildMembers() {
    const members: GuildMember[] = []
    let after: string | undefined
    for (;;) {
        const page = await guild.members.list({ limit: 1000, after, cache: false })
        members.push(...page.values())
        if (page.size < 1000) {
            return members
        }
        after = page.lastKey()
    }
}

export async function fetchUser(userSnowflake: UserResolvable) {
    try {
        return await client.users.fetch(userSnowflake);
    } catch (error) {
        if ((error as DiscordAPIError).code === 10013) { // Unknown User
            return null;
        }
        throw error;
    }
}

// DMs are best-effort: closed DMs or departed members shouldn't surface as
// unhandled rejections in the routes that fire these off.
function logDMFailure(error: unknown) {
    console.error('Failed to send DM:', error)
}

export async function sendVerifDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, accepted: boolean, adminSnowflake?: UserResolvable, reason?: string) {
    return buildVerifNotifEmbed(playerSnowflake, accepted, adminSnowflake, reason)
        .then((embed) => client.users.send(userSnowflake, { embeds: [embed] }))
        .catch(logDMFailure)
}

export async function sendPlayerChangeDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, actorSnowflake: UserResolvable, change: ChangeAction) {
    return buildPlayerChangeNotifEmbed(playerSnowflake, actorSnowflake, change)
        .then((embed) => client.users.send(userSnowflake, { embeds: [embed] }))
        .catch(logDMFailure)
}

export async function sendAssignmentChangeDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, actorSnowflake: UserResolvable, teamId: string, change: ChangeAction) {
    return buildAssignmentChangeNotifEmbed(playerSnowflake, actorSnowflake, teamId, change)
        .then((embed) => client.users.send(userSnowflake, { embeds: [embed] }))
        .catch(logDMFailure)
}

export async function sendJoinRequestDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, teamId: string) {
    return buildJoinRequestEmbed(playerSnowflake, teamId)
        .then((embed) => client.users.send(userSnowflake, { embeds: [embed] }))
        .catch(logDMFailure)
}

export async function sendRoleChangeDM(userSnowflake: UserResolvable, added: string[], removed: string[]) {
    return client.users.send(userSnowflake, { embeds: [buildRoleChangeEmbed(added, removed)] })
        .catch(logDMFailure)
}

// Guild roles an admin could pick for a division, highest first. `editable`
// is false when the bot can't assign the role (above its own, or no Manage
// Roles permission).
export function listGuildRoles() {
    return guild.roles.cache
        .filter((role) => role.id !== guild.id && !role.managed)
        .sort((a, b) => b.position - a.position)
        .map((role) => ({ id: role.id, name: role.name, editable: role.editable }))
}

export function roleEditable(roleId: string) {
    return guild.roles.cache.get(roleId)?.editable ?? false
}

export function roleName(roleId: string) {
    return guild.roles.cache.get(roleId)?.name ?? `Unknown role (${roleId})`
}

export async function searchUniqueGuildMember(query: string) {
    return (await guild.members.search({ query, limit: 1 })).first()
}

client.login(process.env.DISCORD_BOT_TOKEN)

async function buildVerifNotifEmbed(playerSnowflake: UserResolvable, accepted: boolean, adminSnowflake?: UserResolvable, reason?: string) {
    const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor(DM_EMBED_AUTHOR)
        .setFooter({ text: "This is an automated message. Do not reply." })
    const player = await fetchGuildMember(playerSnowflake)
    if (!player) {
        throw new Error('Player not found');
    }
    if (accepted) {
        embed.setTitle(`${player.displayName}'s verification has been approved!`)
    } else {
        const admin = await fetchGuildMember(adminSnowflake ? adminSnowflake : FALLBACK_ADMIN_SNOWFLAKE)
        if (!admin) {
            throw new Error('Admin not found');
        }
        embed
            .setTitle(`${player.displayName}'s verification has been rejected.`)
            .setDescription(`Please contact ${admin.displayName} (<@${adminSnowflake}>) or another CVRE Admin for further information.`)
        if (reason) {
            embed.addFields({ name: "Reason:", value: reason })
        }
    }
    return embed.setTimestamp()
}

async function buildPlayerChangeNotifEmbed(playerSnowflake: UserResolvable, actorSnowflake: UserResolvable, change: ChangeAction) {
    const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor(DM_EMBED_AUTHOR)
        .setFooter({ text: "This is an automated message. Do not reply." })
    embed.setDescription(`Please reach out to your captain/manager or a CVRE admin if you did not expect to receive this message.`)
    const player = await fetchGuildMember(playerSnowflake)
    if (!player) {
        throw new Error('Player not found');
    }
    if (change === ChangeAction.CREATE) {
        embed.setTitle(`${player.displayName} is now registered!`)
            .addFields({ name: "Registered by:", value: `<@${actorSnowflake}>` })
    } else {
        embed.setTitle(`${player.displayName}'s registration has been deleted.`)
            .addFields({ name: "Deleted by:", value: `<@${actorSnowflake}>` })
    }
    return embed.setTimestamp()
}

async function buildAssignmentChangeNotifEmbed(playerSnowflake: UserResolvable, actorSnowflake: UserResolvable, teamId: string, change: ChangeAction) {
    const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor(DM_EMBED_AUTHOR)
        .setFooter({ text: "This is an automated message. Do not reply." })
    embed.setDescription(`Please reach out to your captain/manager or a CVRE admin if you did not expect to receive this message.`)
    const player = await fetchGuildMember(playerSnowflake)
    const team = await prisma.team.findUnique({
        where: {
            id: teamId
        },
        include: {
            manager: true
        }
    })
    if (!player) {
        throw new Error('Player not found');
    }
    if (change === ChangeAction.CREATE) {
        embed.setTitle(`${player.displayName} is now a member of ${team?.name}!`)
            .addFields({ name: 'Team Manager:', value: `<@${team?.manager.discord}>` })
    } else if (change == ChangeAction.REJECT) {
        embed.setTitle(`${player.displayName}, your request to join ${team?.name} was not accepted.`)
            .addFields({ name: 'Team Manager:', value: `<@${team?.manager.discord}>` })
    } else {
        embed.setTitle(`${player.displayName} has been removed from ${team?.name}.`)
            .addFields({ name: 'Team Manager:', value: `<@${team?.manager.discord}>` })
        if (team?.manager.discord != actorSnowflake) {
            embed.addFields({ name: 'Removed by:', value: `<@${actorSnowflake}>` })
        }
    }

    return embed.setTimestamp()
}

async function buildJoinRequestEmbed(playerSnowflake: UserResolvable, teamId: string) {
    const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor(DM_EMBED_AUTHOR)
        .setFooter({ text: "This is an automated message. Do not reply." })
    const player = await fetchGuildMember(playerSnowflake)
    const team = await prisma.team.findUnique({
        where: {
            id: teamId
        },
        include: {
            manager: true
        }
    })
    if (!player) {
        throw new Error('Player not found');
    }
    embed.setTitle(`${player.displayName} has requested to join ${team?.name}!`)
        .setDescription(`Please visit ${APP_URL} to approve or reject their request.`)
    return embed.setTimestamp()
}

function buildRoleChangeEmbed(added: string[], removed: string[]) {
    // Role mentions render as @unknown-role outside the guild, so DMs use
    // plain role names.
    const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor(DM_EMBED_AUTHOR)
        .setFooter({ text: "This is an automated message. Do not reply." })
        .setTitle('Your CVRE Discord roles have been updated.')
        .setDescription('Roles follow your verification and team status. Please reach out to your captain/manager or a CVRE admin if you did not expect to receive this message.')
    if (added.length > 0) {
        embed.addFields({ name: 'Added:', value: added.map(roleName).join('\n') })
    }
    if (removed.length > 0) {
        embed.addFields({ name: 'Removed:', value: removed.map(roleName).join('\n') })
    }
    return embed.setTimestamp()
}
