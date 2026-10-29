import { NextRequest, NextResponse } from "next/server";
import { PrismaAuthService } from "@/server/prisma-auth";
import { toHttpErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const auth = new PrismaAuthService();
    const { setCookieHeader } = await auth.login({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", setCookieHeader);
    return res;
  } catch (err: unknown) {
    const { statusCode, body } = toHttpErrorResponse(err);
    return NextResponse.json(body, { status: statusCode });
  }
}
