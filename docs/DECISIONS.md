# Architecture Decisions, Baseline & Open Questions: Proposera

## 1. Phase 0 Baseline Summary & Check Results

### 1.1 Phase 0 Baseline Sources
- **Repository State**: Clean working tree on branch `main`, tracking remote `origin/main` at commit `469e157`.
- **Existing Files & Sources**:
  - `README.md` ([README.md](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/README.md)): Documents root project structure (`frontend/`, `backend/`, `README.md`).
  - `.gitignore` ([.gitignore](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/.gitignore)): Standard multi-ecosystem ignore file for Node and Python runtimes.

### 1.2 Baseline Read-Only Check Results (Step 1)
- **Check Command**: `npm test` / `npm run lint` / `npm run build` evaluation.
- **Result**: No `package.json`, build manifests, or test scripts currently exist in the repository root or subfolders. Baseline execution is clear with 0 errors.
- **Tracked Files Integrity**: Confirmed 0 tracked files were modified during baseline inspection.

---

## 2. Decision Records

### DEC-001: Separation of Creator Studio and Recipient Presentation
- **Decision**: Architect two completely distinct experiences: an authenticated Creator Studio and a public, distraction-free Recipient Experience.
- **Status**: **DECIDED**
- **Source**: Phase 1 Prompt, Section 3 ("Two distinct experiences: creator and recipient").
- **Reason**: Creators require rich editing tools, media management, and configuration forms. Recipients require an intimate, immersive romantic narrative without any dashboard controls or app chrome.
- **Alternatives Considered**: Unified single-page app with conditional creator overlays. (Rejected: Leaks authoring code to recipients; ruins emotional immersion).
- **Tradeoffs**: Requires distinct routing trees and bundle splitting.
- **Consequences**: Recipient bundle remains ultra-lightweight ($< 120\text{ KB}$); zero creator tooling ships to partner.
- **Reversibility**: COSTLY.

---

### DEC-002: Strict Content vs. Presentation Invariant
- **Decision**: Content data (partner details, messages, timeline, media references) is strictly decoupled from presentation themes. Switching or customizing themes must never alter or destroy content.
- **Status**: **DECIDED**
- **Source**: Phase 1 Prompt, Section 3 ("Content is separate from theme; changing theme must never change or destroy content").
- **Reason**: Prevents catastrophic loss of personal romantic writing when exploring visual templates.
- **Alternatives Considered**: Themes storing bespoke content schemas. (Rejected: Switching themes causes data loss or migration headaches).
- **Tradeoffs**: Themes must adhere to a standardized semantic content interface and gracefully handle unstyled blocks.
- **Consequences**: Guarantees zero data loss across theme changes; simplifies theme ecosystem development.
- **Reversibility**: ONE-WAY.

---

### DEC-003: Unified Shared Scene Renderer
- **Decision**: The Recipient Experience and the Creator Preview mode share the exact same Scene Orchestrator and scene components.
- **Status**: **DECIDED**
- **Source**: Phase 1 Prompt, Section 3 ("Preview and published rendering should share one rendering layer").
- **Reason**: Prevents parity bugs where what the creator previews does not match what the recipient experiences.
- **Alternatives Considered**: Separate preview component and recipient renderer. (Rejected: Inevitable visual drift and double maintenance).
- **Tradeoffs**: Renderer must be cleanly abstracted to accept both draft data and published live data.
- **Consequences**: 100% visual and behavioral parity guaranteed between preview and live delivery.
- **Reversibility**: COSTLY.

---

### DEC-004: Server-Side Enforcement of Authorization and Validation
- **Decision**: Server-side validation and authorization are authoritative; client-side validation is never trusted alone. Non-owners cannot access other creators' proposals. Unpublished proposals return generic 404.
- **Status**: **DECIDED**
- **Source**: Phase 1 Prompt, Section 3 ("Server-side validation and authorization... Client-side file validation is never trusted alone").
- **Reason**: Protects creator privacy, relationship intimacy, and system integrity against IDOR, tampering, and malicious uploads.
- **Alternatives Considered**: Client-side filtering or relying on unguessable IDs alone without ownership verification. (Rejected: Catastrophic security vulnerability).
- **Tradeoffs**: Every API call performs session verification and DB ownership resolution.
- **Consequences**: Robust security posture; zero data leakage.
- **Reversibility**: ONE-WAY.

