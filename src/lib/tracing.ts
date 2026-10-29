/**
 * Minimal OpenTelemetry tracing wrapper.
 *
 * When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, spans are created via a dynamic
 * import of `@opentelemetry/api`. If the package is not installed the import
 * will fail and the function falls back to a direct `fn()` call with zero
 * overhead. When the env var is absent the direct call is used immediately.
 */

/**
 * Records an exception on a span.  The `span` argument is typed as `unknown`
 * so callers don't need to import OpenTelemetry types.
 */
export function recordException(span: unknown, err: unknown): void {
  if (span == null) return;
  try {
    const s = span as {
      recordException?: (e: unknown) => void;
      setStatus?: (s: { code: number }) => void;
    };
    if (typeof s.recordException === "function") {
      s.recordException(err);
    }
    if (typeof s.setStatus === "function") {
      // SpanStatusCode.ERROR = 2
      s.setStatus({ code: 2 });
    }
  } catch {
    // Never throw from a tracing helper.
  }
}

/**
 * Wraps `fn` in an OpenTelemetry span named `name`.
 *
 * - When `OTEL_EXPORTER_OTLP_ENDPOINT` is configured and `@opentelemetry/api`
 *   is available, the span is created, `fn` is awaited inside it, the span is
 *   ended, and the result is returned.
 * - In all other cases (env var absent, package missing, or import error),
 *   `fn()` is called directly with no overhead.
 */
export async function startSpan<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // Fast path: no endpoint configured.
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    return fn();
  }

  // Try to use @opentelemetry/api when available.
  try {
    // @ts-ignore — @opentelemetry/api may not be installed; runtime try/catch handles the fallback
    const otel = await import("@opentelemetry/api");
    const tracer = otel.trace.getTracer("bookforge");
    const span = tracer.startSpan(name);

    let result: T;
    try {
      result = await otel.context.with(
        otel.trace.setSpan(otel.context.active(), span),
        fn
      );
      span.setStatus({ code: otel.SpanStatusCode.OK });
    } catch (err) {
      recordException(span, err);
      span.end();
      throw err;
    }

    span.end();
    return result;
  } catch (importErr) {
    // @opentelemetry/api is not installed or failed to initialise — fall back
    // to a direct call so the app continues to work without the package.
    return fn();
  }
}
