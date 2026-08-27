# EVM Wallet Forensics & Behavioral Analytics — Agent Guidelines

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## 🚀 1. Tech Stack & Environment
- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 3, Lucide React icons
- **Data & Charts**: Recharts, SVG canvas visualizers
- **APIs & On-Chain**: Etherscan API v2, CoinGecko, EVM RPCs
- **Testing**: Node test runner with `tsx` (`src/**/*.test.ts`)

---

## 🛠️ 2. Essential Commands
Always verify changes with the appropriate commands:
- **Dev Server**: `npm run dev` (configured with `--webpack`)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Unit Tests**: `npm test`

---

## 📁 3. Architecture & Directory Overview
- `src/app/`: Next.js App Router (pages, layout, API endpoints).
- `src/components/`: Modular UI components, charts (Radar, Sankey/Flow, Heatmap, Risk Gauge).
- `src/lib/`: Core computational logic:
  - `etherscan.ts` / API clients: Multi-chain data ingestion and normalization.
  - Analytics & Fingerprinting: Shannon entropy, persona classification, Gini index.
  - Risk & Security Engine: 0–100 weighted risk scoring and exposure auditing.
  - Sybil Radar: LayerZero / Hop / OFAC blacklist checking with in-memory caching.
- `src/config/`: Supported chains (Ethereum, Base, Arbitrum, Optimism) and contract registries.
- `src/hooks/`: Custom React hooks for state, data fetching, and animations.

---

## 📐 4. Coding Standards & Guidelines

### TypeScript & React
- **Strict Typing**: Never use `any`. Always create or reuse explicit TypeScript interfaces in `src/types` or `src/lib`.
- **Client vs Server Components**: Mark interactive/chart components with `'use client'`. Keep data fetchers and heavy calculations on the server where feasible.
- **Pure Analytical Functions**: Keep mathematical functions (entropy, risk scores, gas calculations) deterministic and covered by unit tests.

### API & Network Resilience
- **Rate Limit Handling**: Handle Etherscan/CoinGecko HTTP 429 and missing API keys gracefully with fallbacks and informative UI error banners.
- **In-Memory Caching**: Respect cache TTLs for Sybil list syncs and historical price lookups to prevent redundant network overhead.

### UI & UX Aesthetics
- **Design Source of Truth**: Read `DESIGN.md` before UI changes. It records the current app's visual language and responsive rules; `DESIGN_AUDIT.md` records findings, not an alternative theme or automatic approval to redesign.
- **Current Forensics Theme**: Preserve light gray page backgrounds, white cards, near-black text and structural controls, orange primary actions, sharp rectangular geometry, and restrained tactile shadows. Dark panels and semantic chart/status colors are local treatments, not a global dark theme.
- **Shared Styles**: Reuse `src/app/globals.css` tokens and existing components. Keep component-specific sizing in component markup. Do not introduce a second palette; update `DESIGN.md` when the user approves a new shared design decision.
- **Responsive & Accessible**: Ensure charts resize cleanly across mobile and desktop viewports, with legible tooltips and accessible color contrasts.

---

## 🧪 5. Testing & Verification Requirements
- When editing analytics math or risk heuristics, add or update corresponding unit tests in `src/lib/__tests__/` or `src/**/*.test.ts`.
- Run `npm test` and `npm run lint` before completing tasks.
