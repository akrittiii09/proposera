# System Architecture: Proposera

## 1. Architectural Layers & Boundaries

Proposera is designed with strict separation of concerns, ensuring high performance, zero privilege leakage, and clean maintainability.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  ┌─────────────────────────┐           ┌────────────────────────────┐  │
│  │   Creator Studio App    │           │  Unified Scene Renderer    │  │
│  │  (Editors, Management)  │           │   (Preview & Recipient)    │  │
│  └────────────┬────────────┘           └─────────────┬──────────────┘  │
└───────────────┼──────────────────────────────────────┼─────────────────┘
                │ HTTP / REST / JSON                   │ HTTP / Public JSON
                ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API & SERVICES                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Authentication & Session Guard (JWT / Cookie)                   │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  Authorization & Ownership Check (Creator vs Public Projection)  │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  Validation Layer (Schema validation, File magic-number scan)    │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  Services: ProposalService | MediaService | PublishingService    │  │
│  │            PaymentService (Razorpay Webhooks — Deferred)         │  │
│  └────────────┬──────────────────────────────┬──────────────────────┘  │
└───────────────┼──────────────────────────────┼─────────────────────────┘
                ▼                              ▼
┌──────────────────────────────┐ ┌───────────────────────────────────────┐
│       DATABASE LAYER         │ │         OBJECT STORAGE (BLOB)         │
│  (Relational DB / Postgres)  │ │   (Private Bucket & Public CDN)       │
│  - Creators & Entitlements   │ │   - Media Assets                      │
│  - Proposals & Stories       │ │   - Stripped EXIF, Optimized WebP     │
│  - Response Records          │ │                                       │
└──────────────────────────────┘ └───────────────────────────────────────┘
```

### 1.1 Layer Specifications Matrix

| Layer | Primary Responsibility | Execution Realm | Trust Boundary & Untrusted Client Input | Authorization & Validation Enforced |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend (Studio)** | Creator workspace, authoring forms, live preview controls. | Client-side (Browser) | Untrusted; all form values subject to server validation. | Server handles auth; client performs cosmetic validation only. |
| **Frontend (Recipient)**| Immersive, lightweight, responsive proposal narrative. | Client-side (Browser) | Untrusted; recipient has zero write rights except response token. | Served via unauthenticated read projection; no secrets exposed. |
| **Backend API** | Business logic, state management, file ingestion, projection. | Server-side | Never trust: client MIME headers, user IDs, publication status flags. | Strict server-side validation and ownership verification. |
| **Payment Gateway (Razorpay)** | Checkout modal, payment verification, webhook ingestion. *(DECIDED Q1, Implementation DEFERRED)* | External / Server-side Webhook | Untrusted client checkout responses; verify signatures via Razorpay secret. | Entitlement granted only upon cryptographically verified webhook or server capture. |
| **Database** | Relational integrity, atomic commits, draft and proposal storage. | Server-side / DB | Sanitized parameterized inputs only; no direct client SQL. | Enforced by ORM/data-access repository layers. |
| **Object Storage** | Storing binary media assets (images, audio). | Cloud Storage | Never trust client file streams; scanned before final move. | Pre-signed upload credentials with strict byte and content limits. |
| **Observability** | Error tracking, health telemetry, performance metrics. | Server & Edge | Strip all PII, partner names, romantic messages before logging. | Log sanitization filters enforced at transport middleware. |

### 1.2 Client Responsibilities (Browser / Client-Side)
- **Safe Operations**: Interactive UI rendering, scene transitions, animation orchestration, audio playback triggers, optimistic form feedback, responsive viewport adaptation.
- **Untrusted Realm**: All client input (parameters, query strings, headers, form payloads) is treated as untrusted.
- **Zero Authority**: The client never decides authorization, never enforces storage quotas, and never accesses raw draft records directly.

### 1.3 Server Responsibilities (Backend API & Services)
- **Authoritative Validation & Logic**: Parsing and verifying payload schemas (Zod), enforcing file magic numbers, validating image dimensions, stripping EXIF metadata, generating pre-signed upload URLs.
- **Authorization Enforcement**: Strict session resolution and proposal ownership verification (`proposal.creator_id === session.user_id`).
- **Data Projection**: Filtering raw internal proposal entities into sanitized, public-safe JSON projections for recipient consumption.
- **Rate Limiting & Abuse Prevention**: Throttling public read/write surfaces and response submissions.

### 1.4 Database Responsibilities (Data Tier)
- **Relational Integrity**: Foreign key constraints, unique constraints on public slugs, cascade soft-deletes, non-null guarantees.
- **Atomic Operations**: Live mutable publication state updates, status transitions, and response persistence executed within ACID transactions.
- **Data Protection at Rest**: Encrypted storage, connection pooling, parameterized query execution to prevent SQL injection.

---

## 2. Rendering Architecture: Scene-Based Model

### 2.1 Recommendation: Scene-Based Flow
We recommend and adopt a **Scene-Based Architecture** for rendering the recipient and preview experiences.
- *Why Scene-Based?* A marriage proposal is not a static webpage or a scrolling blog post; it is a progressive emotional narrative with distinct beats:
  `Introductory Hook -> Shared Story & Timeline -> Climax (The Question) -> Response -> Celebration`.
- A scene represents an isolated narrative beat with defined enter, active, and exit states.

### 2.2 Scene Contract (PROPOSED)
Every scene component adheres to a strict interface:
- **Inputs**:
  - `sceneData`: Typed content slice relevant to the scene (e.g., milestone details or question text).
  - `theme`: Theme styling tokens (typography classes, motion timings, palette variables).
  - `isActive`: Boolean indicating if the scene currently holds focus.
  - `motionPreference`: `'normal' | 'reduced'` derived from media queries.
- **Outputs / Callbacks**:
  - `onAdvance()`: Requests progression to the subsequent scene.
  - `onInteraction(actionType, payload)`: Notifies parent orchestrator of recipient action (e.g., tapping a memory card).
  - `onResponse(choice)`: Dispatched exclusively by the proposal reveal scene.
- **State Machine Transitions**:
  `IDLE -> ENTERING -> ACTIVE -> RESOLVED -> EXITING -> ADVANCED`.

### 2.3 Unified Rendering Layer (Preview vs. Published)
To eliminate parity discrepancies and prevent maintaining two disparate codebases:
- The **exact same** Scene Orchestrator and Scene Components are used in both the Recipient Experience and the Creator Preview.
- **The Only Differences**:
  1. *Data Source*: Recipient loads published proposal content projection from the public endpoint (`/p/[slug]`); Preview loads live working draft from authenticated creator API. Published proposals are live and mutable (DEC-007 / Q4); edits immediately reflect upon save.
  2. *Chrome Wrapper*: Recipient view renders with zero UI chrome (viewport full-screen); Preview renders inside a simulated mobile viewport frame with preview status banner.
  3. *Interaction Handling*: Recipient response writes to the database (persisted and viewable in Creator Studio per Q2); Preview response triggers celebration locally without persisting mock responses.

---

## 3. Media Ingestion & Delivery Pipeline

Media handling is a high-risk vector for security, performance, and storage abuse. The media architecture enforces strict defense-in-depth:

```
[ Creator Client ]
        │
        │ 1. Request Upload Permit (File size, declared type)
        ▼
