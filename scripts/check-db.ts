import "dotenv/config";
import { getDb } from "../src/lib/db/client";

async function main() {
  const db = getDb();
  try {
    await db.$queryRaw`SELECT 1`;
    console.log("Database connection successful (read-only SELECT 1).");
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  // Driver errors can contain credentials or infrastructure details.
  console.error("Database check failed. Check DATABASE_URL, service health, credentials, and TLS settings.");
  process.exitCode = 1;
});
