import { prisma } from '@/lib/prisma'

export const BillingRepository = {
  findByUserId: (userId: string) =>
    prisma.billingRecord.findUnique({ where: { userId } }),

  findByCustomerId: (stripeCustomerId: string) =>
    prisma.billingRecord.findUnique({ where: { stripeCustomerId } }),

  create: (data: {
    userId: string
    stripeCustomerId: string
  }) => prisma.billingRecord.create({ data }),

  update: (userId: string, data: {
    stripeSubscriptionId?: string
    cardLast4?: string
    cardBrand?: string
    trialEndsAt?: Date
    status?: 'PENDING' | 'TRIAL' | 'ACTIVE' | 'CANCELLED'
  }) => prisma.billingRecord.update({ where: { userId }, data }),
}
