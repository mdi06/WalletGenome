'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Dna,
  ShieldAlert,
  ShieldCheck,
  Zap,
  GitFork,
  Activity,
  Layers,
  Lock,
  Flame,
  UserCheck,
  Scale,
  Code2,
  Cpu,
  Database,
  Compass,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface DocSection {
  id: string;
  category: string;
  title: string;
  badge: string;
  summary: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  filePath: string;
}

const SECTIONS: DocSection[] = [
  {
    id: 'pipeline-architecture',
    category: '1. Architecture & Ingestion',
    title: 'Multi-Chain Pipeline & Rate-Resilient Data Gateway',
    badge: 'INGESTION ENGINE',
    summary: 'Blockscout Open REST + Etherscan V2 multi-chain failover, concurrent batching, daily OHLC pricing, and anti-spoofing.',
    icon: Database,
    filePath: 'src/lib/etherscan.ts · src/lib/prices.ts · src/lib/scanner.ts',
  },
  {
    id: 'calldata-categorization',
    category: '2. Normalization & Gas',
    title: 'Calldata Decoding & Transaction Categorization Engine',
    badge: 'METHOD DISPATCHER',
    summary: 'Calldata method signature matching, function heuristic classification, and historical USD gas calculation.',
    icon: Code2,
    filePath: 'src/lib/scanner.ts · src/lib/labels.ts',
  },
  {
    id: 'behavioral-fingerprint',
    category: '3. Behavioral Forensics',
    title: '6-Dimension Behavioral Fingerprinting & Persona Modeling',
    badge: 'QUANTITATIVE DNA',
    summary: 'Multi-axial quantitative vectors, Shannon entropy calculations, and rule-based persona archetype classification.',
    icon: Dna,
    filePath: 'src/lib/analysis/behavioralFingerprint.ts',
  },
  {
    id: 'risk-score-engine',
    category: '4. Security & Auditing',
    title: 'Composite Security Risk Engine (Score 0–100 & Grades A–F)',
    badge: 'RISK HEURISTICS',
    summary: 'Multi-factor weighted penalty accumulator auditing unverified approvals, drain exposure, failure rates, and dead assets.',
    icon: ShieldAlert,
    filePath: 'src/lib/analysis/riskScore.ts',
  },
  {
    id: 'sybil-radar-media',
    category: '5. Sybil & Blacklist Defense',
    title: 'Sybil Radar & Trusta AI / MEDIA Algorithmic Model',
    badge: 'GRAPH & BOUNTY RADAR',
    summary: '24-hour in-memory cache auto-syncing 800k+ blacklist entries with Trusta MEDIA composite probability scoring.',
    icon: ShieldCheck,
    filePath: 'src/lib/sybil/sybilService.ts · src/lib/sybil/mediaScoring.ts',
  },
  {
    id: 'approvals-exposure-audit',
    category: '6. Token Allowances',
    title: 'ERC-20 Approval & Capital at Risk Exposure Engine',
    badge: 'CALLDATA PARSER',
    summary: 'Spender extraction, unlimited allowance detection, net balance sheet reconstruction, and total USD capital at risk.',
    icon: Lock,
    filePath: 'src/lib/analysis/approvals.ts',
  },
  {
    id: 'portfolio-graveyard',
    category: '7. Asset Forensics',
    title: 'Portfolio Graveyard & Dead Asset Loss Quantification',
    badge: 'VALUE LOSS TRACKER',
    summary: 'Historical unit peak pricing, 180-day inactivity filtering, and cumulative unrealized peak loss calculations.',
    icon: Flame,
    filePath: 'src/lib/analysis/deadAssets.ts',
  },
  {
    id: 'temporal-activity-heatmap',
    category: '8. Cadence & Streaks',
    title: '24×7 Temporal Matrix & Continuous Streak Engine',
    badge: 'TIME-SERIES CADENCE',
    summary: 'Day-hour UTC projection, peak activity identification, and O(N) daily streak algorithms.',
    icon: Activity,
    filePath: 'src/lib/analysis/activityHeatmap.ts',
  },
  {
    id: 'capital-cluster-topologies',
    category: '9. Network Topologies',
    title: 'Capital Flow Topology & Cluster Linkage Matrix',
    badge: 'GRAPH ALGORITHMS',
    summary: '3-column Arkham acyclic layout, inter-wallet transfer detection, and radial orbital multi-body cluster coordinates.',
    icon: GitFork,
    filePath: 'src/components/CapitalFlowGraph.tsx · src/components/ClusterFlowGraph.tsx',
  },
  {
    id: 'decentralized-identity',
    category: '10. Social Graph',
    title: 'Decentralized Identity & Platform Priority Hierarchy',
    badge: 'WEB3.BIO RESOLUTION',
    summary: 'Multi-protocol identity cross-referencing across ENS, Farcaster, Lens, BaseNames, and social handles.',
    icon: UserCheck,
    filePath: 'src/lib/identity/identityService.ts',
  },
  {
    id: 'complexity-matrix',
    category: '11. Technical Specifications',
    title: 'Algorithmic Complexity & Execution Guarantees',
    badge: 'BIG-O SPECIFICATION',
    summary: 'Summary table of time complexity, space complexity, execution runtime, and caching strategies.',
    icon: Cpu,
    filePath: 'src/lib/types.ts · src/app/api/*',
  },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('pipeline-architecture');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.filePath.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/docs#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Top Brand Header ── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center text-left cursor-pointer group"
        >
          <span className="text-xl sm:text-2xl font-black tracking-tight text-black font-sans uppercase">
            WALLET<span className="text-[#ff5500]">.</span>GENOME
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Back to Scanner Link */}
          <Link
            href="/"
            className="btn-3d-neutral text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <Search size={13} className="text-[#ff5500]" />
            <span>SCANNER</span>
          </Link>

          {/* Active Docs Badge */}
          <div className="btn-3d-black text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
            <BookOpen size={13} className="text-[#ff5500]" />
            <span>DOCS / METHODOLOGY</span>
          </div>

          <span className="badge-3d bg-[#ff5500] text-white text-[11px] font-bold tracking-wider px-3 py-1.5 flex items-center gap-1.5">
            <span className="led-live" />
            <span>LIVE INDEXING</span>
          </span>
        </div>
      </header>

      {/* ── Hero Header ── */}
      <div className="pt-4 pb-4 border-b border-[#c8c8c8] space-y-4">
        <div className="badge-3d inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold text-[#0a0a0a]">
          <BookOpen size={13} className="text-[#ff5500]" />
          <span>ENGINEERING DOCUMENTATION & ALGORITHMIC METHODOLOGY</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0a0a0a] leading-tight text-balance">
          How WalletGenome Computes On-Chain Intelligence
        </h1>
        <p className="text-sm sm:text-base text-[#4b5563] font-medium max-w-4xl leading-relaxed text-pretty">
          A clear breakdown of the core algorithms, data pipelines, and security checks powering WalletGenome's on-chain analysis.
        </p>

        {/* Live Search & Filter */}
        <div className="pt-2 max-w-xl">
          <div className="relative flex items-center well-recessed-light">
            <Search className="absolute left-3.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search algorithms, formulas, or components (e.g. 'Shannon entropy', 'MEDIA', 'Approvals')..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-mono font-bold pl-10 pr-4 py-2.5 text-[#0a0a0a] placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Navigation + Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Sticky Sidebar: Table of Contents ── */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-5">
          <div className="card-3d p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#4b5563]">
              <span className="flex items-center gap-1.5">
                <Compass size={14} className="text-[#ff5500]" />
                TABLE OF CONTENTS
              </span>
              <span className="btn-3d-neutral text-[10px] font-mono text-[#0a0a0a] px-2 py-0.5">
                {filteredSections.length} TOPICS
              </span>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {filteredSections.map(s => {
                const IconComponent = s.icon;
                const isSelected = activeSection === s.id;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block p-3 text-xs font-bold transition-all ${
                      isSelected
                        ? 'btn-3d-black text-white'
                        : 'card-3d-interactive text-[#0a0a0a]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent size={14} className="text-[#ff5500] flex-shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <div className={`text-[10px] font-mono mt-1 truncate pl-5.5 ${isSelected ? 'text-gray-300' : 'text-[#6b7280]'}`}>
                      {s.category}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Technical Summary Card */}
          <div className="card-3d p-5 space-y-3 text-xs font-mono text-[#0a0a0a]">
            <div className="font-black text-[#0a0a0a] flex items-center gap-1.5">
              <Zap size={13} className="text-[#ff5500]" />
              KEY COMPUTATION STATS
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-[11px] pt-1">
              <div className="well-recessed-light p-2.5 space-y-0.5">
                <div className="text-[#6b7280]">CHAINS</div>
                <div className="font-bold text-sm text-[#0a0a0a]">5 EVM Networks</div>
              </div>
              <div className="well-recessed-light p-2.5 space-y-0.5">
                <div className="text-[#6b7280]">SYBIL CACHE</div>
                <div className="font-bold text-sm text-[#0a0a0a]">800K+ In-Memory</div>
              </div>
              <div className="well-recessed-light p-2.5 space-y-0.5">
                <div className="text-[#6b7280]">LOOKUP TIME</div>
                <div className="font-bold text-sm text-[#059669]">~0.01 ms (Set)</div>
              </div>
              <div className="well-recessed-light p-2.5 space-y-0.5">
                <div className="text-[#6b7280]">SCORING AXES</div>
                <div className="font-bold text-sm text-[#0a0a0a]">6 Dimensions</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Detailed Content ── */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* ========================================================================= */}
          {/* 1. PIPELINE ARCHITECTURE */}
          {/* ========================================================================= */}
          <section id="pipeline-architecture" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 01 · DATA PIPELINE
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Multi-Chain Pipeline & Rate-Resilient Data Gateway
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('pipeline-architecture')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'pipeline-architecture' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              We use a <strong>dual-gateway system</strong> and caching to bypass block explorer rate limits, ensuring fast and reliable data retrieval.
            </p>

            {/* Architecture Card */}
            <div className="well-recessed-light p-4 space-y-3 font-mono text-xs overflow-hidden">
              <div className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Database size={14} className="text-[#ff5500]" />
                DUAL-GATEWAY FAILOVER WORKFLOW
              </div>
              <div className="bg-[#0a0a0a] text-green-400 p-3.5 text-[11px] leading-relaxed overflow-x-auto whitespace-pre border border-[#222222] shadow-inner">
{`Client Request (Single or Cluster Batch)
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Priority 1: Open Blockscout REST APIs (Zero-Auth, Fast)     │
│             eth.blockscout.com / base.blockscout.com        │
│             arbitrum.blockscout.com / optimism.blockscout   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (If failed or rate-limited)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Priority 2: Etherscan V2 Multi-Chain Gateway                │
│             api.etherscan.io/v2/api?chainid=...             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Parallel Enrichment Pipeline:                               │
│ • Daily OHLC Price Resolution via CoinGecko In-Memory Cache │
│ • Anti-Spoofing Verified Contract Mapping                   │
│ • Web3.bio Identity Graph Resolution (Async non-blocking)   │
└─────────────────────────────────────────────────────────────┘`}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] uppercase">Concurrency</div>
                <p className="text-[#4b5563] leading-relaxed text-[11px] text-pretty">
                  Requests are processed in parallel batches with automated retries and timeouts to guarantee completion without hitting rate limits.
                </p>
              </div>
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] uppercase">Anti-Spoofing</div>
                <p className="text-[#4b5563] leading-relaxed text-[11px] text-pretty">
                  Prices are only fetched for strictly verified contract addresses to prevent scam tokens from inflating portfolio values.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. CALLDATA CATEGORIZATION */}
          {/* ========================================================================= */}
          <section id="calldata-categorization" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 02 · NORMALIZATION & GAS
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Calldata Decoding & Transaction Categorization Engine
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('calldata-categorization')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'calldata-categorization' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              Transactions are decoded and categorized into distinct semantic types using their method signatures and contract registries.
            </p>

            {/* Table of Categories */}
            <div className="well-recessed-light overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap border-collapse">
                <thead className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Method IDs / Heuristic Signatures</th>
                    <th className="p-3">Classification Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-[#ff5500]">approval</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5 font-bold">0x095ea7b3</code>, <code className="badge-3d px-1.5 py-0.5">approve()</code></td>
                    <td className="p-3 text-[#374151]">ERC-20 token allowance approvals to DEXs, bridges, or custom spenders.</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">bridge</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">0xd2ce7d65</code>, <code className="badge-3d px-1.5 py-0.5">0xe9e05c42</code>, <code className="badge-3d px-1.5 py-0.5">0x0f5287e0</code></td>
                    <td className="p-3 text-[#374151]">Cross-chain bridging via Arbitrum Gateway, Optimism Portal, Across, Stargate, or Polygon.</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">swap</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">exactInput</code>, <code className="badge-3d px-1.5 py-0.5">multicall</code>, <code className="badge-3d px-1.5 py-0.5">execute</code></td>
                    <td className="p-3 text-[#374151]">DEX trading across Uniswap, Sushiswap, Curve, Balancer, or 1inch routers.</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">lending</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">supply</code>, <code className="badge-3d px-1.5 py-0.5">borrow</code>, <code className="badge-3d px-1.5 py-0.5">repay</code></td>
                    <td className="p-3 text-[#374151]">Money market operations on Aave, Compound, MakerDAO, or Morpho.</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">staking</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">stake</code>, <code className="badge-3d px-1.5 py-0.5">unstake</code>, <code className="badge-3d px-1.5 py-0.5">delegate</code></td>
                    <td className="p-3 text-[#374151]">Liquid staking / delegation across Lido, Rocket Pool, or native validators.</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">nft</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">mint</code>, <code className="badge-3d px-1.5 py-0.5">safeTransferFrom</code></td>
                    <td className="p-3 text-[#374151]">ERC-721 / ERC-1155 minting and marketplace trading on OpenSea, Blur, etc.</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">transfer</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">input === '0x'</code></td>
                    <td className="p-3 text-[#374151]">Pure native ETH / BNB value transfer between EOA accounts.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Gas Computation Formula */}
            <div className="card-3d p-5 space-y-2">
              <div className="text-xs font-black uppercase flex items-center gap-1.5">
                <Scale size={13} className="text-[#ff5500]" />
                GAS & LIFETIME FEE VALUATION FORMULA
              </div>
              <div className="well-recessed-light p-3.5 font-mono text-xs text-[#0a0a0a] space-y-1">
                <div>{'Gas Cost (ETH) = (gasUsed × gasPrice) / 10^18'}</div>
                <div>{'Gas Cost (USD) = Gas Cost (ETH) × Historical Daily Price(t)'}</div>
              </div>
              <p className="text-[11px] text-[#4b5563] font-mono leading-relaxed">
                Gas costs are calculated using historical prices matching the exact timestamp of execution.
              </p>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. BEHAVIORAL FINGERPRINT */}
          {/* ========================================================================= */}
          <section id="behavioral-fingerprint" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 03 · BEHAVIORAL FORENSICS
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  6-Dimension Behavioral Fingerprinting & Persona Modeling
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('behavioral-fingerprint')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'behavioral-fingerprint' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              Wallets are analyzed across 6 behavioral dimensions, each scored from 0 to 100.
            </p>

            {/* 6 Dimensions Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-mono">
              
              {/* Dim 1 */}
              <div className="card-3d p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-black uppercase">1. DeFi Diversity</span>
                  <span className="badge-3d text-[10px] bg-[#ff5500] text-white px-2 py-0.5 whitespace-nowrap">0–100 PTS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed text-pretty">
                  Measures breadth of smart contracts and distinct protocols used.
                </p>
              </div>

              {/* Dim 2 */}
              <div className="card-3d p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-black uppercase">2. Activity Intensity</span>
                  <span className="badge-3d text-[10px] bg-black text-white px-2 py-0.5 whitespace-nowrap">0–100 PTS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed text-pretty">
                  Evaluates transaction execution frequency.
                </p>
              </div>

              {/* Dim 3 */}
              <div className="card-3d p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-black uppercase">3. Capital Efficiency</span>
                  <span className="badge-3d text-[10px] bg-black text-white px-2 py-0.5 whitespace-nowrap">0–100 PTS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed text-pretty">
                  Ratio of transferred economic value to gas fees consumed.
                </p>
              </div>

              {/* Dim 4 */}
              <div className="card-3d p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-black uppercase">4. Risk Appetite</span>
                  <span className="badge-3d text-[10px] bg-black text-white px-2 py-0.5 whitespace-nowrap">0–100 PTS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed text-pretty">
                  Measures tolerance for unverified contracts and failed transactions.
                </p>
              </div>

              {/* Dim 5 */}
              <div className="card-3d p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-black uppercase">5. Maturity</span>
                  <span className="badge-3d text-[10px] bg-black text-white px-2 py-0.5 whitespace-nowrap">0–100 PTS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed text-pretty">
                  Longevity from first transaction combined with active consistency.
                </p>
              </div>

              {/* Dim 6 */}
              <div className="card-3d p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-black uppercase">6. Network Breadth</span>
                  <span className="badge-3d text-[10px] bg-black text-white px-2 py-0.5 whitespace-nowrap">0–100 PTS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-relaxed text-pretty">
                  Diversity of peers across native transactions and token transfers.
                </p>
              </div>

            </div>

            {/* Persona Decision Tree */}
            <div className="well-recessed-light p-5 space-y-3 font-mono text-xs">
              <div className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#ff5500]" />
                AUTOMATED PERSONA CLASSIFICATION DECISION TREE
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="card-3d p-3 border-l-4 border-l-[#ff5500]">
                  <strong>DeFi Power User:</strong> <code className="text-[#ff5500] font-bold">UniqueContracts &gt; 50</code> OR <code className="text-[#ff5500] font-bold">DeFi Diversity &gt; 60</code>. Multi-year on-chain presence with broad multi-protocol routing.
                </div>
                <div className="card-3d p-3 border-l-4 border-l-black">
                  <strong>Active Trader:</strong> <code className="text-black font-bold">SwapCount &gt; 40% of Txs</code> AND <code className="text-black font-bold">Activity &gt; 50</code>. High-frequency DEX rotation.
                </div>
                <div className="card-3d p-3 border-l-4 border-l-black">
                  <strong>NFT Collector:</strong> <code className="text-black font-bold">NFTCount &gt; 30% of Txs</code>. Heavy minting, marketplace trading, and collection transfers.
                </div>
                <div className="card-3d p-3 border-l-4 border-l-black">
                  <strong>Bridge Heavy:</strong> <code className="text-black font-bold">BridgeCount &gt; 20% of Txs</code>. High cross-chain asset mobility across L1s/L2s.
                </div>
                <div className="card-3d p-3 border-l-4 border-l-black">
                  <strong>Airdrop Farmer:</strong> <code className="text-black font-bold">Activity &gt; 40</code> AND <code className="text-black font-bold">UniqueContracts &lt; 10</code> AND <code className="text-black font-bold">Maturity &lt; 12 mo</code>. Scripted repetitive interactions.
                </div>
                <div className="card-3d p-3 border-l-4 border-l-black">
                  <strong>Passive Whale / Cautious Holder:</strong> <code className="text-black font-bold">Activity &lt; 20</code> AND <code className="text-black font-bold">Maturity &gt; 50</code>. Long-term capital storage.
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4. COMPOSITE RISK ENGINE */}
          {/* ========================================================================= */}
          <section id="risk-score-engine" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 04 · SECURITY & AUDITING
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Composite Security Risk Engine (Score 0–100 & Grades A–F)
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('risk-score-engine')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'risk-score-engine' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              The risk engine scores vulnerabilities from <strong>0 (Safe) to 100 (Critical)</strong>, mapping them to security grades A through F based on key risk factors.
            </p>

            {/* Risk Factor Breakdown Table */}
            <div className="well-recessed-light overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap border-collapse">
                <thead className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Risk Factor</th>
                    <th className="p-3">Max Weight</th>
                    <th className="p-3">Calculation Formula</th>
                    <th className="p-3">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">1. High-Risk Unlimited Approvals</td>
                    <td className="p-3 font-bold text-[#ff5500]">40 pts</td>
                    <td className="p-3 font-mono">{'min(40, HighRiskApprovals × 15)'}</td>
                    <td className="p-3"><span className="badge-3d bg-[#dc2626]/15 text-[#b91c1c] border border-[#dc2626]/40 px-2 py-0.5 font-bold">Critical</span></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">2. Failed Transaction Ratio</td>
                    <td className="p-3 font-bold text-[#ff5500]">25 pts</td>
                    <td className="p-3 font-mono">{'min(25, round(FailedRatio × 120)) if FailedRatio > 5%'}</td>
                    <td className="p-3"><span className="badge-3d bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/40 px-2 py-0.5 font-bold">Warning</span></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">3. Stale Approvals (&gt;6 Months)</td>
                    <td className="p-3 font-bold">15 pts</td>
                    <td className="p-3 font-mono">{'min(15, StaleCount × 3) if StaleCount > 2'}</td>
                    <td className="p-3"><span className="badge-3d bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/40 px-2 py-0.5 font-bold">Warning</span></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">4. Unidentified Contract Ratio</td>
                    <td className="p-3 font-bold">10 pts</td>
                    <td className="p-3 font-mono">{'min(10, round(UnknownRatio × 20)) if UnknownRatio > 30%'}</td>
                    <td className="p-3"><span className="badge-3d bg-[#3b82f6]/15 text-[#1d4ed8] border border-[#3b82f6]/40 px-2 py-0.5 font-bold">Info</span></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">5. Dead Token Holdings</td>
                    <td className="p-3 font-bold">10 pts</td>
                    <td className="p-3 font-mono">{'min(10, DeadTokensCount) if DeadCount > 5'}</td>
                    <td className="p-3"><span className="badge-3d bg-[#3b82f6]/15 text-[#1d4ed8] border border-[#3b82f6]/40 px-2 py-0.5 font-bold">Info</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Letter Grade Scale */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono text-xs">
              <div className="card-3d p-3 text-[#047857]">
                <div className="text-lg font-black">GRADE A</div>
                <div className="text-[10px] font-bold">Score 0–15</div>
                <div className="text-[9px] text-[#6b7280]">Pristine Security</div>
              </div>
              <div className="card-3d p-3 text-blue-700">
                <div className="text-lg font-black">GRADE B</div>
                <div className="text-[10px] font-bold">Score 16–30</div>
                <div className="text-[9px] text-[#6b7280]">Minor Warnings</div>
              </div>
              <div className="card-3d p-3 text-amber-700">
                <div className="text-lg font-black">GRADE C</div>
                <div className="text-[10px] font-bold">Score 31–50</div>
                <div className="text-[9px] text-[#6b7280]">Elevated Risk</div>
              </div>
              <div className="card-3d p-3 text-orange-700">
                <div className="text-lg font-black">GRADE D</div>
                <div className="text-[10px] font-bold">Score 51–70</div>
                <div className="text-[9px] text-[#6b7280]">Substantial Exposure</div>
              </div>
              <div className="card-3d p-3 text-red-700">
                <div className="text-lg font-black">GRADE F</div>
                <div className="text-[10px] font-bold">Score 71–100</div>
                <div className="text-[9px] text-[#6b7280]">Critical Vulnerability</div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 5. SYBIL RADAR & MEDIA SCORING */}
          {/* ========================================================================= */}
          <section id="sybil-radar-media" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 05 · SYBIL & BLACKLIST DEFENSE
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Sybil Radar & Trusta AI / MEDIA Algorithmic Model
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('sybil-radar-media')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'sybil-radar-media' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              Sybil defense checks an 800K+ blacklist cache and uses the Trusta AI MEDIA model to identify bot-like behavior.
            </p>

            {/* In-Memory Datasets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] flex items-center justify-between flex-wrap gap-2">
                  <span>1. LayerZero Sybil Database</span>
                  <span className="badge-3d text-[9px] bg-black text-white px-2 py-0.5 whitespace-nowrap">800K+ ADDR</span>
                </div>
                <p className="text-[11px] text-[#4b5563] text-pretty">
                  Official community bounty hunter reports and algorithmic script execution loops.
                </p>
              </div>
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] flex items-center justify-between flex-wrap gap-2">
                  <span>2. Hop Protocol Sybil Defense</span>
                  <span className="badge-3d text-[9px] bg-black text-white px-2 py-0.5 whitespace-nowrap">GRAPH DEFENSE</span>
                </div>
                <p className="text-[11px] text-[#4b5563] text-pretty">
                  Graph analysis flagging co-funded multi-sig parent roots.
                </p>
              </div>
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] flex items-center justify-between flex-wrap gap-2">
                  <span>3. Umbra Privacy Mixer Clusters</span>
                  <span className="badge-3d text-[9px] bg-black text-white px-2 py-0.5 whitespace-nowrap">STEALTH POOLS</span>
                </div>
                <p className="text-[11px] text-[#4b5563] text-pretty">
                  Identified stealth address routing clusters.
                </p>
              </div>
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] flex items-center justify-between flex-wrap gap-2">
                  <span>4. US Treasury OFAC SDN</span>
                  <span className="badge-3d text-[9px] bg-red-700 text-white px-2 py-0.5 whitespace-nowrap">SANCTIONED</span>
                </div>
                <p className="text-[11px] text-[#4b5563] text-pretty">
                  Specially Designated Nationals registry.
                </p>
              </div>
            </div>

            {/* MEDIA Heuristic Model Deep Dive */}
            <div className="well-recessed-light p-5 space-y-3 font-mono text-xs">
              <div className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Scale size={14} className="text-[#ff5500]" />
                TRUSTA AI / MEDIA COMPOSITE FORMULATION
              </div>
              <div className="card-3d-dark p-3.5 text-xs text-white space-y-1">
                <div className="text-gray-200">{'MEDIA Composite Score = (0.25 × M) + (0.25 × E) + (0.20 × D) + (0.15 × I) + (0.15 × A)'}</div>
                <div className="text-[#ff5500] font-black">{'Sybil Probability P(Sybil) = 100 - MEDIA Composite Score'}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px] pt-1">
                <div className="card-3d p-2.5">
                  <strong>M (Monetary):</strong> 25% weight. Volume tiers ($100 to $50k+) + gas burned bonus.
                </div>
                <div className="card-3d p-2.5">
                  <strong>E (Engagement):</strong> 25% weight. Active months + bot burstiness penalty (&gt;90% txs in &lt;48h).
                </div>
                <div className="card-3d p-2.5">
                  <strong>D (Diversity):</strong> 20% weight. Unique smart contract depth + multi-category breadth.
                </div>
                <div className="card-3d p-2.5">
                  <strong>I (Identity):</strong> 15% weight. Multi-chain footprint (1 to 5 chains) + counterparty diversity.
                </div>
                <div className="card-3d p-2.5">
                  <strong>A (Age):</strong> 15% weight. Lifespan maturity from genesis block (30d to 365d+).
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 6. APPROVALS & EXPOSURE */}
          {/* ========================================================================= */}
          <section id="approvals-exposure-audit" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 06 · TOKEN ALLOWANCES
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  ERC-20 Approval & Capital at Risk Exposure Engine
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('approvals-exposure-audit')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'approvals-exposure-audit' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              WalletGenome calculates your actual <strong>capital at risk in USD</strong> by tracking token allowances and historical balances.
            </p>

            <div className="well-recessed-light p-5 space-y-3 font-mono text-xs">
              <div className="text-xs font-black uppercase text-black">
                CALLDATA PARSING & BALANCE RECONSTRUCTION SPEC
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="card-3d p-3">
                  <strong>1. Calldata Spender Extraction:</strong><br/>
                  Byte slice <code className="badge-3d px-1.5 py-0.2">input[34:74]</code> = 20-byte spender contract address.<br/>
                  Byte slice <code className="badge-3d px-1.5 py-0.2">input[74:138]</code> = 32-byte <code className="badge-3d px-1.5 py-0.2">uint256</code> allowance amount.
                </div>
                <div className="card-3d p-3">
                  <strong>2. Allowance Classification:</strong><br/>
                  • <code className="text-red-700 font-bold">Unlimited:</code> If amount starts with <code className="badge-3d px-1.5 py-0.2">ffff...</code> or equals $2^{256}-1$.<br/>
                  • <code className="text-green-700 font-bold">Revoked:</code> If amount equals <code className="badge-3d px-1.5 py-0.2">0x0</code>.<br/>
                  • <code className="text-blue-700 font-bold">Custom:</code> Specific finite integer allowance.
                </div>
                <div className="card-3d p-3">
                  <strong>3. Net Holdings Reconstruction & Dollar Risk:</strong><br/>
                  <div className="well-recessed-light p-2.5 font-mono text-xs mt-1.5">
                    <div>Token Balance = Σ(Inbound Transfers) - Σ(Outbound Transfers)</div>
                    <div className="font-bold text-[#ff5500]">Capital at Risk (USD) = Token Balance × Unit Price (USD)</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 7. PORTFOLIO GRAVEYARD */}
          {/* ========================================================================= */}
          <section id="portfolio-graveyard" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 07 · ASSET FORENSICS
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Portfolio Graveyard & Dead Asset Loss Quantification
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('portfolio-graveyard')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'portfolio-graveyard' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              The Graveyard engine identifies dead tokens and calculates the exact value lost from their historical peak.
            </p>

            <div className="well-recessed-light p-5 space-y-3 font-mono text-xs">
              <div className="font-black text-[#0a0a0a] uppercase">Dead Asset Heuristic Rule:</div>
              <div className="space-y-1 text-[11px] text-[#374151]">
                <div>1. Holding balance &gt; 0.001 units.</div>
                <div>2. Token is not a benchmark asset (USDT, USDC, DAI, WETH, WBTC, ETH, BUSD, FRAX).</div>
                <div>3. No transfer activity for &gt; 180 days OR total historical inbound USD valuation = $0.</div>
                <div>4. Peak USD loss calculation:</div>
              </div>
              <div className="card-3d p-3.5 text-xs font-mono space-y-1">
                <div>{'Peak Unit Price = max(Transfer USD Value / Transfer Token Amount)'}</div>
                <div className="font-black text-[#dc2626]">{'Total Peak Value Lost = Σ(Peak Unit Price × Current Balance)'}</div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 8. TEMPORAL ACTIVITY */}
          {/* ========================================================================= */}
          <section id="temporal-activity-heatmap" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 08 · CADENCE & STREAKS
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  24×7 Temporal Matrix & Continuous Streak Engine
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('temporal-activity-heatmap')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'temporal-activity-heatmap' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              Transaction times are mapped to a 24x7 matrix to identify bot patterns and timezone activity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] uppercase">24×7 Heatmap Normalization</div>
                <p className="text-[11px] text-[#4b5563] text-pretty">
                  Intensity per cell (day, hour) is normalized against maximum hourly volume:
                  <br/>
                  <code className="badge-3d px-1.5 py-0.5 font-bold mt-1 inline-block">Intensity(d, h) = Count(d, h) / max(Count)</code>
                </p>
              </div>
              <div className="card-3d p-4 space-y-1.5">
                <div className="font-black text-[#0a0a0a] uppercase">O(N) Daily Streak Algorithm</div>
                <p className="text-[11px] text-[#4b5563] text-pretty">
                  Calculates consecutive active transaction days by sorting calendar keys and measuring date deltas:
                  <br/>
                  <code className="badge-3d px-1.5 py-0.5 font-bold mt-1 inline-block">DeltaDays = (Time[i] - Time[i-1]) / 86400s</code>
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 9. NETWORK TOPOLOGIES */}
          {/* ========================================================================= */}
          <section id="capital-cluster-topologies" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 09 · NETWORK TOPOLOGIES
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Capital Flow Topology & Cluster Linkage Matrix
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('capital-cluster-topologies')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'capital-cluster-topologies' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              We visualize funds using Capital Flow Graphs for single addresses and Cluster Matrices for multiple wallets.
            </p>

            <div className="well-recessed-light p-5 space-y-3 font-mono text-xs">
              <div className="font-black text-[#0a0a0a] uppercase">Graph Layout Mathematics:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="card-3d p-3.5 space-y-1">
                  <strong>1. Arkham 3-Column Topology:</strong><br/>
                  • Column 1 (X=160): Inbound funding sources & CEX withdrawals.<br/>
                  • Column 2 (X=550): User core address.<br/>
                  • Column 3 (X=940): Destination DeFi protocols & recipient EOAs.<br/>
                  • Line widths: Volume-weighted stroke <code className="badge-3d px-1.5 py-0.2">W = min(8, 1.5 + log10(USD_Volume))</code>.
                </div>
                <div className="card-3d p-3.5 space-y-1">
                  <strong>2. Cluster Radial Orbital Layout:</strong><br/>
                  • Orbital Radius: <code className="badge-3d px-1.5 py-0.2">R = max(320, WalletCount × 24.5)</code> px.<br/>
                  • Angle per wallet: <code className="badge-3d px-1.5 py-0.2">theta = (2π × i / N) - π/2</code>.<br/>
                  • Coordinates: <code className="badge-3d px-1.5 py-0.2">X = Xc + R × cos(theta)</code>, <code className="badge-3d px-1.5 py-0.2">Y = Yc + R × sin(theta)</code>.<br/>
                  • Shared Hubs placed at gravitational center with force links.
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 10. DECENTRALIZED IDENTITY */}
          {/* ========================================================================= */}
          <section id="decentralized-identity" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 10 · SOCIAL GRAPH
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Decentralized Identity & Platform Priority Hierarchy
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('decentralized-identity')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'decentralized-identity' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              Web3 identities (like ENS, Farcaster) are resolved using Web3.bio, picking the most trusted handle based on our priority matrix.
            </p>

            <div className="well-recessed-light overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap border-collapse">
                <thead className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Priority Weight</th>
                    <th className="p-3">Deep Link Resolution Format</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-[#ff5500]">ENS (.eth)</td>
                    <td className="p-3 font-bold">10 (Highest)</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">https://app.ens.domains/&#123;name&#125;</code></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">Farcaster (Warpcast)</td>
                    <td className="p-3 font-bold">9</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">https://warpcast.com/&#123;handle&#125;</code></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">Lens Protocol</td>
                    <td className="p-3 font-bold">8</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">https://hey.xyz/u/&#123;handle&#125;</code></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">BaseNames (.base.eth)</td>
                    <td className="p-3 font-bold">7</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">https://base.org/names?query=&#123;name&#125;</code></td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-black text-black">Unstoppable Domains</td>
                    <td className="p-3 font-bold">6</td>
                    <td className="p-3"><code className="badge-3d px-1.5 py-0.5">https://unstoppabledomains.com</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 11. TECHNICAL COMPLEXITY SPECIFICATIONS */}
          {/* ========================================================================= */}
          <section id="complexity-matrix" className="card-3d p-6 sm:p-8 space-y-5 text-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
              <div className="space-y-1">
                <span className="badge-3d text-[10px] font-mono font-black text-[#ff5500] uppercase tracking-wider px-2 py-0.5">
                  SECTION 11 · TECHNICAL SPECIFICATIONS
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0a0a0a] pt-1">
                  Algorithmic Complexity & Execution Guarantees
                </h2>
              </div>
              <button
                onClick={() => handleCopyLink('complexity-matrix')}
                className="btn-3d-neutral p-2 text-[#4b5563] hover:text-black cursor-pointer"
                title="Copy anchor link"
              >
                {copiedId === 'complexity-matrix' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#374151] leading-relaxed text-pretty">
              Performance summary of our algorithms and caching policies.
            </p>

            <div className="well-recessed-light overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs font-mono whitespace-nowrap border-collapse">
                <thead className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Subsystem</th>
                    <th className="p-3">Time Complexity</th>
                    <th className="p-3">Space Complexity</th>
                    <th className="p-3">Execution Layer</th>
                    <th className="p-3">Cache Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">Sybil Blacklist Check</td>
                    <td className="p-3 text-green-700 font-bold">O(1) lookup</td>
                    <td className="p-3">O(M) 800k in-memory set</td>
                    <td className="p-3">Server Memory</td>
                    <td className="p-3">24h Global TTL</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">Behavioral Fingerprint</td>
                    <td className="p-3 text-green-700 font-bold">O(N) transactions</td>
                    <td className="p-3">O(U) unique contracts</td>
                    <td className="p-3">Server / Client</td>
                    <td className="p-3">Session / Per-Scan</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">Risk Scoring Engine</td>
                    <td className="p-3 text-green-700 font-bold">O(A + G + D) summary</td>
                    <td className="p-3">O(F) factor list</td>
                    <td className="p-3">Server / Client</td>
                    <td className="p-3">Instant Compute</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">Cluster Linkage Graph</td>
                    <td className="p-3 text-amber-700 font-bold">O(W × C) pair analysis</td>
                    <td className="p-3">O(W + L) nodes &amp; links</td>
                    <td className="p-3">Server Route</td>
                    <td className="p-3">Per-Batch Run</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">Daily Price OHLC Feed</td>
                    <td className="p-3 text-green-700 font-bold">O(1) cache read</td>
                    <td className="p-3">O(K) token day pairs</td>
                    <td className="p-3">Server Memory</td>
                    <td className="p-3">Process Lifecycle</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition-colors">
                    <td className="p-3 font-bold">Web3.bio Identity Graph</td>
                    <td className="p-3 text-blue-700 font-bold">O(1) async HTTP</td>
                    <td className="p-3">O(P) profile records</td>
                    <td className="p-3">Server Gateway</td>
                    <td className="p-3">force-cache HTTP</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-6 border-t border-[#c8c8c8] flex items-center justify-between flex-wrap gap-4">
              <Link
                href="/"
                className="btn-3d-orange text-white text-xs font-mono font-black uppercase tracking-wider px-5 py-2.5 flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>LAUNCH FORENSICS SCANNER</span>
              </Link>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn-3d-neutral text-xs font-mono font-bold text-[#0a0a0a] px-4 py-2 cursor-pointer"
              >
                BACK TO TOP ↑
              </button>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
