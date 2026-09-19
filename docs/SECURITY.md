# Security & Threat Model Specification: Proposera

> [!IMPORTANT]
> This document defines the **required security architecture** for Proposera. No security feature is claimed as currently implemented; these requirements govern all upcoming implementation phases.

---

## 1. Authentication & Session Architecture

### 1.1 Creator Authentication
- **Mechanism**: Secure session cookies (`HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`) or short-lived signed JWTs with rotating refresh tokens.
- **Credential Protection**: Password hashing via Argon2id or bcrypt (minimum cost factor 12).
- **Session Expiration**: Inactivity timeout with absolute session lifetime cap.

### 1.2 Recipient Authentication
- **Model**: Recipient is **unauthenticated** by default. Access is mediated exclusively by knowledge of the unique proposal slug or link token.
- **Boundary**: Recipient sessions carry zero administrative or creator rights.

---

## 2. Authorization Matrix (Role x Action)

| Domain Action | Anonymous Recipient | Authenticated Creator (Owner) | Authenticated Creator (Non-Owner) |
| :--- | :--- | :--- | :--- |
| **Create Proposal** | Denied (401) | **Allowed** | **Allowed** (creates new proposal) |
| **Read Proposal Draft** | Denied (404) | **Allowed** | Denied (404 - existence concealed) |
| **Update Proposal Draft** | Denied (401) | **Allowed** | Denied (404) |
| **Preview Proposal** | Denied (401/404)| **Allowed** | Denied (404) |
| **Publish / Unpublish** | Denied (401) | **Allowed** | Denied (404) |
| **Regenerate Slug** | Denied (401) | **Allowed** | Denied (404) |
| **Delete Proposal** | Denied (401) | **Allowed** | Denied (404) |
| **Upload Media** | Denied (401) | **Allowed** (within quota) | **Allowed** (within quota) |
| **Delete Media Asset** | Denied (401) | **Allowed** (own assets) | Denied (404) |
| **Read Published Proposal** | **Allowed** (via `/p/[slug]`)| **Allowed** | **Allowed** |
| **Submit Response** | **Allowed** (rate-limited) | **Allowed** (test) | **Allowed** |
| **Read Recipient Response** | Denied (404) | **Allowed** (own proposal) | Denied (404) |

---

## 3. Defense Against Common Vulnerabilities

### 3.1 Cross-Site Scripting (XSS) Prevention
- **Strict Rendering Invariant**: Creator-authored text (partner names, messages, notes) must **NEVER** be rendered as unescaped HTML (no `dangerouslySetInnerHTML`).
- All text strings must be rendered as raw React text nodes or passed through strict contextual escaping.
- Rich-text markdown (if supported) must pass through an AST sanitizer with a strict tag allowlist (e.g., `<em>`, `<strong>` only; zero script, iframe, object, or svg tags).

### 3.2 CSRF & Request Forgery
- All state-mutating endpoints (POST, PUT, PATCH, DELETE) require CSRF token validation or `SameSite=Lax/Strict` cookie isolation.
- Pre-flight origin checking validates the `Origin` and `Referer` headers against the platform's root domain.

### 3.3 Server-Side Input & Schema Validation
- Client-side validation is strictly an ergonomic feature for the user; the server **never trusts client-side validation alone**.
- Every request payload is validated against strict schemas (e.g., Zod) enforcing data types, string length caps, and format constraints before business logic execution.

---

## 4. Public Unauthenticated Surface Inventory & Abuse Mitigation

| Public Surface | Method & Endpoint | Payload / Parameters | Threat / Abuse Vector | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Recipient View** | `GET /p/[slug]` | Slug path param | Slug enumeration / scraping | Unguessable slug entropy; strict per-IP rate limiting (100 req/min). |
| **Submit Response** | `POST /api/p/[slug]/response` | `choice`, `custom_note` | Automated spam, denial-of-service, abusive text injection | Rate limit (max 5 submissions per 15 min per IP); character limit on notes (500 chars); honeypot field. |
| **Login / Register**| `POST /api/auth/*` | Credentials | Credential stuffing, brute force | IP and account-level rate limiting; progressive delay; CAPTCHA on suspicious velocity. |

---

## 5. Media Security & Upload Pipeline

1. **Pre-signed Ephemeral Permits**: Creators request an upload URL from the server. The server verifies creator quota before generating a time-limited (15-minute) pre-signed PUT URL.
2. **Magic-Byte Content Inspection**: Upon receiving an asset, a backend worker verifies actual byte signatures (magic numbers) to confirm valid image types (`image/jpeg`, `image/png`, `image/webp`).
3. **Decompression Bomb Protection**: Image dimensions are validated prior to in-memory decoding. Images with extreme pixel areas are rejected to prevent server memory exhaustion.
4. **Metadata Sanitization (EXIF)**: Automatic stripping of EXIF data, GPS coordinates, camera serial numbers, and author tags before permanent storage.
5. **Private vs. Public Bucket Partitioning**:
   - Draft media resides in a private bucket accessible only via short-lived authenticated URLs.
   - Only media referenced in a `PUBLISHED` proposal is served via public CDN endpoints.

---

## 6. Security Headers & Content Security Policy (CSP)

