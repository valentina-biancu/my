import { NextRequest, NextResponse } from "next/server";
import { authConfigured, SESSION_COOKIE, verifySession } from "../../lib/auth";

export async function GET(request: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json(
      { authorised: false, error: "Access verification is not configured." },
      { status: 503 },
    );
  }
  const authorised = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json(
    { authorised, development: process.env.NODE_ENV !== "production" },
    { status: authorised ? 200 : 401 },
  );
}
