'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Dna, GitFork, UserCheck, Lock, Layers, Zap, Activity, HelpCircle, BookOpen } from 'lucide-react';

interface Props {
  onSelectAddress: (address: string) => void;
}

const SHOWCASE_PROFILES = [
  {
    role: 'DEFI POWER USER',
    name: 'vitalik.eth',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    badge: '6 SOCIALS ATTACHED',
    badgeColor: 'bg-[#059669]/10 text-[#059669] border-[#059669]/30',
    description: '2,000+ smart contract interactions, verified Twitter, Lens & Farcaster profiles, and deep multi-chain footprint.',
    stats: '2,181 Contracts · 400+ Active Days',
  },
  {
    role: 'PROTOCOL FOUNDER',
    name: 'hayden.eth',
    address: '0x50EC05AD9D29a73367175E26E962D714E96896C3',
    badge: 'UNISWAP CREATOR',
    badgeColor: 'bg-[#ff5500]/10 text-[#ff5500] border-[#ff5500]/30',
    description: 'Creator of Uniswap. Demonstrates high capital efficiency, continuous liquidity deployment, and DEX routing.',
    stats: 'Core DEX Velocity · Low Risk',
  },
  {
    role: 'LENDING & SOCIAL ARCHITECT',
    name: 'stani.eth',
    address: '0x2e21f5d34208a3d5483f9829f2709e9005bf15f2',
    badge: 'AAVE & LENS FOUNDER',
    badgeColor: 'bg-black text-white border-black',
    description: 'Founder of Aave & Lens Protocol. Multi-year on-chain lending footprint, governance delegation, and Web3 social presence.',
    stats: 'Lending Pioneer · Web3 Social Graph',
  },
  {
    role: 'DEFI MEGA-WHALE',
    name: 'justinsun.eth',
    address: '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296',
    badge: 'HIGH CAPITAL FLOW',
    badgeColor: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30',
    description: 'Founder of Tron. High-velocity multi-million dollar liquidity deposits, staking, and cross-chain capital routing.',
    stats: 'Institutional Scale · High Liquidity',
  },
];

