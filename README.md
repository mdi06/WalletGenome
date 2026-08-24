# EVM Wallet Forensics & Behavioral Analytics 🔍⚡

> **An on-chain intelligence and quantitative portfolio analytics suite for EVM wallets.**  
> Decode wallet personas, audit security risks, and uncover hidden lost funds across 4 EVM networks.

---

## 🌟 Overview

**Wallet Forensics & Analytics** moves beyond simple balance checkers into **deep on-chain behavioral intelligence and quantitative portfolio auditing**.

Built with Next.js 16, TypeScript, and Recharts, this tool ingests raw transaction histories and token transfers across **Ethereum, Base, Arbitrum, and Optimism**, enriching them with historical USD pricing, protocol contract labels, and quantitative risk heuristics.

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

### 6. 🕵️ Sybil & Blacklist Radar (Hybrid In-Memory Auto-Sync)
- **LayerZero Sybil Database**: Cross-references against 800,000+ bounty-reported and self-reported Sybil clusters.
- **Hop Protocol Sybil Defense**: Union-find graph analysis identifying co-funded multi-wallet execution paths.
- **Umbra Mixer Clusters**: Flags stealth address pooling and privacy mixer obfuscation patterns.
- **US Treasury OFAC Sanctions**: Validates against sanctioned Tornado Cash, hack, and exploit addresses.
- **Hybrid Auto-Sync**: 24-hour cache TTL auto-refreshing from authoritative GitHub upstream repositories with 0.01ms in-memory Set lookups.
- **Verdict Precedence**: A positive non-behavioral blacklist match overrides a clean behavioral headline; MEDIA Sybil probability remains a separate secondary heuristic.

### 5. 🗺️ Arkham-Style Capital Flow Graph
- **3-Column Liquidity Network Topology**: Maps fund origins (CEXs, bridges, funding wallets) through core user address to active DeFi protocols and destination wallets.
- **Animated SVG Flow Particles**: Particle-traced directed lines with volume-weighted stroke widths.
- **Evidence-Backed Cluster Links**: Batch mode detects direct submitted-wallet transfers from full native, internal, and ERC-20 evidence, preserving direction, chain, unique transaction hashes, and USD completeness. Shared hubs use full counterparty sets; display truncation does not change conclusions.

### 6. 🔓 Approval & Exposure Audit
- **Calldata Spender Decoding**: Decodes ERC-20 `approve(address, uint256)` method inputs (`0x095ea7b3`).
- **Estimated Approval Exposure ($)**: Caps each active allowance by the reconstructed positive token balance and, for finite approvals, by the decoded allowance amount. Unknown balances or prices remain unavailable; high-risk and unlimited approvals are separate count metrics.

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
- Current approval exposure uses the current spot cache rather than a transfer-time historical quote. An absent current quote leaves exposure unavailable instead of substituting an older price or `$0`.

### Canonical reporting contract

Every single-wallet API response exposes a typed `metrics` object. The methodology page renders the detailed source, inclusion, aggregation, completeness, and price-provenance rules directly from `src/lib/reportingContract.ts`.

| Field | Canonical meaning |
| --- | --- |
| `inflowUSD` / `outflowUSD` | Verified historical subtotal of inbound/outbound native, internal, and ERC-20 transfer legs across selected chains. Current-price estimates and unpriced legs are excluded. |
| `netFlowUSD` | `inflowUSD - outflowUSD`. |
| `grossVolumeUSD` | `inflowUSD + outflowUSD`; not portfolio value. |
| `protocolVolumeUSD` | Priced legs attributed to recognized protocol transactions/contracts, preserving chain provenance. |
| `approvalExposureUSD` | Estimated positive balances covered by active approvals using current prices; unknown balance/price is unavailable, not zero. |
| `riskScore` / `riskGrade` | Maximum (worst) chain risk score and its grade; withheld when wallet history is incomplete. |
| `sybilProbability` | Cross-chain MEDIA behavioral heuristic; separate from blacklist status. If historical pricing is incomplete, the price-dependent monetary dimension is omitted and the remaining behavioral dimensions are reweighted. |
| `blacklistStatus` | `flagged`, `clear`, or `unavailable` from non-behavioral blacklist checks. |
| `activeDays` / `longestStreakDays` | Union and longest consecutive run of UTC activity dates across selected chains. |
| `totalUnlimitedApprovals` | Count of active unlimited approvals across selected chains. |

