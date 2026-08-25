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
import { getNextTabIndex } from '@/lib/accessibility/tabs';
import DemoSnapshotNotice from '@/components/DemoSnapshotNotice';

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

const SCAN_MODES = ['single', 'cluster'] as const;

export default function Home() {
  const {
    scanMode,
    setScanMode,
    singleResult,
    currentAddress,
    setCurrentAddress,
    activeDemoSnapshot,
    clusterResult,
    isLoading,
    progress,
    progressPercent,
    scanProgressDetail,
    error,
    showGuide,
    setShowGuide,
    handleSingleScan,
    handleDemoSnapshot,
    handleClusterScan
  } = useWalletScanner();

  const handleInspectFromCluster = (address: string) => {
    setCurrentAddress(address);
    handleSingleScan(address, [...SUPPORTED_CHAIN_IDS]);
  };

  const handleScanModeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const nextIndex = getNextTabIndex(SCAN_MODES.indexOf(scanMode), SCAN_MODES.length, event.key);
    if (nextIndex === null) return;
    event.preventDefault();
    const nextMode = SCAN_MODES[nextIndex];
    setScanMode(nextMode);
    document.getElementById(`scan-mode-${nextMode}-tab`)?.focus();
  };

  return (
    <main className="min-w-0 overflow-x-clip max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* ── Top Brand Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex min-h-11 min-w-0 items-center text-left cursor-pointer group transition-transform active:scale-95"
          aria-label="WalletGenome Home"
        >
          <span className="text-xl sm:text-2xl font-black tracking-tight text-black font-sans uppercase">
            WALLET<span className="text-[#ff5500]">.</span>GENOME
          </span>
        </button>

        <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {/* How It Works Toggle */}
          {(singleResult || clusterResult) && (
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="btn-3d-neutral min-h-10 text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
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
            className="btn-3d-neutral min-h-10 text-[#0a0a0a] text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={13} className="text-[#ff5500]" />
            <span className="hidden sm:inline">Docs / methodology</span>
            <span className="sm:hidden">Docs</span>
          </Link>

          <span className="badge-3d min-h-10 bg-[#ff5500] text-white text-[11px] font-bold tracking-wider px-3 py-1.5 flex items-center gap-1.5">
            <span className="led-live" />
            <span>Live indexing</span>
          </span>
        </div>
      </header>

      {/* ── Product promise stays directly above the primary scan task ── */}
      {showGuide && (
        <section aria-labelledby="main-hero-title" className="text-center space-y-2 max-w-3xl mx-auto pt-2 pb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-[#4b5563]">
            <Zap size={13} className="text-[#ff5500]" />
            <span>Multi-chain behavioral forensics</span>
          </div>
          <h1 id="main-hero-title" className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tight leading-tight font-sans text-balance">
            See the complete story behind any crypto wallet
          </h1>
          <p className="text-sm sm:text-base text-[#4b5563] font-medium leading-relaxed max-w-2xl mx-auto text-pretty">
            Analyze on-chain behavior, map capital flows, resolve verified social identities, and audit security risks across four major blockchains.
          </p>
        </section>
      )}

      {/* ── Mode Switcher & Input Section ── */}
      <section aria-label="Wallet Forensics Console" className="space-y-3">
        {/* Mode Selector Tabs */}
        <div
          role="tablist"
          aria-label="Forensics Scan Mode"
          className="horizontal-scroll-region flex items-center gap-2.5 overflow-x-auto border-b border-[#c8c8c8] pb-2.5"
        >
          <button
            id="scan-mode-single-tab"
            role="tab"
            aria-selected={scanMode === 'single'}
            aria-controls="scan-mode-single-panel"
            tabIndex={scanMode === 'single' ? 0 : -1}
            onKeyDown={handleScanModeKeyDown}
            type="button"
            onClick={() => setScanMode('single')}
            className={`min-h-11 px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
              scanMode === 'single'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            <Search size={13} className={scanMode === 'single' ? 'text-[#ff5500]' : ''} />
            <span>Single wallet</span>
          </button>

          <button
            id="scan-mode-cluster-tab"
            role="tab"
            aria-selected={scanMode === 'cluster'}
            aria-controls="scan-mode-cluster-panel"
            tabIndex={scanMode === 'cluster' ? 0 : -1}
            onKeyDown={handleScanModeKeyDown}
            type="button"
            onClick={() => setScanMode('cluster')}
            className={`min-h-11 px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
              scanMode === 'cluster'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            <Layers size={13} className={scanMode === 'cluster' ? 'text-[#ff5500]' : ''} />
            <span>Cluster scan</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#ff5500] text-white font-mono shadow-sm">New</span>
          </button>
        </div>

        {/* Input Views */}
        {scanMode !== 'single' && (
          <div id="scan-mode-single-panel" role="tabpanel" aria-labelledby="scan-mode-single-tab" hidden />
        )}
        {scanMode !== 'cluster' && (
          <div id="scan-mode-cluster-panel" role="tabpanel" aria-labelledby="scan-mode-cluster-tab" hidden />
        )}
        {scanMode === 'single' ? (
          <div
            id="scan-mode-single-panel"
            role="tabpanel"
            aria-labelledby="scan-mode-single-tab"
            className="space-y-2"
          >
            <WalletInput
              key={currentAddress || 'wallet-input'}
              onScan={handleSingleScan}
              isLoading={isLoading}
              initialAddress={currentAddress}
            />
          </div>
        ) : (
          <div
            id="scan-mode-cluster-panel"
            role="tabpanel"
            aria-labelledby="scan-mode-cluster-tab"
          >
            <BulkScanInput
              onScanCluster={handleClusterScan}
              isLoading={isLoading}
            />
          </div>
        )}
      </section>

      {/* Loading Progress Bar */}
      {isLoading && (
        <ProgressBar
          message={progress}
          progress={progressPercent}
          scan={scanProgressDetail}
        />
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="card-3d border-l-4 border-l-[#ef4444] p-4 text-xs font-bold text-[#ef4444]">
          {error}
        </div>
      )}

      {activeDemoSnapshot && !showGuide && (
        <DemoSnapshotNotice
          demo={activeDemoSnapshot}
          isLoading={isLoading}
          onRunFreshScan={() => void handleSingleScan(activeDemoSnapshot.address, [...SUPPORTED_CHAIN_IDS])}
        />
      )}

      {/* ── Conditional Dashboard / Guide Render ── */}
      {showGuide && !isLoading && (
        <WelcomeGuide onSelectDemo={demo => void handleDemoSnapshot(demo)} />
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
