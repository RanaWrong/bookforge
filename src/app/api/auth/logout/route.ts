import { NextRequest, NextResponse } from "next/server";
import { PrismaAuthService } from "@/server/prisma-auth";
import { SESSION_COOKIE_NAME, parseCookies } from "@/server/auth";
import { toHttpErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get("cookie") ?? undefined);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    const auth = new PrismaAuthService();
    const { setCookieHeader } = await auth.logout(rawToken);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", setCookieHeader);
    return res;
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
