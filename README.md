# EVM Wallet Forensics & Behavioral Analytics 🔍⚡

> **An on-chain intelligence and quantitative portfolio analytics suite for EVM wallets.**  
> Investigate observable wallet activity, behavioral patterns, and security signals across four supported EVM networks.

---

## 🌟 Overview

**Wallet Forensics & Analytics** moves beyond simple balance checkers into **deep on-chain behavioral intelligence and quantitative portfolio auditing**.

Built with Next.js 16, TypeScript, and Recharts, this tool ingests raw transaction histories and token transfers across **Ethereum, Base, Arbitrum, and Optimism**, enriching them with historical USD pricing, protocol contract labels, and quantitative risk heuristics.

### Design reference

Read [DESIGN.md](DESIGN.md) before changing the UI. It defines the current light gray, white, black, and orange appearance, responsive rules, and how to record new design decisions. Shared styles live in `src/app/globals.css`; local sizing stays with the components. [DESIGN_AUDIT.md](DESIGN_AUDIT.md) tracks findings and follow-up evidence, not automatic approval to redesign.

---

## ✨ Key Analytics Features

### 1. 🧬 Behavioral Fingerprinting & Persona Modeling
- **6-Dimension Quantitative Fingerprint**:
  - **DeFi Diversity**: Shannon entropy calculation across protocol interactions (`swap`, `lending`, `staking`, `bridge`, `nft`).
  - **Activity Intensity**: Transaction cadence and frequency normalized by active lifespan.
  - **Capital Efficiency**: Ratio of total value transferred to gas fees spent.
  - **Risk Appetite**: Proportion of interactions with unverified contracts and failed transactions.
  - **Wallet Maturity**: Age, longevity, and active consistency.
  - **Network Breadth**: Unique counterparties and cross-chain footprint.
- **Automated Persona Classification**: Profiles addresses into archetypes (*DeFi Power User*, *Active Trader*, *Cautious Holder*, *NFT Collector*, *Airdrop Farmer*, *Bridge Heavy*, *Gas Burner*, *Passive Whale*).
- **Radar Chart Visualization**: Recharts-powered spider chart rendering the multi-axial fingerprint.

### 2. 🛡️ Composite Risk Engine & Security Score (0–100)
- **Weighted Multi-Factor Assessment**:
  - High-risk unlimited approvals: up to 40 points (`15 × count`).
  - If there are no high-risk approvals, more than 3 unlimited approvals to known contracts: up to 20 points (`3 × count`).
  - Failed transaction ratio above 5%: up to 25 points (`round(ratio × 120)`).
  - More than 2 approvals older than 180 days: up to 15 points (`3 × count`).
  - More than 5 unknown-contract interactions and a ratio above 30%: up to 10 points (`round(ratio × 20)`).
- **Grade Bands**: A = 0–15, B = 16–30, C = 31–50, D = 51–70, F = 71–100.
- **Scope**: The portfolio metric is the maximum (worst) selected-chain score. The engine does not detect or quantify loss/drain incidents.
- **Interactive Radial SVG Gauge**: Visual grade ratings (**A**, **B**, **C**, **D**, **F**) with itemized factor breakdown and recommended remediations.

### 4. 🕒 Temporal Activity Heatmap
- **24×7 UTC Contribution Grid**: Day-of-week vs. hour-of-day matrix highlighting transaction execution patterns and timezone footprints.
- **Streak & Velocity Metrics**: Calculates active days, longest activity streaks, peak hours, and average transactions per active day.
- **Chain Activity Distribution**: Breaks normal wallet transactions down by selected chain. Percentages are shown only when every selected transaction dataset is complete; partial counts are marked as lower bounds and unavailable history is never displayed as zero.

### 6. 🕵️ Sybil & Blacklist Radar (Hybrid In-Memory Auto-Sync)
- **LayerZero Sybil Database**: Cross-references against 800,000+ bounty-reported and self-reported Sybil clusters.
- **Hop Protocol Sybil Defense**: Union-find graph analysis identifying co-funded multi-wallet execution paths.
- **Umbra Mixer Clusters**: Flags stealth address pooling and privacy mixer obfuscation patterns.
- **US Treasury OFAC Sanctions**: Validates against sanctioned Tornado Cash, hack, and exploit addresses.
- **Hybrid Auto-Sync**: 24-hour cache TTL auto-refreshing from authoritative GitHub upstream repositories with illustrative ~0.01 ms in-memory Set lookup timing; this is not a reproducible benchmark or production latency guarantee.
- **Verdict Precedence**: A positive non-behavioral blacklist match overrides a clean behavioral headline; the local MEDIA-style behavioral risk score remains a separate secondary heuristic and is not a live Trusta score.

