import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { findCreatorByEmail } from "@/lib/db/repositories";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { LoginSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid email or password format" },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const db = getDb();

    // Retrieve creator by email
    const creator = findCreatorByEmail(db, email);

    // Generic rejection if account does not exist or has no password hash
    if (!creator || !creator.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Timing-safe password verification
    const isValidPassword = await verifyPassword(password, creator.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session upon valid credentials
    const session = createSession(db, creator.id);

    const response = NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        email: creator.email,
        role: creator.role,
      },
    });

    // Set secure HTTP-only session cookie
    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(SESSION_COOKIE_NAME, session.id, cookieOptions);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
