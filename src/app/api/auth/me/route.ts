import { NextRequest, NextResponse } from "next/server";
import { PrismaAuthService } from "@/server/prisma-auth";
import { toHttpErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = new PrismaAuthService();
    const session = await auth.authenticateRequest({ cookie: request.headers.get("cookie") ?? undefined });
    return NextResponse.json({ user: { id: session.userId, email: session.email, name: session.name, preferredLocale: session.preferredLocale } });
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
