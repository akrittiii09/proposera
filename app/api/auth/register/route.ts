import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  findCreatorByEmail,
  createCreator,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { RegisterSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = RegisterSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid registration data";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, password } = parseResult.data;
    const db = getDb();

    // Check for existing account safely without exposing database details
    const existing = findCreatorByEmail(db, email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // Hash password using bcryptjs with cost factor >= 12
    const passwordHash = await hashPassword(password);

    // Persist creator
    const creator = createCreator(db, {
      email,
      passwordHash,
      role: "CREATOR",
    });

    // Establish authenticated session
    const session = createSession(db, creator.id);

    const response = NextResponse.json(
      {
        success: true,
        creator: {
          id: creator.id,
          email: creator.email,
          role: creator.role,
        },
      },
      { status: 201 }
    );

    // Set secure HTTP-only session cookie
    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(SESSION_COOKIE_NAME, session.id, cookieOptions);

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}
