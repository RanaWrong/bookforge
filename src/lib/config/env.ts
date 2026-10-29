import type { Locale } from "../i18n/messages.ts";

export interface AppConfig {
  appName: string;
  defaultLocale: Locale;
  nodeEnv: "development" | "production" | "test";
  devIdentityEnabled: boolean;
  databaseUrl: string | undefined;
  sessionSecret: string;
  maxExportConcurrency: number;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawLocale = env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "bn";
  const defaultLocale: Locale = rawLocale === "en" ? "en" : "bn";

  const rawNodeEnv = env.NODE_ENV ?? "development";
  const nodeEnv: "development" | "production" | "test" =
    rawNodeEnv === "production" || rawNodeEnv === "test" ? rawNodeEnv : "development";

  // Hard security rule: Never enable development identity shortcut in production
  const devIdentityFlag = env.BOOKFORGE_DEV_IDENTITY === "true";
  const devIdentityEnabled = nodeEnv !== "production" && devIdentityFlag;

  const sessionSecret =
    env.SESSION_SECRET?.trim() ||
    (nodeEnv === "production"
      ? ""
      : "dev-only-ephemeral-session-secret-do-not-use-in-prod-32bytes");

  if (nodeEnv === "production" && sessionSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET environment variable must be at least 32 characters in production."
    );
  }

  return {
    appName: env.NEXT_PUBLIC_APP_NAME?.trim() || "BookForge",
    defaultLocale,
    nodeEnv,
    devIdentityEnabled,
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    sessionSecret,
    maxExportConcurrency: Math.max(1, Number(env.MAX_EXPORT_CONCURRENCY ?? 2)),
  };
}
