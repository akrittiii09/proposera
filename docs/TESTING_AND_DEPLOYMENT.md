# Testing & Deployment Architecture: Proposera

> [!NOTE]
> This document specifies the verification strategy and deployment topology. In accordance with Phase 1 constraints, no concrete test scripts, CI configuration files, or deployment infrastructure are implemented in this phase.

---

## 1. Testing Strategy

### 1.1 Testing Layers

| Testing Layer | Scope & Objective | Tooling / Realization Direction (PROPOSED) |
| :--- | :--- | :--- |
| **Unit Tests** | Pure business logic, content validation, migration scripts, token contracts. | Vitest / Jest |
| **Integration Tests** | API route handlers, authorization guards, upload verification pipeline, database queries. | Supertest / Node test runner with isolated test DB |
| **End-to-End (E2E)** | Full creator authoring flow, fidelity preview, and recipient emotional journey. | Playwright |
| **Accessibility (a11y)** | WCAG 2.1 AA compliance, axe-core automated audits, keyboard focus, screen-reader markup. | @axe-core/playwright |
| **Mobile Viewport Tests** | Viewport layout fidelity, touch targets, non-overflow text scaling. | Playwright mobile device emulation |
| **Security Audits** | Automated SAST scans, dependency vulnerability checks, authorization boundary tests. | OWASP dependency scan, custom security test suite |
| **Build Validation** | Strict TypeScript typechecking (`tsc --noEmit`), linting (`eslint`), production bundle size budgets. | CI pre-merge gate |

---

## 2. Critical End-to-End (E2E) Journey

The primary end-to-end test journey validates the fundamental value proposition of Proposera:

1. **Step 1: Creator Account & Draft Setup**: Authenticated creator initiates a new proposal; draft record is verified with default scene structure.
2. **Step 2: Content Population**: Creator populates partner name, romantic letters, and adds two milestones with mock media assets.
3. **Step 3: Theme Customization**: Creator selects a theme (e.g., "celestial-rose"); verifies UI immediately updates preview without altering saved text.
4. **Step 4: Authenticated Preview Verification**: Creator opens `/app/proposals/[id]/preview`; verifies that the shared scene renderer displays all content with complete fidelity.
5. **Step 5: Publish Execution**: Creator publishes proposal; system locks an immutable `PublicationSnapshot` and issues slug `/p/sophia-love-x89`.
6. **Step 6: Public Recipient Delivery**: Unauthenticated browser navigates to `/p/sophia-love-x89`; verifies zero creator chrome, correct scenes, and valid public media URLs.
7. **Step 7: Climax & Affirmative Response**: Recipient advances through timeline, triggers proposal reveal, and taps the affirmative "Yes" button.
8. **Step 8: Celebration Verification**: Celebration scene activates (confetti triggers, celebratory music/text renders). Response payload is sent to backend.
9. **Step 9: Post-Publish Verification**: Creator dashboard displays the affirmative response timestamp; creator unpublishes; subsequent public request to `/p/sophia-love-x89` immediately returns 404.

*Pass Condition*: Steps 1 through 9 execute with zero runtime errors, zero DOM leaks of private creator data, and 100% assertion success on state transitions.

---

## 3. Authorization & Security Test Matrix

| Test Case ID | Actor Role | Target Route / Operation | Expected Response / Outcome |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Anonymous | `POST /app/proposals/new` | `401 Unauthorized` |
| **AUTH-02** | Creator B | `GET /app/proposals/[Creator_A_ID]` | `404 Not Found` (Zero existence leakage) |
| **AUTH-03** | Creator B | `PUT /app/proposals/[Creator_A_ID]` | `404 Not Found` |
| **AUTH-04** | Anonymous | `GET /p/[draft_slug]` | `404 Not Found` (Drafts completely invisible) |
| **AUTH-05** | Anonymous | `GET /p/[published_slug]` | `200 OK` (Public projection only) |
| **AUTH-06** | Anonymous | Inspect recipient network payload | Verify `creator_id`, `email`, internal notes are absent |
| **AUTH-07** | Anonymous | Rapidly post 50 responses | `429 Too Many Requests` (Rate limit triggered) |

---

## 4. Mobile Viewport & Device Test Matrix (PROPOSED)

