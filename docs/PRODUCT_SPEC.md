# Product Specification: Proposera

## 1. Product Purpose & Overview

**Proposera** is a standalone, data-driven proposal experience platform designed to create deeply personal, emotionally resonant, and beautifully orchestrated digital proposal experiences.

The platform deliberately decouples **content** (the narrative, partner details, romantic memories, photos, letters, and the proposal reveal) from **presentation** (visual themes, typographic treatments, layout variations, ambient pacing, and celebration animations). This separation guarantees that a creator can evolve or pivot visual themes without risking content loss, structural corruption, or narrative drift.

Proposera serves two fundamentally distinct experiences:
1. **The Creator Studio**: An authoring, customization, preview, and lifecycle management environment for the person crafting the proposal.
2. **The Recipient Experience**: A focused, mobile-first, distraction-free, narrative-driven presentation crafted exclusively for the partner receiving the proposal.

---

## 2. Roles & Personas

### 2.1 Creator (Author / Account Owner)
- **Definition**: The individual planning and delivering the proposal.
- **Intent**: Craft a highly tailored digital journey celebrating a shared relationship, preview it with fidelity, publish it to a shareable URL, present or send it to their partner, and manage its state (unpublish, update slug, or edit).
- **Authentication**: Authenticated user (session/token-based).
- **Privilege Level**: Full write and read access exclusively to their own created proposals, media, and configurations. Zero access to other creators' proposals.

### 2.2 Recipient (Partner)
- **Definition**: The partner experiencing the proposal.
- **Intent**: Experience a romantic, emotionally coherent narrative culminating in a meaningful question and celebration.
- **Authentication**: Unauthenticated by default (accesses via a unique shareable public slug or link token).
- **Privilege Level**: Read-only access to published, public proposal projection data. Interaction privilege is strictly limited to submitting an emotional response. No access to creator drafts, dashboard routes, raw media buckets, or management controls.

### 2.3 Other Roles Evaluation
- **Platform Administrator**: Evaluated but **DEFERRED** to Phase 12 (Governance & Ops). No admin dashboard or system operator role is introduced in MVP to prevent premature complexity. System configuration remains infrastructure- and environment-driven.
- **Collaborator / Co-Author**: Evaluated and rejected for MVP. Proposals are intimate and single-author; multi-user collaboration introduces concurrency conflicts and access control overhead unnecessary for core value.

---

## 3. User Journeys

### 3.1 Creator Journey
1. **Account Access**: Creator lands on the Proposera platform and signs in or registers.
2. **Proposal Initialization**: Initiates a new proposal; system provisions a draft record with default structural scenes.
3. **Partner & Narrative Setup**: Enters partner details (names, nicknames, key dates, relationship milestones).
4. **Media Assembly**: Selects and uploads personal photos/media through an authenticated upload pipeline; system validates, sanitizes, and previews media.
5. **Message & Story Curation**: Writes romantic notes, memory narratives, and configures timeline scenes.
6. **Theme Selection**: Chooses a visual theme from available design templates; theme changes immediately reflect across rendering without altering content data.
7. **Interactive Elements Configuration**: Configures interactive moments, proposal reveal styling, and celebration effects (e.g., confetti dynamics).
8. **Fidelity Preview**: Enters preview mode, simulating the exact mobile recipient experience using live draft data within an isolated preview sandbox.
9. **Publication**: Commits to publish; system validates completeness, issues or confirms a shareable slug, and activates public availability.
10. **Delivery & Sharing**: Copies the verified shareable link to present in person (via mobile/tablet) or transmit directly.
11. **Post-Publish Lifecycle**: Creator can return to edit narrative, temporarily unpublish (revoking public access), or regenerate the access slug if link privacy is compromised.

