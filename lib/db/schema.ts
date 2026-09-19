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

-- Creator Entitlements table (Razorpay Paywall)
CREATE TABLE IF NOT EXISTS creator_entitlements (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRIAL')),
  provider TEXT NOT NULL DEFAULT 'RAZORPAY',
  external_reference TEXT,
  order_id TEXT,
  payment_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entitlements_creator_id ON creator_entitlements (creator_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_order_id ON creator_entitlements (order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_payment_id ON creator_entitlements (payment_id);

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
`;
