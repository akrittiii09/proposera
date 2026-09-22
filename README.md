# Proposera

Proposera is being developed as a standalone, data-driven personalized proposal-experience platform.

## Current Development Status
- **Status**: Milestones 1 through 8 Complete
- **Completed Milestones**:
  - Milestone 1: Foundation, Tooling & Environment Setup
  - Milestone 2: Creator Authentication & Server Sessions
  - Milestone 3: Proposal Authoring & Management
  - Milestone 4: Recipient Delivery & Response Capture (`/p/[slug]`)
  - Milestone 5: Live Mutable Publishing
  - Milestone 6: Free Publishing / Paywall Removal
  - Milestone 7: Media Upload Ingestion Pipeline & Storage Partitioning
  - Milestone 8: Ambient Music Engine & Autoplay Handler
- **Next Milestone**: Milestone 9 — Playful Micro-Interactions (Scratch/Flip reveals) & Enhanced Storytelling

## Project Purpose
Proposera enables creators to author, customize, preview, and share intimate, beautifully orchestrated proposal experiences for their partners. It separates content from presentation so visual themes can be evolved without risking narrative loss.

## Repository Information
- **Repository**: `akrittiii09/proposera`
- **Visibility**: Private
- **Primary Branch**: `main`
- **Ownership**: Solo-owned and controlled by @akrittiii09.

## Required Tooling
- **Node.js**: `v20.x` or higher (tested with Node `v24.x`)
- **npm**: `v10.x` or higher (tested with npm `v11.x`)
- **Git**: `v2.x`

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/akrittiii09/proposera.git
   cd proposera
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Copy the example environment template:
   ```bash
   cp .env.example .env.local
   ```
   No external secret configuration is required for Phase 0.

## Development Scripts

- **Development Server**:
  ```bash
  npm run dev
  ```
- **Typecheck**:
  ```bash
  npm run typecheck
  ```
- **Linting**:
  ```bash
  npm run lint
  ```
- **Unit Tests**:
  ```bash
  npm run test
  ```
- **Production Build**:
  ```bash
  npm run build
  ```

## Contribution & Ownership Guidance
Proposera is an independently owned, closed-source project. All architecture, design, code, and product decisions are controlled directly by the project owner.