### 3.2 Recipient Journey
1. **Access / Open**: Recipient opens the shared URL on their device (overwhelmingly mobile).
2. **Introduction / Hook**: Lands on a calm, elegant opening scene setting an intimate emotional tone without dashboard chrome, headers, footers, or navigational clutter.
3. **Personalized Story & Memories**: Advances through a sequential, scene-based narrative displaying shared milestones, romantic letters, photos, and memory vignettes at a comfortable, natural cadence.
4. **Interactive Moments**: Engages with gentle, optional interactive prompts (e.g., revealing a hidden note or memory checkpoint) that maintain focus and anticipation.
5. **The Proposal Reveal**: Reaches the focal climax of the experience—the marriage/partnership proposal question, styled with deliberate typographic and ambient focus.
6. **Response Selection**: Recipient encounters clear, respectful response options that honor genuine agency without manipulative UI traps, dark patterns, or inaccessible gimmicks.
7. **Celebration**: Upon selecting an affirmative response, a rich, joyous celebration experience unfolds (ambient confetti, celebratory music/visuals, closing heartfelt affirmation).

---

## 4. Proposal Lifecycle & State Transitions

```
                 [ Create ]
                     │
                     ▼
             ┌───────────────┐
      ┌─────►│     DRAFT     │◄────────────┐
      │      └───────┬───────┘             │
      │              │                     │
      │       [ Publish Action ]     [ Unpublish ]
      │              │                     │
      │              ▼                     │
[ Edit: New   ┌───────────────┐            │
 Draft Mode ] │   PUBLISHED   ├────────────┘
      │       └───────┬───────┘
      │               │
      └───────────────┴────────────► [ Soft Delete ]
```

### 4.1 State Definitions
- **DRAFT**: Editable proposal under active authoring. Content is private to the creator. Public URL does not resolve.
- **PUBLISHED**: Proposal is finalized and publicly accessible via its assigned shareable slug. Recipient view resolves the published projection.
- **UNPUBLISHED**: Proposal was previously published but has been temporarily suspended by the creator. Public URL ceases to resolve the proposal experience; renders an indistinguishable 404 or inactive screen.

### 4.2 Allowed Transitions Matrix

| Initial State | Action / Trigger | Target State | Recipient View | Creator Authorization |
| :--- | :--- | :--- | :--- | :--- |
| *(None)* | Create Proposal | **DRAFT** | Inaccessible (404) | Authenticated creator |
| **DRAFT** | Save / Autosave | **DRAFT** | Inaccessible (404) | Owner creator only |
| **DRAFT** | Open Preview | **DRAFT** | Inaccessible (Recipient cannot access; Creator sees preview in auth session) | Owner creator only |
| **DRAFT** | Publish | **PUBLISHED** | Active Recipient Experience | Owner creator only |
| **PUBLISHED** | Edit Content *(Option A: Live)* | **PUBLISHED** | Immediate reflection of edits | Owner creator only |
| **PUBLISHED** | Edit Content *(Option B: Snapshot)* | **PUBLISHED** (Live stays unchanged until republish; working copy is Draft) | Serves previous snapshot until republished | Owner creator only |
| **PUBLISHED** | Unpublish | **UNPUBLISHED** | Inaccessible (Generic Not Found / Unavailable) | Owner creator only |
| **UNPUBLISHED**| Re-publish | **PUBLISHED** | Active Recipient Experience | Owner creator only |
| **PUBLISHED** | Regenerate Slug | **PUBLISHED** (New Slug) | Old slug yields 404; New slug yields Active Experience | Owner creator only |
| **ANY** | Delete | **DELETED** (Soft) | Inaccessible (404) | Owner creator only |

### 4.3 Edit-After-Publish Tradeoff Evaluation *(Open Question Q4)*
- **Model 1: Direct Live Editing**:
  - *Mechanism*: Edits saved by the creator immediately update the public record.
  - *Tradeoffs*: Simple data model; zero branching. However, if the recipient opens the link while the creator is making half-finished edits, the recipient sees broken formatting or partial thoughts.
- **Model 2: Publication Snapshot (Working Draft vs. Published Snapshot)**:
  - *Mechanism*: Publishing creates an immutable published snapshot or version pointer. The creator continues editing a working draft. Changes only go live when the creator explicitly clicks "Update / Re-publish".
  - *Tradeoffs*: Flawless recipient isolation and safety during in-flight authoring. Requires versioned content records or draft-vs-live payload storage.
  - *Proposed Recommendation*: **Model 2 (Snapshot-based Publishing)**. It guarantees the partner never catches the creator mid-edit during high-stakes real-world delivery.

