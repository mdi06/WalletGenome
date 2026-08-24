import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { ProcessedTokenTransfer, ProcessedTransaction } from '../types';
import { analyzeTransfers } from './transfers';

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
