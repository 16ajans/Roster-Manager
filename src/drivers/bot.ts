import { Client, Events, GatewayIntentBits, Guild, GuildResolvable, UserResolvable } from 'discord.js'
import 'dotenv/config'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
let guild: Guild

client.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`)
    guild = client.guilds.resolve(process.env.GUILD_ID as GuildResolvable) as Guild
    fetchUser('144973321749004289').then(user => {
        user.send(`Roster Bot up @ ${(new Date).toISOString()}!`)
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

client.login(process.env.DISCORD_BOT_TOKEN)