---

## 5. Creator / Recipient Boundary Matrix

| Boundary Dimension | Creator Experience | Preview Experience | Recipient Experience |
| :--- | :--- | :--- | :--- |
| **Routes** | `/app/proposals/*`, `/app/settings/*` | `/app/proposals/[id]/preview` | `/p/[slug]` |
| **Authentication** | Required (Strict Creator Session) | Required (Strict Creator Session) | Unauthenticated (Public access by slug token) |
| **Data Readable** | Full proposal entity: raw content, draft status, media URLs, analytics, account info | Working draft content, active theme, uncommitted state | **Public Projection Allowlist Only**: filtered recipient content, sanitized media URLs, active theme styling |
| **Data Writable** | Full CRUD on creator's own proposals, uploads, and account metadata | Ephemeral preview controls (e.g., test step advance); no persistent write | Emotional response submission only (if enabled) |
| **Code Shipped to Client** | Studio UI: Editors, form pickers, media uploaders, layout controls, management toolbars | Shared Scene Renderer + lightweight preview inspector chrome | **Shared Scene Renderer ONLY**; zero studio/editor code, zero authoring bundles |
| **Caching Strategy** | `Cache-Control: private, no-store` | `Cache-Control: private, no-store` | Edge/CDN cacheable with stale-while-revalidate, keyed to published snapshot hash |
| **Error Behavior** | Detailed actionable validation messages, form-field inline errors | Visual preview warning banners for incomplete scenes | Clean, minimal, emotionally neutral fallback screen ("Experience unavailable") |
| **Failure Impact** | Creator is prevented from saving/publishing; guided to correct errors | Preview flags missing media or broken content blocks | System degrades gracefully (e.g., smooth fallback font, missing image placeholder without crashing) |

---

## 6. Scope Tiers

Every capability from the owner vision is categorized below. No capability has been dropped.

| Capability | Scope Tier | Justification & Architectural Rationale |
| :--- | :--- | :--- |
| **Personalized Names & Nicknames** | **MUST HAVE** | Core identity element of the romantic narrative. |
| **Romantic Messages & Letters** | **MUST HAVE** | Primary emotional medium of the proposal. |
| **Photo Upload & Display** | **MUST HAVE** | Core visual storytelling medium across relationship milestones. |
| **Relationship Timeline & Memories** | **MUST HAVE** | Chronological progression anchoring the journey. |
| **Theme Selection & Custom Colors** | **MUST HAVE** | Enables stylistic resonance while enforcing content separation. |
| **Proposal Question Reveal** | **MUST HAVE** | The foundational climax of the product. |
| **Accessible Affirmative ("Yes") Interaction** | **MUST HAVE** | The resolution moment for the recipient. |
| **Confetti & Celebration Orchestration**| **MUST HAVE** | Joyful emotional culmination of the accepted proposal. |
| **Custom URL / Shareable Link** | **MUST HAVE** | Essential mechanism for delivering the experience to the partner. |
| **Mobile-First Responsive Recipient View**| **MUST HAVE** | Proposals are experienced on smartphones in intimate settings. |
| **Fidelity Preview Mode** | **MUST HAVE** | Creator must verify pacing and rendering before live sharing. |
| **Unpublish & Slug Regeneration** | **MUST HAVE** | Essential privacy and emergency control for creators. |
| **Reduced-Motion Accessibility** | **MUST HAVE** | Non-negotiable requirement for recipient safety and accessibility. |
| **Optional Playful Interactions** | **SHOULD HAVE** | Interactive micro-moments (e.g., scratch-to-reveal or memory flip cards) enrich the journey but must not block basic proposal delivery if simplified. |
| **Ambient Background Music** | **SHOULD HAVE** | Elevates emotional mood, but constrained by mobile autoplay policies, licensing, and audio decoding. Proposed for initial implementation once audio policy is decided (Q5). |
| **Response Notification / Persisted Answer**| **SHOULD HAVE** | Notification to creator when partner accepts; dependent on Open Question Q2 resolution. |
| **Collaborative Co-Authoring** | **FUTURE/DEFERRED**| Single-creator focus in MVP; collaboration deferred to Phase 12. |
| **Custom Domain Mapping (CNAME)** | **FUTURE/DEFERRED**| Advanced distribution feature; `/p/[slug]` satisfies MVP requirements. |
| **Video Uploads & Streaming** | **FUTURE/DEFERRED**| Bandwidth, transcoding, and hosting storage costs exceed Phase 1 MVP constraints. |

