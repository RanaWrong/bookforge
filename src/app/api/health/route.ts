import fs from "node:fs";
import { NextResponse } from "next/server";
import { loadAppConfig } from "@/lib/config/env";
import { getRepository } from "@/server/db";

export async function GET() {
  const config = loadAppConfig();
  const repo = getRepository();
  const dbStatus = await repo.ping();
  const mem = process.memoryUsage();

  let diskFreeMb: number | null = null;
  try {
    const stat = fs.statfsSync(process.cwd());
    diskFreeMb = Math.round((stat.bavail * stat.bsize) / (1024 * 1024));
  } catch {
    diskFreeMb = null;
  }

  return NextResponse.json(
    {
      status: dbStatus.ok ? "healthy" : "degraded",
      app: config.appName,
      environment: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      database: dbStatus,
      resources: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        diskFreeMb,
      },
      metrics: repo.metrics,
    },
    { status: dbStatus.ok ? 200 : 503 }
  );
}
