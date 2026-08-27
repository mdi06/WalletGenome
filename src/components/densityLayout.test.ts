import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

it('keeps secondary controls compact on desktop while preserving mobile targets', () => {
  const pageSource = readSource('../app/page.tsx');
  const walletSource = readSource('./WalletInput.tsx');
  const transferSource = readSource('./TransferTable.tsx');
  const filterSource = readSource('./FilterDropdown.tsx');

  assert.match(pageSource, /min-h-11[^\n]*md:min-h-9/);
  assert.match(walletSource, /min-h-11 md:min-h-9/);
  assert.match(walletSource, /sm:w-auto sm:ml-1\.5 min-h-11/);
  assert.match(transferSource, /grid grid-cols-3 gap-2 md:flex/);
  assert.match(transferSource, /min-h-11 w-full justify-center/);
  assert.match(filterSource, /min-h-11 md:min-h-9/);
});

it('compacts transfer rows on desktop while preserving token identity and neutral elevation', () => {
  const transferSource = readSource('./TransferTable.tsx');
  const globalStyles = readSource('../app/globals.css');

  assert.match(transferSource, /<td className="py-5 md:py-1\.5 px-4 font-mono font-black/);
  assert.strictEqual((transferSource.match(/py-5 md:py-1\.5 px-4/g) ?? []).length, 8);
  assert.match(transferSource, /Token contract/);
  assert.match(transferSource, /Contract unavailable/);
  assert.match(transferSource, /min-h-11 min-w-11 md:min-h-9 md:min-w-9/);
  assert.match(globalStyles, /--shadow-btn-neutral:.*0 1px 0 #d3d5db/);
  assert.match(globalStyles, /\.btn-3d-neutral:hover:not\(:disabled\)[\s\S]*border: 1px solid #b8bbc3/);
});

it('keeps loaded evidence concise and snapshot warnings restrained', () => {
  const loadedSource = readSource('./LoadedScanSummary.tsx');
  const noticeSource = readSource('./DemoSnapshotNotice.tsx');

  assert.match(loadedSource, /Saved snapshot/);
  assert.doesNotMatch(loadedSource, /<dt className="inline">Evidence:/);
  assert.match(loadedSource, /flex flex-col gap-3 p-3 md:flex-row[\s\S]*md:gap-1 md:p-2/);
  assert.match(noticeSource, /Saved snapshot · Non-live/);
  assert.doesNotMatch(noticeSource, /Demo snapshot · Evidence status · Saved snapshot/);
  assert.match(noticeSource, /border border-\[#d6b48f\] border-l-4 border-l-\[#b33c00\] bg-\[#fff7ed\] shadow-none/);
  assert.match(noticeSource, /History evidence: \{data\.status\}/);
  assert.match(noticeSource, /border-t border-\[#d6b48f\]/);
});
