import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getIndexingStatus, shouldShowDemoSnapshotNotice } from './indexingStatus';

const baseInput = {
  scanMode: 'single' as const,
  activeDemoSnapshot: false,
  singleStatus: null,
  clusterStatus: null,
  hasError: false,
};

describe('indexing status presentation', () => {
  it('reports a live state when the selected mode has no result yet', () => {
    assert.strictEqual(getIndexingStatus(baseInput), 'live');
  });

  it('labels an active single-wallet demo as a saved snapshot', () => {
    assert.strictEqual(
      getIndexingStatus({ ...baseInput, activeDemoSnapshot: true }),
      'saved-snapshot',
    );
  });

  it('does not carry the single-wallet demo label into cluster mode', () => {
    assert.strictEqual(
      getIndexingStatus({ ...baseInput, scanMode: 'cluster', activeDemoSnapshot: true }),
      'live',
    );
  });

  it('hides the single-wallet demo notice after switching to cluster mode', () => {
    assert.strictEqual(
      shouldShowDemoSnapshotNotice({
        scanMode: 'single',
        activeDemoSnapshot: true,
        showGuide: false,
      }),
      true,
    );
    assert.strictEqual(
      shouldShowDemoSnapshotNotice({
        scanMode: 'cluster',
        activeDemoSnapshot: true,
        showGuide: false,
      }),
      false,
    );
  });

  it('does not show a saved snapshot notice while the guide is open', () => {
    assert.strictEqual(
      shouldShowDemoSnapshotNotice({
        scanMode: 'single',
        activeDemoSnapshot: true,
        showGuide: true,
      }),
      false,
    );
  });

  it('uses the selected mode result status and ignores the other mode', () => {
    assert.strictEqual(
      getIndexingStatus({ ...baseInput, scanMode: 'single', singleStatus: 'partial', clusterStatus: 'unavailable' }),
      'partial',
    );
    assert.strictEqual(
      getIndexingStatus({ ...baseInput, scanMode: 'cluster', singleStatus: 'partial', clusterStatus: 'unavailable' }),
      'unavailable',
    );
  });

  it('reports an unavailable state when the selected scan fails before returning a result', () => {
    assert.strictEqual(getIndexingStatus({ ...baseInput, hasError: true }), 'unavailable');
  });
});
