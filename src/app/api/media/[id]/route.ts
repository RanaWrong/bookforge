import { NextRequest, NextResponse } from "next/server";
import { PrismaAuthService } from "@/server/prisma-auth";
import { getDb } from "@/lib/db/client";
import { toHttpErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = new PrismaAuthService();
    const session = await auth.authenticateRequest({ cookie: request.headers.get("cookie") ?? undefined });
    const db = getDb();
    const asset = await db.asset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "NOT_FOUND", message: "Asset not found." }, { status: 404 });
    // Ownership check via workspace membership
    const membership = await db.workspaceMember.findFirst({ where: { workspaceId: asset.workspaceId, userId: session.userId } });
    if (!membership) return NextResponse.json({ error: "NOT_FOUND", message: "Asset not found." }, { status: 404 });

    const mediaDir = process.env.MEDIA_DIR || "/tmp/bookforge-media";
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const fullPath = path.join(mediaDir, asset.storageKey);
    try {
      const bytes = await fs.readFile(fullPath);
      return new NextResponse(bytes as BodyInit, {
        headers: {
          "Content-Type": asset.mimeType,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `inline; filename="${asset.filename}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "NOT_FOUND", message: "File not found on storage." }, { status: 404 });
    }
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
