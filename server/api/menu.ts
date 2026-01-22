import { prisma } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
    return await prisma.menu.findMany()
})