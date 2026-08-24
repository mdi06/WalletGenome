import assert from 'node:assert';
import { describe, it } from 'node:test';
import { detectDirectWalletLinkages, findSharedCounterparties } from './clusterAnalysis';
import { WalletClusterEvidence, WalletTransferEvidence } from './types';

const walletA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const walletB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function transfer(hash: string, valueUSD: number | null = 250): WalletTransferEvidence {
  return {
    hash,
    chainId: 1,
    source: walletA,
    target: walletB,
    assetType: 'erc20',
    assetIdentifier: '0x9999999999999999999999999999999999999999',
    valueUSD,
    timestamp: 1_700_000_000,
    date: '2023-11-14',
  };
}

function evidence(
  walletAddress: string,
  transfers: WalletTransferEvidence[] = [],
  counterparties: string[] = [],
): WalletClusterEvidence {
  return { walletAddress, transfers, counterparties };
}

describe('Cluster linkage analysis', () => {
  it('creates one evidence-backed linkage for a known inter-wallet transfer', () => {
    const item = transfer('0xabc');
    const linkages = detectDirectWalletLinkages([
      evidence(walletA, [item], [walletB]),
      evidence(walletB, [item], [walletA]),
    ]);

    assert.strictEqual(linkages.length, 1);
    assert.strictEqual(linkages[0].source, walletA);
    assert.strictEqual(linkages[0].target, walletB);
    assert.strictEqual(linkages[0].txCount, 1);
    assert.strictEqual(linkages[0].volumeUSD, 250);
    assert.strictEqual(linkages[0].valueStatus, 'complete');
    assert.deepStrictEqual(linkages[0].evidenceTxHashes, ['0xabc']);
  });

  it('does not invent a linkage when submitted wallets never transfer to each other', () => {
    const linkages = detectDirectWalletLinkages([
      evidence(walletA, [], ['0x1111111111111111111111111111111111111111']),
      evidence(walletB, [], ['0x2222222222222222222222222222222222222222']),
    ]);
    assert.deepStrictEqual(linkages, []);
  });

  it('aggregates multiple transactions and withholds incomplete USD volume', () => {
    const linkages = detectDirectWalletLinkages([
      evidence(walletA, [transfer('0x1', 10), transfer('0x2', null)], [walletB]),
      evidence(walletB, [transfer('0x1', 10), transfer('0x2', null)], [walletA]),
    ]);

    assert.strictEqual(linkages[0].txCount, 2);
    assert.deepStrictEqual(linkages[0].evidenceTxHashes, ['0x1', '0x2']);
    assert.strictEqual(linkages[0].volumeUSD, null);
    assert.strictEqual(linkages[0].valueStatus, 'partial');
  });

  it('finds a shared hub beyond the first 40 counterparties', () => {
    const uniqueA = Array.from({ length: 45 }, (_, index) =>
      `0x${(index + 1).toString(16).padStart(40, '0')}`
    );
    const sharedHub = uniqueA[40];
    const hubs = findSharedCounterparties([
      evidence(walletA, [], uniqueA),
      evidence(walletB, [], [sharedHub]),
    ]);

    assert.deepStrictEqual(hubs, [{
      address: sharedHub,
      label: null,
      sharedCount: 2,
      walletAddresses: [walletA, walletB],
    }]);
  });
});
