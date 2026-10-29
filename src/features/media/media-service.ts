import crypto from "node:crypto";
import { AppError } from "../../lib/errors.ts";
import type { SessionContext } from "../../server/auth.ts";
import {
  getRepository,
  type BookForgeRepository,
  type MediaAssetRecord,
} from "../../server/db.ts";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB

export class MediaService {
  private readonly repo: BookForgeRepository;

  constructor(repo: BookForgeRepository = getRepository()) {
    this.repo = repo;
  }

  public uploadValidatedAsset(
    session: SessionContext,
    input: {
      bookId?: string | null;
      filename: string;
      mimeType: string;
      bytes: Buffer;
      altText: string;
    }
  ): MediaAssetRecord {
    const cleanName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!cleanName || cleanName.includes("..")) {
      throw new AppError("VALIDATION_ERROR", "Invalid media filename.");
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(input.mimeType)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Unsupported media MIME type: ${input.mimeType}`
      );
    }
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_MEDIA_BYTES) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Media file size must be between 1 byte and ${MAX_MEDIA_BYTES} bytes.`
      );
    }

    if (input.mimeType === "image/svg+xml") {
      const svgText = input.bytes.toString("utf8");
      if (/<script|onload=|onerror=|javascript:/i.test(svgText)) {
        throw new AppError("VALIDATION_ERROR", "Unsafe executable SVG content rejected.");
      }
    }

    const sha256 = crypto.createHash("sha256").update(input.bytes).digest("hex");
    const storageKey = `private/${session.userId}/${sha256.slice(0, 16)}-${cleanName}`;

    return this.repo.createMediaAsset(session.userId, {
      bookId: input.bookId ?? null,
      filename: cleanName,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      altText: input.altText.trim(),
      storageKey,
      sha256,
    });
  }
}
