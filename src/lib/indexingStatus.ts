import type { DataAvailabilityStatus } from './types';

export type ScanMode = 'single' | 'cluster';
export type IndexingStatus = 'ready' | 'scanning' | 'completed' | 'saved' | 'partial' | 'unavailable';

interface IndexingStatusInput {
  scanMode: ScanMode;
  activeDemoSnapshot: boolean;
  activeClusterSnapshot?: boolean;
  singleStatus: DataAvailabilityStatus | null;
  clusterStatus: DataAvailabilityStatus | null;
  hasError: boolean;
  isLoading: boolean;
}

interface DemoSnapshotNoticeInput {
  scanMode: ScanMode;
  activeDemoSnapshot: boolean;
  showGuide: boolean;
}

export function shouldShowDemoSnapshotNotice({
  scanMode,
  activeDemoSnapshot,
  showGuide,
}: DemoSnapshotNoticeInput): boolean {
  return scanMode === 'single' && activeDemoSnapshot && !showGuide;
}

export function getIndexingStatus({
  scanMode,
  activeDemoSnapshot,
  activeClusterSnapshot = false,
  singleStatus,
  clusterStatus,
  hasError,
  isLoading,
}: IndexingStatusInput): IndexingStatus {
  if (isLoading) return 'scanning';
  if (scanMode === 'single' && activeDemoSnapshot) return 'saved';
  if (scanMode === 'cluster' && activeClusterSnapshot) return 'saved';

  const selectedStatus = scanMode === 'single' ? singleStatus : clusterStatus;
  
  if (selectedStatus === 'unavailable' || (hasError && selectedStatus === null)) return 'unavailable';
  if (selectedStatus === 'partial') return 'partial';
  if (selectedStatus === 'complete') return 'completed';

  return 'ready';
}
