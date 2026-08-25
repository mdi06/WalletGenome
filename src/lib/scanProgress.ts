export type ScanProgressPhase = 'resolving' | 'fetching' | 'pricing' | 'analyzing' | 'finalizing';

export interface ScanProgressDetail {
  phase: ScanProgressPhase;
  completedChains?: number;
  totalChains?: number;
  queriedChains?: number;
  currentChainId?: number;
  currentChainName?: string;
  completedChainIds?: number[];
  recordsFound?: number;
}

export interface DisplayScanProgress extends ScanProgressDetail {
  message: string;
  progressPercent: number;
}

export interface LiveScanProgress extends DisplayScanProgress {
  chainIds: number[];
  startedAt: number;
  lastUpdatedAt: number;
}

export type DisplayScanStatus = 'queued' | 'running' | 'completed' | 'failed';

export function formatScanProgress(
  progress: ScanProgressDetail,
  status: DisplayScanStatus,
  error?: string,
): DisplayScanProgress {
  if (status === 'completed') {
    return { ...progress, phase: 'finalizing', message: 'Forensic scan complete.', progressPercent: 100 };
  }

  if (status === 'failed') {
    return { ...progress, message: error || 'Forensic scan failed.', progressPercent: 100 };
  }

  const totalChains = progress.totalChains ?? 0;
  const completedChains = progress.completedChains ?? 0;
  const queriedChains = progress.queriedChains ?? 0;
  const recordsFound = progress.recordsFound ?? 0;

  let message = 'Indexing EVM block state and resolving multi-chain forensics...';
  let progressPercent = 8;

  switch (progress.phase) {
    case 'resolving':
      message = 'Resolving wallet identity and scan target...';
      progressPercent = 8;
      break;
    case 'fetching': {
      if (completedChains > 0) {
        message = `${completedChains} of ${totalChains || 1} chain histories complete; ${recordsFound.toLocaleString('en-US')} records found so far.`;
      } else if (queriedChains > 0) {
        message = `History providers responded for ${queriedChains} of ${totalChains || 1} chains; ${recordsFound.toLocaleString('en-US')} records found so far.`;
      } else {
        message = `Contacting history providers across ${totalChains || 1} chains...`;
      }

      const queriedFraction = totalChains > 0 ? Math.min(queriedChains, totalChains) / totalChains : 0;
      const completedFraction = totalChains > 0 ? Math.min(completedChains, totalChains) / totalChains : 0;
      progressPercent = 18 + Math.round((queriedFraction * 18) + (completedFraction * 34));
      break;
    }
    case 'pricing':
      message = `Checking historical prices for supported assets; ${recordsFound.toLocaleString('en-US')} history records loaded.`;
      progressPercent = 76;
      break;
    case 'analyzing':
      message = 'Computing wallet risk, approvals, flows, and behavioral fingerprints...';
      progressPercent = 90;
      break;
    case 'finalizing':
      message = 'Finalizing forensic report...';
      progressPercent = 97;
      break;
  }

  return { ...progress, message, progressPercent };
}
