import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

export type ProposalStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED" | "DELETED";

export interface CreatorRecord {
  id: string;
  email: string;
  password_hash: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalRecord {
  id: string;
  creator_id: string;
  title: string;
  partner_name: string;
  slug: string;
  status: ProposalStatus;
  published_at: string | null;
  theme_id: string;
  custom_theme_overrides: string; // JSON string
  story_content: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface PublicProposalProjection {
  slug: string;
  title: string;
  partner_name: string;
  theme_id: string;
  custom_theme_overrides: Record<string, unknown>;
  story_content: Record<string, unknown>;
  published_at: string | null;
}

export interface ResponseRecord {
  id: string;
  proposal_id: string;
  choice: string;
  custom_note: string | null;
  user_agent_hash: string | null;
  created_at: string;
}


export interface SessionRecord {
  id: string;
  creator_id: string;
  created_at: string;
  expires_at: string;
}

// -----------------------------------------------------------------------------
// Helper: Secure Random Slug Generator
// -----------------------------------------------------------------------------
export function generateRandomSlug(partnerName: string = "proposal"): string {
  const sanitized = partnerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "proposal";
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  return `${sanitized}-${randomSuffix}`;
}

// -----------------------------------------------------------------------------
// Creator Repository
// -----------------------------------------------------------------------------
export function createCreator(
  db: DatabaseSync,
  data: { email: string; passwordHash: string; role?: string }
): CreatorRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const role = data.role || "CREATOR";

  const stmt = db.prepare(`
    INSERT INTO creators (id, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.email.toLowerCase().trim(), data.passwordHash, role, now, now);

  return {
    id,
    email: data.email.toLowerCase().trim(),
    password_hash: data.passwordHash,
    role,
    created_at: now,
    updated_at: now,
  };
}

export function findCreatorById(db: DatabaseSync, id: string): CreatorRecord | null {
  const stmt = db.prepare("SELECT * FROM creators WHERE id = ?");
  const row = stmt.get(id) as unknown as CreatorRecord | undefined;
  return row ? { ...row } : null;
}

export function findCreatorByEmail(db: DatabaseSync, email: string): CreatorRecord | null {
  const stmt = db.prepare("SELECT * FROM creators WHERE email = ? COLLATE NOCASE");
  const row = stmt.get(email.toLowerCase().trim()) as unknown as CreatorRecord | undefined;
  return row ? { ...row } : null;
}

export function updateCreatorPassword(
  db: DatabaseSync,
  id: string,
  newPasswordHash: string
): boolean {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE creators
    SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `);
  const result = stmt.run(newPasswordHash, now, id);
  return Number(result.changes) > 0;
}

// -----------------------------------------------------------------------------
// Proposal Repository
// -----------------------------------------------------------------------------
export function createProposal(
  db: DatabaseSync,
  data: {
    creatorId: string;
    title: string;
    partnerName: string;
    slug?: string;
    themeId?: string;
    storyContent?: Record<string, unknown> | string;
    customThemeOverrides?: Record<string, unknown> | string;
  }
): ProposalRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = data.slug || generateRandomSlug(data.partnerName);
  const themeId = data.themeId || "midnight-velvet";
  const storyContent =
    typeof data.storyContent === "string"
      ? data.storyContent
      : JSON.stringify(data.storyContent || {});
  const customThemeOverrides =
    typeof data.customThemeOverrides === "string"
      ? data.customThemeOverrides
      : JSON.stringify(data.customThemeOverrides || {});

  const stmt = db.prepare(`
    INSERT INTO proposals (
      id, creator_id, title, partner_name, slug, status, published_at,
      theme_id, custom_theme_overrides, story_content, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'DRAFT', NULL, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.creatorId,
    data.title,
    data.partnerName,
    slug,
    themeId,
    customThemeOverrides,
    storyContent,
    now,
    now
  );

  return {
    id,
    creator_id: data.creatorId,
    title: data.title,
    partner_name: data.partnerName,
    slug,
    status: "DRAFT",
    published_at: null,
    theme_id: themeId,
    custom_theme_overrides: customThemeOverrides,
    story_content: storyContent,
    created_at: now,
    updated_at: now,
  };
}

export function findProposalById(db: DatabaseSync, id: string): ProposalRecord | null {
  const stmt = db.prepare("SELECT * FROM proposals WHERE id = ?");
  const row = stmt.get(id) as unknown as ProposalRecord | undefined;
  return row ? { ...row } : null;
}

export function findProposalsByCreatorId(db: DatabaseSync, creatorId: string): ProposalRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM proposals
    WHERE creator_id = ? AND status != 'DELETED'
    ORDER BY created_at DESC, rowid DESC
  `);
  const rows = stmt.all(creatorId) as unknown as ProposalRecord[];
  return rows ? rows.map((r) => ({ ...r })) : [];
}

export function findProposalBySlug(db: DatabaseSync, slug: string): ProposalRecord | null {
  const stmt = db.prepare("SELECT * FROM proposals WHERE slug = ?");
  const row = stmt.get(slug) as unknown as ProposalRecord | undefined;
  return row ? { ...row } : null;
}

export function findPublishedProposalBySlug(db: DatabaseSync, slug: string): ProposalRecord | null {
  const stmt = db.prepare("SELECT * FROM proposals WHERE slug = ? AND status = 'PUBLISHED'");
  const row = stmt.get(slug) as unknown as ProposalRecord | undefined;
  return row ? { ...row } : null;
}

/**
 * Public Projection Filter (docs/DATA_MODEL.md Section 4).
 * Eliminates creator_id, internal notes, and private metadata.
 */