> [!IMPORTANT]
> Capabilities placed in **SHOULD HAVE** (Playful Interactions, Ambient Music, Response Notification) are flagged for Owner Confirmation. They remain fully architected in this specification, ready for Phase 2 implementation if confirmed.

---

## 7. Response & Interaction Principles

### 7.1 Genuine Choice & Non-Manipulative Mechanics
- The proposal interaction must **never** employ deceptive UX patterns, manipulative traps, or coercive UI tricks (such as fleeing "No" buttons, disabled declines that mock the user, infinite loops, or forced selections).
- Love and commitments require dignity and genuine agency. The interface must provide a clear, honorable, and accessible affirmative path while handling alternate pathways with emotional respect and zero shame mechanics.

### 7.2 Accessibility & Ergonomics
- The interaction target must satisfy WCAG 2.1 AA minimum touch targets (minimum 48x48px on mobile viewports).
- Full keyboard navigation and screen-reader accessibility: semantic `<button>` elements, accessible ARIA announcements (`aria-live="polite"` for celebration trigger), and explicit focus rings.

### 7.3 Motion Sensitivity & Reduced Motion
- All transitions and celebration effects must strictly respect `prefers-reduced-motion: reduce`.
- In reduced-motion mode:
  - Confetti particle explosions are replaced by an elegant, static celebratory typography layout with subtle opacity fades.
  - Pacing transitions avoid rapid zoom, parallax tilting, or disorienting camera movements.

---

## 8. Confirmed Requirements Register

| Requirement ID | Requirement Description | Authority Source |
| :--- | :--- | :--- |
| **REQ-001** | Two distinct experiences: creator and recipient. | Phase 1 Prompt, Section 3 |
| **REQ-002** | Creator capabilities: create, partner info, upload/select media, write messages, configure sections, choose theme, preview, publish, share URL, edit later, unpublish, regenerate slug. | Phase 1 Prompt, Section 3 |
| **REQ-003** | Recipient flow: open link, introduction, personalized story, interactive moments, proposal reveal, response, celebration. Mobile-first, non-dashboard. | Phase 1 Prompt, Section 3 |
| **REQ-004** | Vision capabilities: names, photos, romantic messages, timeline, memories, music, animations, confetti, "yes" interaction, playful moments, custom colors/theme, custom URL, mobile-first. | Phase 1 Prompt, Section 3 |
| **REQ-005** | Data-driven proposals: content separated from theme; changing theme never alters or destroys content. | Phase 1 Prompt, Section 3 |
| **REQ-006** | Preview and published rendering must share one unified rendering layer. | Phase 1 Prompt, Section 3 |
| **REQ-007** | Server-side validation and authorization. Creators cannot access other creators' proposals. Recipients cannot access creator-only data. Unpublished proposals are inaccessible. Client file validation never trusted alone. | Phase 1 Prompt, Section 3 |
| **REQ-008** | Response interaction must not use manipulative mechanics; must be accessible. | Phase 1 Prompt, Section 3 |
| **REQ-009** | Mobile-first architecture, accessibility including reduced motion, and performance-aware engineering. | Phase 1 Prompt, Section 3 |
| **REQ-010** | Phase 0 fixed inputs: repository state, .gitignore, README.md. No changes to Phase 0 outputs in Phase 1. | Phase 1 Prompt, Section 1 |
