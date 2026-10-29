/**
 * Storage abstraction for export files.
 *
 * Environment variables:
 *   STORAGE_PROVIDER    - "local" (default) or "s3"
 *   EXPORT_DIR          - local export directory (default: "./output/exports")
 *   AWS_S3_BUCKET       - S3 bucket name (required when STORAGE_PROVIDER=s3)
 *   AWS_REGION          - AWS region (default: "us-east-1")
 *   AWS_ACCESS_KEY_ID   - AWS credentials (required when STORAGE_PROVIDER=s3)
 *   AWS_SECRET_ACCESS_KEY - AWS credentials (required when STORAGE_PROVIDER=s3)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

function getStorageProvider(): "local" | "s3" {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider !== "local" && provider !== "s3") {
    throw new Error(
      `Invalid STORAGE_PROVIDER value "${provider}". Must be "local" or "s3".`
    );
  }
  return provider;
}

function getExportDir(): string {
  return process.env.EXPORT_DIR ?? "./output/exports";
}

function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET environment variable is required when STORAGE_PROVIDER=s3");
  }
  return bucket;
}

function getAwsRegion(): string {
  return process.env.AWS_REGION ?? "us-east-1";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Write an export buffer to storage and return the storage key.
 *
 * The storage key is always `"{jobId}.{ext}"` (e.g. `"abc123.pdf"`).
 *
 * - On "local": writes the buffer to `EXPORT_DIR/{storageKey}`, creating the
 *   directory if it does not exist.
 * - On "s3": uploads the buffer via `PutObjectCommand` and returns the S3 key.
 *
 * @param jobId - The export job UUID used to construct the storage key.
 * @param ext   - File extension without the leading dot (e.g. "pdf", "epub").
 * @param buffer - The file content to persist.
 * @returns The storage key (e.g. "abc123.pdf").
 */
export async function writeExportFile(
  jobId: string,
  ext: string,
  buffer: Buffer
): Promise<string> {
  const storageKey = `${jobId}.${ext}`;
  const provider = getStorageProvider();

  if (provider === "s3") {
    await writeToS3(storageKey, buffer, ext);
  } else {
    await writeToLocal(storageKey, buffer);
  }

  return storageKey;
}

/**
 * Resolve a storage key to a download URL.
 *
 * - On "local": returns a relative API URL `/api/exports/{storageKey}`.
 * - On "s3": generates a pre-signed `GetObject` URL with the given TTL.
 *
 * @param storageKey - The key returned by `writeExportFile`.
 * @param ttlSeconds - Lifetime of the pre-signed URL in seconds (default 900 = 15 min).
 * @returns A URL the client can use to download the file.
 */
export async function getDownloadUrl(
  storageKey: string,
  ttlSeconds: number = 900
): Promise<string> {
  const provider = getStorageProvider();

  if (provider === "s3") {
    return getS3PresignedUrl(storageKey, ttlSeconds);
  }

  return `/api/exports/${storageKey}`;
}

/**
 * Return the absolute filesystem path for a locally stored export file.
 * Intended for use by the worker when it needs to read or serve the file
 * directly without going through the storage abstraction layer.
 *
 * @param storageKey - The key returned by `writeExportFile`.
 * @returns Absolute path on the local filesystem.
 */
export function getExportFilePath(storageKey: string): string {
  return resolve(join(getExportDir(), storageKey));
}

// ---------------------------------------------------------------------------
// Local driver
// ---------------------------------------------------------------------------

async function writeToLocal(storageKey: string, buffer: Buffer): Promise<void> {
  const exportDir = resolve(getExportDir());
  await mkdir(exportDir, { recursive: true });
  const filePath = join(exportDir, storageKey);
  await writeFile(filePath, buffer);
}

// ---------------------------------------------------------------------------
// S3 driver (all AWS SDK imports are dynamic so the package is optional)
// ---------------------------------------------------------------------------

async function writeToS3(
  storageKey: string,
  buffer: Buffer,
  ext: string
): Promise<void> {
  // Dynamic import keeps the AWS SDK out of the module graph when S3 is unused.
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({ region: getAwsRegion() });

  const contentType = resolveContentType(ext);

  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

async function getS3PresignedUrl(
  storageKey: string,
  ttlSeconds: number
): Promise<string> {
  // Both the client and the presigner are dynamically imported so that
  // the app starts correctly when only local storage is configured.
  const [{ S3Client, GetObjectCommand }, { getSignedUrl }] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
  ]);

  const client = new S3Client({ region: getAwsRegion() });

  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: storageKey,
  });

  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Map a file extension to a MIME content type.
 * Falls back to "application/octet-stream" for unknown extensions.
 */
function resolveContentType(ext: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    epub: "application/epub+zip",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    zip: "application/zip",
    html: "text/html; charset=utf-8",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
