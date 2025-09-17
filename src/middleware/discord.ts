import express from "express";
import { fetchGuildMember, searchUniqueGuildMember } from "../drivers/bot";
import { noUpload } from "../drivers/fs";
import { Player, User } from "@prisma/client";
import { GuildMember } from "discord.js";
import { prisma } from "../drivers/db";

export const router = express.Router()

router.post('/member/search', noUpload, async (req, res) => {
    if (!req.body.discordSearch || (req.body.discordSearch as string).length < 1) {
        res.send()
        return
    }
    const member = await searchUniqueGuildMember(req.body.discordSearch)
    if (member) {
        const player = await prisma.player.findUnique({
            where: {
                discord: member?.id
            }
        })
        let registered = false
        if (player) {
            registered = true
        }
        res.render('fragments/discord-member', {
            member,
            registered
        })
    } else {
        res.send('<p>Not Found.</p>')
    }
})

interface HydratedUser extends Omit<User, 'discord'> {
    discord: string | GuildMember
}

interface HydratedPlayer extends Omit<Player, 'discord'> {
    discord: string | GuildMember
}


export const hydrateOne = async function (one: HydratedPlayer | HydratedUser) {
    one.discord = await fetchGuildMember(one.discord) ?? one.discord
    return one
}

export const hydrateMany = async function (many: HydratedPlayer[] | HydratedUser[]) {
    return await Promise.all(many.map(one => hydrateOne(one)))
} 