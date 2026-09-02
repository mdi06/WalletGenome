import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLUSTER_SAMPLE_ADDRESSES,
  CLUSTER_SAMPLE_SNAPSHOT,
  formatClusterSnapshotDate,
  isClusterSampleSearch,
} from './clusterDemoSnapshot';

test('defines a dated provider-free cluster example without live evidence claims', () => {
  assert.equal(CLUSTER_SAMPLE_SNAPSHOT.schemaVersion, 1);
  assert.equal(CLUSTER_SAMPLE_SNAPSHOT.result.source, 'saved');
  assert.equal(CLUSTER_SAMPLE_SNAPSHOT.result.status, 'complete');
  assert.deepEqual(CLUSTER_SAMPLE_SNAPSHOT.result.wallets.map(wallet => wallet.address), CLUSTER_SAMPLE_ADDRESSES);
  assert.equal(CLUSTER_SAMPLE_SNAPSHOT.result.requestedWallets, CLUSTER_SAMPLE_ADDRESSES.length);
  assert.equal(CLUSTER_SAMPLE_SNAPSHOT.result.totalTransactions, 0);
  assert.deepEqual(CLUSTER_SAMPLE_SNAPSHOT.result.linkages, []);
  assert.deepEqual(CLUSTER_SAMPLE_SNAPSHOT.result.sharedCounterparties, []);
  assert.equal(formatClusterSnapshotDate(CLUSTER_SAMPLE_SNAPSHOT.generatedAt), 'Sep 1, 2026');
});

test('recognizes only the explicit cluster sample URL state', () => {
  assert.equal(isClusterSampleSearch('?cluster=sample'), true);
  assert.equal(isClusterSampleSearch('?cluster=live'), false);
  assert.equal(isClusterSampleSearch(''), false);
});
