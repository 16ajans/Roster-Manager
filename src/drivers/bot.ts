import { Client, EmbedBuilder, Events, GatewayIntentBits, Guild, GuildResolvable, UserResolvable } from 'discord.js'
import { prisma } from './db'

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
    fetchUser('144973321749004289').then(user => {
        user.send(`Roster Bot up @ ${(new Date).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}!`)
    })
})

export function fetchMemberRoles(userSnowflake: UserResolvable) {
    fetchGuildMember(userSnowflake).then((member) => {
        return member.roles
    })
}

export function fetchGuildMember(userSnowflake: UserResolvable) {
    return guild.members.fetch(userSnowflake)
}

export function fetchUser(userSnowflake: UserResolvable) {
    return client.users.fetch(userSnowflake)
}

export async function sendVerifDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, accepted: boolean, adminSnowflake?: UserResolvable, reason?: string) {
    return client.users.send(userSnowflake, { embeds: [await buildVerifNotifEmbed(playerSnowflake, accepted, adminSnowflake, reason)] })
}

export async function sendPlayerChangeDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, actorSnowflake: UserResolvable, change: ChangeAction) {
    return client.users.send(userSnowflake, { embeds: [await buildPlayerChangeNotifEmbed(playerSnowflake, actorSnowflake, change)] })
}

export async function sendAssignmentChangeDM(userSnowflake: UserResolvable, playerSnowflake: UserResolvable, actorSnowflake: UserResolvable, teamId: string, change: ChangeAction) {
    return client.users.send(userSnowflake, { embeds: [await buildAssignmentChangeNotifEmbed(playerSnowflake, actorSnowflake, teamId, change)] })
}

export async function searchUniqueGuildMember(query: string) {
    return (await guild.members.search({ query, limit: 1 })).first()
}

client.login(process.env.DISCORD_BOT_TOKEN)

async function buildVerifNotifEmbed(playerSnowflake: UserResolvable, accepted: boolean, adminSnowflake?: UserResolvable, reason?: string) {
    const embed = new EmbedBuilder()
        .setColor(0x703893)
        .setAuthor({ name: "CVRE Roster Integration", url: "https://cvre.app/", iconURL: "https://cvre.app/images/CVRE.png" })
        .setFooter({ text: "This is an automated message. Do not reply." })
    const player = await fetchGuildMember(playerSnowflake)
    if (accepted) {
        embed.setTitle(`${player.displayName}'s verification has been approved!`)
    } else {
        const admin = await fetchGuildMember(adminSnowflake ? adminSnowflake : "144973321749004289")
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
        .setColor(0x703893)
        .setAuthor({ name: "CVRE Roster Integration", url: "https://cvre.app/", iconURL: "https://cvre.app/images/CVRE.png" })
        .setFooter({ text: "This is an automated message. Do not reply." })
    embed.setDescription(`Please reach out to your captain/manager or a CVRE admin if you did not expect to receive this message.`)
    const player = await fetchGuildMember(playerSnowflake)
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
        .setColor(0x703893)
        .setAuthor({ name: "CVRE Roster Integration", url: "https://cvre.app/", iconURL: "https://cvre.app/images/CVRE.png" })
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