export default function WelcomeGuide({ onSelectAddress }: Props) {
  return (
    <div className="space-y-10 py-2 animate-fade-in-up">
      
      {/* ── 1. Hero Headline & Overview ── */}
      <div className="text-center space-y-3 max-w-3xl mx-auto pt-2 pb-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#dcdcdc] border border-[#c8c8c8] text-xs font-mono font-bold text-[#0a0a0a]">
          <Zap size={13} className="text-[#ff5500]" />
          <span>INSTANT MULTI-CHAIN BEHAVIORAL FORENSICS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tight leading-tight uppercase font-sans">
          See the Complete Story Behind Any Crypto Wallet
        </h1>
        <p className="text-sm sm:text-base text-[#444444] font-medium leading-relaxed max-w-2xl mx-auto">
          Analyze on-chain behavior, map capital flows, resolve verified social identities, and audit security risks across 5 major blockchains in seconds.
        </p>
      </div>

      {/* ── 2. One-Click Interactive Showcase Profiles ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={14} className="text-[#ff5500]" />
            TRY INSTANT DEMO PROFILES (1-CLICK SCAN)
          </div>
          <span className="text-[11px] font-bold text-[#4b5563] hidden sm:inline">
            Click any profile to test-drive live intelligence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SHOWCASE_PROFILES.map((p, idx) => (
            <div
              key={idx}
              className="card-3d-interactive p-5 text-[#0a0a0a] space-y-3 flex flex-col justify-between group cursor-pointer"
              onClick={() => onSelectAddress(p.address)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-extrabold text-[#4b5563] uppercase tracking-wider">
                    {p.role}
                  </span>
                  <span className={`badge-3d text-[9px] font-mono font-black px-2 py-0.5 border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>

                <div className="text-lg font-black text-[#0a0a0a] font-mono group-hover:text-[#ff5500] transition-colors">
                  {p.name}
                </div>

                <p className="text-xs text-[#4b5563] leading-relaxed line-clamp-3 text-pretty">
                  {p.description}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#c8c8c8] flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[#6b7280] truncate">
                  {p.stats}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAddress(p.address);
                  }}
                  className="btn-3d-black text-white font-bold text-xs px-3 py-1.5 flex items-center gap-1 flex-shrink-0 cursor-pointer"
                >
                  <span>Explore</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. How Does It Work? (3-Step Visual Guide) ── */}
      <div className="space-y-4 pt-4">
        <div className="text-xs font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle size={14} className="text-[#ff5500]" />
          HOW DOES WALLETGENOME WORK?
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Step 1 */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a] relative">
            <div className="w-8 h-8 btn-3d-black text-white font-mono font-black flex items-center justify-center text-sm">
              01
            </div>
            <h3 className="text-base font-black uppercase text-[#0a0a0a]">
              Multi-Chain Scan
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed text-pretty">
              Enter any 0x address or ENS domain. We query Ethereum, Arbitrum, Base, BSC, and Optimism simultaneously—without requiring you to connect a wallet or install extensions.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a] relative">
            <div className="w-8 h-8 btn-3d-orange text-white font-mono font-black flex items-center justify-center text-sm">
              02
            </div>
            <h3 className="text-base font-black uppercase text-[#0a0a0a]">
              Forensic Processing
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed text-pretty">
              Our indexing engine filters out spoofed/scam meme tokens, verifies legitimate protocol contracts, audits 5 public Sybil databases, and resolves verified social profiles (Web3.bio).
            </p>
          </div>

          {/* Step 3 */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a] relative">
            <div className="w-8 h-8 btn-3d-black text-white font-mono font-black flex items-center justify-center text-sm">
              03
            </div>
            <h3 className="text-base font-black uppercase text-[#0a0a0a]">
              Actionable Intelligence
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed text-pretty">
              Synthesizes a 6-axis Behavioral Radar, assigns a quantified Persona archetype, renders an interactive money flow graph, and flags open unlimited approval exposures.
            </p>
          </div>

        </div>
      </div>

      {/* ── 4. Core Capabilities (4 Feature Bento Cards) ── */}
      <div className="space-y-4 pt-4">
        <div className="text-xs font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={14} className="text-[#ff5500]" />
          WHAT YOU CAN UNCOVER ON ANY WALLET
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bento Card 1: Behavioral DNA */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 btn-3d-black text-[#ff5500] flex items-center justify-center flex-shrink-0">
                <Dna size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Behavioral DNA & Personas
                </h4>
                <span className="text-[10px] font-bold text-[#4b5563]">
                  Quantitative archetype classification
                </span>
              </div>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed text-pretty">
              Understand how an entity operates on-chain. Are they a DeFi Power User, Active Trader, or Passive Whale? Our engine computes 6 mathematical dimensions including contract breadth, maturity, and Shannon entropy.
            </p>
          </div>

          {/* Bento Card 2: Interactive Capital Flow */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 btn-3d-black text-[#059669] flex items-center justify-center flex-shrink-0">
                <GitFork size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Interactive Capital Flow Topology
                </h4>
                <span className="text-[10px] font-bold text-[#4b5563]">
                  Follow where the capital really travels
                </span>
              </div>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed text-pretty">
              Visualize inflows from exchanges, DeFi protocol interactions, and outbound destinations in an interactive particle-flow canvas. Automatically uncovers the #1 most-sent-to recipient wallet.
            </p>
          </div>

          {/* Bento Card 3: Universal Social Identities */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 btn-3d-black text-[#3b82f6] flex items-center justify-center flex-shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Universal Social Identities
                </h4>
                <span className="text-[10px] font-bold text-[#4b5563]">
                  Bridge hex addresses to real-world accounts
                </span>
              </div>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed text-pretty">
              Connects addresses to public Web2 and Web3 profiles across ENS domains, Farcaster Warpcast, Lens Protocol, Twitter/X, and GitHub with direct verified external links.
            </p>
          </div>

          {/* Bento Card 4: Security & Approval Audit */}
          <div className="card-3d p-6 space-y-3 text-[#0a0a0a]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 btn-3d-black text-[#dc2626] flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Security & Approval Audit
                </h4>
                <span className="text-[10px] font-bold text-[#4b5563]">
                  Identify wallet vulnerabilities & blacklist status
                </span>
              </div>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed text-pretty">
              Protects assets by highlighting active unlimited token allowances to unverified contracts, calculating dead zero-liquidity tokens, and checking against LayerZero, Hop, and OFAC sanctions lists.
            </p>
          </div>

        </div>
      </div>

      {/* ── 4.5. Methodology & Algorithmic Docs Callout Banner ── */}
      <div className="card-3d-dark p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <BookOpen size={16} className="text-[#ff5500]" />
            <span className="text-xs font-mono font-black uppercase tracking-wider text-[#ff5500]">
              ALGORITHMIC SPECIFICATION & MATHEMATICS
            </span>
          </div>
          <p className="text-xs text-gray-300 font-medium">
            Explore how we compute Shannon entropy, Trusta MEDIA Sybil scores, risk grade heuristics, and multi-chain gas valuations.
          </p>
        </div>
        <Link
          href="/docs"
          className="btn-3d-orange text-white text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <span>READ THE DOCS</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* ── 5. Trust Indicators & FAQ Bar ── */}
      <div className="card-3d p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#4b5563]">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-[#059669]" />
          <span className="text-[#0a0a0a]">100% Read-Only & Safe:</span>
          <span>We never ask for wallet signatures or private keys.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#0a0a0a]">Supported Networks:</span>
          <span className="font-mono text-[#ff5500]">Ethereum · Arbitrum · Base · BSC · Optimism</span>
        </div>
      </div>

    </div>
  );
}
