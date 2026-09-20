# Data Model Specification: Proposera

## 1. Entity Architecture & Evaluation

The Proposera domain model cleanly separates identity, editorial narrative, media assets, presentation styling, and recipient responses.

Below is the evaluation of domain entities under confirmed owner decisions:

| Entity Name | Evaluation & Disposition | Rationale | In MVP? | Status Label |
| :--- | :--- | :--- | :--- | :--- |
| **Creator (User)** | Retained as distinct entity | Stores creator credentials, email, quota limits, and ownership pointers. | Yes | **REQUIRED** (DECIDED - Q1) |
| **Proposal** | Retained as root aggregate | The core entity governing lifecycle state, secret slug, ownership, and metadata. Live mutable when published. | Yes | **REQUIRED** (DECIDED - Q3/Q4) |
| **Recipient Info** | Merged into Proposal Content | Embedded within Proposal Content to ensure atomic cohesion with the story. | Yes | **PROPOSED** |
| **Proposal Content** | Retained as structured JSON/document | Working narrative payload. When proposal is published, edits to content update the live experience immediately. | Yes | **REQUIRED** (DECIDED - Q4) |
| **Publication Snapshot** | Superseded by Live Mutable Model | Published proposals update live; immutable snapshots rejected for MVP. Version history deferred to future phases. | No | **DEFERRED** (Phase 9+) |
| **Memory / Timeline Item** | Embedded within Content Structure | Stored as an ordered array in content for effortless sequencing and editing. | Yes | **REQUIRED** |
| **Media Asset** | Retained as distinct entity | Tracks physical file storage key, MIME type, dimensions, byte size, ownership, and sanitization status. | Yes | **REQUIRED** |
| **Theme Definition** | System catalog (code/static config) | Themes are platform-provided templates, not creator-defined tables in MVP. Customizations live in Proposal Content. | Yes | **PROPOSED** |
| **Response** | Retained as distinct entity | Records recipient confirmation, timestamp, and optional note. Visible to creator. | Yes | **REQUIRED** (DECIDED - Q2) |

---

## 2. Entity Specifications (Illustrative Field Schemas)

> [!NOTE]
> All schema representations in this section are **ILLUSTRATIVE** conceptual design specifications. Concrete database definitions (DDL, Prisma/Drizzle schemas, or migrations) and detailed payment models belong strictly to Phase 2+.

### 2.1 Creator (User)
- **Purpose**: Authenticated account identity of the author.
- **Ownership**: Root owner entity.
- **Relationships**: `1 Creator : N Proposals`, `1 Creator : N MediaAssets`.
- **Visibility**: **NEVER PUBLIC**. Private to creator session.
- **Lifecycle**: Created upon public signup; updated on profile changes; soft-deleted upon account termination.
- **MVP Relevance**: Essential for creator authentication, isolating proposals, and securing private drafts.
- **Necessity vs. Convenience**: **STRICTLY NECESSARY**.
- **Status**: **REQUIRED** (DECIDED — Q1).

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Primary key
email                VARCHAR      NOT NULL      Unique login email (public signup)
password_hash        VARCHAR      NULLABLE      Hashed credentials (or auth provider ID)
created_at           TIMESTAMPTZ  NOT NULL      Account creation timestamp
updated_at           TIMESTAMPTZ  NOT NULL      Last profile update timestamp
status               ENUM         NOT NULL      ACTIVE, SUSPENDED, DELETED
media_storage_bytes  BIGINT       NOT NULL      Cumulative media usage tracker
```

### 2.2 Proposal
- **Purpose**: Lifecycle container and metadata aggregate for a proposal.
- **Ownership**: Belongs to `Creator`.
- **Relationships**: `N Proposals : 1 Creator`, `1 Proposal : 1 ContentPayload`, `1 Proposal : N Responses`.
- **Visibility**: Metadata is **NEVER PUBLIC**. When status is `PUBLISHED`, the proposal content is served via public projection to anyone possessing the secret/random slug URL.
- **Lifecycle**: Created in `DRAFT`; transitions to `PUBLISHED`, `UNPUBLISHED`, or `DELETED`. When `PUBLISHED`, creator edits update the live experience immediately (DECIDED Q4).
- **MVP Relevance**: Fundamental aggregate root for the proposal experience.
- **Necessity vs. Convenience**: **STRICTLY NECESSARY**.
- **Status**: **REQUIRED** (DECIDED — Q3/Q4).

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Internal primary key
creator_id           UUID         NOT NULL      Foreign key -> Creator.id
title                VARCHAR      NOT NULL      Internal title (for creator studio list)
slug                 VARCHAR      NOT NULL      Secret/random public URL token (e.g. "for-sophia-v9k2x")
status               ENUM         NOT NULL      DRAFT, PUBLISHED, UNPUBLISHED, DELETED
theme_id             VARCHAR      NOT NULL      Identifier of active theme template (e.g. "celestial-rose")
created_at           TIMESTAMPTZ  NOT NULL      Record initialization timestamp
updated_at           TIMESTAMPTZ  NOT NULL      Record modification timestamp
published_at         TIMESTAMPTZ  NULLABLE      Timestamp of initial publication
```

