import express from "express";
import { userAuth } from "../auth";
import { fetchGuildMember, fetchUser, searchUniqueGuildMember } from "../../drivers/bot"
import { noUpload } from "../../drivers/filesystem";

export const router = express.Router()

router.get('/member/:snowflake', userAuth, async (req, res) => {
    const user = fetchUser(req.params.snowflake)
    const member = fetchGuildMember(req.params.snowflake)
    Promise.all([user, member]).then(results => {
        res.render('components/discord-member', {
            user: results[0],
            member: results[1]
        })
    })
})

router.post('/member/search', userAuth, noUpload, async (req, res) => {
    if (!req.body.discordDisplay || (req.body.discordDisplay as string).length < 1) {
        res.send()
        return
    }
    const member = await searchUniqueGuildMember(req.body.discordDisplay)
    if (member) {
        const user = member.user
        res.render('components/discord-member', {
            user,
            member,
            input: true
        })
    } else {
        res.send('<span>Not Found.</span>')
    }
})