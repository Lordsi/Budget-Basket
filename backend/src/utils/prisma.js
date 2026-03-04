const { PrismaClient } = require("@prisma/client");

/**
 * Singleton Prisma client — prevents multiple instances during hot-reload
 * in development and keeps a single connection pool in production.
 */
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
