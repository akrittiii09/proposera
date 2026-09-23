import { NextResponse } from "next/server";
import fs from "node:fs";
import { getDb } from "@/lib/db";
import { getReadyStorageDir } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Lightweight operational health probe for deployment monitoring.
 * Verifies application process responsiveness, SQLite database read accessibility,
 * and persistent storage path availability without exposing sensitive internal data.
 */
export async function GET() {
  try {
    // 1. Verify SQLite database connectivity via minimal read-only query
    const db = getDb();
    const result = db.prepare("SELECT 1 AS healthy").get() as { healthy?: number } | undefined;
    if (!result || result.healthy !== 1) {
      return NextResponse.json(
        { status: "unhealthy", error: "Database health check failed" },
        { status: 503 }
      );
    }

    // 2. Verify media storage path availability (non-destructive)
    const storageDir = getReadyStorageDir();
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    fs.accessSync(storageDir, fs.constants.R_OK | fs.constants.W_OK);

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Health check failure:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Service dependency check failed",
      },
      { status: 503 }
    );
  }
}
