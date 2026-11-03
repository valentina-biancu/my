import { NextRequest, NextResponse } from "next/server";
import {
  authConfigured,
  makeSession,
  SESSION_COOKIE,
  verifyAccessCode,
} from "../../lib/auth";

export async function POST(request: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json(
      { valid: false, error: "Access verification is not configured." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code || !verifyAccessCode(body.code)) {
    return NextResponse.json(
      { valid: false, error: "That access code was not recognised." },
      { status: 401 },
    );
  }
  const session = makeSession();
  const response = NextResponse.json({ valid: true });
  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
