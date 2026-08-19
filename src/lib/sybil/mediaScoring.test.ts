import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeMediaScore } from './mediaScoring';
import { processTransactions, processTokenTransfers } from '../scanner';
import type { ProcessedTransaction, ProcessedTokenTransfer, EtherscanTransaction, EtherscanTokenTransfer } from '../types';

describe('MEDIA Sybil Model & API Data Flow Tests', () => {
  const dummyAddress = '0x1234567890123456789012345678901234567890';

  it('should return high risk when transaction history is empty', () => {
    const score = computeMediaScore({
      address: dummyAddress,
      transactions: [],
      tokenTransfers: [],
      uniqueContractCount: 0,
      activeChainsCount: 1,
      totalVolumeUSD: 0,
      totalGasUSD: 0,
    });

    assert.strictEqual(score.compositeScore, 10);
    assert.strictEqual(score.sybilProbability, 90);
    assert.strictEqual(score.classification, 'High Sybil Risk');
  });

  it('should correctly evaluate category diversity and lifespan with full ProcessedTransaction history', () => {
    // 20 transactions spread across 4 months and multiple categories
    const now = Math.floor(Date.now() / 1000);
    const monthsAgo4 = now - 120 * 24 * 3600;

    const mockTransactions: ProcessedTransaction[] = [
      {
        hash: '0x1',
        timestamp: monthsAgo4,
        date: '2026-04-01',
        from: dummyAddress,
        to: '0xUniswapRouter',
        value: '0',
        valueFormatted: 0,
        valueUSD: 0,
        gasUsed: 21000,
        gasPrice: 20000000000,
        gasCostETH: 0.00042,
        gasCostUSD: 1.5,
        isError: false,
        methodId: '0x38ed1739',
        functionName: 'swapExactTokensForTokens',
        category: 'swap',
        chainId: 1,
      },
      {
        hash: '0x2',
        timestamp: monthsAgo4 + 30 * 24 * 3600,
        date: '2026-05-01',
        from: dummyAddress,
        to: '0xOpenSeaSeaport',
        value: '0',
        valueFormatted: 0,
        valueUSD: 0,
        gasUsed: 50000,
        gasPrice: 20000000000,
        gasCostETH: 0.001,
        gasCostUSD: 3.5,
        isError: false,
        methodId: '0xfb0f3ee1',
        functionName: 'fulfillBasicOrder',
        category: 'nft',
        chainId: 1,
      },
      {
        hash: '0x3',
        timestamp: monthsAgo4 + 60 * 24 * 3600,
        date: '2026-06-01',
        from: dummyAddress,
        to: '0xAcrossBridge',
        value: '1000000000000000000',
        valueFormatted: 1,
        valueUSD: 3000,
        gasUsed: 40000,
        gasPrice: 20000000000,
        gasCostETH: 0.0008,
        gasCostUSD: 2.8,
        isError: false,
        methodId: '0x9e6e4f3a',
        functionName: 'deposit',
        category: 'bridge',
        chainId: 1,
      },
      {
        hash: '0x4',
        timestamp: monthsAgo4 + 90 * 24 * 3600,
        date: '2026-07-01',
        from: dummyAddress,
        to: '0xAaveLendingPool',
        value: '0',
        valueFormatted: 0,
        valueUSD: 0,
        gasUsed: 80000,
        gasPrice: 20000000000,
        gasCostETH: 0.0016,
        gasCostUSD: 5.6,
        isError: false,
        methodId: '0xe8eda9df',
        functionName: 'supply',
        category: 'lending',
        chainId: 1,
      },
      {
        hash: '0x5',
        timestamp: now,
        date: '2026-08-01',
        from: dummyAddress,
        to: '0xUSDC',
        value: '0',
        valueFormatted: 0,
        valueUSD: 0,
        gasUsed: 30000,
        gasPrice: 20000000000,
        gasCostETH: 0.0006,
        gasCostUSD: 2.1,
        isError: false,
        methodId: '0x095ea7b3',
        functionName: 'approve',
        category: 'approval',
        chainId: 1,
      },
    ];

    const mockTransfers: ProcessedTokenTransfer[] = Array.from({ length: 16 }, (_, i) => ({
      hash: `0xtx_${i}`,
      timestamp: monthsAgo4 + i * 24 * 3600 * 5,
      date: '2026-05-15',
      from: dummyAddress,
      to: `0xrecipient_${i}`,
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      tokenDecimal: 6,
      value: '100000000',
      valueFormatted: 100,
      valueUSD: 100,
      direction: 'out' as const,
      chainId: 1,
    }));

    const score = computeMediaScore({
      address: dummyAddress,
      transactions: mockTransactions,
      tokenTransfers: mockTransfers,
      uniqueContractCount: 15,
      activeChainsCount: 3,
      totalVolumeUSD: 15000,
      totalGasUSD: 250,
    });

    // Monetary score should be high due to $15k volume + gas bonus
    assert.ok(score.monetary >= 85, `Expected monetary >= 85, got ${score.monetary}`);
    // Engagement should recognize 5 distinct months (Apr, May, Jun, Jul, Aug) -> monthCount >= 3 (65)
    assert.ok(score.engagement >= 65, `Expected engagement >= 65, got ${score.engagement}`);
    // Diversity has 5 distinct categories ('swap', 'nft', 'bridge', 'lending', 'approval') >= 4 -> triggers +10 category bonus
    assert.ok(score.diversity >= 90, `Expected diversity >= 90, got ${score.diversity}`);
    // Identity has 3 chains (80) + 16 token transfers >= 15 (+10 bonus) -> 90
    assert.strictEqual(score.identity, 90);
    // Age is 120 days -> ageDays >= 90 (60)
    assert.ok(score.age >= 60, `Expected age >= 60, got ${score.age}`);

    assert.strictEqual(score.classification, 'Organic Human');
    assert.ok(score.sybilProbability < 25, `Expected sybilProbability < 25, got ${score.sybilProbability}`);
  });

  it('should detect bot burstiness when transactions happen in < 48 hours', () => {
    const startTs = 1700000000;
    // 20 transactions in 10 hours
    const burstTxs: ProcessedTransaction[] = Array.from({ length: 20 }, (_, i) => ({
      hash: `0xburst_${i}`,
      timestamp: startTs + i * 1800, // 30 min apart
      date: '2026-08-01',
      from: dummyAddress,
      to: '0xContract',
      value: '0',
      valueFormatted: 0,
      valueUSD: 0,
      gasUsed: 21000,
      gasPrice: 1000000000,
      gasCostETH: 0.000021,
      gasCostUSD: 0.05,
      isError: false,
      methodId: '0x',
      functionName: '',
      category: 'transfer',
      chainId: 1,
    }));

    const score = computeMediaScore({
      address: dummyAddress,
      transactions: burstTxs,
      tokenTransfers: [],
      uniqueContractCount: 1,
      activeChainsCount: 1,
      totalVolumeUSD: 50,
      totalGasUSD: 1,
    });

    // Engagement score should be penalized for burstiness (spanDays < 2 & totalTxCount > 15)
    assert.ok(score.engagement <= 15, `Expected engagement penalty <= 15, got ${score.engagement}`);
    assert.strictEqual(score.classification, 'High Sybil Risk');
  });

  it('should verify processTransactions and processTokenTransfers integration', () => {
    const rawTxs: EtherscanTransaction[] = [
      {
        blockNumber: '100',
        timeStamp: '1700000000',
        hash: '0xabc',
        nonce: '1',
        blockHash: '0x0',
        transactionIndex: '0',
        from: dummyAddress,
        to: '0xdef',
        value: '1000000000000000000',
        gas: '21000',
        gasPrice: '20000000000',
        isError: '0',
        txreceipt_status: '1',
        input: '0x095ea7b30000000000',
        contractAddress: '',
        cumulativeGasUsed: '21000',
        gasUsed: '21000',
        confirmations: '10',
        methodId: '0x095ea7b3',
        functionName: 'approve(address,uint256)',
      },
    ];

    const rawTransfers: EtherscanTokenTransfer[] = [
      {
        blockNumber: '100',
        timeStamp: '1700000000',
        hash: '0xabc',
        nonce: '1',
        blockHash: '0x0',
        from: dummyAddress,
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        to: '0xdef',
        value: '1000000',
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        tokenDecimal: '6',
        transactionIndex: '0',
        gas: '50000',
        gasPrice: '20000000000',
        gasUsed: '40000',
        cumulativeGasUsed: '40000',
        input: '0x',
        confirmations: '10',
      },
    ];

    const processedTxs = processTransactions(rawTxs, dummyAddress, 1, {});
    const processedTransfers = processTokenTransfers(rawTransfers, dummyAddress, 1, {});

    assert.strictEqual(processedTxs.length, 1);
    assert.strictEqual(processedTxs[0].category, 'approval');
    assert.strictEqual(processedTxs[0].chainId, 1);

    assert.strictEqual(processedTransfers.length, 1);
    assert.strictEqual(processedTransfers[0].direction, 'out');
    assert.strictEqual(processedTransfers[0].tokenSymbol, 'USDC');
  });
});
