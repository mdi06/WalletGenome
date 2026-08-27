import { useCallback, useEffect, useRef, useState } from 'react';
import { MultiChainScanResult, ClusterScanResult } from '@/lib/types';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { getUrlScanTarget } from './walletScannerUrl';
import { runSingleWalletScanStream } from './scanStreamClient';
import { runClusterScanRequest } from './clusterScanClient';
import type { LiveScanProgress } from '@/lib/scanProgress';
import { loadDemoSnapshot } from './demoSnapshotClient';
import { getDemoWalletFromSearch, type DemoWallet } from '@/lib/demoWallets';

export function useWalletScanner() {
  const autoScanStarted = useRef(false);
  const activeSingleScanId = useRef(0);
  const activeSingleScanController = useRef<AbortController | null>(null);
  const [scanMode, setScanModeState] = useState<'single' | 'cluster'>('single');
  
  // Single scan state
  const [singleResult, setSingleResult] = useState<MultiChainScanResult | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [singleChainIds, setSingleChainIds] = useState<number[]>([...SUPPORTED_CHAIN_IDS]);
  const [activeDemoSnapshot, setActiveDemoSnapshot] = useState<DemoWallet | null>(null);
  
  // Cluster scan state
  const [clusterResult, setClusterResult] = useState<ClusterScanResult | null>(null);
  
  // Global scan state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined);
  const [scanProgressDetail, setScanProgressDetail] = useState<LiveScanProgress | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const setScanMode = useCallback((mode: 'single' | 'cluster') => {
    setScanModeState(mode);
    if (mode === 'cluster') {
      setSingleResult(null);
      setActiveDemoSnapshot(null);
    } else {
      setClusterResult(null);
    }
  }, []);


  const handleSingleScan = useCallback(async (address: string, chainIds: number[]) => {
    const scanId = ++activeSingleScanId.current;
    activeSingleScanController.current?.abort();
    const controller = new AbortController();
    activeSingleScanController.current = controller;
    setIsLoading(true);
    setError(null);
    setSingleResult(null);
    setActiveDemoSnapshot(null);
    setSingleChainIds([...chainIds]);
    setShowGuide(false);
    setScanMode('single');
    setCurrentAddress(address);
    setProgress(`Indexing EVM block state & resolving multi-chain forensics...`);
    setProgressPercent(undefined);
    const startedAt = Date.now();
    setScanProgressDetail({
      phase: 'resolving',
      message: 'Resolving wallet identity and scan target...',
      progressPercent: 8,
      chainIds: [...chainIds],
      completedChains: 0,
      totalChains: chainIds.length,
      queriedChains: 0,
      completedChainIds: [],
      recordsFound: 0,
      startedAt,
      lastUpdatedAt: startedAt,
    });

    // Preload dashboard bundle during scan to eliminate render delay
    import('@/components/Dashboard').catch(() => {});

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('demo');
      url.searchParams.set('address', address);
      window.history.pushState({}, '', url.toString());
    }

    try {
      const result = await runSingleWalletScanStream({
        address,
        chainIds,
        signal: controller.signal,
        onUpdate: update => {
          if (activeSingleScanId.current !== scanId) return;
          setProgress(update.progress.message);
          setProgressPercent(update.progress.progressPercent);
          setScanProgressDetail({
            ...update.progress,
            chainIds: [...chainIds],
            startedAt: update.startedAt,
            lastUpdatedAt: update.updatedAt,
          });
        },
      });
      if (activeSingleScanId.current !== scanId) return;
      setProgressPercent(100);
      setSingleResult(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (activeSingleScanId.current === scanId) {
        setError(err instanceof Error ? err.message : 'Scan execution failed.');
      }
    } finally {
      if (activeSingleScanId.current === scanId) {
        activeSingleScanController.current = null;
        setIsLoading(false);
        setProgress('');
        setProgressPercent(undefined);
      }
    }
  }, [setScanMode]);

  const handleDemoSnapshot = useCallback(async (demo: DemoWallet) => {
    const scanId = ++activeSingleScanId.current;
    activeSingleScanController.current?.abort();
    const controller = new AbortController();
    activeSingleScanController.current = controller;
    setIsLoading(true);
    setError(null);
    setSingleResult(null);
    setActiveDemoSnapshot(null);
    setSingleChainIds([...SUPPORTED_CHAIN_IDS]);
    setShowGuide(false);
    setScanMode('single');
    setCurrentAddress(demo.address);
    setProgress(`Loading saved demo snapshot for ${demo.name}...`);
    setProgressPercent(35);
    setScanProgressDetail(undefined);

    import('@/components/Dashboard').catch(() => {});

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('address');
      url.searchParams.set('demo', demo.slug);
      window.history.pushState({}, '', url.toString());
    }

    try {
      const snapshot = await loadDemoSnapshot(demo, fetch, controller.signal);
      if (activeSingleScanId.current !== scanId) return;
      setProgressPercent(100);
      setSingleResult(snapshot.result);
      setActiveDemoSnapshot(demo);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (activeSingleScanId.current === scanId) {
        setError(err instanceof Error ? err.message : 'Saved demo snapshot failed to load.');
      }
    } finally {
      if (activeSingleScanId.current === scanId) {
        activeSingleScanController.current = null;
        setIsLoading(false);
        setProgress('');
        setProgressPercent(undefined);
      }
    }
  }, [setScanMode]);

  const handleClusterScan = async (addresses: string[], chainIds: number[]) => {
    setScanMode('cluster');
    setIsLoading(true);
    setError(null);
    setSingleResult(null);
    setActiveDemoSnapshot(null);
    setShowGuide(false);
    setProgress(`Scanning cluster of ${addresses.length} wallets across ${chainIds.length} chains...`);
    const startedAt = Date.now();
    setScanProgressDetail({
      phase: 'fetching',
      message: `Scanning cluster of ${addresses.length} wallets across ${chainIds.length} chains...`,
      progressPercent: 15,
      chainIds: [...chainIds],
      completedChains: 0,
      totalChains: chainIds.length,
      startedAt,
      lastUpdatedAt: startedAt,
    });

    // Preload bulk dashboard bundle during scan to eliminate render delay
    import('@/components/BulkDashboard').catch(() => {});

    try {
      const data = await runClusterScanRequest({ addresses, chainIds });
      setClusterResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cluster scan execution failed.');
    } finally {
      setIsLoading(false);
      setProgress('');
      setProgressPercent(undefined);
    }
  };

  // Auto-scan if address is present in URL
  useEffect(() => {
    const demo = getDemoWalletFromSearch(window.location.search);
    if (demo && !autoScanStarted.current) {
      autoScanStarted.current = true;
      const timeoutId = window.setTimeout(() => {
        void handleDemoSnapshot(demo);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const urlTarget = getUrlScanTarget(window.location.search);
    if (!urlTarget || autoScanStarted.current) return;
    autoScanStarted.current = true;
    const timeoutId = window.setTimeout(() => {
      void handleSingleScan(urlTarget, [...SUPPORTED_CHAIN_IDS]);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [handleDemoSnapshot, handleSingleScan]);

  useEffect(() => () => {
    activeSingleScanId.current += 1;
    activeSingleScanController.current?.abort();
    activeSingleScanController.current = null;
  }, []);

  return {
    scanMode,
    setScanMode,
    singleResult,
    currentAddress,
    setCurrentAddress,
    singleChainIds,
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
  };
}
