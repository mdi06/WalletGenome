import { useCallback, useEffect, useRef, useState } from 'react';
import { MultiChainScanResult, ClusterScanResult } from '@/lib/types';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { getUrlScanTarget } from './walletScannerUrl';

export function useWalletScanner() {
  const autoScanStarted = useRef(false);
  const activeSingleScanId = useRef(0);
  const activeSingleScanController = useRef<AbortController | null>(null);
  const [scanMode, setScanMode] = useState<'single' | 'cluster'>('single');
  
  // Single scan state
  const [singleResult, setSingleResult] = useState<MultiChainScanResult | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  
  // Cluster scan state
  const [clusterResult, setClusterResult] = useState<ClusterScanResult | null>(null);
  
  // Global scan state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);


  const handleSingleScan = useCallback(async (address: string, chainIds: number[]) => {
    const scanId = ++activeSingleScanId.current;
    activeSingleScanController.current?.abort();
    const controller = new AbortController();
    activeSingleScanController.current = controller;
    setIsLoading(true);
    setError(null);
    setSingleResult(null);
    setShowGuide(false);
    setScanMode('single');
    setCurrentAddress(address);
    setProgress(`Indexing EVM block state & resolving multi-chain forensics...`);
    setProgressPercent(undefined);

    // Preload dashboard bundle during scan to eliminate render delay
    import('@/components/Dashboard').catch(() => {});

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('address', address);
      window.history.pushState({}, '', url.toString());
    }

    try {
      setProgress(`Fetching full wallet history across ${chainIds.length} chains...`);
      setProgressPercent(15);

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chainIds }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const result: MultiChainScanResult = await response.json();
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
  }, []);

  const handleClusterScan = async (addresses: string[], chainIds: number[]) => {
    setIsLoading(true);
    setError(null);
    setShowGuide(false);
    setProgress(`Scanning cluster of ${addresses.length} wallets across ${chainIds.length} chains...`);

    // Preload bulk dashboard bundle during scan to eliminate render delay
    import('@/components/BulkDashboard').catch(() => {});

    try {
      const response = await fetch('/api/batch-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses, chainIds }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data: ClusterScanResult = await response.json();
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
    const urlTarget = getUrlScanTarget(window.location.search);
    if (!urlTarget || autoScanStarted.current) return;
    autoScanStarted.current = true;
    const timeoutId = window.setTimeout(() => {
      void handleSingleScan(urlTarget, [...SUPPORTED_CHAIN_IDS]);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [handleSingleScan]);

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
    clusterResult,
    isLoading,
    progress,
    progressPercent,
    error,
    showGuide,
    setShowGuide,
    handleSingleScan,
    handleClusterScan
  };
}
