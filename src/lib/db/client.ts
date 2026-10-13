import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  bookforgePrisma?: PrismaClient;
};

// Lazy initialization allows static builds without database credentials.
export function getDb(): PrismaClient {
  if (globalForPrisma.bookforgePrisma) return globalForPrisma.bookforgePrisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for database operations.");
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  const client = new PrismaClient({ adapter });
  globalForPrisma.bookforgePrisma = client;
  return client;
}
