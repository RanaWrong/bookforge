import "server-only";
import crypto from "node:crypto";
import { getDb } from "../lib/db/client";
import { AppError } from "../lib/errors";
import { loadAppConfig } from "../lib/config/env";
import {
  hashPassword,
  verifyPassword,
  hashSessionToken,
  formatHttpOnlySessionCookie,
  parseCookies,
  AuthRateLimiter,
  SESSION_COOKIE_NAME,
  type SessionContext,
} from "./auth";

/**
 * Prisma-backed AuthService — mirrors src/server/auth.ts (Map-backed) but
 * persists User + Session rows to PostgreSQL via the workspace baseline
 * (20261022000000_baseline). Used by /api/auth/* routes.
 *
 * The Map-backed AuthService remains valid for unit tests (createIsolatedRepository).
 * This service is the production path.
 */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class PrismaAuthService {
  private readonly rateLimiter: AuthRateLimiter;

  constructor(rateLimiter = new AuthRateLimiter(5, 60_000)) {
    this.rateLimiter = rateLimiter;
  }

  async register(input: {
    email: string;
    name: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ userId: string; email: string; setCookieHeader: string }> {
    const email = input.email.trim().toLowerCase();
    const rateKey = `reg:${input.ipAddress ?? "local"}:${email}`;
    this.rateLimiter.checkAndRecord(rateKey);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("VALIDATION_ERROR", "Please provide a valid email address.");
    }
    if (input.name.trim().length < 2 || input.name.trim().length > 100) {
      throw new AppError("VALIDATION_ERROR", "Name must be between 2 and 100 characters.");
    }

    const passwordHash = hashPassword(input.password);
    const db = getDb();

    // Create user + workspace + membership atomically so every user owns a workspace
    const workspaceSlug = `ws-${crypto.randomUUID().slice(0, 8)}`;
    let userId: string;
    try {
      const user = await db.user.create({
        data: {
          email,
          name: input.name.trim(),
          passwordHash,
        },
        select: { id: true, email: true },
      });
      userId = user.id;
      const workspace = await db.workspace.create({
        data: { name: `${input.name.trim()}'s Workspace`, slug: workspaceSlug },
        select: { id: true },
      });
      await db.workspaceMember.create({
        data: { workspaceId: workspace.id, userId, role: "OWNER" },
      });
      await db.designProfile.create({
        data: {
          workspaceId: workspace.id,
          name: "Master Book (215 × 275 mm)",
          isPreset: true,
          pageSize: "215x275mm",
          widthMm: 215,
          heightMm: 275,
          mirrorMargins: true,
          marginTopMm: 18,
          marginBottomMm: 20,
          marginInsideMm: 22,
          marginOutsideMm: 16,
          gutterMm: 5,
        },
      });
    } catch (e: unknown) {
      if (e instanceof Error && /Unique constraint|users_email_key/i.test(e.message)) {
        throw new AppError("CONFLICT_ERROR", "An account with this email already exists.", 409);
      }
      throw e;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(rawToken);
    await db.session.create({
      data: {
        userId: userId!,
        tokenHash,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return { userId: userId!, email, setCookieHeader: formatHttpOnlySessionCookie(rawToken) };
  }

  async login(input: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ userId: string; email: string; setCookieHeader: string }> {
    const email = input.email.trim().toLowerCase();
    const rateKey = `login:${input.ipAddress ?? "local"}:${email}`;
    this.rateLimiter.checkAndRecord(rateKey);

    const db = getDb();
    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, passwordHash: true } });
    if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError("AUTHENTICATION_ERROR", "Invalid email or password.", 401);
    }

    this.rateLimiter.reset(rateKey);
    const rawToken = crypto.randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(rawToken),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return { userId: user.id, email: user.email, setCookieHeader: formatHttpOnlySessionCookie(rawToken) };
  }

  async logout(rawToken: string | undefined): Promise<{ setCookieHeader: string }> {
    if (rawToken) {
      const db = getDb();
      await db.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } });
    }
    return { setCookieHeader: formatHttpOnlySessionCookie("", 0) };
  }

  async authenticateRequest(
    headers?: Record<string, string | undefined>,
    env: NodeJS.ProcessEnv = process.env
  ): Promise<SessionContext> {
    const cookies = parseCookies(headers?.cookie);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    if (rawToken) {
      const db = getDb();
      const sess = await db.session.findUnique({
        where: { tokenHash: hashSessionToken(rawToken) },
        select: { expiresAt: true, user: { select: { id: true, email: true, name: true, preferredLocale: true } } },
      });
      if (!sess) throw new AppError("AUTHENTICATION_ERROR", "Session expired or invalid.", 401);
      if (new Date(sess.expiresAt).getTime() <= Date.now()) {
        await db.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } });
        throw new AppError("AUTHENTICATION_ERROR", "Session expired or invalid.", 401);
      }
      return {
        userId: sess.user.id,
        email: sess.user.email,
        name: sess.user.name,
        preferredLocale: (sess.user.preferredLocale === "en" ? "en" : "bn") as "bn" | "en",
        isDevIdentity: false,
      };
    }

    const config = loadAppConfig(env);
    if (config.devIdentityEnabled) {
      // Ensure dev user exists in DB as well (lazy seed)
      const db = getDb();
      const devEmail = "developer@bookforge.local";
      let dev = await db.user.findUnique({ where: { email: devEmail }, select: { id: true } });
      if (!dev) {
        dev = await db.user.create({ data: { email: devEmail, name: "Local developer" }, select: { id: true } });
        const ws = await db.workspace.create({ data: { name: "Local Dev Workspace", slug: `ws-dev-${crypto.randomUUID().slice(0, 6)}` }, select: { id: true } });
        await db.workspaceMember.create({ data: { workspaceId: ws.id, userId: dev.id, role: "OWNER" } });
      }
      return {
        userId: dev.id,
        email: devEmail,
        name: "Local developer",
        preferredLocale: "bn",
        isDevIdentity: true,
      };
    }

    throw new AppError("AUTHENTICATION_ERROR", "Authentication required.", 401);
  }

  /** Resolve workspaceId for a user (first OWNER workspace). Used by book routes. */
  async resolveWorkspaceId(userId: string): Promise<string> {
    const db = getDb();
    const membership = await db.workspaceMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });
    if (!membership) throw new AppError("NOT_FOUND", "No workspace found for user.", 404);
    return membership.workspaceId;
  }
}
