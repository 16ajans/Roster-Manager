import { PrismaClient, User } from '@prisma/client'
import { PrismaSessionStore } from '@quixo3/prisma-session-store';

export const prisma = new PrismaClient()

export const prismaSession = new PrismaSessionStore(
    prisma,
    {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
    }
)

interface SessionUser extends User {
    admin?: boolean
}

// Augment express-session with a custom SessionData object
declare module "express-session" {
    interface SessionData {
        user: SessionUser
    }
}

// async function main() {
//   // ... you will write your Prisma Client queries here
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect()
//   })
//   .catch(async (e) => {
//     console.error(e)
//     await prisma.$disconnect()
//     process.exit(1)
//   })