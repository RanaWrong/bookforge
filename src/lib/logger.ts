import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  workspaceId?: string;
  action?: string;
}

/**
 * AsyncLocalStorage store for per-request context.
 * Wrap API route handlers with `requestContext.run({ requestId }, handler)`
 * so every `logger.*` call within that handler automatically includes the
 * context fields in its output.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Convenience helper — call at the start of a Node.js API route (not Edge
 * middleware) to bind context for the lifetime of the async call chain.
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   return runWithContext({ requestId: req.headers.get("x-request-id") ?? crypto.randomUUID() }, async () => {
 *     // logger calls here will include requestId automatically
 *     logger.info("handling GET /api/example");
 *     return NextResponse.json({ ok: true });
 *   });
 * }
 */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}

function log(level: LogLevel, message: string, meta?: LogMeta) {
  // Merge any ambient request context into every log entry
  const ctx = requestContext.getStore();
  const contextFields: Partial<RequestContext> = ctx
    ? {
        requestId: ctx.requestId,
        ...(ctx.userId !== undefined ? { userId: ctx.userId } : {}),
        ...(ctx.workspaceId !== undefined ? { workspaceId: ctx.workspaceId } : {}),
        ...(ctx.action !== undefined ? { action: ctx.action } : {}),
      }
    : {};

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...contextFields,
    ...(meta ? { meta } : {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
};
