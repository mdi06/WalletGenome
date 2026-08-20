import { useState, useEffect } from 'react';
import { MultiChainScanResult, ClusterScanResult } from '@/lib/types';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';

export function useWalletScanner() {
  const [scanMode, setScanMode] = useState<'single' | 'cluster'>('single');
  
  // Single scan state
  const [singleResult, setSingleResult] = useState<MultiChainScanResult | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  
  // Cluster scan state
  const [clusterResult, setClusterResult] = useState<ClusterScanResult | null>(null);
  
  // Global scan state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // Auto-scan if address is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlAddr = params.get('address') || params.get('wallet');
      if (urlAddr && (urlAddr.startsWith('0x') || urlAddr.endsWith('.eth'))) {
        setCurrentAddress(urlAddr);
        handleSingleScan(urlAddr, [...SUPPORTED_CHAIN_IDS]);
      }
    }
  }, []);

  const handleSingleScan = async (address: string, chainIds: number[], isDemo = false) => {
    setIsLoading(true);
    setError(null);
    setShowGuide(false);
    setScanMode('single');
    setCurrentAddress(address);
    setProgress(`Indexing EVM block state & resolving multi-chain forensics...`);

    // Preload dashboard bundle during scan to eliminate render delay
    import('@/components/Dashboard').catch(() => {});

    if (typeof window !== 'undefined' && !isDemo) {
      const url = new URL(window.location.href);
      url.searchParams.set('address', address);
      window.history.pushState({}, '', url.toString());
    }

    try {
      setProgress(`Scanning ${chainIds.length} active chains & Web3.bio identity graph...`);

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chainIds, isDemo }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data: MultiChainScanResult = await response.json();
      setSingleResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan execution failed.');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

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
    }
  };

  return {
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
  };
}
