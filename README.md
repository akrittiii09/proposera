# Proposera

Proposera is a data-driven, personalized proposal-experience platform designed to orchestrate deeply emotional, beautifully choreographed digital journeys for romantic proposals.

[![Release](https://img.shields.io/badge/release-1.0%20production%20ready-rose)](https://github.com/akrittiii09/proposera)
[![Tests](https://img.shields.io/badge/tests-136%20passing-emerald)](https://github.com/akrittiii09/proposera)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🌟 Production Release 1.0
- **Status**: Production Ready & Fully Hardened
- **Live Production URL**: [https://proposera-production.up.railway.app](https://proposera-production.up.railway.app)
- **Deployment Platform**: Railway (Docker container with persistent `/app/data` volume for SQLite & media assets)
- **Publishing Model**: **100% Free Forever** &mdash; No paywall, no payment gateway, no subscription required.

---

## ✨ Key Capabilities

### 1. Creator Studio
- **Clean White Workspace**: Professional, distraction-free authoring environment with accessible typography, crisp borders, and refined forms.
- **Creator Authentication**: Secure session cookies, bcrypt password hashing, and complete data isolation between creators.
- **Live Mutable Publishing**: Direct, free publishing with instant updates reflecting on the live URL without breaking links or creating messy snapshots.
- **Custom URL Slugs**: Author custom URLs (e.g. `/p/sophia-love`) or generate unguessable secure random slugs.
- **Response Dashboard**: Live view of recipient answers, timestamps, and optional heartfelt notes.

### 2. Recipient Experience (`/p/[slug]`)
- **Emotional 5-Scene Progression**:
  1. *Opening Scene*: Intimate greeting & cover memory photo.
  2. *Story Letter*: Narrative reflection with thumb-friendly scrolling.
  3. *The Climax Question*: Dignified, prominent proposal question presentation.
  4. *Response Submission*: Accessible, non-manipulative affirmative answer with optional custom note.
  5. *Celebration*: Atmospheric confetti fireworks and confirmation banner.
- **Cinematic Romantic Themes**:
  - `midnight-velvet`: Dark, intimate, starry elegance.
  - `sunset-terrace`: Warm, golden-hour romance.
  - `celestial-rose`: Soft pastels and dreamy aesthetic.
- **Ambient Proposal Music Engine**: Royalty-free curated soundtracks, first-interaction activation, smooth volume fade-in, and accessible persistent mute controls.

### 3. Security, Privacy & Reliability
- **Strict Non-Disclosure**: Indistinguishable 404 responses for drafts, unpublished proposals, or non-existent paths to prevent discovery.
- **Privacy-Safe Media Pipeline**: Magic-byte verification, automatic stripping of EXIF and GPS coordinates, single-use upload permits, automated WebP conversion, and storage quota enforcement.
- **Operational Health**: `/api/health` monitoring probe for container and database readiness.
- **Reduced Motion Support**: Strict adherence to `prefers-reduced-motion: reduce` across animations and audio indicators.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: `v20.x` or higher (tested on Node `v22.x` and `v24.x`)
- **npm**: `v10.x` or higher
- **Git**: `v2.x`

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/akrittiii09/proposera.git
   cd proposera
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   No external secret configuration is required for baseline development.

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Development & Quality Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Launch local Next.js development server |
| `npm run test` | Run complete unit and integration test suite via Vitest |
| `npm run typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`) |
| `npm run lint` | Run ESLint checks |
| `npm run build` | Compile optimized production build |
| `npm run start` | Start production server from compiled `.next` bundle |

---

## 📦 Architecture & Deployment

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS design system
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled, robust prepared statements)
- **Containerization**: Multi-stage `Dockerfile` with persistent storage volume mount at `/app/data`
- **Cloud Host**: Railway Docker runner with automated restart policies

---

## 📄 License & Community

Proposera is open-source software licensed under the MIT License. Contributions and issues are welcome on [GitHub](https://github.com/akrittiii09/proposera).
