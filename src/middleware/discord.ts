import express from "express";
import { fetchGuildMember, searchUniqueGuildMember } from "../drivers/bot";
import { noUpload } from "../drivers/fs";
import { Player } from "@prisma/client";
import { GuildMember } from "discord.js";

export const router = express.Router()

router.post('/member/search', noUpload, async (req, res) => {
    if (!req.body.discordSearch || (req.body.discordSearch as string).length < 1) {
        res.send()
        return
    }
    const member = await searchUniqueGuildMember(req.body.discordSearch)
    if (member) {
        res.render('fragments/discord-member', {
            member,
            input: true
        })
    } else {
        res.send('<p>Not Found.</p>')
    }
})

interface HydratedPlayer extends Omit<Player, 'discord'> {
    discord: string | GuildMember
}

export const hydratePlayer = async function (player: HydratedPlayer) {
    player.discord = await fetchGuildMember(player.discord)
    return player
}

export const hydratePlayers = async function (players: HydratedPlayer[]) {
    return await Promise.all(players.map(player => hydratePlayer(player)))
} 