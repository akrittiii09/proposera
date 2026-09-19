# Development Guide: Proposera

## 1. Prerequisites

- **Node.js**: `v20.x` or higher (Active LTS or Current)
- **npm**: `v10.x` or higher
- **Git**: `v2.x`

---

## 2. Getting Started

1. Clone the private repository:
   ```bash
   git clone https://github.com/akrittiii09/proposera.git
   cd proposera
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
   *Note: Phase 0 does not require external database or third-party service secrets.*

4. Launch development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 3. Engineering Workflows & Tooling Commands

Every phase and contribution must satisfy the following verification pipeline:

| Command | Purpose | Configuration File |
| :--- | :--- | :--- |
| `npm run dev` | Starts local Next.js development server | `next.config.ts` |
| `npm run typecheck` | Validates TypeScript types across all files | `tsconfig.json` |
| `npm run lint` | Lints project files against Next.js standards | `eslint.config.mjs` |
| `npm run test` | Executes unit and integration test suites | `vitest.config.ts` |
| `npm run build` | Compiles optimized production bundle | `next.config.ts` |

---

## 4. Git & Repository Discipline

- **Primary Branch**: `main`.
- **Commit Style**: Semantic commits (e.g., `chore(phase-0): ...`, `docs: ...`, `feat: ...`).
- **Safety**:
  - Never force-push or rewrite published history on `main`.
  - Always verify `git status`, `git diff`, and `git diff --check` prior to staging and committing.
  - Never commit credentials, `.env`, or `.env.local` files.
