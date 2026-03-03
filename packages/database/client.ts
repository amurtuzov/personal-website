import { PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export let prisma: PrismaClient;

export function createPrismaClient(): PrismaClient {
  if (!prisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const prismaClient = createPrismaClient();