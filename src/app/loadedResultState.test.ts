import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('collapses the loaded single-wallet form while keeping edit values available', () => {
  const pageSource = readSource('./page.tsx');
  assert.match(pageSource, /LoadedScanSummary/);
  assert.match(pageSource, /!showGuide && singleResult && !isLoading && !isScanEditorOpen/);
  assert.match(pageSource, /onEdit=\{openSingleScanEditor\}/);
  assert.match(pageSource, /initialAddress=\{currentAddress\}/);
  assert.match(pageSource, /initialChainIds=\{singleChainIds\}/);
});

test('wires loaded-result Scanner navigation to the existing single-wallet editor', () => {
  const pageSource = readSource('./page.tsx');

  assert.match(pageSource, /const openSingleScanEditor = React\.useCallback\(\(\) => \{[\s\S]*setShowGuide\(false\);[\s\S]*setIsScanEditorOpen\(true\);/);
  assert.match(pageSource, /onScannerClick=\{singleResult \|\| clusterResult \? openSingleScanEditor : undefined\}/);
  assert.match(pageSource, /onEdit=\{openSingleScanEditor\}/);
});

test('clears single-wallet state when switching into cluster mode', () => {
  const hookSource = readSource('../hooks/useWalletScanner.ts');
  assert.match(hookSource, /const \[singleChainIds, setSingleChainIds\]/);
  assert.match(hookSource, /if \(mode === 'cluster'\)[\s\S]{0,180}setSingleResult\(null\)[\s\S]{0,180}setActiveDemoSnapshot\(null\)/);
  assert.match(hookSource, /setClusterResult\(null\)/);
});
