import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { moralisBudgetPerFallbackChain, processWalletScan, summarizeAvailability } from './scanService';
import { ChainDataAvailability } from '@/lib/types';

function availability(overrides: Partial<ChainDataAvailability> = {}): ChainDataAvailability {
  return {
    chainId: 1,
    chainName: 'Ethereum',
    transactions: 'complete',
    tokenTransfers: 'complete',
    internalTransactions: 'complete',
    prices: 'complete',
    errors: [],
    ...overrides,
  };
}

describe('Scan availability aggregation', () => {
  it('keeps verified empty or populated complete datasets complete', () => {
    assert.strictEqual(summarizeAvailability([availability()]), 'complete');
  });

  it('marks one incomplete dataset as partial', () => {
    assert.strictEqual(
      summarizeAvailability([availability({ tokenTransfers: 'unavailable' })]),
      'partial',
    );
  });

  it('keeps core history complete when only historical prices are partial', () => {
    assert.strictEqual(summarizeAvailability([availability({ prices: 'partial' })]), 'complete');
  });

  it('partitions the scan-level Moralis budget across fallback chains', () => {
    assert.strictEqual(moralisBudgetPerFallbackChain(3000, 0), 3000);
    assert.strictEqual(moralisBudgetPerFallbackChain(3000, 1), 3000);
    assert.strictEqual(moralisBudgetPerFallbackChain(3000, 2), 1500);
    assert.strictEqual(moralisBudgetPerFallbackChain(3000, 5), 600);
  });

  it('marks a scan unavailable when every explorer dataset is unavailable', () => {
    assert.strictEqual(
      summarizeAvailability([
        availability({
          transactions: 'unavailable',
          tokenTransfers: 'unavailable',
          internalTransactions: 'unavailable',
        }),
      ]),
      'unavailable',
    );
  });

  it('preserves verified empty explorer results as a complete scan', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) {
        return new Response('[]', { status: 200 });
      }
      if (url.includes('api.etherscan.io') || url.includes('blockscout.com')) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 200 });
    });

    try {
      const result = await processWalletScan(
        '0x1111111111111111111111111111111111111111',
        [1],
      );
      assert.strictEqual(result.status, 'complete');
      assert.strictEqual(result.availability[0]?.transactions, 'complete');
      assert.strictEqual(result.availability[0]?.tokenTransfers, 'complete');
      assert.strictEqual(result.availability[0]?.internalTransactions, 'complete');
      assert.strictEqual(result.aggregated.worstChainRiskGrade, 'A');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('withholds risk conclusions when explorer data is unavailable', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('[]', { status: 200 }));

    try {
      const result = await processWalletScan(
        '0x2222222222222222222222222222222222222222',
        [999999],
      );
      assert.strictEqual(result.status, 'unavailable');
      assert.strictEqual(result.aggregated.worstChainRiskScore, null);
      assert.strictEqual(result.aggregated.worstChainRiskGrade, null);
      assert.ok(result.sybilReport);
      assert.strictEqual(result.metrics.blacklistStatus, 'clear');
      assert.strictEqual(result.availability[0]?.errors[0]?.code, 'unsupported_chain');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('withholds historical USD metrics without degrading complete history', async () => {
    const timestamp = '1600000000';
    const transaction = {
      blockNumber: '1',
      timeStamp: timestamp,
      hash: '0xprice-estimate',
      nonce: '0',
      blockHash: '0xblock',
      transactionIndex: '0',
      from: '0x5555555555555555555555555555555555555555',
      to: '0x6666666666666666666666666666666666666666',
      value: '1000000000000000000',
      gas: '21000',
      gasPrice: '1000000000',
      isError: '0',
      txreceipt_status: '1',
      input: '0x',
      contractAddress: '',
      cumulativeGasUsed: '21000',
      gasUsed: '21000',
      confirmations: '1',
      methodId: '0x',
      functionName: '',
    };
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('coins.llama.fi')) {
        return new Response(JSON.stringify({ coins: { 'coingecko:ethereum': { price: 3000 } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('api.coingecko.com')) return new Response('', { status: 503 });
      if (url.includes('action=txlistinternal') || url.includes('action=tokentx')) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), { status: 200 });
      }
      if (url.includes('action=txlist')) {
        return new Response(JSON.stringify({ status: '1', result: [transaction] }), { status: 200 });
      }
      return new Response('', { status: 503 });
    });

    try {
      const result = await processWalletScan(
        '0x5555555555555555555555555555555555555555',
        [1],
        'spot-estimate-test-key',
      );
      assert.strictEqual(result.status, 'complete');
      assert.strictEqual(result.availability[0]?.prices, 'partial');
      assert.strictEqual(result.aggregated.worstChainRiskScore, 0);
      assert.strictEqual(result.metrics.inflowUSD, null);
      assert.strictEqual(result.metrics.riskScore, 0);
      assert.notStrictEqual(result.metrics.sybilProbability, null);
      assert.strictEqual(result.sybilReport?.mediaScore?.monetaryIncluded, false);
      assert.strictEqual(result.metrics.activeDays, 1);
      assert.strictEqual(result.metrics.totalUnlimitedApprovals, 0);
      assert.notStrictEqual(result.metrics.blacklistStatus, 'unavailable');
      assert.strictEqual(result.aggregated.priceProvenance.spotEstimate > 0, true);
      assert.strictEqual(
        result.availability[0]?.errors.some(error => error.code === 'spot_estimate'),
        true,
      );
      assert.match(
        result.availability[0]?.errors.find(error => error.code === 'spot_estimate')?.message ?? '',
        /transaction or transfer valuations used current token prices/i,
      );
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('isolates historical price completeness by chain', async () => {
    const wallet = '0x7777777777777777777777777777777777777777';
    const ethereumTransaction = {
      blockNumber: '1', timeStamp: '1600000000', hash: '0xeth-price-gap', nonce: '0',
      blockHash: '0xblock', transactionIndex: '0', from: wallet,
      to: '0x6666666666666666666666666666666666666666', value: '1000000000000000000',
      gas: '21000', gasPrice: '1000000000', isError: '0', txreceipt_status: '1', input: '0x',
      contractAddress: '', cumulativeGasUsed: '21000', gasUsed: '21000', confirmations: '1',
      methodId: '0x', functionName: '',
    };
    const baseUsdcTransfer = {
      blockNumber: '1', timeStamp: '1600000000', hash: '0xbase-usdc', nonce: '0',
      blockHash: '0xblock', from: '0x6666666666666666666666666666666666666666',
      contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', to: wallet,
      value: '1000000', tokenName: 'USD Coin', tokenSymbol: 'USDC', tokenDecimal: '6',
      transactionIndex: '0', logIndex: '0', gas: '0', gasPrice: '0', gasUsed: '0',
      cumulativeGasUsed: '0', input: '0x', confirmations: '1',
    };

    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('raw.githubusercontent.com')) return new Response('', { status: 200 });
      if (url.includes('coins.llama.fi')) {
        return new Response(JSON.stringify({ coins: { 'coingecko:ethereum': { price: 3000 } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('api.coingecko.com')) return new Response('', { status: 503 });

      const action = new URL(url).searchParams.get('action');
      if (url.includes('api.etherscan.io') && action === 'txlist') {
        return new Response(JSON.stringify({ status: '1', result: [ethereumTransaction] }), { status: 200 });
      }
      if (url.includes('base.blockscout.com') && action === 'tokentx') {
        return new Response(JSON.stringify({ status: '1', result: [baseUsdcTransfer] }), { status: 200 });
      }
      if (action) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), { status: 200 });
      }
      return new Response('', { status: 503 });
    });

    try {
      const result = await processWalletScan(wallet, [1, 8453], 'cross-chain-price-test-key');
      assert.strictEqual(result.status, 'complete');
      assert.strictEqual(result.availability.find(item => item.chainId === 1)?.prices, 'partial');
      assert.strictEqual(result.availability.find(item => item.chainId === 8453)?.prices, 'complete');
    } finally {
      fetchMock.mock.restore();
    }
  });
});
