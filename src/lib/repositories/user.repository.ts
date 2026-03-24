import { prisma } from "../prisma";

export const UserRepository = {
  /**
   * Upserts a user in the database based on their Clerk profile.
   */
  upsertUser: async (clerkId: string, email: string, name: string | null) => {
    return prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        name,
      },
      create: {
        clerkId,
        email,
        name,
      },
    });
  },

  /**
   * Fetches a user by their internal UUID.
   */
  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  /**
   * Fetches a user by their Clerk ID.
   */
  findByClerkId: (clerkId: string) =>
    prisma.user.findUnique({ 
      where: { clerkId },
      include: {
        agents: true,
      }
    }),
};
