# Routing Architecture: Proposera

## 1. Information Architecture Overview

Proposera segregates routes into four functional domains:
1. **Public Marketing & Auth Domain**: Root marketing, login, and registration.
2. **Creator Studio Domain**: Authenticated workspace for authoring, configuring, previewing, and managing proposals.
3. **Internal Preview Domain**: Authenticated, high-fidelity sandbox route simulating recipient view without exposing public endpoints.
4. **Public Recipient Domain**: Clean, distraction-free, dedicated route for the partner to experience the published proposal.

```
proposera.app/
├── (public)
│   ├── /                         # Platform landing & overview
│   ├── /login                    # Creator authentication
│   └── /register                 # Creator account creation
│
├── /app/                         # Authenticated Creator Studio
│   ├── /proposals                # Proposal management dashboard
│   ├── /proposals/new            # Proposal initializer
│   ├── /proposals/[id]           # Studio editor (content, themes, media)
│   ├── /proposals/[id]/preview   # Authenticated recipient preview sandbox
│   ├── /proposals/[id]/settings  # Slug management, unpublish, lifecycle
│   └── /settings                 # Account profile & storage quota
│
└── /p/                           # Dedicated Recipient Experience Domain
    └── /p/[slug]                 # Public recipient presentation endpoint
```

---

## 2. Comprehensive Route Matrix

| Route Pattern | Experience Domain | Auth Required | Access Authorization | Draft Behavior | Published Behavior | Error Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Marketing | No | Anyone | N/A | N/A | Render standard layout |
| `/login` | Auth | No (Guest) | Unauthenticated users (Redirects if auth) | N/A | N/A | Form validation errors |
| `/register` | Auth | No (Guest) | Unauthenticated users (Redirects if auth) | N/A | N/A | Form validation errors |
| `/app/proposals` | Creator Studio | Yes | Authenticated Creator | Displays all proposals owned by creator | Displays active status and shareable link | Redirects to `/login` if unauthenticated |
| `/app/proposals/new` | Creator Studio | Yes | Authenticated Creator | Initializes new draft and redirects to editor | N/A | Redirects to `/login` if unauthenticated |
| `/app/proposals/[id]` | Creator Studio | Yes | Proposal Owner Only | Loads draft editor with autosave | Loads editor; changes queue for republish | 404 if not found or unauthorized |
| `/app/proposals/[id]/preview` | Preview Sandbox | Yes | Proposal Owner Only | Renders shared scene renderer with draft data | Renders shared scene renderer with latest draft | 404 if unauthorized; never public |
| `/app/proposals/[id]/settings`| Creator Studio | Yes | Proposal Owner Only | Manage internal title, delete draft | Manage slug, unpublish, view responses | 404 if unauthorized |
| `/p/[slug]` | Recipient | No | Public (Anyone with valid slug) | **Returns 404** (Drafts are never accessible) | Renders published recipient scene flow | Generic 404 Not Found screen |
| `/404` | Error Handling | No | Anyone | Minimal fallback | Minimal fallback | Standardized non-disclosing error |
| `/500` | Error Handling | No | Anyone | Minimal fallback | Minimal fallback | Standardized non-disclosing error |

---

## 3. Public Route Strategy: Evaluation & Rules

### 3.1 Route Pattern Evaluation
We evaluated three candidate URL patterns for the recipient experience:
1. **Option A: `/p/[slug]` (Recommended)**:
   - *Pros*: Clear visual signal that this is an experiential presentation; clean URL path; isolates recipient logic from marketing and app routes.
   - *Cons*: Minor prefix characters.
2. **Option B: Root Slugs `/[slug]`**:
   - *Pros*: Slightly shorter link.
   - *Cons*: Namespace collision with system routes (`/login`, `/settings`, `/api`, `/terms`); creates security risks if user chooses a reserved slug; complicates route dispatching.
3. **Option C: Subdomain per Proposal `[slug].proposera.app`**:
   - *Pros*: Total isolation.
   - *Cons*: DNS wildcard complexity, SSL certificate management overhead, and slower mobile DNS resolution.

*PROPOSED Decision*: **Option A (`/p/[slug]`)**. Provides clean namespace isolation, zero routing collisions, and minimal URL overhead.

### 3.2 Slug Rules & Strategy
- **Format**: Lowercase alphanumeric characters and hyphens only (`^[a-z0-9-]+$`), minimum 6 characters, maximum 48 characters.
- **Slug Generation Default**: Cryptographically unguessable, human-friendly identifier (e.g., `for-sophia-v9k2x`).
- **Vanity Slugs**: Creators may customize their slug (e.g., `sophia-and-alex`), provided it satisfies:
  1. Global uniqueness across all proposals.
  2. Reserved word exclusion (see below).
- **Reserved Words Denylist**: Slugs cannot match system keywords:
  `app`, `api`, `auth`, `admin`, `settings`, `static`, `assets`, `health`, `proposals`, `preview`, `login`, `register`, `terms`, `privacy`, `support`, `null`, `undefined`.
- **Slug Regeneration & Revocation**:
  - If a creator regenerates their slug (e.g., if a private link was sent to the wrong person):
    - A new slug is assigned immediately.
    - The old slug is **immediately revoked** and returns a generic `404 Not Found`.
    - *PROPOSED Policy*: To ensure total creator privacy and prevent eavesdropping, old slugs do not redirect to new slugs.

---

## 4. Preview Route Isolation

The route `/app/proposals/[id]/preview` is an internal authoring tool:
- **Strict Authentication**: Accessible strictly within an active creator session.
- **Strict Authorization**: Verifies `proposal.creator_id === session.creator_id`.
- **Public Protection**: If an unauthenticated user or an unauthorized creator requests `/app/proposals/[id]/preview`, the server immediately responds with an HTTP 404 (preventing existence leaks) or redirects to `/login`.
- **Search Engine Directives**: Emits `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: private, no-store`.

---

## 5. Error Behavior & Non-Disclosure Principle

When an unauthenticated recipient visits `/p/[slug]`:
- If the slug **does not exist**: Return HTTP `404 Not Found`.
- If the proposal is in **DRAFT** state: Return HTTP `404 Not Found`.
- If the proposal is in **UNPUBLISHED** state: Return HTTP `404 Not Found`.
- If the proposal is **DELETED**: Return HTTP `404 Not Found`.

> [!IMPORTANT]
> **Non-Disclosure Rule**: Outsiders and search bots must **never** be able to distinguish whether a proposal never existed, is currently a private draft, or was recently unpublished. Distinguishable error messages (e.g., *"This proposal is still a draft"*) leak relationship status and creator identity. Every inaccessible state serves an identical, emotionally neutral generic page: *"This page is unavailable or does not exist."*

---

## 6. Routing Scalability & Theme Decoupling

- **Decoupled Architecture**: Routes are 100% agnostic of visual themes.
- Themes do **not** register unique URL paths (e.g., no `/p/[slug]/celestial` or `/p/[slug]/minimal`).
- The public route `/p/[slug]` inspects the proposal's published snapshot, identifies the active `theme_id`, and loads the corresponding theme renderer dynamically on the client.
- Adding 50 new themes in future phases requires zero routing modifications, zero route migrations, and zero URL rewrites.
