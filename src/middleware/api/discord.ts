import express from "express";
import { userAuth } from "../auth";
import { fetchGuildMember, fetchUser } from "../../drivers/bot"

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