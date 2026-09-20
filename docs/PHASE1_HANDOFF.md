# Phase 1 Handoff: Product & Architecture Specification

**Project**: Proposera  
**Phase**: Phase 1 — Product & Architecture Specification  
**Git Branch**: `main`  
**Status**: Specification Only Complete (Zero Implementation)

---

## 1. What Was Decided

All items below originate directly from owner instructions, prompt constraints, or confirmed requirements:

1. **Dual Distinct Experiences**: Independent Creator Studio (authoring, settings, previews) and Recipient Experience (intimate, mobile-first, distraction-free narrative). *(Source: Phase 1 Prompt, Section 3)*
2. **Content vs. Presentation Separation**: Proposal content (partner details, memories, letters, question) is strictly decoupled from themes. Changing a theme never alters or corrupts content. *(Source: Phase 1 Prompt, Section 3)*
3. **Unified Rendering Layer**: The Creator Preview and the live Recipient Experience share the exact same Scene Orchestrator and scene components. *(Source: Phase 1 Prompt, Section 3)*
4. **Authoritative Server-Side Validation & Auth**: Zero trust in client validation alone; strict ownership verification on every creator endpoint; drafts and unpublished proposals return an identical 404 to unauthenticated outsiders. *(Source: Phase 1 Prompt, Section 3)*
5. **Non-Manipulative & Accessible Response**: Proposal response interaction prohibits deceptive mechanics (no fleeing buttons) and strictly supports accessible controls and reduced motion. *(Source: Phase 1 Prompt, Section 3)*
6. **Mobile-First Sensory Baseline**: Recipient experience is engineered primarily for mobile phone viewports (360px–430px) with touch targets $\ge 48\times 48\text{ px}$. *(Source: Phase 1 Prompt, Section 3)*
7. **Public Creator Signup Without Paywall (DEC-008 / Q1)**: Creators may publicly sign up. Proposal authoring and live publishing are directly available without payment. Proposera MVP has NO paywall; Razorpay is not required for publishing. *(Source: Owner Decision Q1)*
8. **Persisted Recipient Responses (DEC-002 / Q2)**: Recipient responses (affirmative choice, timestamp, optional message) MUST be stored in the database and visible to the creator in Creator Studio. *(Source: Owner Decision Q2)*
9. **Public Proposal Access via Secret URL (DEC-009 / Q3)**: Recipient accesses proposal via unguessable random slug (`/p/[slug]`) without authentication (no recipient login/accounts/passwords). Creator DOES authenticate. *(Source: Owner Decision Q3)*
10. **Live Mutable Published Proposals (DEC-007 / Q4)**: Published proposals are live and mutable. Edits immediately update the published experience upon saving. Immutable publication snapshots are explicitly REJECTED for MVP. Proposal version history/rollback is DEFERRED. *(Source: Owner Decision Q4)*

---

## 2. What Was Proposed

### 2.1 ONE-WAY Decisions (Listed First)
- **Relational Aggregate with Document Content (DEC-010)**: Core metadata (`Proposal`, `Creator`, `MediaAsset`, `Response`) stored in relational tables, with narrative story milestones stored as structured, versioned JSON documents.
- **Scene-Based Flow Architecture (DEC-006)**: Recipient presentation structured as a progressive state-machine scene flow (`Intro -> Timeline -> Reveal Climax -> Response -> Celebration`).

### 2.2 Reversible / Costly Decisions
- **Dedicated Recipient Route Namespace (DEC-008)**: Dedicated `/p/[slug]` route pattern to avoid collisions with system routes and enable clean edge caching.
- **Strict Non-Disclosing 404 Policy (DEC-009)**: Draft, unpublished, deleted, and non-existent proposals return an identical generic error page to preserve relationship privacy.
- **Candidate Full-Stack Technology Stack (DEC-010)**: Next.js (TypeScript), Neon Serverless PostgreSQL, Cloudflare R2 object storage with CDN.

---

## 3. What Was Deferred

| Item | Target Phase | Dependency / Reason |
| :--- | :--- | :--- |
| **Creator Authentication & Session Implementation** | Phase 2 | Concrete implementation deferred to Phase 2 (Public signup decided in Q1). |
| **Database Migrations & ORM Implementation** | Phase 2 | Concrete implementation deferred to Phase 2 (Live mutable model decided in Q4). |
| **Razorpay Payment Gateway Integration** | Removed | Removed from MVP per product decision (publishing is free for authenticated creators). |
| **Media Upload Worker & Ingestion Pipeline** | Phase 6 | Requires object store provisioning and API scaffolding. |
| **Ambient Music Engine & Autoplay Handler** | Phase 7 | Depends on Q5 audio source decision. |
| **Playful Micro-Interactions (Scratch/Flip)** | Phase 8 | Non-blocking narrative enhancement. |
| **Proposal Version History, Rollback & Snapshots** | Phase 9+ | Snapshot model rejected for MVP (DEC-007 / Q4); deferred to future enterprise tier. |
| **Optional Recipient Passcode Protection** | Phase 9+ | Secret slug sufficient for MVP (DEC-009 / Q3); optional PIN protection deferred. |
| **Collaborative Proposal Co-Authoring** | Phase 12 | Out of scope for single-creator MVP. |
| **Custom Domain Mapping (CNAME)** | Phase 13 | Advanced feature requiring wildcard SSL management. |
| **Video Ingestion & Transcoding** | Phase 14 | Bandwidth and transcoding costs exceed MVP scope. |