---

### DEC-005: Non-Manipulative, Accessible Response Mechanics
- **Decision**: The proposal reveal interaction must not use manipulative mechanics (e.g. fleeing "No" buttons) and must adhere to strict accessibility standards.
- **Status**: **DECIDED**
- **Source**: Phase 1 Prompt, Section 3 ("The response interaction must not use manipulative mechanics that prevent a genuine choice, and must be accessible").
- **Reason**: Genuine human agency and dignity are essential to authentic relationship milestones.
- **Alternatives Considered**: Playful fleeing decline button. (Rejected: Coercive, patronizing, and inaccessible to assistive technology).
- **Tradeoffs**: Emotional delight must be generated through beautiful pacing and celebration rather than gimmicks.
- **Consequences**: WCAG 2.1 AA compliant; respectful romantic interaction.
- **Reversibility**: REVERSIBLE.

---

### DEC-006: Scene-Based Flow Architecture for Recipient Experience
- **Decision**: Structure the recipient presentation as a sequential, scene-based state machine (`Intro -> Timeline -> Climax -> Response -> Celebration`).
- **Status**: **PROPOSED**
- **Source**: Architectural recommendation based on Product Spec requirements.
- **Reason**: Proposals are emotional narratives best experienced one beat at a time on mobile screens without infinite scroll fatigue.
- **Alternatives Considered**: Continuous vertical scrolling webpage; multi-tab document.
- **Tradeoffs**: Requires orchestrating scene transition timings and keyboard/touch navigation.
- **Consequences**: Delivers high emotional impact, predictable pacing, and controlled audio/visual reveals.
- **Reversibility**: REVERSIBLE.

---

### DEC-007: Live Mutable Published Proposal Model
- **Decision**: Published proposals are live and mutable. If the creator edits the proposal after publishing, the published experience updates immediately without requiring separate publication snapshots.
- **Status**: **DECIDED**
- **Source**: Owner Decision Q4 (Phase 1 Owner Decision Update).
- **Reason**: Simplifies publishing flow and gives creators immediate control over live updates.
- **Alternatives Considered**: Immutable publication snapshot model (previously proposed; rejected by owner).
- **Tradeoffs**: Edits made after publishing are immediately visible to anyone visiting the live URL. (Version history / snapshot rollback deferred to future phases as a PROPOSED feature).
- **Consequences**: Streamlined data model: proposal content is stored and edited directly, with live public projections reflecting the latest state when status is PUBLISHED.
- **Reversibility**: REVERSIBLE.

---

### DEC-011: Public Creator Signup Without Paywall (No Payment Gate)
- **Decision**: Proposera permits public creator registration. Proposal authoring and live publishing are available to authenticated creators without payment. Proposera MVP has NO paywall, and Razorpay/payment is not required for publishing.
- **Status**: **DECIDED (Revised)**
- **Source**: Owner Decision (Revised - Paywall Removed from MVP).
- **Reason**: Removes onboarding friction and payment barriers; allows seamless romantic journey creation and publishing for authenticated creators without payment gate.
- **Alternatives Considered**: Paid Razorpay paywall, subscription models (both rejected for MVP).
- **Tradeoffs**: No upfront monetization in MVP; maximum adoption and friction-free user delight.
- **Consequences**: Zero payment integration complexity, zero webhook dependency, zero payment credentials needed.
- **Reversibility**: REVERSIBLE.

---

### DEC-008: Dedicated Recipient Namespace (`/p/[slug]`)
- **Decision**: Host recipient proposal experiences under `/p/[slug]`.
- **Status**: **PROPOSED**
- **Source**: Architectural evaluation in `docs/ROUTING.md`.
- **Reason**: Clear namespace isolation; eliminates collisions with system routes (`/app`, `/auth`, `/api`); clean URL sharing.
- **Alternatives Considered**: Root slug `/[slug]` (risk of collisions); subdomains (DNS/SSL complexity).
- **Tradeoffs**: Adds a 3-character prefix to links.
- **Consequences**: Zero routing conflicts; clear edge caching rules.
- **Reversibility**: REVERSIBLE.

