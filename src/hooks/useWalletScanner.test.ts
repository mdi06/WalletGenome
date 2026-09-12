import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./useWalletScanner.ts', import.meta.url), 'utf8');

test('reports only successful live single and cluster scans', () => {
  assert.match(source, /onLiveScanSuccess\?: \(\) => void/);
  assert.match(source, /if \(isSuccessfulLiveScan\(result\.status\)\) onLiveScanSuccess\?\.\(\)/);
  assert.match(source, /if \(isSuccessfulLiveScan\(data\.status\)\) onLiveScanSuccess\?\.\(\)/);
});

test('saved single and cluster demos do not report live-scan success', () => {
  const demoSingle = source.slice(source.indexOf('const handleDemoSnapshot'), source.indexOf('const handleClusterScan'));
  const demoCluster = source.slice(source.indexOf('const handleClusterDemoSnapshot'), source.indexOf('// Auto-scan'));
  assert.match(demoSingle, /onScanStart\?\.\(\);/);
  assert.match(demoCluster, /onScanStart\?\.\(\);/);
  assert.doesNotMatch(demoSingle, /onLiveScanSuccess/);
  assert.doesNotMatch(demoCluster, /onLiveScanSuccess/);
});