[ API: MediaService ] ──► (Validates quota, limits, creates PENDING record)
        │
        │ 2. Issues Pre-signed Upload URL (Time-limited, byte-capped)
        ▼
[ Object Storage: /staging/ ]
        │
        │ 3. Asynchronous Validation & Processing Worker
        ▼
┌────────────────────────────────────────────────────────┐
│ 1. Content Magic Number Check (Verify actual bytes)    │
│ 2. Decompression Bomb Check (Validate pixel dimensions)│
│ 3. Strip EXIF / GPS / Camera Metadata                 │
│ 4. Re-encode to optimized WebP format                  │
│ 5. Store in /ready/ bucket                             │
└────────────────────────────────────────────────────────┘
```

### 3.1 Media Rules & Invariants
- **Validation by Content, Not Extension**: The server inspects file magic numbers (e.g., image signatures). A `.exe` or `.html` renamed to `.jpg` is immediately rejected.
- **Size & Dimension Limits**:
  - Maximum upload file size: 8 MB per image.
  - Maximum pixel dimensions: 4096 x 4096 px. Images exceeding this are scaled down.
- **Decompression Abuse Defense**: Headers are inspected to calculate uncompressed memory footprints before allocation.
- **EXIF & Privacy Sanitization**: All location coordinates (GPS), camera serials, and timestamps are stripped automatically to protect creator and partner physical privacy.
- **Private Until Published**: Media uploaded for drafts resides in private buckets accessible only via signed URLs. Once a proposal is published, only the referenced assets are accessible via the public CDN.
- **Creator Quota**: Every creator is assigned a total storage cap (e.g., 50 MB in MVP) enforced server-side before issuing upload permits.

### 3.2 Ambient Music Architecture *(Open Question Q5)*
- Mobile browsers strictly enforce autoplay policies: audio context cannot play without an explicit recipient touch/click gesture.
- The scene orchestrator initializes an audio manager that attaches an ambient play trigger to the recipient's first physical interaction (e.g., tapping "Begin Story").
- Audio volume ramps smoothly (fade-in) to avoid startling the recipient. A persistent, elegant audio toggle is provided at all times.

---

## 4. System Extensibility & Boundaries

### 4.1 Extension Points
The system provides clean extension points designed for future growth:
- **Themes**: New themes implement a standardized Theme Definition interface (tokens, surface components, animation parameters) without modifying backend tables.
- **Scenes**: New scene archetypes (e.g., interactive map of places visited) plug into the scene orchestrator by implementing the standard scene contract.
- **Content Blocks**: Content primitives use typed JSON schemas that support optional additive blocks.

### 4.2 What the Core Must NOT Know
- The core database schema and API routing must **never** know about specific theme CSS, animations, or DOM structures.
- The recipient router must never know which scene variations are activated inside a proposal payload; it simply mounts the scene pipeline.

### 4.3 What NOT to Build Up Front (Anti-Overengineering Guardrails)
- Do NOT build custom visual theme builders or CSS drag-and-drop editors for creators in MVP. Themes must be curated, pre-tested platform templates.
- Do NOT build a full digital asset management (DAM) system with folders and tagging. Proposals require a simple linear photo gallery.
- Do NOT build real-time WebSocket multi-user collaboration.

---

## 5. Privacy-Safe Observability & Telemetry

- **PII Scrubbing Invariant**: Operational logs, telemetry, and error reports must never capture:
  - Partner names or nicknames.
  - Romantic letter text or milestone memories.
  - Recipient response notes.
  - Raw client IP addresses (hashed or truncated if needed for rate limiting).
- **Safe Telemetry**:
  - Server metrics: HTTP status codes, latency histograms, database query execution times, upload pipeline error codes.
  - Anonymized funnel events: `proposal_created`, `proposal_published`, `recipient_view_opened`, `recipient_response_submitted`.
