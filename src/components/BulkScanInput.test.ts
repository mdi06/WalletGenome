import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { parseBulkWalletEntries } from './BulkScanInput';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('cluster wallet input validation', () => {
  it('keeps unique valid wallets while reporting duplicate and invalid entries', () => {
    const first = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const second = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    assert.deepStrictEqual(
      parseBulkWalletEntries(`${first}\n${first}, invalid-wallet ${second}`),
      {
        validAddresses: [first.toLowerCase(), second],
        duplicateAddresses: [first.toLowerCase()],
        duplicateEntryCount: 1,
        invalidEntries: ['invalid-wallet'],
        invalidEntryCount: 1,
      },
    );
  });

  it('shows rejected entries before enabling a cluster scan', () => {
    const source = readSource('./BulkScanInput.tsx');

    assert.match(source, /id="bulk-address-rejected" role="alert"/);
    assert.match(source, /Remove invalid or duplicate entries before Cluster Scan runs/);
    assert.match(source, /disabled=\{isLoading \|\| parsedInput\.validAddresses\.length === 0 \|\| hasRejectedEntries\}/);
    assert.match(source, /Invalid:/);
    assert.match(source, /Duplicates:/);
  });
});