---

## 4. Files Created / Updated

All files are created exclusively under `docs/` in accordance with Section 9:
- [`docs/PRODUCT_SPEC.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/PRODUCT_SPEC.md): Roles, user journeys, proposal lifecycle, boundary matrix, scope tiers, and confirmed requirements register.
- [`docs/DATA_MODEL.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/DATA_MODEL.md): Entity definitions, illustrative schemas, content/presentation separation invariants, public projection allowlist, and lifecycle rules.
- [`docs/ROUTING.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/ROUTING.md): Information architecture, route table, `/p/[slug]` strategy, preview isolation, error non-disclosure, and routing scalability.
- [`docs/ARCHITECTURE.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/ARCHITECTURE.md): System layers, scene-based rendering contract, unified preview/live engine, media pipeline, extensibility, and privacy-safe telemetry.
- [`docs/SECURITY.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/SECURITY.md): Auth architecture, authorization matrix, XSS/CSRF mitigations, public surface inventory, upload security, CSP, and threat model.
- [`docs/DESIGN_SYSTEM.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/DESIGN_SYSTEM.md): Mobile-first ergonomics, performance budgets, token taxonomy, component primitives, motion principles, and theme decoupling.
- [`docs/TESTING_AND_DEPLOYMENT.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/TESTING_AND_DEPLOYMENT.md): Testing pyramid, critical E2E journey, authorization test matrix, viewport matrix, candidate infrastructure, and recovery direction.
- [`docs/DECISIONS.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/DECISIONS.md): Phase 0 baseline, decision records (DEC-001 through DEC-010), open questions (Q1–Q8), and deferred work register.
- [`docs/PHASE1_HANDOFF.md`](file:///c:/Users/akrit/OneDrive/Desktop/Proposera/docs/PHASE1_HANDOFF.md): Final verification, handoff report, and evidence table.

---

## 5. Architectural Tradeoffs

1. **Live Mutable Proposals vs. Snapshot-Based Publishing**:
   - *Chosen*: Live Mutable Publishing (DEC-007 / Q4).
   - *Tradeoff*: Edits to published proposals update the live `/p/[slug]` route immediately upon saving. Provides a simpler database schema and lower operational complexity for MVP. Snapshot version history and rollback are deferred to Phase 9+.
2. **Document-Based Content vs. Fully Normalized Tables**:
   - *Chosen*: Structured JSON content document with relational root aggregates.
   - *Tradeoff*: Querying individual milestone properties across all proposals is less relational, but ordering, editing, and versioning a cohesive story narrative is atomic and drift-free.
3. **Dedicated Route `/p/[slug]` vs. Root Vanity Route `/[slug]`**:
   - *Chosen*: `/p/[slug]`.
   - *Tradeoff*: Minor 3-character URL prefix, but eliminates all routing collisions with system endpoints and simplifies edge caching rules.

---

## 6. Open Questions Register

The following questions have been resolved by owner decisions:
- **Q1 (Creator Signup & Publishing)**: **DECIDED (Revised)**. Public creator signup without paywall. Publishing is available to authenticated creators without payment. Razorpay is not required.
- **Q2 (Response Persistence)**: **DECIDED**. Recipient responses must be persisted and visible to creator in Creator Studio.
- **Q3 (Public Proposal Access)**: **DECIDED**. Public proposal access via secret unguessable URL; zero recipient authentication (no accounts/passwords/PINs). Creator authenticates.
- **Q4 (Edit After Publish)**: **DECIDED**. Published proposals are live and mutable. Edits immediately update live view. Immutable snapshots rejected for MVP.

The following open questions remain awaiting owner decision:
- **Q1-A**: Razorpay commercialization details (REMOVED: No paywall in MVP).
- **Q5**: Music source policy (Proposed default: Curated royalty-free ambient tracks in MVP).
- **Q6**: Supported device and browser baseline (Proposed default: Modern mobile Safari/Chrome, evergreen desktop).
- **Q7**: Language and script scope (Proposed default: English UI, arbitrary UTF-8 narrative text).
- **Q8**: Data retention and deletion expectations (Proposed default: Indefinite retention with soft-delete grace period).

---

## 7. Known Risks & Mitigations

1. **Mobile Audio Autoplay Restrictions**:
   - *Risk*: Browsers block unprompted background music.
   - *Mitigation*: Audio playback is attached to the recipient's first physical tap ("Begin Story") with gentle volume fade-in and a visible toggle.
2. **Image Decompression Exploits & High Egress**:
   - *Risk*: Creators upload multi-megabyte images that exhaust memory and incur high bandwidth costs.
   - *Mitigation*: Server-side magic-byte verification, image re-encoding to WebP, dimension caps, and zero-egress Cloudflare R2 storage.
3. **Accidental Exposure of Private Proposals**:
   - *Risk*: In-progress proposals indexed by Google or viewed via sequential slug guessing.
   - *Mitigation*: Unguessable slug entropy, global `noindex, nofollow` headers, robots.txt exclusion, and strict 404 non-disclosure for drafts.

---

## 8. Dependencies Added, If Any

**NONE**. In accordance with Phase 1 constraints, zero dependencies were installed or added to `package.json`.

---

## 9. Tests & Baseline Checks Executed

All verification checks were executed against the Phase 1 documentation changes on the working tree. No application-code changes were present.

- **Read-Only Baseline Inspection**: Evaluated package manifests and test scripts. Result: 0 packages installed, 0 failures.
- **Git Status & Working Tree Integrity**: Verified `git status` and `git diff --stat`. Only documentation files in `docs/` are modified (intentionally uncommitted Phase 1 specifications); zero application files modified.
- **Formatting & Whitespace Check**: Verified `git diff --check`. 0 whitespace or formatting errors.
- **Secret Scan**: Grep scan across `docs/` confirmed zero credentials, access tokens, or private keys.

---

## 10. Acceptance Criteria Evidence Table

| Requirement / Criterion | Document Location | Specific Section & Evidence |
| :--- | :--- | :--- |
| **Creator & Recipient Separation** | `docs/PRODUCT_SPEC.md` | Section 2 ("Roles & Personas") & Section 5 ("Creator/Recipient Boundary Matrix") |
| **Proposal Lifecycle & States** | `docs/PRODUCT_SPEC.md` | Section 4 ("Proposal Lifecycle & State Transitions") |
| **Scope Tiers (Must / Should / Future)**| `docs/PRODUCT_SPEC.md` | Section 6 ("Scope Tiers") |
| **Response Principles & Accessibility** | `docs/PRODUCT_SPEC.md` | Section 7 ("Response & Interaction Principles") |
| **Confirmed Requirements Register** | `docs/PRODUCT_SPEC.md` | Section 8 ("Confirmed Requirements Register") |
| **Entity Evaluation & Field Schemas** | `docs/DATA_MODEL.md` | Section 1 ("Entity Architecture") & Section 2 ("Entity Specifications") |
| **Content vs. Presentation Invariant** | `docs/DATA_MODEL.md` | Section 3 ("Content vs. Presentation Separation") |
| **Public Projection Allowlist** | `docs/DATA_MODEL.md` | Section 4 ("Public Projection & Visibility Allowlist") |
| **Route Architecture & Matrix** | `docs/ROUTING.md` | Section 1 ("Information Architecture") & Section 2 ("Route Matrix") |
| **Public Slug Strategy & Non-Disclosure**| `docs/ROUTING.md` | Section 3 ("Public Route Strategy") & Section 5 ("Error Behavior & Non-Disclosure") |
| **System Layers & Trust Boundaries** | `docs/ARCHITECTURE.md` | Section 1 ("Architectural Layers & Boundaries") |
| **Scene-Based Rendering Contract** | `docs/ARCHITECTURE.md` | Section 2 ("Rendering Architecture: Scene-Based Model") |
| **Media Pipeline & EXIF Sanitization** | `docs/ARCHITECTURE.md` | Section 3 ("Media Ingestion & Delivery Pipeline") |
| **Privacy-Safe Observability** | `docs/ARCHITECTURE.md` | Section 5 ("Privacy-Safe Observability & Telemetry") |
| **Security, Auth & Threat Model** | `docs/SECURITY.md` | Section 2 ("Authorization Matrix"), Section 6 ("CSP"), Section 9 ("Threat Model") |
| **Design System & Motion Principles** | `docs/DESIGN_SYSTEM.md` | Section 1 ("Ergonomic Baseline"), Section 3 ("Tokens"), Section 5 ("Motion") |
| **Testing Pyramid & Critical E2E Flow**| `docs/TESTING_AND_DEPLOYMENT.md`| Section 1 ("Testing Strategy") & Section 2 ("Critical E2E Journey") |
| **Deployment Candidates & Recovery** | `docs/TESTING_AND_DEPLOYMENT.md`| Section 6 ("Deployment Architecture") & Section 7 ("Operational Lifecycle") |
| **Decision Records & Labels** | `docs/DECISIONS.md` | Section 2 ("Decision Records: DEC-001 through DEC-011") |
| **Open Questions Register** | `docs/DECISIONS.md` | Section 3 ("Open Questions Register: Q1–Q4 DECIDED, Q1-A & Q5–Q8 OPEN") |

---

## 11. Phase 2 Prerequisites

Before initiating Phase 2 (Foundation & Setup), the owner may:
1. Review and confirm the updated Phase 1 specifications and decision records in `docs/DECISIONS.md`.
2. Note that Razorpay is removed from the MVP and proposal publishing is free for authenticated creators.
3. Confirm if SHOULD-HAVE capabilities (Playful Micro-Interactions, Ambient Music, Response Notifications) are included in early Phase 2 domain models.
4. If instructed, commit the documentation files using: `docs(phase-1): complete product and architecture specification`.