### 5. 🗺️ Arkham-Style Capital Flow Graph
- **3-Column Liquidity Network Topology**: Maps fund origins (CEXs, bridges, funding wallets) through core user address to active DeFi protocols and destination wallets.
- **Animated SVG Flow Particles**: Particle-traced directed lines with volume-weighted stroke widths.
- **Flow Summary**: Shows verified inflow, outflow, and net flow when history is complete. When history is incomplete but returned transfer legs have historical or stablecoin prices, the Flow Graph shows a separately labelled observed lower bound with missing-history and excluded-value warnings; it is not presented as a complete lifetime total or promoted as a Behavioral DNA headline.
- **Evidence-Backed Cluster Links**: Batch mode detects direct submitted-wallet transfers from full native, internal, and ERC-20 evidence, preserving direction, chain, unique transaction hashes, and USD completeness. Shared hubs use full counterparty sets; display truncation does not change conclusions. These are observed linkage signals, not proof of common control; the Arbitrum Foundation check recognizes published sample addresses and does not reproduce its full graph model.

### 6. 🔓 Approval & Exposure Audit
- **Calldata Spender Decoding**: Decodes ERC-20 `approve(address, uint256)` method inputs (`0x095ea7b3`).
- **Estimated Approval Exposure ($)**: Caps each latest observed non-revoked allowance state by the reconstructed positive token balance and, for finite approvals, by the decoded allowance amount. Approval rows come from returned transaction history, not a live allowance query. Unknown balances or prices remain unavailable; high-risk and unlimited approvals are separate count metrics.

---

## 🛠️ Data Pipeline Architecture

```
                               ┌─────────────────────────────┐
                               │   User Input / Batch Scan   │
                               └──────────────┬──────────────┘
                                              │
               ┌──────────────────────────────┴──────────────────────────────┐
               ▼                                                             ▼
  ┌─────────────────────────┐                                   ┌─────────────────────────┐
  │   Blockscout REST API   │                                   │   Etherscan V2 API      │
  │   (Open Rate-Resilient) │                                   │   (Multi-Chain Gateway) │
  └────────────┬────────────┘                                   └────────────┬────────────┘
               │                                                             │
               └──────────────────────────────┬──────────────────────────────┘
                                              ▼
                             ┌────────────────────────────────┐
                             │ Transaction Normalization &    │
                             │ Calldata Method Categorization │
                             └────────────────┬───────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               ▼                              ▼                              ▼
  ┌─────────────────────────┐   ┌───────────────────────────┐  ┌───────────────────────────┐
  │  Historical Price Feed  │   │  Entity Label Dictionary  │  │  CEX Sweeper Verifier     │
  │ (DefiLlama Batch + CG)  │   │  (100+ DEX/Bridge/CEX/L2) │  │  (Deposit Sweep Filter)   │
  └────────────┬────────────┘   └─────────────┬─────────────┘  └─────────────┬─────────────┘
               │                              │                              │
               └──────────────────────────────┼──────────────────────────────┘
                                              ▼
                             ┌────────────────────────────────┐
                             │ Analytics & Quantitative Core: │
                             │ • Behavioral Fingerprint       │
                             │ • Risk Scoring Algorithm       │
                             │                              │ • Activity Heatmap Matrix      │
                             │ • Capital Flow Topology        │
                             └────────────────┬───────────────┘
                                              ▼
                             ┌────────────────────────────────┐
                             │ Interactive Next.js Dashboard  │
                             └────────────────────────────────┘
```

### Historical USD price policy

- Timestamp-matched daily prices are labeled `historical`.
- Stablecoins use an explicit `stablecoin_assumption` of $1.
- If a daily price is missing but a current price exists, the transaction or transfer valuation is labeled `spot_estimate`. It uses the token's price at scan time, is not an exact historical value, and is excluded from definitive historical USD metrics.
- If neither price is available, the USD value remains `null`/unavailable rather than becoming `$0`.
- Historical price completeness is tracked independently per chain. A missing historical quote withholds only historical USD and price-backed risk/Sybil metrics; complete transaction history can still produce definitive non-price activity, approval-count, and blacklist metrics.
- Approval exposure uses the current spot cache rather than a transfer-time historical quote. The approval state is reconstructed from the latest non-revoked states observed in returned approval history, not from a live allowance query. An absent current quote leaves exposure unavailable instead of substituting an older price or `$0`.

### Canonical reporting contract

