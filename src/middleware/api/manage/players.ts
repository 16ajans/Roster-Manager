import express, { NextFunction, Request, Response } from 'express'
import { userAuth } from '../../auth'
import { prisma } from '../../../drivers/db'
import { noUpload } from '../../../drivers/filesystem'
import { State, Team } from '@prisma/client'

export const router = express.Router()

const getTeams = async function (req: Request, res: Response, next: NextFunction) {
    const teams = await prisma.team.findMany({ // TODO: include assignment & player info
        where: {
                managerId: req.session.user?.id
        },
        include: {
            Assignment: {
                include: {
                    player: true
                }
            }
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
    .get('/', userAuth, getTeams)
    .post('/', userAuth, noUpload, async (req, res, next) => {
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
    .put('/:teamID', userAuth, noUpload, async (req, res, next) => {
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
    .delete('/:teamID', userAuth, async (req, res) => {
        await prisma.team.delete({
            where: {
                id: req.params.teamID,
                managerId: req.session.user?.id
            }
        })
        res.send("<p>Team deleted.</p>")
    })


    .get('/register', userAuth, async (req, res) => {
        const divisions = await prisma.division.findMany()
        res.render('components/manage/teams-register', {
            divisions
        })
    })
    .get('/:teamID', userAuth, async (req, res) => {
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
    .get('/:teamID/assignments', userAuth, async (req, res) => {
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
    .post('/:teamID/assignments', userAuth, noUpload, async (req, res, next) => {
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
    .delete('/:teamID/assignments/:assignmentID', userAuth, async (req, res, next) => {
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
