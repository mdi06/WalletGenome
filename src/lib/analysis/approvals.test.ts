import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { analyzeApprovals } from './approvals';
import { EtherscanTokenTransfer, ProcessedTransaction } from '../types';
import { batchFetchPrices } from '../prices';

const wallet = '0x1234567890123456789012345678901234567890';
const spender = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';
const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const unknownToken = '0x9999999999999999999999999999999999999999';
const uni = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

function approvalInput(amount: bigint): string {
  return `0x095ea7b3${'0'.repeat(24)}${spender.slice(2)}${amount.toString(16).padStart(64, '0')}`;
}

function approval(tokenAddress: string, amount: bigint, timestamp: number): ProcessedTransaction {
  return {
    hash: `0xapproval${timestamp}`,
    timestamp,
    date: '2026-08-23',
    from: wallet,
    to: tokenAddress,
    value: '0',
    valueFormatted: 0,
    valueUSD: 0,
    valueUSDProvenance: 'historical',
    gasUsed: 50_000,
    gasPrice: 1,
    gasCostETH: 0.0001,
    gasCostUSD: 0.3,
    gasCostUSDProvenance: 'historical',
    isError: false,
    methodId: '0x095ea7b3',
    functionName: 'approve',
    input: approvalInput(amount),
    category: 'approval',
    chainId: 1,
  };
}

function transfer(
  tokenAddress: string,
  from: string,
  to: string,
  rawValue: string,
  symbol: string = 'USDC',
  decimals: string = '6',
): EtherscanTokenTransfer {
  return {
    blockNumber: '1',
    timeStamp: '1700000000',
    hash: `0xtransfer${rawValue}${from.slice(-2)}`,
    nonce: '0',
    blockHash: '0xblock',
    from,
    contractAddress: tokenAddress,
    to,
    value: rawValue,
    tokenName: symbol,
    tokenSymbol: symbol,
    tokenDecimal: decimals,
    transactionIndex: '0',
    gas: '0',
    gasPrice: '0',
    gasUsed: '0',
    cumulativeGasUsed: '0',
    input: '0x',
    confirmations: '1',
  };
}

describe('Approval exposure analysis', () => {
  it('lets a newer revoke suppress an older unlimited approval', () => {
    const summary = analyzeApprovals([
      approval(usdc, (BigInt(1) << BigInt(256)) - BigInt(1), 100),
      approval(usdc, BigInt(0), 200),
    ], [transfer(usdc, spender, wallet, '100000000')], wallet, 1);

    assert.strictEqual(summary.totalApprovals, 0);
    assert.strictEqual(summary.unlimitedCount, 0);
    assert.strictEqual(summary.totalExposureUSD, 0);
  });

  it('caps finite approval exposure at the decoded allowance', () => {
    const summary = analyzeApprovals([
      approval(usdc, BigInt(30_000_000), 100),
    ], [transfer(usdc, spender, wallet, '100000000')], wallet, 1);
    const item = summary.activeApprovals[0];

    assert.strictEqual(item.isUnlimited, false);
    assert.strictEqual(item.allowanceAmount, 30);
    assert.strictEqual(item.estimatedTokenBalance, 100);
    assert.strictEqual(item.estimatedExposureUSD, 30);
    assert.strictEqual(item.exposureStatus, 'estimated');
    assert.strictEqual(summary.totalExposureUSD, 30);
  });

  it('uses the priced positive balance for an unlimited approval', () => {
    const summary = analyzeApprovals([
      approval(usdc, (BigInt(1) << BigInt(256)) - BigInt(1), 100),
    ], [transfer(usdc, spender, wallet, '100000000')], wallet, 1);
    const item = summary.activeApprovals[0];

    assert.strictEqual(item.isUnlimited, true);
    assert.strictEqual(item.estimatedExposureUSD, 100);
    assert.strictEqual(item.estimatedExposureUSDProvenance, 'stablecoin_assumption');
    assert.strictEqual(summary.exposureStatus, 'complete');
  });

  it('uses the current spot quote instead of a transfer-time historical quote', async () => {
    const timestamp = 1_700_000_000;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('coins.llama.fi')) {
        return new Response(JSON.stringify({
          coins: { 'coingecko:uniswap': { price: 25 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ prices: [[timestamp * 1000, 5]] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      await batchFetchPrices([{ coingeckoId: 'uniswap', timestamp }]);
      const summary = analyzeApprovals([
        approval(uni, (BigInt(1) << BigInt(256)) - BigInt(1), 100),
      ], [transfer(uni, spender, wallet, '1000000000000000000', 'UNI', '18')], wallet, 1);

      assert.strictEqual(summary.activeApprovals[0]?.estimatedExposureUSD, 25);
      assert.strictEqual(summary.activeApprovals[0]?.estimatedExposureUSDProvenance, 'spot_estimate');
      assert.strictEqual(summary.totalExposureUSDProvenance.status, 'complete');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('keeps unpriced positive balances unavailable instead of zero', () => {
    const summary = analyzeApprovals([
      approval(unknownToken, (BigInt(1) << BigInt(256)) - BigInt(1), 100),
    ], [transfer(unknownToken, spender, wallet, '100000000000000000000', 'ZZQ', '18')], wallet, 1);
    const item = summary.activeApprovals[0];

    assert.strictEqual(item.estimatedTokenBalance, 100);
    assert.strictEqual(item.estimatedExposureUSD, null);
    assert.strictEqual(item.estimatedExposureUSDProvenance, 'unpriced');
    assert.strictEqual(item.exposureStatus, 'unavailable');
    assert.strictEqual(summary.totalExposureUSD, null);
    assert.strictEqual(summary.exposureStatus, 'partial');
  });

  it('reports an active approval with a zero balance separately from unavailable pricing', () => {
    const summary = analyzeApprovals([
      approval(usdc, (BigInt(1) << BigInt(256)) - BigInt(1), 100),
    ], [
      transfer(usdc, spender, wallet, '100000000'),
      transfer(usdc, wallet, spender, '100000000'),
    ], wallet, 1);
    const item = summary.activeApprovals[0];

    assert.strictEqual(item.estimatedTokenBalance, 0);
    assert.strictEqual(item.estimatedExposureUSD, 0);
    assert.strictEqual(item.exposureStatus, 'zero_balance');
    assert.strictEqual(summary.totalExposureUSD, 0);
    assert.strictEqual(summary.exposureStatus, 'complete');
  });
});
