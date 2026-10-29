import { NextRequest, NextResponse } from "next/server";

/**
 * Edge-runtime middleware — lightweight by design.
 *
 * Responsibilities:
 *  1. Assign a stable X-Request-ID to every matched request (forwarded from
 *     the caller or generated fresh).
 *  2. Echo the same ID on the response so callers and downstream services can
 *     correlate logs.
 *
 * NOTE: `AsyncLocalStorage` (node:async_hooks) is NOT available in the Edge
 * runtime that Next.js middleware runs in.  Request-context propagation into
 * logger entries is therefore handled at the Node.js API-route level using the
 * `runWithContext` helper exported from `src/lib/logger.ts`.  Middleware is
 * intentionally kept free of any Node.js-only imports to avoid Edge/runtime
 * mismatches.
 *
 * Auth is handled per-route via PrismaAuthService — see individual route files.
 */
export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/books/:path*"],
};
