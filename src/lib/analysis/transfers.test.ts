import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import type { ProcessedTokenTransfer, ProcessedTransaction } from '../types';
import { batchFetchPrices, clearPriceCachesForTests } from '../prices';
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
  it('values recorded transfer amounts at current prices independently of historical prices', async () => {
    clearPriceCachesForTests();
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith('/prices/current/')) {
        return Response.json({ coins: { 'coingecko:ethereum': { price: 5 } } });
      }
      if (url.pathname === '/batchHistorical') {
        return Response.json({ coins: { 'coingecko:ethereum': { prices: [{ timestamp: 1_699_963_200, price: 2 }] } } });
      }
      return new Response('', { status: 404 });
    });
    try {
      await batchFetchPrices([{ chainId: 1, timestamp: 1_700_000_000 }]);
      const inbound = nativeTransfer('in', 2, 'historical');
      const outbound = nativeTransfer('out', 2, 'historical');
      const unsupported = tokenTransfer('in', null, 'unpriced');
      const summary = analyzeTransfers([inbound, outbound], [unsupported], wallet);
      assert.strictEqual(summary.totalInboundUSD, 2);
      assert.strictEqual(summary.currentPriceFlow?.inboundUSD, 5);
      assert.strictEqual(summary.currentPriceFlow?.outboundUSD, 5);
      assert.strictEqual(summary.currentPriceFlow?.pricedLegs, 2);
      assert.strictEqual(summary.currentPriceFlow?.totalLegs, 3);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('keeps a direction unavailable when none of its transfers has a current quote', () => {
    clearPriceCachesForTests();
    const summary = analyzeTransfers([], [tokenTransfer('in', null, 'unpriced')], wallet);
    assert.strictEqual(summary.currentPriceFlow?.inboundUSD, null);
    assert.strictEqual(summary.currentPriceFlow?.outboundUSD, 0);
    assert.strictEqual(summary.currentPriceFlow?.pricedLegs, 0);
  });

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