### 2.3 Proposal Content (Draft Payload)
- **Purpose**: Complete working narrative data authored by the creator.
- **Ownership**: Belongs to `Proposal`.
- **Relationships**: `1 DraftContent : 1 Proposal`.
- **Visibility**: **NEVER PUBLIC**. Strictly authenticated to owner.
- **Lifecycle**: Initialized with defaults on Proposal creation; updated via autosave/manual save.
- **MVP Relevance**: Fundamental payload holding the personal story, timeline, romantic letter, and proposal question.
- **Necessity vs. Convenience**: **STRICTLY NECESSARY**. The romantic proposal cannot exist without content.
- **Status**: **REQUIRED**.

*ILLUSTRATIVE Structure (Embedded JSON Document)*:
```json
{
  "schema_version": 1,
  "partner": {
    "name": "Sophia",
    "nickname": "Soph",
    "avatar_media_id": "uuid-media-1"
  },
  "story": {
    "opening_headline": "Every step brought me to you",
    "opening_letter": "From our first walk by the shore...",
    "milestones": [
      {
        "id": "m1",
        "date_label": "October 14, 2021",
        "title": "The Rainy Evening in Brooklyn",
        "description": "We shared one umbrella and talked for four hours.",
        "media_id": "uuid-media-2"
      }
    ]
  },
  "proposal_moment": {
    "lead_in_text": "There is only one question left to ask...",
    "question": "Sophia, will you marry me?",
    "affirmative_label": "Yes, forever",
    "celebration_message": "Here is to our forever journey!"
  },
  "custom_theme_overrides": {
    "accent_color": "#e05a74",
    "font_pair": "serif-editorial",
    "ambient_music_media_id": null
  }
}
```

> [!NOTE]
> **No Paywall / Entitlement Gate**: Proposera MVP has no paywall; proposal creation, authoring, and publishing are directly available to authenticated creators without payment.
> **Proposal Version History / Snapshots**: Immutable publication snapshots were explicitly rejected for MVP (DEC-007 / Q4). Published proposals are live and mutable; edits update the published view immediately. Proposal version history, rollback, and immutable publication snapshots are **DEFERRED (Phase 9+)**.

