import { PrismaClient } from '@prisma/client';
import { setupSSLCertificates } from './ssl-db-connection';

// Ensure SSL certificates are set up before initializing Prisma
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  setupSSLCertificates();
}

// Global Prisma client singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;