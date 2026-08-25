import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  DEMO_WALLETS,
  getDemoWalletBySlug,
  getDemoWalletFromSearch,
} from './demoWallets';

test('curated demo wallet catalog has unique stable identities', () => {
  assert.equal(DEMO_WALLETS.length, 4);
  assert.equal(new Set(DEMO_WALLETS.map(wallet => wallet.slug)).size, DEMO_WALLETS.length);
  assert.equal(
    new Set(DEMO_WALLETS.map(wallet => wallet.address.toLowerCase())).size,
    DEMO_WALLETS.length,
  );
  assert.equal(getDemoWalletBySlug('vitalik')?.ens, 'vitalik.eth');
  assert.equal(getDemoWalletBySlug('unknown'), null);
  assert.equal(getDemoWalletFromSearch('?demo=hayden')?.ens, 'hayden.eth');
  assert.equal(getDemoWalletFromSearch('?demo=unknown'), null);
});

test('each catalog entry points to a matching versioned snapshot', async () => {
  for (const demo of DEMO_WALLETS) {
    const snapshotUrl = new URL(`../../public${demo.snapshotPath}`, import.meta.url);
    const payload = JSON.parse(await readFile(snapshotUrl, 'utf8')) as {
      schemaVersion: number;
      generatedAt: string;
      chainIds: number[];
      result: { address: string; chains: unknown[] };
    };

    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.generatedAt, demo.generatedAt);
    assert.deepEqual(payload.chainIds, [1, 10, 8453, 42161]);
    assert.equal(payload.result.address.toLowerCase(), demo.address.toLowerCase());
    assert.equal(payload.result.chains.length, 4);
  }
});
