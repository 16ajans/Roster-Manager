import { Client, EmbedBuilder, Events, GatewayIntentBits, Guild, GuildResolvable, UserResolvable } from 'discord.js'
import 'dotenv/config'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
let guild: Guild

client.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`)
    guild = client.guilds.resolve(process.env.GUILD_ID as GuildResolvable) as Guild
    fetchUser('144973321749004289').then(user => {
        user.send(`Roster Bot up @ ${(new Date).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}!`)
    })
})

export function fetchMemberRoles (userSnowflake: UserResolvable) {
    fetchGuildMember(userSnowflake).then((member) => {
        return member.roles
    })
}

export function fetchGuildMember (userSnowflake: UserResolvable) {
    return guild.members.fetch(userSnowflake)
}

export function fetchUser (userSnowflake: UserResolvable) {
    return client.users.fetch(userSnowflake)
}

export async function sendDM (userSnowflake: UserResolvable, playerSnowflake: UserResolvable, accepted: boolean, adminSnowflake?: UserResolvable, reason?: string) {
    return client.users.send(userSnowflake, { embeds: [await buildVerifNotifEmbed(playerSnowflake, accepted, adminSnowflake, reason)] })
}

client.login(process.env.DISCORD_BOT_TOKEN)

async function buildVerifNotifEmbed(playerSnowflake: UserResolvable, accepted: boolean, adminSnowflake?: UserResolvable, reason?: string) {
    const embed = new EmbedBuilder()
        .setColor(0x703893)
        .setAuthor({ name: "CVRE Roster Integration", url: "https://cvre.app/", iconURL: "https://cvre.app/images/CVRE.png"})
        .setFooter({ text: "This is an automated message. Do not reply."})
    const player = await fetchGuildMember(playerSnowflake)
    if (accepted) {
        embed.setTitle(`${player.displayName}'s verification has been approved!`)
    } else {
        const admin = await fetchGuildMember(adminSnowflake ? adminSnowflake : "144973321749004289")
        embed
            .setTitle(`${player.displayName}'s verification has been rejected.`)
            .setDescription(`Please contact ${admin.displayName} (<@${adminSnowflake}>) or another CVRE admin for further information.`)
        if (reason) {
            embed.addFields({ name: "Reason:", value: reason })
        }
    }
    return embed.setTimestamp()
}