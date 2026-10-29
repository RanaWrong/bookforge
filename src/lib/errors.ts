import type { ErrorCode } from "../modules/books/contracts";

export class LibraryError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = "LibraryError";
  }
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toHttpErrorResponse(err: unknown): {
  statusCode: number;
  body: { error: string; message: string };
} {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: { error: err.code, message: err.message },
    };
  }
  if (err instanceof LibraryError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      INVALID_INPUT: 400,
      UNSUPPORTED_CONTENT: 400,
      IDENTITY_DISABLED: 403,
      UNAVAILABLE: 503,
      FORBIDDEN: 403,
      AI_DISABLED: 503,
      AI_PROVIDER_ERROR: 502,
      EXPORT_FORMAT_UNSUPPORTED: 400,
      INVITE_EXPIRED: 410,
    };
    return {
      statusCode: statusMap[err.code] ?? 400,
      body: { error: err.code, message: err.message },
    };
  }
  if (err instanceof Error) {
    return {
      statusCode: 500,
      body: { error: "INTERNAL_ERROR", message: err.message },
    };
  }
  return {
    statusCode: 500,
    body: { error: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  };
}