---

### DEC-009: Strict Non-Disclosing Error Behavior
- **Decision**: Missing slugs, drafts, unpublished proposals, and deleted proposals all return an identical, non-disclosing 404 response.
- **Status**: **PROPOSED**
- **Source**: Security evaluation in `docs/ROUTING.md` and `docs/SECURITY.md`.
- **Reason**: Conceals existence of relationship milestones, private drafts, or relationship breakups from third-party snoopers.
- **Alternatives Considered**: Descriptive error pages ("Draft mode", "Proposal has been taken down").
- **Tradeoffs**: Creators who test their live link while logged out might be confused if they forgot to publish. (Mitigated by clear indicator in Studio UI).
- **Consequences**: Complete privacy protection against slug scanning.
- **Reversibility**: REVERSIBLE.

---

### DEC-010: Candidate Stack & Infrastructure Evaluation
- **Decision**: Propose Next.js full-stack (React/TypeScript), Neon Serverless PostgreSQL, and Cloudflare R2 object storage.
- **Status**: **PROPOSED**
- **Source**: Technology evaluation per Phase 1 Section 3 criteria.
- **Evaluation Criteria**: Owner control, low-scale cost (free/negligible tiers), minimal operational burden, standard portability, security features, mobile performance.
- **Alternatives Considered**:
  - *Full-stack*: Next.js vs. FastAPI + React vs. Remix. (Next.js provides unified TypeScript contracts between studio and shared scene renderer).
  - *Database*: Neon vs. Supabase vs. Self-hosted Postgres. (Neon offers instant branching, serverless scale-to-zero, standard SQL).
  - *Storage*: Cloudflare R2 vs. AWS S3. (Cloudflare R2 eliminates egress fees for high-res photo delivery).
- **Tradeoffs**: Next.js full-stack couples backend and frontend deployment.
- **Consequences**: Rapid development velocity, unified types, zero egress cost.
- **Reversibility**: COSTLY.

---

## 3. Owner Decision Register & Open Questions

### 3.1 Owner Decision Register (Resolved)

#### Q1 — Creator Signup & Publishing
- **Status**: **DECIDED (Revised)**
- **Decision**: Public creator signup without paywall. Proposera allows creators to publicly register. Proposal creation, authoring, and live publishing are directly available to authenticated creators without payment. Razorpay is NOT part of the MVP and is not required for publishing.

#### Q2 — Response Persistence
- **Status**: **DECIDED**
- **Decision**: Recipient responses are persisted and visible to the creator. When the recipient responds, the choice and timestamp are persisted in the database, and the creator can view the response in the creator studio. Database/API implementation is DEFERRED to Phase 3.

#### Q3 — Public Link Protection
- **Status**: **DECIDED**
- **Decision**: Secret/random proposal URL; creator authentication required; recipient authentication not required. The recipient does NOT need to authenticate or log in. The creator DOES authenticate. Access is mediated by possession of an unguessable secret URL (`/p/[slug]`).

#### Q4 — Edit After Publish
- **Status**: **DECIDED**
- **Decision**: Published proposals are live mutable experiences and update immediately when edited. If the creator edits the proposal after publishing, the published experience changes accordingly. Immutable publication snapshots are not part of the active architecture.

---

### 3.2 Remaining Open Questions Register (Awaiting Owner Decision)

#### Q1-A: Razorpay Commercialization Specifics
- **Status**: **REMOVED / DEPRECATED**
- **Resolution**: Proposera MVP has no paywall; Razorpay/payment is removed from MVP scope. No commercialization gate is required for proposal publishing.

---

### Q5: Music source: creator uploads, third-party embeds, curated library, or deferred from MVP?
- **Why It Matters**: Affects audio licensing, copyright liability, mobile autoplay constraints, and storage bandwidth.
- **Options**:
  - *Option A*: Curated royalty-free romantic audio library provided by Proposera (5–10 ambient tracks).
  - *Option B*: Creator direct audio file upload (MP3/AAC).
  - *Option C*: Third-party audio embeds (Spotify / Apple Music widget).
  - *Option D*: Deferred from initial MVP.
