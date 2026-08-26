import type { DataAvailabilityStatus } from './types';

export type ScanMode = 'single' | 'cluster';
export type IndexingStatus = 'live' | 'saved-snapshot' | 'partial' | 'unavailable';

interface IndexingStatusInput {
  scanMode: ScanMode;
  activeDemoSnapshot: boolean;
  singleStatus: DataAvailabilityStatus | null;
  clusterStatus: DataAvailabilityStatus | null;
  hasError: boolean;
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
  singleStatus,
  clusterStatus,
  hasError,
}: IndexingStatusInput): IndexingStatus {
  if (scanMode === 'single' && activeDemoSnapshot) return 'saved-snapshot';

  const selectedStatus = scanMode === 'single' ? singleStatus : clusterStatus;
  if (selectedStatus === 'unavailable' || (hasError && selectedStatus === null)) return 'unavailable';
  if (selectedStatus === 'partial') return 'partial';

  return 'live';
}
