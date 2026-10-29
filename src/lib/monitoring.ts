import { logger } from "./logger";

/**
 * Builds a minimal Sentry-compatible HTTP envelope payload for an exception.
 * Spec: https://develop.sentry.dev/sdk/envelopes/
 */
function buildSentryEnvelope(
  err: unknown,
  context?: Record<string, unknown>
): string {
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = Date.now() / 1000;

  let exceptionValue = "Unknown error";
  let exceptionType = "Error";
  let stacktrace: { frames: { filename: string; function: string; lineno?: number }[] } | undefined;

  if (err instanceof Error) {
    exceptionValue = err.message;
    exceptionType = err.name ?? "Error";

    if (err.stack) {
      const frames = err.stack
        .split("\n")
        .slice(1) // skip first line (error message)
        .map((line) => {
          const match = line.trim().match(/^at (.+?) \((.+?):(\d+):\d+\)$/) ??
            line.trim().match(/^at (.+?):(\d+):\d+$/);
          if (match && match.length === 4) {
            return { function: match[1], filename: match[2], lineno: parseInt(match[3], 10) };
          }
          if (match && match.length === 3) {
            return { function: "<anonymous>", filename: match[1], lineno: parseInt(match[2], 10) };
          }
          return { function: line.trim(), filename: "<unknown>" };
        });
      stacktrace = { frames: frames.reverse() };
    }
  } else if (typeof err === "string") {
    exceptionValue = err;
  }

  const event: Record<string, unknown> = {
    event_id: eventId,
    timestamp,
    platform: "node",
    exception: {
      values: [
        {
          type: exceptionType,
          value: exceptionValue,
          ...(stacktrace ? { stacktrace } : {}),
        },
      ],
    },
    ...(context ? { extra: context } : {}),
  };

  // Sentry envelope format:
  // {"event_id":"..."}\n
  // {"type":"event","length":<N>}\n
  // <event JSON>\n
  const envelopeHeader = JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() });
  const eventJson = JSON.stringify(event);
  const itemHeader = JSON.stringify({ type: "event", length: eventJson.length });

  return `${envelopeHeader}\n${itemHeader}\n${eventJson}\n`;
}

/**
 * Captures an exception, forwarding it to a Sentry-compatible DSN when
 * `ERROR_MONITORING_DSN` is set (must start with "https://"). Always logs
 * the error locally. Never throws — safe to call from catch blocks.
 */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>
): void {
  // Always log locally, regardless of DSN configuration.
  const logMeta: Record<string, unknown> = {};
  if (err instanceof Error) {
    logMeta["errorName"] = err.name;
    logMeta["errorMessage"] = err.message;
    if (err.stack) logMeta["stack"] = err.stack;
  } else {
    logMeta["error"] = String(err);
  }
  if (context) {
    Object.assign(logMeta, context);
  }
  logger.error("captureException", logMeta);

  // Fire-and-forget to Sentry-compatible DSN when configured.
  const dsn = process.env.ERROR_MONITORING_DSN;
  if (typeof dsn === "string" && dsn.startsWith("https://")) {
    const envelope = buildSentryEnvelope(err, context);

    // Derive the envelope endpoint from the DSN.
    // DSN format: https://<key>@<host>/<project-id>
    // Envelope endpoint: https://<host>/api/<project-id>/envelope/
    let envelopeUrl: string;
    try {
      const url = new URL(dsn);
      const projectId = url.pathname.replace(/^\//, "");
      envelopeUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/`;
    } catch {
      // Malformed DSN — skip forwarding.
      return;
    }

    // fire-and-forget: intentionally not awaited
    fetch(envelopeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    }).catch(() => {
      // Swallow network errors — monitoring must never interfere with app flow.
    });
  }
}
