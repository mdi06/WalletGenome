'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Dna, GitFork, UserCheck, Lock, Layers, Activity, HelpCircle, BookOpen } from 'lucide-react';
import { DEMO_WALLETS, formatDemoSnapshotDate, type DemoWallet } from '@/lib/demoWallets';

interface Props {
  onSelectDemo: (demo: DemoWallet) => void;
}

export default function WelcomeGuide({ onSelectDemo }: Props) {
  return (
    <div className="space-y-12 py-2 animate-fade-in-up">
      {/* ── 1. One-Click Interactive Showcase Profiles ── */}
      <section aria-labelledby="demo-profiles-heading" className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-3">
          <h2 id="demo-profiles-heading" className="text-xs font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={14} className="text-orange-ink" />
            <span>Explore saved demo wallets</span>
          </h2>
          <span className="text-[11px] font-bold text-[#6b7280] hidden sm:inline">
            Opens instantly without provider API calls
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_WALLETS.map(demo => (
            <button
              key={demo.slug}
              type="button"
              aria-label={`Load saved demo snapshot for ${demo.name}`}
              onClick={() => onSelectDemo(demo)}
              className="card-3d-interactive p-5 text-left text-[#0a0a0a] space-y-3 flex flex-col justify-between group min-h-64"
            >
              <span className="space-y-3 block">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono font-extrabold text-[#4b5563] uppercase tracking-wider truncate">
                    {demo.role}
                  </span>
                  <span className="badge-3d flex-shrink-0 border border-[#059669]/30 bg-[#059669]/10 px-1.5 py-0.2 font-mono text-[9px] font-black text-[#047857]">
                    Saved · non-live
                  </span>
                </span>

                <span className="block text-xl font-black text-[#0a0a0a] font-mono group-hover:text-orange-ink transition-colors">
                  {demo.ens}
                </span>

                <span className="block text-xs text-[#4b5563] leading-relaxed text-pretty">
                  Public multi-chain demo data for {demo.name}. The dashboard keeps the original provider and pricing completeness warnings.
                </span>
              </span>

              <span className="mt-6 pt-3 border-t border-[#c8c8c8] flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] font-mono font-bold text-[#6b7280]">
                  Four chains · Updated {formatDemoSnapshotDate(demo.generatedAt)}
                </span>
                <span aria-hidden="true" className="flex flex-shrink-0 items-center gap-1 text-xs font-black uppercase tracking-wider text-[#0a0a0a] transition-colors group-hover:text-orange-ink">
                  <span className="sr-only sm:not-sr-only">Open</span>
                  <ArrowRight size={12} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 2. How Does It Work? (3-Step Visual Guide) ── */}
      <section aria-labelledby="how-it-works-heading" className="space-y-4 border-y border-[#c8c8c8] py-6">
        <h2 id="how-it-works-heading" className="text-xs font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle size={14} className="text-orange-ink" />
          <span>HOW DOES WALLETGENOME WORK?</span>
        </h2>

        <div className="grid grid-cols-1 divide-y divide-[#c8c8c8] md:grid-cols-3 md:divide-x md:divide-y-0">
          
          {/* Step 1 */}
          <div className="space-y-3 py-5 text-[#0a0a0a] md:px-6 md:py-2 md:first:pl-0 md:last:pr-0">
              <div className="font-mono text-sm font-black text-orange-ink">
              01
            </div>
            <h3 className="text-base font-black uppercase text-[#0a0a0a]">
              Multi-Chain Scan
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed text-pretty">
              Enter any 0x address or ENS domain. We query Ethereum, Arbitrum, Base, and Optimism simultaneously—without requiring you to connect a wallet or install extensions.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 py-5 text-[#0a0a0a] md:px-6 md:py-2 md:first:pl-0 md:last:pr-0">
              <div className="font-mono text-sm font-black text-orange-ink">
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
          <div className="space-y-3 py-5 text-[#0a0a0a] md:px-6 md:py-2 md:first:pl-0 md:last:pr-0">
              <div className="font-mono text-sm font-black text-orange-ink">
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
      </section>

      {/* ── 3. Core Capabilities (4 Feature Bento Cards) ── */}
      <section aria-labelledby="core-capabilities-heading" className="space-y-4 border-b border-[#c8c8c8] pb-6">
        <h2 id="core-capabilities-heading" className="text-xs font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={14} className="text-orange-ink" />
          <span>WHAT YOU CAN UNCOVER ON ANY WALLET</span>
        </h2>

        <div className="grid grid-cols-1 divide-y divide-[#c8c8c8] md:grid-cols-2 md:divide-x md:divide-y-0">
          
          {/* Bento Card 1: Behavioral DNA */}
          <div className="space-y-3 py-5 text-[#0a0a0a] md:pr-6 md:odd:pl-0 md:even:pl-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#0a0a0a] bg-[#0a0a0a] text-[#ff5500]">
                <Dna size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Behavioral DNA & Personas
                </h3>
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
          <div className="space-y-3 py-5 text-[#0a0a0a] md:pr-6 md:odd:pl-0 md:even:pl-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#0a0a0a] bg-[#0a0a0a] text-[#059669]">
                <GitFork size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Interactive Capital Flow Topology
                </h3>
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
          <div className="space-y-3 py-5 text-[#0a0a0a] md:pr-6 md:odd:pl-0 md:even:pl-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#0a0a0a] bg-[#0a0a0a] text-[#3b82f6]">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Universal Social Identities
                </h3>
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
          <div className="space-y-3 py-5 text-[#0a0a0a] md:pr-6 md:odd:pl-0 md:even:pl-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#0a0a0a] bg-[#0a0a0a] text-[#dc2626]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-[#0a0a0a]">
                  Security & Approval Audit
                </h3>
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
      </section>

      {/* ── 4.5. Methodology & Algorithmic Docs Callout Banner ── */}
      <div className="border-y border-[#272a38] bg-[#121318] px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
          className="btn-3d-orange min-h-11 text-[#0a0a0a] text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <span>READ THE DOCS</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* ── 5. Trust Indicators & FAQ Bar ── */}
      <div className="border-y border-[#c8c8c8] py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#4b5563]">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-[#059669]" />
          <span className="text-[#0a0a0a]">100% Read-Only & Safe:</span>
          <span>We never ask for wallet signatures or private keys.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#0a0a0a]">Supported Networks:</span>
          <span className="font-mono text-orange-ink">Ethereum · Arbitrum · Base · Optimism</span>
        </div>
      </div>

    </div>
  );
}