The platform must emit strict security headers on all HTTP responses:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 6.1 Content Security Policy (PROPOSED Direction)
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://media.proposera.app;
  media-src 'self' https://media.proposera.app;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```
*(If third-party embeds like Spotify or YouTube are chosen in Q5, frame-src and connect-src will be updated accordingly).*

---

## 7. Privacy, Social Previews & Search Indexing

- **Search Engine Indexing**:
  - All public proposal routes (`/p/[slug]`) must emit:
    ```http
    X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
    ```
  - Standard `robots.txt` must disallow `/p/` and `/app/`.
- **Social Media Previews (Open Graph / Twitter Cards)**:
  - Default policy: Open Graph tags must **NOT** leak partner names or intimate proposal questions to external crawlers (which cache previews forever).
  - Social tags provide generic branding: *"A romantic proposal on Proposera"*.

---

## 8. Required Secret Categories

The application strictly compartmentalizes secrets. No concrete credentials are listed:
1. `DATABASE_CREDENTIALS`: Connection string and pool secrets for relational database.
2. `AUTH_SECRETS`: Session encryption keys, JWT signing keys, salt factors.
3. `STORAGE_CREDENTIALS`: Cloud object store access key, secret key, and endpoint.
4. `PAYMENT_CREDENTIALS`: Razorpay API Key ID, Key Secret, and Webhook Signing Secret (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) — integration deferred to Phase 2+.
5. `PUBLIC_DOMAIN_CONFIG`: Canonical hostnames for application and media CDN.
6. `ENCRYPTION_KEYS`: Application-level data encryption keys for at-rest payload protection.

---

## 9. Comprehensive Threat Model & Mitigations

| Threat ID | Threat Description | Severity | Required Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **THREAT-01** | **IDOR on Proposal Access**: Creator A guesses or changes proposal ID to inspect or edit Creator B's proposal. | Critical | Server enforces strict ownership check: `proposal.creator_id === session.creator_id` on all endpoints. Non-owners receive 404. |
| **THREAT-02** | **Draft Data Leakage**: Unauthenticated user guesses slug of an unpublished draft and views private romantic content. | High | Endpoint `/p/[slug]` filters exclusively by `status = PUBLISHED`. Drafts return indistinguishable 404. |
| **THREAT-03** | **Malicious File Upload**: Attacker uploads executable script or HTML payload masked as a JPEG to compromise recipient or domain. | Critical | Magic-number verification; rejection of polyglot files; stripped EXIF; re-encoding to WebP; served from separate domain/CDN with `nosniff`. |
| **THREAT-04** | **Response Flooding / Spam**: Bot or malicious actor floods response endpoint with thousands of submissions. | Medium | IP rate-limiting, submission throttling, honeypot fields, and optional CAPTCHA triggers. |
| **THREAT-05** | **Storage Exhaustion**: Creator uploads massive quantities of files to drive up hosting costs. | High | Strict per-creator storage byte quotas enforced before pre-signed upload URL generation. |
| **THREAT-06** | **Search Engine Scraping**: Googlebot indexes proposals, making private relationship milestones public in search results. | High | Global `noindex, nofollow` headers and robots.txt disallow directives on all recipient and app routes. |
| **THREAT-07** | **PII Exposure in Server Logs**: Romantic letters and recipient answers end up in third-party error monitoring platforms. | Medium | Middleware log sanitizer scrubs message bodies, partner names, and query parameters before writing logs. |

---

## 10. Security Controls Classification

| Classification Tier | Security Controls & Measures | Enforcement Realm |
| :--- | :--- | :--- |
| **Required Controls (MVP)** | - Authoritative server-side validation on all API endpoints.<br>- Ownership authorization guard (`creator_id === session.user_id`).<br>- Generic 404 non-disclosure for drafts and unpublished proposals.<br>- Prohibition of raw HTML rendering (XSS protection).<br>- Magic-byte file validation, EXIF stripping, and WebP re-encoding.<br>- `noindex, nofollow, noarchive` headers on all `/p/*` and `/app/*` routes.<br>- Per-creator media storage byte quotas.<br>- Rate limiting on public response submissions.<br>- Unguessable secret URL with zero recipient auth (DEC-009 / Q3).<br>- Public creator signup gated by Razorpay paywall (DEC-008 / Q1). | Server / Edge |
| **Proposed Controls (Phase 2)** | - Password hashing via Argon2id (cost factor $\ge 12$).<br>- HTTP-only, Secure, SameSite=Lax/Strict session cookies.<br>- Private Cloudflare R2 bucket isolation with ephemeral pre-signed upload URLs.<br>- Declarative Zod schema validation across all request boundaries.<br>- Content Security Policy (CSP) header enforcement.<br>- Razorpay webhook signature verification (`X-Razorpay-Signature`). | Server / Application |
| **Future Controls (Deferred)** | - Progressive CAPTCHA triggers on high-velocity requests.<br>- WebAuthn / Passkey support for creator authentication.<br>- Automated virus/malware scanning worker for uploaded assets.<br>- Optional passcode protection for public proposal links (Deferred Phase 9+ per Q3). | Worker / Cloud Infra |
| **Open Security Questions** | - **Q1-A**: Razorpay commercialization details (pricing, currency, billing cycles).<br>- **Q5**: Ambient audio strategy (local asset vs. streaming embed CSP implications). | Owner Decision |
