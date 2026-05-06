/**
 * Standard PrismaClient for Better Auth.
 * Better Auth's Prisma adapter requires a non-serverless Prisma client,
 * so we keep a separate instance here alongside the Neon-based one.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaAuthGlobal: PrismaClient | undefined;
}

const prismaAuth: PrismaClient =
  globalThis.prismaAuthGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaAuthGlobal = prismaAuth;
}

export default prismaAuth;
