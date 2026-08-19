import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeDeadAssets } from './deadAssets';
import { ProcessedTokenTransfer } from '../types';

describe('Dead Asset Classification & Long-term HODL Protection Tests', () => {
  const dummyAddress = '0x1234567890123456789012345678901234567890';
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - (365 * 24 * 3600);

  it('should NOT flag long-term HODL ecosystem tokens (AERO, VELO, GMX, PENDLE) as dead even if inactive for > 180 days', () => {
    const hodlTransfers: ProcessedTokenTransfer[] = [
      {
        hash: '0xaero_tx',
        timestamp: oneYearAgo, // 365 days ago
        date: '2025-08-01',
        from: '0xUniswap',
        to: dummyAddress,
        contractAddress: '0x940181a94a35a4569e4529a3cdfb74e38fd98631',
        tokenName: 'Aerodrome',
        tokenSymbol: 'AERO',
        tokenDecimal: 18,
        value: '1000000000000000000000',
        valueFormatted: 1000,
        valueUSD: 800,
        direction: 'in',
        chainId: 8453,
      },
      {
        hash: '0xpendle_tx',
        timestamp: oneYearAgo,
        date: '2025-08-01',
        from: '0xPool',
        to: dummyAddress,
        contractAddress: '0x808507121b80c02388fad14726482e061b8da827',
        tokenName: 'Pendle',
        tokenSymbol: 'PENDLE',
        tokenDecimal: 18,
        value: '500000000000000000000',
        valueFormatted: 500,
        valueUSD: 2500,
        direction: 'in',
        chainId: 1,
      },
      {
        hash: '0xgmx_tx',
        timestamp: oneYearAgo,
        date: '2025-08-01',
        from: '0xPool',
        to: dummyAddress,
        contractAddress: '0xfc5a1a6eb0ba367c0e756bf524129065ba6aa558',
        tokenName: 'GMX',
        tokenSymbol: 'GMX',
        tokenDecimal: 18,
        value: '10000000000000000000',
        valueFormatted: 10,
        valueUSD: 300,
        direction: 'in',
        chainId: 42161,
      },
    ];

    const graveyard = analyzeDeadAssets(hodlTransfers, 8453);

    assert.strictEqual(graveyard.totalTokensDead, 0, 'Recognized tokens held long-term must NOT be flagged as dead assets');
    assert.strictEqual(graveyard.deadAssets.length, 0);
    assert.strictEqual(graveyard.totalPeakValueLost, 0);
  });

  it('should NOT flag unpriced/dust tokens with zero historical USD value as dead assets', () => {
    const unpricedTransfers: ProcessedTokenTransfer[] = [
      {
        hash: '0xdust_tx',
        timestamp: oneYearAgo,
        date: '2025-08-01',
        from: '0xRandomAirdrop',
        to: dummyAddress,
        contractAddress: '0x1111111111111111111111111111111111111111',
        tokenName: 'Random Airdrop Meme',
        tokenSymbol: 'AIRDROP',
        tokenDecimal: 18,
        value: '1000000000000000000',
        valueFormatted: 1,
        valueUSD: null,
        direction: 'in',
        chainId: 1,
      },
    ];

    const graveyard = analyzeDeadAssets(unpricedTransfers, 1);

    assert.strictEqual(graveyard.totalTokensDead, 0, 'Unpriced tokens with zero historical recorded value should not create fake dead asset losses');
    assert.strictEqual(graveyard.totalPeakValueLost, 0);
  });

  it('should correctly flag genuine dead assets that had verified peak value and then collapsed/rugged', () => {
    const ruggedTransfers: ProcessedTokenTransfer[] = [
      {
        hash: '0xrug_tx',
        timestamp: oneYearAgo,
        date: '2025-08-01',
        from: '0xDEX',
        to: dummyAddress,
        contractAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        tokenName: 'Rugged Token Classic',
        tokenSymbol: 'RUGGED',
        tokenDecimal: 18,
        value: '1000000000000000000000',
        valueFormatted: 1000,
        valueUSD: 1500, // Acquired for $1,500 ($1.50 per unit)
        direction: 'in',
        chainId: 1,
      },
    ];

    const graveyard = analyzeDeadAssets(ruggedTransfers, 1);

    assert.strictEqual(graveyard.totalTokensDead, 1, 'Token with confirmed peak value that lost all trading value must be flagged as dead');
    assert.strictEqual(graveyard.deadAssets[0].tokenSymbol, 'RUGGED');
    assert.strictEqual(graveyard.deadAssets[0].peakValueUSD, 1500);
    assert.strictEqual(graveyard.deadAssets[0].currentValueUSD, 0);
    assert.strictEqual(graveyard.totalPeakValueLost, 1500);
  });
});
