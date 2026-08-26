import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { ProcessedTokenTransfer, ProcessedTransaction } from '../types';
import { analyzeTransfers, deduplicateTokenTransfers } from './transfers';

const wallet = '0x1111111111111111111111111111111111111111';
const counterparty = '0x2222222222222222222222222222222222222222';

function nativeTransfer(
  direction: 'in' | 'out',
  valueUSD: number | null,
  valueUSDProvenance: ProcessedTransaction['valueUSDProvenance'],
): ProcessedTransaction {
  return {
    hash: `0xnative-${direction}-${valueUSDProvenance}`,
    timestamp: 1_700_000_000,
    date: '2023-11-14',
    from: direction === 'in' ? counterparty : wallet,
    to: direction === 'in' ? wallet : counterparty,
    value: '1000000000000000000',
    valueFormatted: 1,
    valueUSD,
    valueUSDProvenance,
    gasUsed: 21_000,
    gasPrice: 1,
    gasCostETH: 0,
    gasCostUSD: 0,
    gasCostUSDProvenance: 'historical',
    isError: false,
    methodId: '0x',
    functionName: '',
    category: 'transfer',
    chainId: 1,
  };
}

function tokenTransfer(
  direction: 'in' | 'out',
  valueUSD: number | null,
  valueUSDProvenance: ProcessedTokenTransfer['valueUSDProvenance'],
): ProcessedTokenTransfer {
  return {
    hash: `0xtoken-${direction}-${valueUSDProvenance}`,
    timestamp: 1_700_000_000,
    date: '2023-11-14',
    from: direction === 'in' ? counterparty : wallet,
    to: direction === 'in' ? wallet : counterparty,
    contractAddress: '0x3333333333333333333333333333333333333333',
    tokenName: 'Token',
    tokenSymbol: 'TKN',
    tokenDecimal: 18,
    value: '1000000000000000000',
    valueFormatted: 1,
    valueUSD,
    valueUSDProvenance,
    direction,
    chainId: 1,
  };
}

describe('Verified capital flow', () => {
  it('deduplicates repeated token events without collapsing distinct legs in one transaction', () => {
    const first = tokenTransfer('in', 100, 'historical');
    const distinctLeg = {
      ...first,
      to: '0x4444444444444444444444444444444444444444',
      value: '2000000000000000000',
      valueFormatted: 2,
    };
    const sameEventWithLogIndex = { ...first, logIndex: '7' };

    const unique = deduplicateTokenTransfers([
      first,
      { ...first },
      distinctLeg,
      sameEventWithLogIndex,
    ]);

    assert.strictEqual(unique.length, 3);
    assert.strictEqual(unique[0], first);
    assert.strictEqual(unique[1], distinctLeg);
    assert.strictEqual(unique[2], sameEventWithLogIndex);
  });

  it('deduplicates token events before ranking and coverage totals', () => {
    const first = tokenTransfer('in', 100, 'historical');
    const distinctLeg = {
      ...first,
      to: '0x4444444444444444444444444444444444444444',
      value: '2000000000000000000',
      valueFormatted: 2,
      valueUSD: 200,
    };

    const summary = analyzeTransfers([], [first, { ...first }, distinctLeg], wallet);

    assert.strictEqual(summary.topInbound.length, 2);
    assert.strictEqual(summary.capitalFlowCoverage.totalLegs, 2);
    assert.strictEqual(summary.totalInboundUSD, 300);
  });

  it('includes historical and stablecoin values while excluding spot estimates and unpriced legs', () => {
    const summary = analyzeTransfers([
      nativeTransfer('in', 100, 'historical'),
      nativeTransfer('out', 400, 'spot_estimate'),
    ], [
      tokenTransfer('out', 25, 'stablecoin_assumption'),
      tokenTransfer('in', null, 'unpriced'),
    ], wallet);

    assert.strictEqual(summary.totalInboundUSD, 100);
    assert.strictEqual(summary.totalOutboundUSD, 25);
    assert.deepStrictEqual(summary.capitalFlowCoverage, {
      verifiedLegs: 2,
      totalLegs: 4,
      excludedSpotEstimateLegs: 1,
      unpricedLegs: 1,
      coveragePercent: 50,
      status: 'partial',
    });
  });
});
