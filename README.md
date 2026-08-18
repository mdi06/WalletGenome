# EVM Wallet Forensics & Behavioral Analytics 🔍⚡

> **An on-chain intelligence and quantitative portfolio analytics suite for EVM wallets.**  
> Decode wallet personas, audit security risks, and uncover hidden lost funds across 5 EVM networks.

---

## 🌟 Overview

**Wallet Forensics & Analytics** moves beyond simple balance checkers into **deep on-chain behavioral intelligence and quantitative portfolio auditing**.

Built with Next.js 16, TypeScript, and Recharts, this tool ingests raw transaction histories and token transfers across **Ethereum, Base, Arbitrum, BNB Chain (BSC), and Optimism**, enriching them with historical USD pricing, protocol contract labels, and quantitative risk heuristics.

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
  - Unlimited token approvals to unverified smart contracts (Weight: 30%).
  - Detected loss incidents and unauthorized drain traces (Weight: 25%).
  - Failed transaction ratios and wasted gas fees (Weight: 15%).
  - Stale approvals older than 6 months (Weight: 10%).
  - Unidentified contract interaction ratios (Weight: 10%).
  - Graveyard dead assets (Weight: 10%).
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

### 5. 🗺️ Arkham-Style Capital Flow Graph
- **3-Column Liquidity Network Topology**: Maps fund origins (CEXs, bridges, funding wallets) through core user address to active DeFi protocols and destination wallets.
- **Animated SVG Flow Particles**: Particle-traced directed lines with volume-weighted stroke widths.

### 6. 🔓 Approval & Exposure Audit
- **Calldata Spender Decoding**: Decodes ERC-20 `approve(address, uint256)` method inputs (`0x095ea7b3`).
- **Capital at Risk ($)**: Quantifies total USD value exposed per active allowance based on net holding balances.

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
  │  (CoinGecko Daily OHLC) │   │  (100+ DEX/Bridge/CEX/L2) │  │  (Deposit Sweep Filter)   │
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
COINGECKO_API_KEY=your_coingecko_demo_key
```
*(Note: The application includes native Blockscout fallbacks and operates out-of-the-box even without external API keys).*

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Production Build & Validation

```bash
npm run build
npm run start
```

---

## 📄 License

MIT License. Designed for on-chain quantitative research and security auditing.
