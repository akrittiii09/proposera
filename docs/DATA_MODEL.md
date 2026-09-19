# Data Model Specification: Proposera

## 1. Entity Architecture & Evaluation

The Proposera domain model separates identity, editorial narrative, media assets, presentation styling, and publication snapshots.

Below is the evaluation of domain entities:

| Entity Name | Evaluation & Disposition | Rationale | In MVP? | Status Label |
| :--- | :--- | :--- | :--- | :--- |
| **Creator (User)** | Retained as distinct entity | Stores creator credentials, email, quota limits, and ownership pointers. | Yes | CONFIRMED REQUIREMENT |
| **Proposal** | Retained as root aggregate | The core entity governing lifecycle state, slug, ownership, and metadata. | Yes | CONFIRMED REQUIREMENT |
| **Recipient Info** | Merged into Proposal Content | Evaluated as a separate table vs embedded record. Merged into Proposal Content to ensure atomic versioning with the story. | Yes | ARCHITECTURAL PROPOSAL |
| **Proposal Content (Draft)** | Retained as structured JSON/document | Normalized relational scenes vs versioned document structure. Document structure chosen for narrative flexibility. | Yes | CONFIRMED REQUIREMENT |
| **Publication Snapshot** | Retained as distinct entity | Decouples live public rendering from ongoing creator draft modifications. | Yes | ARCHITECTURAL PROPOSAL |
| **Memory / Timeline Item** | Embedded within Content Structure | Evaluated as separate table. Storing as an ordered array in content ensures drag-and-drop reordering without complex relational ordering keys. | Yes | CONFIRMED REQUIREMENT |
| **Media Asset** | Retained as distinct entity | Tracks physical file storage key, MIME type, dimensions, byte size, ownership, and sanitization status. | Yes | CONFIRMED REQUIREMENT |
| **Theme Definition** | System catalog (code/static config) | Themes are platform-provided templates, not creator-defined tables in MVP. Customizations (colors/fonts) live in Proposal Content. | Yes | ARCHITECTURAL PROPOSAL |
| **Response** | Retained as distinct entity | Records recipient confirmation, timestamp, and optional note. Isolated from content to avoid write collisions. | Yes | ARCHITECTURAL PROPOSAL |

---

## 2. Entity Specifications (Illustrative Field Schemas)

> [!NOTE]
> All schema representations in this section are **ILLUSTRATIVE** design specifications. Concrete database definitions (DDL, Prisma/Drizzle schemas, or migrations) belong strictly to later implementation phases.

### 2.1 Creator (User)
- **Purpose**: Authenticated account identity of the author.
- **Ownership**: Root owner entity.
- **Relationships**: `1 Creator : N Proposals`, `1 Creator : N MediaAssets`.
- **Visibility**: **NEVER PUBLIC**. Private to creator session.
- **Lifecycle**: Created on signup; updated on profile changes; soft-deleted upon account termination.
- **Status**: CONFIRMED REQUIREMENT.

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Primary key
email                VARCHAR      NOT NULL      Unique login email
password_hash        VARCHAR      NULLABLE      Hashed credentials (or auth provider ID)
created_at           TIMESTAMPTZ  NOT NULL      Account creation timestamp
updated_at           TIMESTAMPTZ  NOT NULL      Last profile update timestamp
status               ENUM         NOT NULL      ACTIVE, SUSPENDED, DELETED
media_storage_bytes  BIGINT       NOT NULL      Cumulative media usage tracker
```

### 2.2 Proposal
- **Purpose**: Lifecycle container and metadata aggregate for a proposal.
- **Ownership**: Belongs to `Creator`.
- **Relationships**: `N Proposals : 1 Creator`, `1 Proposal : 1 DraftContent`, `1 Proposal : N Snapshots`, `1 Proposal : N Responses`.
- **Visibility**: Metadata is **NEVER PUBLIC**. Public visibility is projected exclusively via `PublicationSnapshot` when in `PUBLISHED` state.
- **Lifecycle**: Created in `DRAFT`; transitions to `PUBLISHED`, `UNPUBLISHED`, or `DELETED`.
- **Status**: CONFIRMED REQUIREMENT.

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Internal primary key
creator_id           UUID         NOT NULL      Foreign key -> Creator.id
title                VARCHAR      NOT NULL      Internal title (for creator studio list)
slug                 VARCHAR      NOT NULL      Unique public URL identifier (e.g. "for-sophia-x7k9")
status               ENUM         NOT NULL      DRAFT, PUBLISHED, UNPUBLISHED, DELETED
theme_id             VARCHAR      NOT NULL      Identifier of active theme template (e.g. "celestial-rose")
active_snapshot_id   UUID         NULLABLE      Foreign key -> PublicationSnapshot.id (null if never published)
created_at           TIMESTAMPTZ  NOT NULL      Record initialization timestamp
updated_at           TIMESTAMPTZ  NOT NULL      Record modification timestamp
published_at         TIMESTAMPTZ  NULLABLE      Timestamp of most recent publication
```

