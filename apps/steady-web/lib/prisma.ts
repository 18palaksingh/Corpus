import 'server-only';

import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per process.
 *
 * Next's dev server reloads modules on every edit, and a fresh client per
 * reload exhausts the connection pool within a few minutes, so the instance is
 * parked on `globalThis` in development. In production the module is evaluated
 * once and the global is never touched.
 */
const globalForPrisma = globalThis as unknown as { steadyPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.steadyPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.steadyPrisma = prisma;
}