- **Tradeoffs**: Option B introduces copyright risk and large files. Option C embeds clunky widgets that destroy romantic visual immersion. Option A guarantees elegance, legal safety, and optimal compression.
- **PROPOSED Default**: **Option A (Curated royalty-free ambient tracks)** for initial rollout, with Option B deferred to Phase 8.
- **Blocking Phase**: Blocks Phase 7 (Media & Audio Engine).

---

### Q6: Supported browsers, devices, and network conditions.
- **Why It Matters**: Determines CSS feature support, touch event handling, audio policy implementation, and asset optimization targets.
- **Options**:
  - *Option A*: Modern evergreen mobile browsers (iOS Safari 16+, Chrome/Firefox on Android 12+) and modern desktop browsers (last 2 versions), targeting 3G/4G network profiles.
  - *Option B*: Broad legacy support including older iOS/Android webviews.
- **Tradeoffs**: Legacy support inflates JS bundle size with polyfills and complicates CSS styling.
- **PROPOSED Default**: **Option A (Modern evergreen mobile and desktop)**.
- **Blocking Phase**: Blocks Phase 5 (Frontend Rendering & Scene Engine).

---

### Q7: Language, script, and text-direction scope for content and UI.
- **Why It Matters**: Dictates font loading strategies, bidirectional CSS (LTR/RTL), and layout flexibility.
- **Options**:
  - *Option A*: English-first UI; content supports arbitrary UTF-8 text (including emojis, accents, non-Latin scripts), LTR layout baseline.
  - *Option B*: Full multi-lingual UI with immediate RTL (Right-to-Left) mirroring.
- **Tradeoffs**: Full RTL requires extensive CSS logical properties testing across all themes in MVP.
- **PROPOSED Default**: **Option A (English UI, universal UTF-8 content support; explicit RTL layouts deferred)**.
- **Blocking Phase**: Blocks Phase 5 (Design System & Typography Implementation).

---

### Q8: Retention and deletion expectations for proposals, media, and responses.
- **Why It Matters**: Determines database pruning jobs, soft-delete rules, object store lifecycle policies, and compliance obligations.
- **Options**:
  - *Option A*: Indefinite retention until creator triggers deletion; soft-deletion with 14-day recovery window; hard asset wipe on 30 days.
  - *Option B*: Time-limited temporary hosting (e.g. proposals auto-expire 90 days after publication).
- **Tradeoffs**: Proposals are lifelong sentimental memories; auto-expiration destroys user trust.
- **PROPOSED Default**: **Option A (Indefinite retention until creator-initiated deletion, soft-delete recovery window)**.
- **Blocking Phase**: Blocks Phase 2 (Data Storage & Lifecycle Implementation).

---

## 4. Deferred Work Register

The following items are recognized as out-of-scope for Phase 1 and are intentionally deferred:

| Deferred Capability | Target Phase | Dependency / Reason |
| :--- | :--- | :--- |
| **Creator Authentication Implementation** | Phase 2 | Scheduled for implementation following Q1 public signup decision. |
| **Razorpay Payment & Entitlement Integration** | REMOVED | Removed from MVP per product decision (publishing is free for authenticated creators). |
| **Database Migrations & ORM Setup** | Phase 2 | Scheduled for implementation following live mutable data model approval. |
| **Media Upload Ingestion Worker** | Phase 6 | Requires object store provisioning and API scaffolding. |
| **Curated Audio Engine & Autoplay Handler**| Phase 7 | Depends on Q5 resolution. |
| **Playful Micro-Interactions (Scratch/Flip)**| Phase 8 | Non-blocking enhancement to core narrative flow. |
| **Proposal Version History & Rollback** | Phase 9 | Future enhancement; published proposals remain live mutable in MVP. |
| **Collaborative Proposal Co-Authoring** | Phase 12 | Requires multi-tenant permissions and conflict resolution. |
| **Custom Domain Mapping (CNAME)** | Phase 13 | Requires automated SSL certificate provisioning. |
| **Video Ingestion & Transcoding** | Phase 14 | Requires dedicated video processing pipeline and CDN budget. |
