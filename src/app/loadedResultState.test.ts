import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('collapses the loaded single-wallet form while keeping edit values available', () => {
  const pageSource = readSource('./page.tsx');
  assert.match(pageSource, /LoadedScanSummary/);
  assert.match(pageSource, /!showGuide && singleResult && !isLoading && !isScanEditorOpen/);
  assert.match(pageSource, /onEdit=\{\(\) => setIsScanEditorOpen\(true\)\}/);
  assert.match(pageSource, /initialAddress=\{currentAddress\}/);
  assert.match(pageSource, /initialChainIds=\{singleChainIds\}/);
});

test('clears single-wallet state when switching into cluster mode', () => {
  const hookSource = readSource('../hooks/useWalletScanner.ts');
  assert.match(hookSource, /const \[singleChainIds, setSingleChainIds\]/);
  assert.match(hookSource, /if \(mode === 'cluster'\)[\s\S]{0,180}setSingleResult\(null\)[\s\S]{0,180}setActiveDemoSnapshot\(null\)/);
  assert.match(hookSource, /setClusterResult\(null\)/);
});
