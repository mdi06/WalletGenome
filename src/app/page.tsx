'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import WalletInput from '@/components/WalletInput';
import BulkScanInput from '@/components/BulkScanInput';
import ProgressBar from '@/components/ProgressBar';
import WelcomeGuide from '@/components/WelcomeGuide';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import Link from 'next/link';
import { HelpCircle, LayoutDashboard, Search, Layers, BookOpen } from 'lucide-react';
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
  { label: '0x11E48...44E4 (Hayden.eth · Uniswap Founder)', address: '0x11E4857Bb9993a50c685A79AFfb4F1a64Ffb44E4' },
  { label: '0x2e21f...3a0c (Stani.eth · Aave Founder)', address: '0x2e21f5d32841cf8c73797824da4f8ab080003a0c' },
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
    handleSingleScan(address, [...SUPPORTED_CHAIN_IDS], true);
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
          className="flex items-center text-left cursor-pointer group"
        >
          <span className="text-xl sm:text-2xl font-black tracking-tight text-black font-sans uppercase">
            WALLETGENOME<span className="text-[#ff5500]">.</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* How It Works Toggle */}
          {(singleResult || clusterResult) && (
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="bg-[#dedede] hover:bg-black hover:text-white border border-[#cecece] text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer"
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
            className="bg-[#dedede] hover:bg-black hover:text-white border border-[#cecece] text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen size={13} className="text-[#ff5500]" />
            <span>DOCS / METHODOLOGY</span>
          </Link>

          <span className="bg-black text-white text-[11px] font-bold tracking-wider px-3 py-1.5 hidden sm:inline-block">
            NODE: V4.2.0
          </span>
          <span className="bg-[#ff5500] text-white text-[11px] font-bold tracking-wider px-3 py-1.5">
            LIVE INDEXING
          </span>
        </div>
      </header>

      {/* ── Mode Switcher & Input Section ── */}
      <div className="space-y-3">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-[#cecece] pb-2">
          <button
            type="button"
            onClick={() => setScanMode('single')}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'single'
                ? 'bg-black text-white shadow-sm'
                : 'bg-[#dedede] text-[#555555] hover:text-black border border-[#cecece]'
            }`}
          >
            <Search size={13} className={scanMode === 'single' ? 'text-[#ff5500]' : ''} />
            <span>SINGLE WALLET FORENSICS</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode('cluster')}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'cluster'
                ? 'bg-black text-white shadow-sm'
                : 'bg-[#dedede] text-[#555555] hover:text-black border border-[#cecece]'
            }`}
          >
            <Layers size={13} className={scanMode === 'cluster' ? 'text-[#ff5500]' : ''} />
            <span>CLUSTER / BULK MATRIX SCAN</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#ff5500] text-white font-mono">NEW</span>
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
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                FAST DEMO PRESETS:
              </span>
              {PRESET_WALLETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCurrentAddress(p.address);
                    handleSingleScan(p.address, [...SUPPORTED_CHAIN_IDS], true);
                  }}
                  className="text-xs font-mono font-bold text-gray-700 hover:text-black bg-white hover:bg-gray-100 px-3 py-1 border border-gray-200 shadow-sm transition-colors cursor-pointer"
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
      </div>

      {/* Loading Progress Bar */}
      {isLoading && <ProgressBar message={progress} />}

      {/* Error Alert */}
      {error && (
        <div className="bg-white border-l-4 border-l-[#ef4444] p-4 text-xs font-bold text-[#ef4444]">
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
