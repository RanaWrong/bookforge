import { NextRequest, NextResponse } from "next/server";
import { PrismaAuthService } from "@/server/prisma-auth";
import { PdfExportService } from "@/features/publishing/pdf-exporter";
import { toHttpErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await context.params;
    const auth = new PrismaAuthService();
    const session = await auth.authenticateRequest({ cookie: request.headers.get("cookie") ?? undefined });
    const payload = (await request.json().catch(() => ({}))) as { scope?: "BOOK" | "CHAPTER"; chapterId?: string; format?: "pdf" | "html" };
    const exporter = new PdfExportService();

    // Default to HTML for backward-compat; request format: "pdf" for real PDF bytes
    if (payload.format === "pdf") {
      const result = await exporter.generatePdfBuffer(session, {
        bookId,
        scope: payload.scope === "CHAPTER" ? "CHAPTER" : "BOOK",
        chapterId: payload.chapterId ?? null,
      });
      return new NextResponse(result.pdfBuffer as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${result.safeFilename}"`,
          "Content-Length": String(result.pdfBuffer.byteLength),
        },
      });
    }

    const job = exporter.generateExport(session, {
      bookId,
      scope: payload.scope === "CHAPTER" ? "CHAPTER" : "BOOK",
      chapterId: payload.chapterId ?? null,
    });
    return NextResponse.json({ job });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
