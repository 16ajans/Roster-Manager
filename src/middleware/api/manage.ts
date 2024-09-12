import express, { NextFunction, Request, Response } from 'express'
import { userAuth } from '../auth'
import { prisma } from '../../drivers/db'
import { noUpload, verifUpload } from '../../drivers/filesystem'
import { Player, State, Team } from '@prisma/client'
import { fetchGuildMember, fetchUser } from '../../drivers/bot'

export const router = express.Router()

const getPlayers = async function (req: Request, res: Response, next: NextFunction) {
    const players = await prisma.player.findMany({
        where: {
            managerId: req.session.user?.id,
            NOT: {
                discord: req.session.user?.discord
            }
        }
    })
    if (players.length === 0) {
        res.render('components/manage/players-empty')
    } else {
        res.render('components/manage/players-list', {
            players
        })
    }
    next()
}

router
    .get('/players', userAuth, getPlayers)
    .post('/players', userAuth, verifUpload.single('verification'), async (req, res, next) => {
            let state: State = State.AWAITING
            let doc: string | undefined = undefined
            if (req.file) {
                state = State.REVIEW
                doc = req.file.filename
            }
            await prisma.player.create({
                data: {
                    name: req.body.name as string,
                    school: req.body.school as string,
                    discord: req.body.discord as string,
                    manager: {
                        connect: {
                            id: req.session.user?.id
                        }
                    },
                    doc,
                    status: state
                }
            })
            next()
        }, getPlayers)
    .put('/players/:playerID', userAuth, verifUpload.single('verification'), async (req, res, next) => {
        const player = await prisma.player.findUnique({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
            }
        }) as Player
        const data: {
            name?: string;
            school?: string;
            doc?: string;
            status?: State;
        } = {}
        if (player.name != req.body.name) {
            data.name = req.body.name
        }
        if (player.school != req.body.school) {
            data.school = req.body.school
        }
        if (Object.keys(data).length > 0) {
            data.status = State.AWAITING
        }
        if (req.file) {
            data.doc = req.file.filename
            data.status = State.REVIEW
        }
        await prisma.player.update({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
            },
            data
        })
        next()
    }, getPlayers)
    .delete('/players/:playerID', userAuth, async (req, res) => {
        await prisma.player.delete({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
            }
        })
        res.send("<p>Player registration deleted.</p>")
    })

    .get('/players/register', userAuth, async (req, res) => {
        res.render('components/manage/players-register')
    })
    .get('/players/:playerID', userAuth, async (req, res) => {
        const player = await prisma.player.findUnique({
            where: {
                id: req.params.playerID,
                managerId: req.session.user?.id
            }
        }) as Player
        const user = fetchUser(player.discord)
        const member = fetchGuildMember(player.discord)
        Promise.all([user, member]).then(results => {
            res.render('components/manage/players-register', {
                player,
                user: results[0],
                member: results[1]
            })
        })
    })


const getTeams = async function (req: Request, res: Response, next: NextFunction) {
    const teams = await prisma.team.findMany({ // TODO: include assignment & player info
        where: {
                managerId: req.session.user?.id
            }
    })
    if (teams.length === 0) {
        res.render('components/manage/teams-empty')
    } else {
        res.render('components/manage/teams-list', {
            teams
        })
    }
    next()
}

router
    .get('/teams', userAuth, getTeams)
    .post('/teams', userAuth, noUpload, async (req, res, next) => {
        console.log(req.body)
        await prisma.team.create({
            data : {
                name: req.body.name as string,
                locale: req.body.locale as string,
                division: {
                    connect: {
                        id: req.body.divisionId
                    }
                },
                manager: {
                    connect: {
                        id: req.session.user?.id
                    }
                }
            }
        })
        next()
    }, getTeams)
    .put('/teams/:teamID', userAuth, noUpload, async (req, res, next) => {
        const team = await prisma.team.findUnique({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            }
        }) as Team
        const data: {
            name?: string;
            locale?: string;
            division?: { connect: { id: string; }; };
        } = {}
        if (team.name != req.body.name) {
            data.name = req.body.name
        }
        if (team.locale != req.body.locale) {
            data.locale = req.body.locale
        }
        if (team.divisionId != req.body.divisionId) {
            data.division = {
                connect: {
                    id: req.body.divisionId
                }
            }
        }
        await prisma.team.update({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            },
            data
        })
        next()
    }, getTeams)
    .delete('/teams/:teamID', userAuth, async (req, res) => {
        await prisma.team.delete({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            }
        })
        res.send("<p>Team deleted.</p>")
    })


    .get('/teams/register', userAuth, async (req, res) => {
        const divisions = await prisma.division.findMany()
        res.render('components/manage/teams-register', {
            divisions
        })
    })
    .get('/teams/:teamID', userAuth, async (req, res) => {
        const divisions = prisma.division.findMany()
        const team = prisma.team.findUnique({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            }
        })
        Promise.all([divisions, team]).then(results => {
            res.render('components/manage/teams-register', {
                divisions: results[0],
                team: results[1]
            })
        })
    })

router
    .get('/teams/:teamID/assignments', userAuth, async (req, res) => {
        const players = await prisma.player.findMany({
            where: {
                managerId: req.session.user?.id,
                Assignment: {
                    none: {
                        teamId: req.params.teamID
                    }
                }
            }
        })
        res.render('components/manage/teams-assign', {
            teamID: req.params.teamID,
            players
        })
    })
    .post('/teams/:teamID/assignments', userAuth, noUpload, async (req, res, next) => {
        const player = await prisma.player.findUnique({
            where: {
                id: req.body.playerID,
                managerId: req.session.user?.id
            }
        })
        const team = await prisma.team.findUnique({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            }
        })
        if (!player || !team) {
            res.sendStatus(403)
            return
        }

        const data: {
            player: {
                connect: {
                    id: string
                }
            },
            team: {
                connect: {
                    id: string
                }
            },
            alt_tag?: string,
            scoresaber?: string,
            status: State
        } = {
            player: {
                connect: {
                    id: req.body.playerID as string
                }
            },
            team: {
                connect: {
                    id: req.params.teamID as string
                }
            },
            status: State.ACCEPTED // short circuit for manager-only assignments. implement later for join requests
        }
        if (req.body.alt_tag) {
            data.alt_tag = req.body.alt_tag
        }
        if (req.body.scoresaber) {
            data.scoresaber = req.body.scoresaber
        }
        await prisma.assignment.create({
            data
        })
        next()
    }, getTeams)
    .delete('/teams/:teamID/assignments/:assignmentID', userAuth, async (req, res, next) => {
        const team = await prisma.team.findUnique({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            }
        })
        if (!team) {
            res.sendStatus(403)
            return
        }

        await prisma.assignment.delete({
            where: {
                id: req.params.assignmentID
            }
        })
        next()
    }, getTeams)
