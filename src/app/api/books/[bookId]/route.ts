import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth";
import { BookService } from "@/features/books/service";
import { toHttpErrorResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;
    const auth = new AuthService();
    const session = auth.authenticateRequest({
      cookie: request.headers.get("cookie") ?? undefined,
    });
    const service = new BookService();
    const book = service.getBookWithChapters(session, bookId);
    return NextResponse.json({ book });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;
    const auth = new AuthService();
    const session = auth.authenticateRequest({
      cookie: request.headers.get("cookie") ?? undefined,
    });
    const service = new BookService();
    const deleted = service.deleteBook(session, bookId);
    return NextResponse.json({ deleted });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
