# Project Definition: Proposera

## 1. Project Overview

**Proposera** is a standalone, personalized proposal-experience platform designed to orchestrate deeply personal and emotional digital journeys for romantic proposals.

- **Current Status**: Milestones 1 through 8 Complete.
- **Owner & Decision Maker**: Solo-owned and controlled by the project owner (@akrittiii09).
- **Repository**: `proposera` (Private GitHub Repository).

---

## 2. Distinction: CURRENT vs. PLANNED

### 2.1 CURRENT (Implemented in Milestones 1 through 8)
- Core project repository initialized with Git and GitHub remote (`origin/main`).
- Modern full-stack foundation with Next.js 15, TypeScript (strict mode), and Tailwind CSS.
- Development tooling configured:
  - Strict typechecking (`npm run typecheck`)
  - Next.js ESLint linting (`npm run lint`)
  - Fast ESM testing suite via Vitest (`npm run test`)
  - Production build pipeline (`npm run build`)
- Safe environment configuration baseline (`.env.example` and `lib/env.ts`).
- Creator authentication with bcrypt password hashing and HTTP-only session cookies.
- Proposal authoring and management (Creator Studio) with draft lifecycle and validation.
- Public recipient presentation engine (`/p/[slug]`) with 404 non-disclosure protection.
- Recipient response capture with affirmative choice, custom note, and idempotency guarantees.
- Live mutable publishing with immediate updates on save.
- Free publishing for authenticated creators with zero paywall.
- Media upload pipeline with magic-number validation, EXIF stripping, single-use permits, and quota management.
- Ambient music engine with curated royalty-free tracks, first-interaction activation, smooth volume fade-in, and accessible persistent mute controls.

### 2.2 PLANNED (To be built in later milestones)
- **Milestone 9**: Playful Micro-Interactions (Scratch/Flip reveals) & Enhanced Storytelling.
- **Milestone 10**: Custom Domain Mapping & Advanced Theme Customization.
- **Milestone 11**: Real-time Creator Notifications & Analytics.