Every single-wallet API response exposes a typed `metrics` object. The methodology page renders the detailed source, inclusion, aggregation, completeness, and price-provenance rules directly from `src/lib/reportingContract.ts`.

| Field | Canonical meaning |
| --- | --- |
| `inflowUSD` / `outflowUSD` | Verified historical subtotal of inbound/outbound native, internal, and ERC-20 transfer legs across selected chains. Current-price estimates and unpriced legs are excluded. |
| `netFlowUSD` | `inflowUSD - outflowUSD`. |
| `grossVolumeUSD` | `inflowUSD + outflowUSD`; not portfolio value. |
| `protocolVolumeUSD` | Priced legs attributed to recognized protocol transactions/contracts, preserving chain provenance. |
| `approvalExposureUSD` | Estimated positive balances covered by latest non-revoked observed approvals using current prices; unknown balance/price is unavailable, not zero. |
| `riskScore` / `riskGrade` | Maximum (worst) chain risk score and its grade; withheld when wallet history is incomplete. |
| `sybilProbability` | Cross-chain local MEDIA-style behavioral risk heuristic; separate from blacklist status and not a live Trusta score. If historical pricing is incomplete, the price-dependent monetary dimension is omitted and the remaining behavioral dimensions are reweighted. |
| `blacklistStatus` | `flagged`, `clear`, or `unavailable` from non-behavioral blacklist checks. |
| `activeDays` / `longestStreakDays` | Union and longest consecutive run of UTC activity dates across selected chains. |
| `totalUnlimitedApprovals` | Count of unlimited approvals in the latest observed state across selected chains. |

Capital Flow also publishes `capitalFlowCoverage`: verified transfer legs, total eligible legs, excluded current-price estimates, unpriced legs, coverage percentage, and `complete`/`partial`/`unavailable` status. When wallet history is complete, partial price coverage is presented as a verified lower bound with count coverage. When wallet history itself is incomplete, the canonical metrics remain unavailable, but the Flow Graph may show an observed priced lower bound calculated only from returned historical or stablecoin-priced legs. Missing history, current-price estimates, and unpriced values are excluded and called out explicitly. Other USD metrics continue to follow their own completeness contracts.

### Public scan request policy

- Scans remain public and unauthenticated; provider credentials are server-side environment variables and are never accepted from request bodies.
- Single and batch routes validate exact allowed fields, EVM/ENS targets, and supported chain IDs before provider work.
- Single-wallet browser scans request an NDJSON stream from `POST /api/scan`. The same request emits scan phases, provider-response counts, cumulative history records, and the final report, so progress does not depend on process-local job storage or cross-instance polling.
- Batch scans accept at most 10 unique wallets and process at most 3 wallet scans concurrently.
- Per-caller sliding-window limits, per-instance concurrency caps, body limits, and a 280-second work budget return deterministic `4xx`, `429`, or `504` errors.
- The in-process limiter protects each Vercel function instance. When the optional Upstash REST variables are configured, shared Redis also enforces deployment-wide daily scan quotas (the batch quota counts requested wallets) and refresh cooldowns.

### Stateless persistence policy

- The application is intentionally stateless: each scan is a point-in-time, provider-dependent report and is not saved as durable history.
- Scanned wallet addresses and generated reports are retained only for the active request. There are no saved-wallet, saved-report, account, or historical-comparison features.
- Identity, price, blacklist, rate-limit, and concurrency caches remain process-local, best-effort optimizations. Report and successful history-dataset caches use the optional shared Upstash Redis adapter, with process memory as a fallback when it is not configured.
- Complete-history single-wallet reports may be reused for five minutes and are marked `cached`; their original fetch time, history-cache sources, and all missing-data warnings are retained. Complete transaction, token-transfer, and internal-transaction datasets are cached independently for one hour, so a missing historical price does not force another history download.
- A forced refresh skips reads from the report and history caches, fetches from providers, and replaces each successfully complete transaction, token-transfer, or internal-transaction dataset with a new one-hour entry. Partial or failed refresh responses do not overwrite the previous complete dataset; the fresh report is then cached for five minutes and retains provider failure warnings. Refreshes are limited to once every five minutes per caller.
- Simultaneous identical scans are coalesced only within one server process. Shared Redis caches and quotas do not coordinate in-flight work across processes; verify those deployment-wide behaviors against real Redis from two processes before claiming them.
- When a shared report is copied into process memory, its original fetch time and remaining lifetime are preserved; expired reports are rejected instead of receiving a new full five-minute lifetime. Shared daily scan quotas require the Upstash variables; without them, the existing per-instance limits still apply.
- The four curated public demo wallets load versioned static snapshots covering Ethereum, Base, Arbitrum, and Optimism instead of entering the live provider pipeline. Each snapshot displays its generation date and offers a separate **Run fresh scan** action; provider and price completeness warnings remain part of the saved result.
- Curated demo snapshots are application assets, not user-saved reports. Updating them is a deliberate maintenance action and does not add accounts, report history, or runtime database writes.
- Production application code performs no runtime filesystem writes. Known-wallet labels are version-controlled read-only configuration.
- Adding saved reports or comparable history requires a durable database, migrations, authenticated ownership boundaries, access control, and explicit retention rules first.

