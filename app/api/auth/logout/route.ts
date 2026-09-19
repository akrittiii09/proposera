import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  invalidateSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const db = getDb();
      invalidateSession(db, token);
    }

    const response = NextResponse.json({ success: true });

    // Clear session cookie in browser
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }
}
