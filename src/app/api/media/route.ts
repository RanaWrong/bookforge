import { NextRequest, NextResponse } from "next/server";
import { PrismaAuthService } from "@/server/prisma-auth";
import { getDb } from "@/lib/db/client";
import { toHttpErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = new PrismaAuthService();
    const session = await auth.authenticateRequest({ cookie: request.headers.get("cookie") ?? undefined });
    const db = getDb();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || (await auth.resolveWorkspaceId(session.userId));
    // Verify membership
    const membership = await db.workspaceMember.findFirst({ where: { workspaceId, userId: session.userId }, select: { role: true } });
    if (!membership) return NextResponse.json({ error: "NOT_FOUND", message: "Workspace not found or access denied." }, { status: 404 });
    const assets = await db.asset.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ assets });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = new PrismaAuthService();
    const session = await auth.authenticateRequest({ cookie: request.headers.get("cookie") ?? undefined });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bookId = (formData.get("bookId") as string | null) || null;
    const altText = String(formData.get("altText") ?? "");
    if (!file) return NextResponse.json({ error: "VALIDATION_ERROR", message: "File is required." }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const filename = file.name || "upload";

    // Reuse existing validation from MediaService but persist bytes to disk
    const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
    if (!allowed.has(mimeType)) return NextResponse.json({ error: "VALIDATION_ERROR", message: `Unsupported MIME: ${mimeType}` }, { status: 400 });
    if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) return NextResponse.json({ error: "VALIDATION_ERROR", message: "File size must be 1 byte to 10 MB." }, { status: 400 });
    if (mimeType === "image/svg+xml" && /<script|onload=|onerror=|javascript:/i.test(bytes.toString("utf8"))) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "Unsafe SVG content rejected." }, { status: 400 });
    }

    const crypto = await import("node:crypto");
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const storageKey = `private/${session.userId}/${sha256.slice(0, 16)}-${cleanName}`;

    // Write to local volume (MEDIA_DIR) — safe fallback for Coolify VPS
    const mediaDir = process.env.MEDIA_DIR || "/tmp/bookforge-media";
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const fullPath = path.join(mediaDir, storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, bytes);

    const db = getDb();
    const workspaceId = await auth.resolveWorkspaceId(session.userId);
    const asset = await db.asset.create({
      data: {
        workspaceId,
        bookId: bookId && /^[0-9a-f-]{36}$/i.test(bookId) ? bookId : null,
        filename: cleanName,
        mimeType,
        sizeBytes: bytes.byteLength,
        altText: altText.trim(),
        storageKey,
        sha256,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