### 2.5 Media Asset
- **Purpose**: Tracks binary media uploaded by creators (images, future audio).
- **Ownership**: Belongs to `Creator`.
- **Relationships**: `N MediaAssets : 1 Creator`.
- **Visibility**: **PRIVATE UNTIL PUBLISHED**. When referenced in a proposal with status `PUBLISHED`, public projection serves an optimized, public CDN URL. Unreferenced or draft-only media is private.
- **Lifecycle**: Uploaded to staging; validated & sanitized; assigned to proposal content; soft-deleted if removed.
- **MVP Relevance**: Manages creator photo uploads, EXIF sanitization, byte quotas, and secure asset references.
- **Necessity vs. Convenience**: **STRICTLY NECESSARY**. Binary assets cannot be safely embedded directly in database text fields and require tracking.
- **Status**: **REQUIRED**.

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Media asset ID
creator_id           UUID         NOT NULL      Foreign key -> Creator.id
storage_key          VARCHAR      NOT NULL      Object store path (e.g. "creators/{id}/media/{uuid}.webp")
original_filename    VARCHAR      NOT NULL      Sanitized client filename for reference
mime_type            VARCHAR      NOT NULL      Validated MIME (e.g. "image/webp", "image/jpeg")
byte_size            INTEGER      NOT NULL      File size in bytes
width                INTEGER      NULLABLE      Image pixel width
height               INTEGER      NULLABLE      Image pixel height
sha256_hash          VARCHAR      NOT NULL      Checksum for deduplication and integrity
status               ENUM         NOT NULL      PENDING_SCAN, READY, QUARANTINED, DELETED
created_at           TIMESTAMPTZ  NOT NULL      Upload timestamp
```

### 2.6 Response
- **Purpose**: Capture the recipient's response, timestamp, and metadata.
- **Ownership**: Belongs to `Proposal`.
- **Relationships**: `N Responses : 1 Proposal`.
- **Visibility**: **NEVER PUBLIC**. Readable only by the proposal's authenticated creator in Creator Studio.
- **Lifecycle**: Created upon recipient response submission on public proposal page (`/p/[slug]`). Append-only.
- **MVP Relevance**: Records the acceptance outcome for creator review in Creator Studio (decided in Q2).
- **Necessity vs. Convenience**: **DECIDED (Required)**. Owner decided that recipient responses MUST be persisted and visible to the creator.
- **Status**: **DECIDED (REQUIRED)**.

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Primary key
proposal_id          UUID         NOT NULL      Foreign key -> Proposal.id
choice               VARCHAR      NOT NULL      Normalized answer token (e.g. "AFFIRMATIVE")
custom_note          TEXT         NULLABLE      Optional loving message from recipient
user_agent_hash      VARCHAR      NULLABLE      Hashed browser footprint for rate limiting/analytics
created_at           TIMESTAMPTZ  NOT NULL      Response timestamp
```

---

## 3. Content vs. Presentation Separation

### 3.1 The Invariant
**Core Rule**: *A change in theme must NEVER modify, drop, truncate, or overwrite underlying proposal content.*

Content is stored in a clean, semantic document schema containing:
- Partner identifiers (names, pronouns, nicknames).
- Story narratives and timeline milestones.
- Media references (keyed by asset ID, not hardcoded layout styles).
- Proposal question and affirmative configuration.

Themes are pure rendering skins that consume the semantic content tree. A theme dictates:
- Typography choices and scale.
- Surface palettes, gradients, and particle aesthetics.
- Layout orchestration (e.g., vertical scroll narrative vs. horizontal card transitions).
- Spatial transitions and emotional pacing.

### 3.2 Handling Theme Incompatibilities & Missing Content Blocks
If a creator switches to a theme that does not natively support a specialized block (e.g., a theme that renders only 3 highlight photos when the creator has 8 timeline milestones):
- **Contract Rule**: Themes must provide graceful fallback rendering for standard content primitives.
- **Fallback Behavior**: The shared rendering layer provides a default generic container for unhandled blocks so no narrative data is hidden from the recipient.
- The Studio UI visually flags theme limitations: *"This theme is optimized for 3-5 photos. All 8 will be rendered, but consider trimming for best visual harmony."*
- Raw data remains 100% intact in the database regardless of theme selection.