### 2.3 Proposal Content (Draft Payload)
- **Purpose**: Complete working narrative data authored by the creator.
- **Ownership**: Belongs to `Proposal`.
- **Relationships**: `1 DraftContent : 1 Proposal`.
- **Visibility**: **NEVER PUBLIC**. Strictly authenticated to owner.
- **Lifecycle**: Initialized with defaults on Proposal creation; updated via autosave/manual save.
- **Status**: CONFIRMED REQUIREMENT.

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

### 2.4 Publication Snapshot
- **Purpose**: Immutable snapshot of the content at the moment of publication. Serves public recipient traffic without risk from in-flight draft edits.
- **Ownership**: Belongs to `Proposal`.
- **Relationships**: `N Snapshots : 1 Proposal`.
- **Visibility**: **PUBLIC AFTER PUBLISH** (via public projection filter).
- **Lifecycle**: Generated upon "Publish" or "Update Published Version". Superseded snapshots remain archived for rollback or audit.
- **Status**: ARCHITECTURAL PROPOSAL.

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Primary key
proposal_id          UUID         NOT NULL      Foreign key -> Proposal.id
version_number       INTEGER      NOT NULL      Monotonically increasing version index
theme_id             VARCHAR      NOT NULL      Theme ID at time of publication
snapshot_payload     JSONB        NOT NULL      Full frozen story and presentation state
content_hash         VARCHAR      NOT NULL      SHA-256 digest of payload for cache ETag
created_at           TIMESTAMPTZ  NOT NULL      Snapshot timestamp
```

### 2.5 Media Asset
- **Purpose**: Tracks binary media uploaded by creators (images, future audio).
- **Ownership**: Belongs to `Creator`.
- **Relationships**: `N MediaAssets : 1 Creator`.
- **Visibility**: **PRIVATE UNTIL PUBLISHED**. When referenced in an active `PublicationSnapshot`, public projection serves an optimized, public URL. Unreferenced or draft-only media is private.
- **Lifecycle**: Uploaded to staging; validated & sanitized; assigned to proposal content; soft-deleted if removed.
- **Status**: CONFIRMED REQUIREMENT.

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
- **Visibility**: **NEVER PUBLIC**. Readable only by proposal's creator.
- **Lifecycle**: Created upon recipient response submission. Append-only.
- **Status**: ARCHITECTURAL PROPOSAL.

*ILLUSTRATIVE Field Schema*:
```
Field Name           Type         Nullability   Description
id                   UUID         NOT NULL      Primary key
proposal_id          UUID         NOT NULL      Foreign key -> Proposal.id
snapshot_id          UUID         NOT NULL      Foreign key -> PublicationSnapshot.id
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
                    │ billing/quota (PRIVATE)      │
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
- **Creator Account Deletion**: Triggers soft-deletion of all associated proposals, snapshots, and responses. Media assets are queued for asynchronous deletion from object storage after a 14-day recovery buffer.
- **Proposal Deletion**: Immediately revokes the public slug (returns 404). Database record is soft-deleted (`status = DELETED`).

### 5.2 Unpublish Policy
- When a proposal is unpublished:
  - `status` transitions from `PUBLISHED` to `UNPUBLISHED`.
  - The public route `/p/[slug]` immediately yields a generic `404 Not Found`.
  - All draft content and previous publication snapshots remain safely stored in the creator's private account for future reactivation.

### 5.3 Retention & Backups (Directional Proposal)
- Daily encrypted snapshots of the relational database.
- Object storage bucket versioning enabled with a 30-day lifecycle retention to protect against accidental file deletion or corruption.
- Responses are retained indefinitely unless deleted by the creator or upon account deletion.
