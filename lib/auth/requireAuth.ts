import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateSession, SESSION_COOKIE_NAME } from "./session";
import { CreatorRecord, SessionRecord } from "@/lib/db/repositories";

export interface AuthContext {
  creator: CreatorRecord;
  session: SessionRecord;
}

/**
 * Resolves the currently authenticated creator from the HTTP session cookie.
 * Returns null if no valid session exists.
 */
export async function getCurrentCreator(explicitToken?: string): Promise<AuthContext | null> {
  let token = explicitToken;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Cookies not accessible (e.g. outside request context in unit tests)
      token = undefined;
    }
  }
  if (!token) {
    return null;
  }
  const db = getDb();
  return validateSession(db, token);
}

/**
 * Server-side guard for protected Creator Studio pages.
 * Redirects unauthenticated visitors to /login.
 */
export async function requireAuth(redirectTo: string = "/login"): Promise<AuthContext> {
  const auth = await getCurrentCreator();
  if (!auth) {
    redirect(redirectTo);
  }
  return auth;
}

/**
 * Server-side guard for protected API route handlers.
 * Returns a 401 Unauthorized response if unauthenticated.
 */
/**
 * Server-side guard for protected API route handlers.
 * Returns a 401 Unauthorized response if unauthenticated.
 */
export async function requireApiAuth(
  requestOrToken?: NextRequest | Request | string
): Promise<
  | { authenticated: true; auth: AuthContext }
  | { authenticated: false; response: NextResponse }
> {
  let token: string | undefined;

  if (typeof requestOrToken === "string") {
    token = requestOrToken;
  } else if (requestOrToken) {
    if ("cookies" in requestOrToken && typeof requestOrToken.cookies?.get === "function") {
      token = requestOrToken.cookies.get(SESSION_COOKIE_NAME)?.value;
    }
    if (!token && requestOrToken.headers) {
      const cookieHeader = requestOrToken.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) {
        token = match[1];
      }
    }
  }

  const auth = await getCurrentCreator(token);
  if (!auth) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }
  return { authenticated: true, auth };
}