Capital Flow also publishes `capitalFlowCoverage`: verified transfer legs, total eligible legs, excluded current-price estimates, unpriced legs, coverage percentage, and `complete`/`partial`/`unavailable` status. A partial subtotal is shown only when wallet history is complete and at least one eligible transfer leg has a historical or stablecoin price. Other USD metrics continue to follow their own completeness contracts.

### Public scan request policy

- Scans remain public and unauthenticated; provider credentials are server-side environment variables and are never accepted from request bodies.
- Single and batch routes validate exact allowed fields, EVM/ENS targets, and supported chain IDs before provider work.
- Batch scans use the shared client/API limit of 10 unique wallets and at most 3 wallet scans concurrently.
- Per-caller sliding-window limits, per-instance concurrency caps, body limits, and a 280-second work budget return deterministic `4xx`, `429`, or `504` errors.
- The in-process limiter protects each Vercel function instance; production should also mirror these limits at the platform firewall for deployment-wide enforcement.

### Stateless persistence policy

- The application is intentionally stateless: each scan is a point-in-time, provider-dependent report and is not saved as durable history.
- Scanned wallet addresses and generated reports are retained only for the active request. There are no saved-wallet, saved-report, account, or historical-comparison features.
- Scan, identity, price, blacklist, rate-limit, and concurrency caches are process-local, best-effort optimizations. Vercel instances do not share them, and a cold or replaced instance must remain correct.
- A single-wallet scan with complete history and pricing may be reused from one instance's five-minute memory cache and is marked `cached`; incomplete-price, incomplete-history, and cluster-evidence responses are not cached as complete public reports.
- Production application code performs no runtime filesystem writes. Known-wallet labels are version-controlled read-only configuration.
- Adding saved reports or comparable history requires a durable database, migrations, authenticated ownership boundaries, access control, and explicit retention rules first.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/wallet-analytics.git
cd wallet-analytics

# Install dependencies
npm install

# Setup environment variables (optional for higher rate limits)
cp .env.example .env.local
```

### Environment Variables (.env.local)

```env
ETHERSCAN_API_KEY=your_etherscan_api_key
MORALIS_API_KEY=your_moralis_api_key
MORALIS_MAX_FALLBACK_CU_PER_SCAN=3000
MORALIS_MAX_PAGES_PER_DATASET=100
ETHERSCAN_ENABLE_PAID_CHAINS=false
BLOCKSCOUT_API_KEY=your_blockscout_pro_api_key
COINGECKO_API_KEY=your_coingecko_demo_key
```

The scanner is explorer-first. It runs all selected chains concurrently and
loads normal transactions, ERC-20 transfers, and internal transactions from
indexed explorers. A dataset marked complete never triggers Moralis. Ethereum
and Arbitrum use the Etherscan V2 free tier when configured; Base and Optimism
prefer Blockscout. Set `ETHERSCAN_ENABLE_PAID_CHAINS=true` only when the
Etherscan key has paid access to Base and Optimism.

Moralis is a dataset-level last resort. Missing normal transactions use the
30-CU raw transaction endpoint, missing ERC-20 transfers use the 50-CU transfer
endpoint, and missing internal traces use the 50-CU verbose transaction
endpoint. The app never automatically calls the 150-CU Wallet History endpoint.
`MORALIS_MAX_FALLBACK_CU_PER_SCAN` remains a scan-level cap and is partitioned
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
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

---

## 📄 License

MIT License. Designed for on-chain quantitative research and security auditing.
