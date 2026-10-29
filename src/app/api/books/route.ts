import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth";
import { BookService } from "@/features/books/service";
import { toHttpErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const auth = new AuthService();
    const session = auth.authenticateRequest({
      cookie: request.headers.get("cookie") ?? undefined,
    });
    const service = new BookService();
    return NextResponse.json({ books: service.listUserBooks(session) });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = new AuthService();
    const session = auth.authenticateRequest({
      cookie: request.headers.get("cookie") ?? undefined,
    });
    const payload: unknown = await request.json();
    const service = new BookService();
    const book = service.createBook(session, payload);
    return NextResponse.json({ book }, { status: 201 });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
