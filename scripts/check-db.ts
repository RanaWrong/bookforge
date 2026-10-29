import { loadAppConfig } from "../src/lib/config/env.ts";
import { getRepository } from "../src/server/db.ts";

async function main(): Promise<void> {
  const config = loadAppConfig();
  const repo = getRepository();
  const health = await repo.ping();
  console.log(
    JSON.stringify(
      {
        app: config.appName,
        nodeEnv: config.nodeEnv,
        storageMode: health.mode,
        ok: health.ok,
        checkedAt: health.checkedAt,
      },
      null,
      2
    )
  );
  if (!health.ok) {
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error("Database check failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