| Device Profile | Viewport Dimensions | DPI / Pixel Ratio | Browser Engine | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Modern Phone** | 390 x 844 px | 3.0 | WebKit (Mobile Safari) | Highest (P0) |
| **Compact Phone** | 360 x 780 px | 2.0 | Blink (Chrome Android) | Highest (P0) |
| **Large Flagship Phone** | 430 x 932 px | 3.0 | WebKit (Mobile Safari) | High (P1) |
| **Tablet Portrait** | 820 x 1180 px | 2.0 | WebKit (iPad) | Medium (P2) |
| **Desktop Baseline** | 1440 x 900 px | 1.0 / 2.0 | Blink / Gecko / WebKit | High (P1) |

---

## 5. Testability Architectural Constraints

To guarantee robust automated testing without brittle workarounds:
1. **Deterministic Timers**: Animations and transitions must accept controllable duration multipliers (allowing tests to run with `duration: 0` for fast execution).
2. **Stable Data Attributes**: All interactive targets and scene anchors expose unambiguous semantic selectors (`data-testid="scene-milestone"`, `data-testid="btn-affirmative"`).
3. **Mockable Storage & Media Pipeline**: Media ingestion accepts an in-memory storage adapter for CI environments without requiring live cloud bucket connections.

---

## 6. Deployment Architecture & Hosting Candidates (PROPOSED)

We evaluate candidate solutions across critical infrastructure categories based on: *Owner control, low-scale cost, operational burden, portability, security, and mobile delivery performance*.

### 6.1 Application Hosting & Compute

| Candidate Option | Evaluation & Fit | Tradeoffs | Proposed Disposition |
| :--- | :--- | :--- | :--- |
| **Option 1: Vercel (Next.js)** | Flawless Next.js edge caching, automatic preview deployments, zero server maintenance. | Vendor lock-in; bandwidth pricing at high scale. | **PROPOSED (Primary)** |
| **Option 2: Cloudflare Pages / Workers** | Outstanding global edge performance, zero cold starts, minimal cost. | Runtime limitations for certain Node-specific native libraries. | Viable Alternative |
| **Option 3: Self-Hosted Docker (Fly.io / Render)** | Complete portability, standard container, direct operational control. | Higher maintenance, manual SSL/CDN/edge routing setup. | Viable Alternative |

### 6.2 Relational Database Hosting

| Candidate Option | Evaluation & Fit | Tradeoffs | Proposed Disposition |
| :--- | :--- | :--- | :--- |
| **Option 1: Neon Serverless Postgres** | Generous free/low tier, instant branching for test environments, Postgres standard. | Dependent on cloud provider regions. | **PROPOSED (Primary)** |
| **Option 2: Supabase (Postgres)** | Built-in auth/storage options, managed Postgres, excellent developer experience. | Slight lock-in if using proprietary extensions. | Viable Alternative |
| **Option 3: AWS RDS / Cloud SQL** | Enterprise reliability, total control. | Significant monthly cost baseline, complex IAM management. | Rejected for MVP |

### 6.3 Media Object Storage & CDN

| Candidate Option | Evaluation & Fit | Tradeoffs | Proposed Disposition |
| :--- | :--- | :--- | :--- |
| **Option 1: Cloudflare R2 + CDN** | S3-compatible, **zero egress fees**, exceptional global edge distribution. | Requires Cloudflare dashboard management. | **PROPOSED (Primary)** |
| **Option 2: AWS S3 + CloudFront** | Industry standard, proven reliability, extensive SDKs. | Egress fees can escalate; complex IAM policies. | Viable Alternative |

---

## 7. Operational Lifecycle & Recovery Direction

- **Environment Separation**: Three isolated environments:
  - `development`: Local development with local SQLite/Postgres and mock storage.
  - `preview / staging`: Isolated preview database and staging bucket for pull requests.
  - `production`: Fully hardened, redundant database, production R2 storage, edge CDN.
- **CI/CD Pipeline**: GitHub Actions triggered on PR and push to `main`. Executes: linting $\rightarrow$ typecheck $\rightarrow$ unit/integration tests $\rightarrow$ build check.
- **Rollback Strategy**:
  - Application code: Instant one-click deployment rollbacks via platform host (Vercel/Cloudflare).
  - Database schema: Backward-compatible non-destructive migrations; rollbacks scripted prior to migration execution.
- **Backup & Disaster Recovery**: Daily automated database snapshots retained for 30 days; geo-replicated object storage with object versioning enabled.