The current history cache reuses a complete indexed dataset as a point-in-time snapshot. A later incremental-history phase should persist the last inspected block per wallet/chain, fetch only newer blocks, and recheck a recent block window for chain reorganizations before replacing the cached dataset.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x (the version used by local verification, CI, and Vercel)
- npm, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/mdi06/WalletGenome.git
cd WalletGenome

# Install dependencies
npm install

# Setup environment variables (optional for higher rate limits)
cp .env.example .env.local
```

### Environment Variables (.env.local)

```env
ETHERSCAN_API_KEY=your_etherscan_api_key
# Optional last-resort fallback; disabled unless explicitly enabled.
MORALIS_FALLBACK_ENABLED=false
# MORALIS_API_KEY=your_current_moralis_api_key
MORALIS_MAX_FALLBACK_CU_PER_SCAN=3000
MORALIS_MAX_PAGES_PER_DATASET=100
ETHERSCAN_ENABLE_PAID_CHAINS=false
BLOCKSCOUT_API_KEY=your_blockscout_pro_api_key
COINGECKO_API_KEY=your_coingecko_demo_key
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
SHARED_SCAN_DAILY_LIMIT=500
SHARED_BATCH_DAILY_LIMIT=100
```

The scanner is explorer-first. It runs all selected chains concurrently and
loads normal transactions, ERC-20 transfers, and internal transactions from
indexed explorers. A dataset marked complete never triggers Moralis. Ethereum
and Arbitrum use the Etherscan V2 free tier when configured; Base and Optimism
prefer Blockscout. Set `ETHERSCAN_ENABLE_PAID_CHAINS=true` only when the
Etherscan key has paid access to Base and Optimism.
When a legacy Etherscan-compatible Blockscout endpoint fails, the scanner falls
back to Blockscout REST v2 address transactions, token transfers, and internal
transactions with cursor pagination.

Moralis is a dataset-level last resort. Missing normal transactions use the
30-CU raw transaction endpoint, missing ERC-20 transfers use the 50-CU transfer
endpoint, and missing internal traces use the 50-CU verbose transaction
endpoint. The app never automatically calls the 150-CU Wallet History endpoint.
Moralis fallback is disabled by default. Only set `MORALIS_FALLBACK_ENABLED=true`
with a current key when this optional last-resort provider is intentionally
configured. `MORALIS_MAX_FALLBACK_CU_PER_SCAN` remains a scan-level cap and is partitioned
equally across only the chains whose explorer data is incomplete. This prevents
one chain from consuming another fallback chain's allocation. Account-quota
exhaustion is reported separately from the local CU limit.
`MORALIS_MAX_PAGES_PER_DATASET` prevents unbounded cursor pagination. Partial
explorer and fallback records are deduplicated and remain explicitly partial
unless one provider proves full cursor exhaustion.

Ethereum, Base, Arbitrum, and Optimism also use live RPC heads to divide large
explorer histories into bounded block ranges. Range work is concurrent, while
per-domain limiters prevent one upstream provider from being flooded.
Without external API keys, the application uses best-effort public indexers and
marks any unverified gaps as partial instead of presenting missing records as a
complete scan.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Production Build & Validation

```bash
npm run verify
npm run start
```

`npm run verify` runs lint, deterministic Next.js route type generation plus TypeScript checking, the full regression suite, and the production build. Run it before pushing or creating a deployment. Vercel uses the same command from `vercel.json`; no lint or TypeScript bypass is configured.

Use the [Vercel Preview, promotion, and rollback runbook](docs/deployment_runbook.md)
for environment variables, deployment-wide rate limits, monitoring, Preview
smoke tests, production promotion, and restoration of the last known good
deployment.

Performance measurement and privacy-safe Web Vitals telemetry are defined in
[docs/performance-budget.md](docs/performance-budget.md). Local asset sizes and
browser traces are candidate evidence only; Preview Lighthouse runs and
production field percentiles remain separate release gates.

---

## 📄 License

MIT License. Designed for on-chain quantitative research and security auditing.
