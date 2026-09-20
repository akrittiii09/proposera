/**
 * Proposera SQLite Database Schema Definition.
 * Faithfully mirrors the Phase 1 Data Model (docs/DATA_MODEL.md).
 */

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- Creators table
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'CREATOR',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_email ON creators (email);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'DELETED')),
  published_at TEXT,
  theme_id TEXT NOT NULL DEFAULT 'midnight-velvet',
  custom_theme_overrides TEXT NOT NULL DEFAULT '{}',
  story_content TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_slug ON proposals (slug);
CREATE INDEX IF NOT EXISTS idx_proposals_creator_id ON proposals (creator_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  choice TEXT NOT NULL,
  custom_note TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_responses_proposal_id ON responses (proposal_id);

-- Server-side Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_creator_id ON sessions (creator_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- Upload Permits table (time-limited, single-use permits for media upload)
CREATE TABLE IF NOT EXISTS upload_permits (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  max_byte_size INTEGER NOT NULL,
  allowed_mime_types TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_upload_permits_creator_id ON upload_permits (creator_id);
CREATE INDEX IF NOT EXISTS idx_upload_permits_proposal_id ON upload_permits (proposal_id);
CREATE INDEX IF NOT EXISTS idx_upload_permits_expires_at ON upload_permits (expires_at);

-- Media Assets table (sanitized and optimized media binaries)
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  proposal_id TEXT,
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sha256_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'READY' CHECK (status IN ('PENDING_SCAN', 'READY', 'QUARANTINED', 'DELETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_creator_id ON media_assets (creator_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_proposal_id ON media_assets (proposal_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets (status);
`;
