import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL } from "./schema";

let instance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export interface DatabaseOptions {
  dbPath?: string;
  inMemory?: boolean;
}

/**
 * Initializes and returns a DatabaseSync instance.
 * By default creates or opens ./data/proposera.sqlite
 */
export function getDb(options?: DatabaseOptions): DatabaseSync {
  const isTest = process.env.NODE_ENV === "test";
  const inMemory = options?.inMemory ?? (isTest && !options?.dbPath);
  const targetPath = inMemory
    ? ":memory:"
    : options?.dbPath || process.env.DATABASE_PATH || path.join(process.cwd(), "data", "proposera.sqlite");

  if (instance && currentDbPath === targetPath) {
    return instance;
  }

  // If path changed or instance not created, close existing and re-initialize
  if (instance) {
    try {
      instance.close();
    } catch {
      // ignore close error
    }
    instance = null;
  }

  if (!inMemory && targetPath !== ":memory:") {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (!inMemory) {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec(SCHEMA_SQL);

  instance = db;
  currentDbPath = targetPath;
  return instance;
}

/**
 * Explicitly closes current database connection (useful for tests).
 */
export function closeDb(): void {
  if (instance) {
    try {
      instance.close();
    } catch {
      // ignore error
    }
    instance = null;
    currentDbPath = null;
  }
}