### 3.3 Location of Theme-Specific Overrides
Theme-specific customizations (e.g., overriding a primary accent color or font pair within the chosen theme) are stored in a distinct sub-object: `custom_theme_overrides`.
- If the theme changes, overrides for the old theme are preserved in an inactive state or mapped to equivalent semantic tokens (e.g., `accent_color`), never polluting the story content.

### 3.4 Schema Versioning & Migration Strategy
- Every content payload includes a root `schema_version` integer.
- Forward migrations are executed via declarative migration pipelines when loading older versions:
  $$\text{Payload}_{v1} \xrightarrow{\text{migrateV1toV2}} \text{Payload}_{v2}$$
- Any unhandled fields in future schema extensions are preserved via schema pass-through to prevent data loss.

---

## 4. Public Projection & Visibility Allowlist

To prevent data leaks, the server **never** delivers the raw `Proposal` or `Creator` record to the recipient. The public endpoint generates an explicit **Public Projection**:

```
                              RAW PROPOSAL
                    ┌──────────────────────────────┐
                    │ creator_id (PRIVATE)         │
                    │ email (PRIVATE)              │
                    │ status (PRIVATE)             │
                    │ internal notes (PRIVATE)     │
                    │ account/quota (PRIVATE)      │
                    │ story content                │
                    │ media URLs                   │
                    │ theme selection              │
                    └──────────────┬───────────────┘
                                   │
                         [ Filter Projection ]
                                   │
                                   ▼
                       RECIPIENT PUBLIC PAYLOAD
                    ┌──────────────────────────────┐
                    │ partner name / nickname      │
                    │ public story milestones      │
                    │ proposal question & prompt   │
                    │ theme ID & visual overrides  │
                    │ sanitized public media URLs  │
                    └──────────────────────────────┘
```

### 4.1 Strict Visibility Map

| Domain Field | Recipient Exposure | Reason for Policy |
| :--- | :--- | :--- |
| `Creator.id` | **NEVER** | Protects creator anonymity and internal database IDs. |
| `Creator.email` | **NEVER** | Highly sensitive PII; zero recipient utility. |
| `Proposal.id` | **NEVER** | Internal aggregate key; recipient references public `slug` only. |
| `Proposal.status` | **NEVER** | Recipient only receives 200 OK if published; status enum is internal. |
| `Proposal.created_at` | **NEVER** | Authoring metadata is internal. |
| `MediaAsset.storage_key`| **NEVER** | Internal bucket paths must never leak. Only signed/public CDN URLs. |
| `MediaAsset.byte_size` | **NEVER** | Internal storage metric. |
| `Partner.name` | **PUBLIC (Published)** | Essential for emotional delivery. |
| `Story.milestones` | **PUBLIC (Published)** | Core narrative content. |
| `Proposal.question` | **PUBLIC (Published)** | Core proposal reveal. |
| `Theme.id` | **PUBLIC (Published)** | Required by client renderer to apply styling. |

---

## 5. Data Lifecycle & Retention

### 5.1 Deletion Policy
- **Creator Account Deletion**: Triggers soft-deletion of all associated proposals and responses. Media assets are queued for asynchronous deletion from object storage after a 14-day recovery buffer.
- **Proposal Deletion**: Immediately revokes the public slug (returns 404). Database record is soft-deleted (`status = DELETED`).

### 5.2 Unpublish Policy
- When a proposal is unpublished:
  - `status` transitions from `PUBLISHED` to `UNPUBLISHED`.
  - The public route `/p/[slug]` immediately yields a generic `404 Not Found`.
  - All draft and published content remains safely stored in the creator's private account for future reactivation.

### 5.3 Retention & Backups (Directional Proposal)
- Daily encrypted snapshots of the relational database.
- Object storage bucket versioning enabled with a 30-day lifecycle retention to protect against accidental file deletion or corruption.
- Responses are retained indefinitely unless deleted by the creator or upon account deletion.