export function getPublicProjection(proposal: ProposalRecord): PublicProposalProjection {
  let customOverrides: Record<string, unknown> = {};
  let storyContent: Record<string, unknown> = {};

  try {
    customOverrides = JSON.parse(proposal.custom_theme_overrides);
  } catch {
    customOverrides = {};
  }

  try {
    storyContent = JSON.parse(proposal.story_content);
  } catch {
    storyContent = {};
  }

  return {
    slug: proposal.slug,
    title: proposal.title,
    partner_name: proposal.partner_name,
    theme_id: proposal.theme_id,
    custom_theme_overrides: customOverrides,
    story_content: storyContent,
    published_at: proposal.published_at,
  };
}

/**
 * Updates proposal fields with strict server-side creator ownership enforcement.
 */
export function updateProposal(
  db: DatabaseSync,
  id: string,
  creatorId: string,
  updates: Partial<{
    title: string;
    partnerName: string;
    themeId: string;
    slug: string;
    status: ProposalStatus;
    customThemeOverrides: Record<string, unknown> | string;
    storyContent: Record<string, unknown> | string;
  }>
): ProposalRecord | null {
  const existing = findProposalById(db, id);
  if (!existing || existing.creator_id !== creatorId || existing.status === "DELETED") {
    return null;
  }

  const now = new Date().toISOString();
  const title = updates.title ?? existing.title;
  const partnerName = updates.partnerName ?? existing.partner_name;
  const themeId = updates.themeId ?? existing.theme_id;
  const slug = updates.slug ?? existing.slug;
  const status = updates.status ?? existing.status;

  if (updates.slug && updates.slug !== existing.slug) {
    const slugConflict = db.prepare("SELECT id FROM proposals WHERE slug = ? AND id != ?").get(updates.slug, id);
    if (slugConflict) {
      throw new Error("Slug is already in use by another proposal");
    }
  }

  let publishedAt = existing.published_at;
  if (status === "PUBLISHED" && !publishedAt) {
    publishedAt = now;
  }

  const customThemeOverrides =
    updates.customThemeOverrides !== undefined
      ? typeof updates.customThemeOverrides === "string"
        ? updates.customThemeOverrides
        : JSON.stringify(updates.customThemeOverrides)
      : existing.custom_theme_overrides;

  const storyContent =
    updates.storyContent !== undefined
      ? typeof updates.storyContent === "string"
        ? updates.storyContent
        : JSON.stringify(updates.storyContent)
      : existing.story_content;

  const stmt = db.prepare(`
    UPDATE proposals
    SET title = ?, partner_name = ?, theme_id = ?, slug = ?, status = ?, published_at = ?,
        custom_theme_overrides = ?, story_content = ?, updated_at = ?
    WHERE id = ? AND creator_id = ?
  `);
  stmt.run(title, partnerName, themeId, slug, status, publishedAt, customThemeOverrides, storyContent, now, id, creatorId);

  return findProposalById(db, id);
}

/**
 * Updates proposal status with ownership enforcement.
 */
export function updateProposalStatus(
  db: DatabaseSync,
  id: string,
  creatorId: string,
  newStatus: ProposalStatus
): ProposalRecord | null {
  const existing = findProposalById(db, id);
  if (!existing || existing.creator_id !== creatorId) {
    return null;
  }

  const now = new Date().toISOString();
  let publishedAt = existing.published_at;
  if (newStatus === "PUBLISHED" && !publishedAt) {
    publishedAt = now;
  }

  const stmt = db.prepare(`
    UPDATE proposals
    SET status = ?, published_at = ?, updated_at = ?
    WHERE id = ? AND creator_id = ?
  `);
  stmt.run(newStatus, publishedAt, now, id, creatorId);

  return findProposalById(db, id);
}

/**
 * Soft deletes a proposal with ownership enforcement.
 */
export function deleteProposal(db: DatabaseSync, id: string, creatorId: string): boolean {
  const updated = updateProposalStatus(db, id, creatorId, "DELETED");
  return updated !== null;
}

// -----------------------------------------------------------------------------
// Response Repository
// -----------------------------------------------------------------------------
export function createResponse(
  db: DatabaseSync,
  data: {
    proposalId: string;
    choice: string;
    customNote?: string | null;
    userAgentHash?: string | null;
  }
): ResponseRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO responses (id, proposal_id, choice, custom_note, user_agent_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.proposalId, data.choice, data.customNote || null, data.userAgentHash || null, now);

  return {
    id,
    proposal_id: data.proposalId,
    choice: data.choice,
    custom_note: data.customNote || null,
    user_agent_hash: data.userAgentHash || null,
    created_at: now,
  };
}

/**
 * Retrieves the most recent response for a given proposal ID.
 */
export function findLatestResponseByProposalId(
  db: DatabaseSync,
  proposalId: string
): ResponseRecord | null {
  const stmt = db.prepare(`
    SELECT * FROM responses
    WHERE proposal_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const row = stmt.get(proposalId) as unknown as ResponseRecord | undefined;
  return row ? { ...row } : null;
}

/**
 * Retrieves responses belonging to a proposal.
 * Enforces ownership check: verifies proposal belongs to creatorId.
 */
export function findResponsesByProposalId(
  db: DatabaseSync,
  proposalId: string,
  creatorId: string
): ResponseRecord[] | null {
  const proposal = findProposalById(db, proposalId);
  if (!proposal || proposal.creator_id !== creatorId) {
    return null;
  }

  const stmt = db.prepare(`
    SELECT * FROM responses
    WHERE proposal_id = ?
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(proposalId) as unknown as ResponseRecord[];
  return rows ? rows.map((r) => ({ ...r })) : [];
}
