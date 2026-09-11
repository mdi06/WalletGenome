'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import WalletInput from '@/components/WalletInput';
import BulkScanInput from '@/components/BulkScanInput';
import ProgressBar from '@/components/ProgressBar';
import WelcomeGuide from '@/components/WelcomeGuide';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { HelpCircle, LayoutDashboard, Search, Layers, Zap } from 'lucide-react';
import { useWalletScanner } from '@/hooks/useWalletScanner';
import { getNextTabIndex } from '@/lib/accessibility/tabs';
import DemoSnapshotNotice from '@/components/DemoSnapshotNotice';
import { getIndexingStatus, shouldShowDemoSnapshotNotice } from '@/lib/indexingStatus';
import SiteHeader from '@/components/SiteHeader';
import LoadedScanSummary from '@/components/LoadedScanSummary';
import { CLUSTER_SAMPLE_ADDRESSES, CLUSTER_SAMPLE_SNAPSHOT } from '@/lib/clusterDemoSnapshot';
import BetaUpdatesCard from '@/components/auth/BetaUpdatesCard';
import LiveScanSignInDialog from '@/components/auth/LiveScanSignInDialog';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  PENDING_LIVE_SCAN_KEY,
  parsePendingLiveScan,
  serializePendingLiveScan,
  type PendingLiveScan,
} from '@/lib/auth/pendingLiveScan';

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
  const { user, isLoading: isAuthLoading, signInWithGoogle } = useAuth();
  const {
    scanMode,
    setScanMode,
    singleResult,
    currentAddress,
    setCurrentAddress,
    singleChainIds,
    activeDemoSnapshot,
    clusterResult,
    activeClusterSnapshot,
    isLoading,
    progress,
    progressPercent,
    scanProgressDetail,
    error,
    showGuide,
    setShowGuide,
    handleSingleScan,
    handleDemoSnapshot,
    handleClusterScan,
    handleClusterDemoSnapshot,
    handleClusterInputChange,
  } = useWalletScanner({ canRunLiveScans: Boolean(user) });
  const [isScanEditorOpen, setIsScanEditorOpen] = React.useState(false);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = React.useState(false);
  const [pendingLiveScan, setPendingLiveScan] = React.useState<PendingLiveScan | null>(null);
  const [isAuthStarting, setIsAuthStarting] = React.useState(false);
  const [authStartError, setAuthStartError] = React.useState<string | null>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const indexingStatus = getIndexingStatus({
    scanMode,
    activeDemoSnapshot: Boolean(activeDemoSnapshot),
    activeClusterSnapshot: Boolean(activeClusterSnapshot),
    singleStatus: singleResult?.status ?? null,
    clusterStatus: clusterResult?.status ?? null,
    hasError: Boolean(error),
    isLoading,
  });
  const openSignInDialog = (scan: PendingLiveScan, trigger?: HTMLElement) => {
    if (isAuthStarting) return;
    returnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPendingLiveScan(scan);
    setAuthStartError(isAuthLoading ? 'Checking your sign-in status. Please try again in a moment.' : null);
    setIsSignInDialogOpen(true);
  };

  const closeSignInDialog = React.useCallback(() => {
    try {
      window.localStorage.removeItem(PENDING_LIVE_SCAN_KEY);
    } catch {
      // Storage may be unavailable; closing still preserves the in-memory form state.
    }
    setPendingLiveScan(null);
    setAuthStartError(null);
    setIsSignInDialogOpen(false);
    setIsAuthStarting(false);
  }, []);

  const continueWithGoogle = React.useCallback(async () => {
    if (!pendingLiveScan || isAuthStarting) return;
    if (isAuthLoading) {
      setAuthStartError('Checking your sign-in status. Please try again in a moment.');
      return;
    }

    setIsAuthStarting(true);
    setAuthStartError(null);
    try {
      window.localStorage.setItem(PENDING_LIVE_SCAN_KEY, serializePendingLiveScan(pendingLiveScan));
      const message = await signInWithGoogle(`${window.location.pathname}${window.location.search}`);
      if (message) {
        setAuthStartError('Google sign-in could not start. Please try again, or cancel and return to your scan.');
        return;
      }
      setIsSignInDialogOpen(false);
      setPendingLiveScan(null);
    } catch {
      setAuthStartError('Google sign-in could not start. Please try again, or cancel and return to your scan.');
    } finally {
      setIsAuthStarting(false);
    }
  }, [isAuthLoading, isAuthStarting, pendingLiveScan, signInWithGoogle]);

  const requestSingleScan = (
    address: string,
    chainIds: number[],
    options: { forceRefresh?: boolean } = {},
    trigger?: HTMLElement,
  ) => {
    if (user) {
      void handleSingleScan(address, chainIds, options);
      return;
    }
    openSignInDialog({ mode: 'single', address, chainIds, forceRefresh: options.forceRefresh }, trigger);
  };

  const requestClusterScan = (addresses: string[], chainIds: number[], trigger?: HTMLElement) => {
    if (user) {
      void handleClusterScan(addresses, chainIds);
      return;
    }
    openSignInDialog({ mode: 'cluster', addresses, chainIds }, trigger);
  };

  React.useEffect(() => {
    if (!user || isAuthLoading) return;
    const serialized = window.localStorage.getItem(PENDING_LIVE_SCAN_KEY);
    if (!serialized) return;
    window.localStorage.removeItem(PENDING_LIVE_SCAN_KEY);
    const pendingScan = parsePendingLiveScan(serialized);
    if (!pendingScan) return;
    if (pendingScan.mode === 'single') {
      void handleSingleScan(pendingScan.address, pendingScan.chainIds, { forceRefresh: pendingScan.forceRefresh });
    } else {
      void handleClusterScan(pendingScan.addresses, pendingScan.chainIds);
    }
  }, [handleClusterScan, handleSingleScan, isAuthLoading, user]);

  const handleInspectFromCluster = (address: string) => {
    setIsScanEditorOpen(false);
    setCurrentAddress(address);
    requestSingleScan(address, [...SUPPORTED_CHAIN_IDS]);
  };

  const handleSetScanMode = (mode: 'single' | 'cluster') => {
    setIsScanEditorOpen(false);
    setScanMode(mode);
  };

  const handleSingleScanFromForm = (address: string, chainIds: number[], trigger?: HTMLElement) => {
    if (user) setIsScanEditorOpen(false);
    requestSingleScan(address, chainIds, {}, trigger);
  };

  const handleScanModeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const nextIndex = getNextTabIndex(SCAN_MODES.indexOf(scanMode), SCAN_MODES.length, event.key);
    if (nextIndex === null) return;
    event.preventDefault();
    const nextMode = SCAN_MODES[nextIndex];
    handleSetScanMode(nextMode);
    document.getElementById(`scan-mode-${nextMode}-tab`)?.focus();
  };

  return (
    <main className="min-w-0 overflow-x-clip max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:space-y-5">
      <SiteHeader
        activePage="scanner"
        onBrandClick={showGuide ? undefined : () => setShowGuide(true)}
        contextAction={(singleResult || clusterResult) ? (
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="btn-3d-neutral min-h-11 inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0a0a0a] cursor-pointer md:min-h-9 md:w-auto md:justify-start md:py-1"
          >
            {showGuide ? (
              <>
                <LayoutDashboard size={13} className="text-orange-ink" />
                <span>VIEW DASHBOARD</span>
              </>
            ) : (
              <>
                <HelpCircle size={13} className="text-orange-ink" />
                <span>HOW IT WORKS</span>
              </>
            )}
          </button>
        ) : undefined}
      />

      {/* ── Product promise stays directly above the primary scan task ── */}
      {showGuide && (
        <section aria-labelledby="main-hero-title" className="text-center space-y-2 max-w-3xl mx-auto pt-2 pb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-[#4b5563]">
            <Zap size={13} className="text-orange-ink" />
            <span>Multi-chain behavioral forensics</span>
          </div>
          <h1 id="main-hero-title" className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tight leading-tight font-sans text-balance">
            Investigate observable activity across supported EVM networks
          </h1>
          <p className="text-sm sm:text-base text-[#4b5563] font-medium leading-relaxed max-w-2xl mx-auto text-pretty">
            Review observable on-chain behavior, capital flows, available public identities, and security signals across Ethereum, Base, Arbitrum, and Optimism.
          </p>
        </section>
      )}

      {/* ── Mode Switcher & Input Section ── */}
      <section aria-label="Wallet Forensics Console" className="space-y-3">
        {/* Mode Selector Tabs */}
        <div
          role="tablist"
          aria-label="Forensics Scan Mode"
          className="grid grid-cols-2 gap-2 border-b border-[#c8c8c8] pb-2.5 md:flex md:items-center md:gap-2.5"
        >
          <button
            id="scan-mode-single-tab"
            role="tab"
            aria-selected={scanMode === 'single'}
            aria-controls="scan-mode-single-panel"
            tabIndex={scanMode === 'single' ? 0 : -1}
            onKeyDown={handleScanModeKeyDown}
            type="button"
            onClick={() => handleSetScanMode('single')}
            className={`min-h-11 min-w-0 w-full justify-center px-2 py-2 text-center text-xs font-black uppercase leading-tight tracking-wider flex items-center gap-2 cursor-pointer md:min-h-9 md:w-auto md:flex-none md:justify-start md:px-3 md:py-1.5 md:text-left ${
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
            onClick={() => handleSetScanMode('cluster')}
            className={`min-h-11 min-w-0 w-full justify-center px-2 py-2 text-center text-xs font-black uppercase leading-tight tracking-wider flex items-center gap-2 cursor-pointer md:min-h-9 md:w-auto md:flex-none md:justify-start md:px-3 md:py-1.5 md:text-left ${
              scanMode === 'cluster'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            <Layers size={13} className={scanMode === 'cluster' ? 'text-[#ff5500]' : ''} />
            <span>Cluster scan</span>
            <span className="badge-brand-orange hidden text-[9px] px-1.5 py-0.2 font-mono shadow-sm md:inline-flex">New</span>
          </button>
        </div>

        {/* Input Views */}
        <div
          id="scan-mode-single-panel"
          role="tabpanel"
          aria-labelledby="scan-mode-single-tab"
          hidden={scanMode !== 'single'}
          className="space-y-2"
        >
          {!showGuide && singleResult && !isLoading && !isScanEditorOpen ? (
            <LoadedScanSummary
              address={currentAddress || singleResult.address}
              chainIds={singleChainIds}
              evidenceMode={indexingStatus}
              data={singleResult}
              isLoading={isLoading}
              onRefresh={() => requestSingleScan(currentAddress || singleResult.address, singleChainIds, { forceRefresh: true })}
              onEdit={() => setIsScanEditorOpen(true)}
            />
          ) : (
            <WalletInput
              key={`${currentAddress || 'wallet-input'}-${singleChainIds.join('-')}`}
              onScan={handleSingleScanFromForm}
              isLoading={isLoading}
              initialAddress={currentAddress}
              initialChainIds={singleChainIds}
            />
          )}
        </div>
        <div
          id="scan-mode-cluster-panel"
          role="tabpanel"
          aria-labelledby="scan-mode-cluster-tab"
          hidden={scanMode !== 'cluster'}
        >
          {scanMode === 'cluster' && (
            <BulkScanInput
              onScanCluster={requestClusterScan}
              onLoadSavedClusterSnapshot={handleClusterDemoSnapshot}
              onClusterInputChange={handleClusterInputChange}
              isLoading={isLoading}
            />
          )}
        </div>
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
        <div role="alert" className="card-3d border-l-4 border-l-[#ef4444] p-4 text-xs font-bold !text-[#991b1b]">
          {error}
        </div>
      )}

      <div className="min-h-5" aria-live="polite">
        {!user && !isAuthLoading && (
          <p className="text-xs font-bold text-[#4b5563]">
            Google sign-in is required for live scans. Saved demos remain available without signing in.
          </p>
        )}
      </div>

      {shouldShowDemoSnapshotNotice({
        scanMode,
        activeDemoSnapshot: Boolean(activeDemoSnapshot),
        showGuide,
      }) && activeDemoSnapshot && (
        <DemoSnapshotNotice
          demo={activeDemoSnapshot}
          isLoading={isLoading}
          data={singleResult ?? undefined}
          onRunFreshScan={trigger => {
            setIsScanEditorOpen(false);
            requestSingleScan(activeDemoSnapshot.address, [...SUPPORTED_CHAIN_IDS], {}, trigger);
          }}
        />
      )}

      {/* ── Conditional Dashboard / Guide Render ── */}
      {showGuide && !isLoading && (
        <WelcomeGuide onSelectDemo={demo => void handleDemoSnapshot(demo)} />
      )}

      {!showGuide && !isLoading && (
        <>
          {scanMode === 'single' && singleResult && (
            <Dashboard data={singleResult} showStatusPanel={!activeDemoSnapshot} />
          )}

          {scanMode === 'cluster' && clusterResult && (
            <BulkDashboard
              data={clusterResult}
              onInspectWallet={handleInspectFromCluster}
              snapshotGeneratedAt={activeClusterSnapshot?.generatedAt}
              onRunFreshScan={() => requestClusterScan([...CLUSTER_SAMPLE_ADDRESSES], [...CLUSTER_SAMPLE_SNAPSHOT.chainIds])}
            />
          )}
        </>
      )}

      {user && !isAuthLoading && !isLoading && <BetaUpdatesCard />}

      <LiveScanSignInDialog
        open={isSignInDialogOpen && !user}
        isStarting={isAuthStarting}
        error={authStartError}
        onContinue={() => void continueWithGoogle()}
        onClose={closeSignInDialog}
        returnFocusRef={returnFocusRef}
      />
    </main>
  );
}
