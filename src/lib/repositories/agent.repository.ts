import { prisma } from '@/lib/prisma'

export const AgentRepository = {
    findByUserId: (userId: string) =>
        prisma.agent.findUnique({ where: { userId } }),

    create: (data: { userId: string; name: string }) =>
        prisma.agent.create({ data }),

    setActive: (id: string, isActive: boolean) =>
        prisma.agent.update({ where: { id }, data: { isActive } }),

    updateStatus: (id: string, data: Partial<{
        isActive: boolean
        waConnected: boolean
        waNumber: string
    }>) => prisma.agent.update({ where: { id }, data }),

    setContainerId: (id: string, containerId: string | null) =>
        prisma.agent.update({ where: { id }, data: { containerId } }),

    delete: (id: string) =>
        prisma.agent.delete({ where: { id } }),
}