import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth";
import {
  ManuscriptImportService,
  parseDocxStructuredImport,
  parseMarkdownImport,
} from "@/features/import/import-service";
import type { CommitImportChapterSelection } from "@/features/import/limits";
import { toHttpErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const auth = new AuthService();
    const session = auth.authenticateRequest({
      cookie: request.headers.get("cookie") ?? undefined,
    });
    const payload = (await request.json()) as {
      bookId?: string;
      filename: string;
      sourceType?: "MARKDOWN" | "DOCX";
      content: string;
      commit?: boolean;
      selections?: CommitImportChapterSelection[];
    };

    const report =
      payload.sourceType === "DOCX"
        ? parseDocxStructuredImport(payload.filename, payload.content)
        : parseMarkdownImport(payload.filename, payload.content);

    if (payload.commit && payload.bookId) {
      const importService = new ManuscriptImportService();
      const createdChapters = importService.commitConfirmedImport(
        session,
        payload.bookId,
        report,
        payload.selections
      );
      return NextResponse.json({ report, createdChapters }, { status: 201 });
    }

    return NextResponse.json({ report });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
