import crypto from "node:crypto";
import { AppError } from "../lib/errors.ts";
import { logger } from "../lib/logger.ts";
import { loadAppConfig } from "../lib/config/env.ts";
import { getRepository, type BookForgeRepository, type UserRecord } from "./db.ts";

export const SESSION_COOKIE_NAME = "bf_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionContext {
  userId: string;
  email: string;
  name: string;
  preferredLocale: "bn" | "en";
  isDevIdentity: boolean;
}

/**
 * Password hashing using Node's native cryptographic `scryptSync` with 16-byte random salt
 * and timing-safe verification (`crypto.timingSafeEqual`).
 */
export function hashPassword(plainPassword: string): string {
  if (plainPassword.length < 8 || plainPassword.length > 128) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Password must be between 8 and 128 characters."
    );
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedBuffer = crypto.scryptSync(plainPassword, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function formatHttpOnlySessionCookie(
  rawToken: string,
  maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000),
  isProduction = process.env.NODE_ENV === "production"
): string {
  const flags = [
    `${SESSION_COOKIE_NAME}=${rawToken}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProduction) {
    flags.push("Secure");
  }
  return flags.join("; ");
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = v;
    }
  }
  return out;
}

/**
 * Sliding-window Rate Limiter for authentication endpoints (prevents brute-force attacks).
 */
export class AuthRateLimiter {
  private attempts = new Map<string, number[]>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60_000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  public checkAndRecord(key: string): void {
    const now = Date.now();
    const history = (this.attempts.get(key) ?? []).filter(
      (ts) => now - ts < this.windowMs
    );
    if (history.length >= this.maxAttempts) {
      logger.warn("auth.rate_limit_exceeded", { key });
      throw new AppError(
        "RATE_LIMIT_EXCEEDED",
        "Too many authentication attempts. Please try again later.",
        429
      );
    }
    history.push(now);
    this.attempts.set(key, history);
  }

  public reset(key: string): void {
    this.attempts.delete(key);
  }
}

export class AuthService {
  private readonly repo: BookForgeRepository;
  private readonly rateLimiter: AuthRateLimiter;

  constructor(
    repo: BookForgeRepository = getRepository(),
    rateLimiter = new AuthRateLimiter(5, 60_000)
  ) {
    this.repo = repo;
    this.rateLimiter = rateLimiter;
  }

  public register(input: {
    email: string;
    name: string;
    password: string;
    ipAddress?: string;
  }): { user: UserRecord; sessionToken: string; setCookieHeader: string } {
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
    const user = this.repo.createUser({
      email,
      name: input.name.trim(),
      passwordHash,
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    this.repo.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(rawToken),
      ipAddress: input.ipAddress ?? null,
    });

    logger.info("auth.user_registered", { userId: user.id, email: user.email });
    return {
      user,
      sessionToken: rawToken,
      setCookieHeader: formatHttpOnlySessionCookie(rawToken),
    };
  }

  public login(input: {
    email: string;
    password: string;
    ipAddress?: string;
  }): { user: UserRecord; sessionToken: string; setCookieHeader: string } {
    const email = input.email.trim().toLowerCase();
    const rateKey = `login:${input.ipAddress ?? "local"}:${email}`;
    this.rateLimiter.checkAndRecord(rateKey);

    const user = this.repo.getUserByEmail(email);
    // Generic error message to prevent account enumeration
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      logger.warn("auth.login_failed", { email });
      throw new AppError("AUTHENTICATION_ERROR", "Invalid email or password.", 401);
    }

    this.rateLimiter.reset(rateKey);
    const rawToken = crypto.randomBytes(32).toString("hex");
    this.repo.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(rawToken),
      ipAddress: input.ipAddress ?? null,
    });

    logger.info("auth.login_succeeded", { userId: user.id });
    return {
      user,
      sessionToken: rawToken,
      setCookieHeader: formatHttpOnlySessionCookie(rawToken),
    };
  }

  public logout(rawToken: string | undefined): { setCookieHeader: string } {
    if (rawToken) {
      this.repo.deleteSessionByTokenHash(hashSessionToken(rawToken));
    }
    return {
      setCookieHeader: formatHttpOnlySessionCookie("", 0),
    };
  }

  /**
   * Resolves authenticated user exclusively from verified server-side session token
   * (HTTP-only cookie `bf_session`) or explicit local dev flag in development.
   * NEVER trusts a browser-supplied `userId` header.
   */
  public authenticateRequest(
    headers?: Record<string, string | undefined>,
    env: NodeJS.ProcessEnv = process.env
  ): SessionContext {
    const cookies = parseCookies(headers?.cookie);
    const rawToken = cookies[SESSION_COOKIE_NAME];

    if (rawToken) {
      const found = this.repo.getValidSessionByTokenHash(hashSessionToken(rawToken));
      if (!found) {
        throw new AppError("AUTHENTICATION_ERROR", "Session expired or invalid.", 401);
      }
      return {
        userId: found.user.id,
        email: found.user.email,
        name: found.user.name,
        preferredLocale: found.user.preferredLocale,
        isDevIdentity: false,
      };
    }

    const config = loadAppConfig(env);
    if (config.devIdentityEnabled) {
      return {
        userId: "user-local-dev-01",
        email: "author@bookforge.local",
        name: "মোঃ সোহেল রানা (Local Dev)",
        preferredLocale: "bn",
        isDevIdentity: true,
      };
    }

    throw new AppError("AUTHENTICATION_ERROR", "Authentication required.", 401);
  }
}

export function assertOwnership(session: SessionContext, resourceUserId: string): void {
  if (!session.userId || session.userId !== resourceUserId) {
    throw new AppError(
      "AUTHORIZATION_ERROR",
      "You do not have permission to access this resource.",
      403
    );
  }
}
