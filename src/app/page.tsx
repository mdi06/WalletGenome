'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import WalletInput from '@/components/WalletInput';
import BulkScanInput from '@/components/BulkScanInput';
import ProgressBar from '@/components/ProgressBar';
import WelcomeGuide from '@/components/WelcomeGuide';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import Link from 'next/link';
import { HelpCircle, LayoutDashboard, Search, Layers, BookOpen, Zap } from 'lucide-react';
import { useWalletScanner } from '@/hooks/useWalletScanner';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  loading: () => (
    <div className="p-12 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Rendering Multi-Chain Forensic Dashboard...
    </div>
  ),
  ssr: false,
});

const BulkDashboard = dynamic(() => import('@/components/BulkDashboard'), {
  loading: () => (
    <div className="p-12 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Rendering Cluster Intelligence Matrix...
    </div>
  ),
  ssr: false,
});

const PRESET_WALLETS = [
  { label: '0xd8dA6...6045 (Vitalik.eth · Multi-Chain · 6 Socials)', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
];

export default function Home() {
  const {
    scanMode,
    setScanMode,
    singleResult,
    currentAddress,
    setCurrentAddress,
    clusterResult,
    isLoading,
    progress,
    error,
    showGuide,
    setShowGuide,
    handleSingleScan,
    handleClusterScan
  } = useWalletScanner();

  const handleSelectFromGuide = (address: string) => {
    setCurrentAddress(address);
    handleSingleScan(address, [...SUPPORTED_CHAIN_IDS], false);
  };

  const handleInspectFromCluster = (address: string) => {
    setCurrentAddress(address);
    handleSingleScan(address, [...SUPPORTED_CHAIN_IDS]);
  };

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Top Brand Header ── */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center text-left cursor-pointer group transition-transform active:scale-95"
          aria-label="WalletGenome Home"
        >
          <span className="text-xl sm:text-2xl font-black tracking-tight text-black font-sans uppercase">
            WALLET<span className="text-[#ff5500]">.</span>GENOME
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* How It Works Toggle */}
          {(singleResult || clusterResult) && (
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="btn-3d-neutral text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
            >
              {showGuide ? (
                <>
                  <LayoutDashboard size={13} className="text-[#ff5500]" />
                  <span>VIEW DASHBOARD</span>
                </>
              ) : (
                <>
                  <HelpCircle size={13} className="text-[#ff5500]" />
                  <span>HOW IT WORKS</span>
                </>
              )}
            </button>
          )}

          {/* Docs / Methodology Link */}
          <Link
            href="/docs"
            className="btn-3d-neutral text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={13} className="text-[#ff5500]" />
            <span>DOCS / METHODOLOGY</span>
          </Link>

          <span className="badge-3d bg-[#ff5500] text-white text-[11px] font-bold tracking-wider px-3 py-1.5 flex items-center gap-1.5">
            <span className="led-live" />
            <span>LIVE INDEXING</span>
          </span>
        </div>
      </header>

      {/* ── Hero Headline & Overview (Displayed on Default Landing View) ── */}
      {showGuide && (
        <section aria-labelledby="main-hero-title" className="text-center space-y-3 max-w-3xl mx-auto pt-4 pb-2">
          <div className="badge-3d inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-[#0a0a0a]">
            <Zap size={13} className="text-[#ff5500]" />
            <span>INSTANT MULTI-CHAIN BEHAVIORAL FORENSICS</span>
          </div>
          <h1 id="main-hero-title" className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tight leading-tight uppercase font-sans text-balance">
            See the Complete Story Behind Any Crypto Wallet
          </h1>
          <p className="text-sm sm:text-base text-[#4b5563] font-medium leading-relaxed max-w-2xl mx-auto text-pretty">
            Analyze on-chain behavior, map capital flows, resolve verified social identities, and audit security risks across 5 major blockchains in seconds.
          </p>
        </section>
      )}

      {/* ── Mode Switcher & Input Section ── */}
      <section aria-label="Wallet Forensics Console" className="space-y-3">
        {/* Mode Selector Tabs */}
        <div role="tablist" aria-label="Forensics Scan Mode" className="flex items-center gap-2.5 border-b border-[#c8c8c8] pb-2.5">
          <button
            role="tab"
            aria-selected={scanMode === 'single'}
            type="button"
            onClick={() => setScanMode('single')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
              scanMode === 'single'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            <Search size={13} className={scanMode === 'single' ? 'text-[#ff5500]' : ''} />
            <span>SINGLE WALLET FORENSICS</span>
          </button>

          <button
            role="tab"
            aria-selected={scanMode === 'cluster'}
            type="button"
            onClick={() => setScanMode('cluster')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
              scanMode === 'cluster'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            <Layers size={13} className={scanMode === 'cluster' ? 'text-[#ff5500]' : ''} />
            <span>CLUSTER / BULK MATRIX SCAN</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#ff5500] text-white font-mono shadow-sm">NEW</span>
          </button>
        </div>

        {/* Input Views */}
        {scanMode === 'single' ? (
          <div className="space-y-2">
            <WalletInput
              onScan={handleSingleScan}
              isLoading={isLoading}
              initialAddress={currentAddress}
            />

            {/* Preset Wallets Bar */}
            <div className="flex items-center gap-2 flex-wrap px-1">
              <span className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                FAST DEMO PRESETS:
              </span>
              {PRESET_WALLETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCurrentAddress(p.address);
                    handleSingleScan(p.address, [...SUPPORTED_CHAIN_IDS], false);
                  }}
                  className="btn-3d-neutral text-xs font-mono font-bold text-[#0a0a0a] px-3 py-1 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <BulkScanInput
            onScanCluster={handleClusterScan}
            isLoading={isLoading}
          />
        )}
      </section>

      {/* Loading Progress Bar */}
      {isLoading && <ProgressBar message={progress} />}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="card-3d border-l-4 border-l-[#ef4444] p-4 text-xs font-bold text-[#ef4444]">
          {error}
        </div>
      )}

      {/* ── Conditional Dashboard / Guide Render ── */}
      {showGuide && !isLoading && (
        <WelcomeGuide onSelectAddress={handleSelectFromGuide} />
      )}

      {!showGuide && !isLoading && (
        <>
          {scanMode === 'single' && singleResult && (
            <Dashboard data={singleResult} />
          )}

          {scanMode === 'cluster' && clusterResult && (
            <BulkDashboard
              data={clusterResult}
              onInspectWallet={handleInspectFromCluster}
            />
          )}
        </>
      )}
    </main>
  );
}
