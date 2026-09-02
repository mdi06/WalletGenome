import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { moralisBudgetPerFallbackChain, processWalletScan, summarizeAvailability } from './scanService';
import { scanResultCache, sharedCache } from '@/lib/cache';
import { ChainDataAvailability, EtherscanTransaction } from '@/lib/types';

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

function scanTransaction(wallet: string, hash: string): EtherscanTransaction {
  return {
    blockNumber: '10',
    timeStamp: '1700000000',
    hash,
    nonce: '0',
    blockHash: '0xscan-block',
    transactionIndex: '0',
    from: wallet,
    to: '0x0000000000000000000000000000000000000001',
    value: '0',
    gas: '21000',
    gasPrice: '1',
    isError: '0',
    txreceipt_status: '1',
    input: '0x',
    contractAddress: '',
    cumulativeGasUsed: '21000',
    gasUsed: '21000',
    confirmations: '1',
    methodId: '',
    functionName: '',
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

  it('coalesces simultaneous identical scans into one provider operation', async () => {
    const wallet = '0x8888888888888888888888888888888888888888';
    let explorerCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.etherscan.io') || url.includes('blockscout.com')) {
        explorerCalls += 1;
        await new Promise<void>(resolve => setImmediate(resolve));
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      return new Response('', { status: 503 });
    });

    try {
      const [first, second] = await Promise.all([
        processWalletScan(wallet, [1], 'coalescing-test-key'),
        processWalletScan(wallet, [1], 'coalescing-test-key'),
      ]);
      assert.equal(explorerCalls, 3);
      assert.equal(first.status, 'complete');
      assert.equal(second.status, 'complete');
      assert.equal(first.cached, undefined);
      assert.equal(second.cached, undefined);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('marks a reused report with its original fetch time', async () => {
    const wallet = '0x9999999999999999999999999999999999999998';
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.etherscan.io') || url.includes('blockscout.com')) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      return new Response('', { status: 503 });
    });

    try {
      const first = await processWalletScan(wallet, [1]);
      const second = await processWalletScan(wallet, [1]);
      assert.equal(first.cached, undefined);
      assert.equal(second.cached, true);
      assert.equal(second.cacheMetadata?.source, 'memory');
      assert.equal(second.cacheMetadata?.fetchedAt, first.cacheMetadata?.fetchedAt);
      assert.equal(second.cacheMetadata?.historyDatasets?.length, 3);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('bypasses cached history datasets during a forced refresh', async () => {
    const wallet = '0x9999999999999999999999999999999999999997';
    let explorerCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.etherscan.io') || url.includes('blockscout.com')) {
        explorerCalls += 1;
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      return new Response('', { status: 503 });
    });

    try {
      await processWalletScan(wallet, [1]);
      assert.equal(explorerCalls, 3);

      await processWalletScan(wallet, [1], '', false, { forceRefresh: true });
      assert.equal(explorerCalls, 6);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('uses refreshed explorer history after the report cache expires', async () => {
    const wallet = '0x9999999999999999999999999999999999999996';
    const realDateNow = Date.now.bind(Date);
    const initialTime = realDateNow();
    let timeOffset = 0;
    let stage: 'empty' | 'fresh' | 'failed' = 'empty';
    let explorerCalls = 0;
    const dateNowMock = mock.method(Date, 'now', () => realDateNow() + timeOffset);
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('api.etherscan.io') || url.includes('blockscout.com') || url.includes('routescan.io')) {
        explorerCalls += 1;
        if (stage === 'failed') return new Response('', { status: 503 });
        const action = new URL(url).searchParams.get('action');
        const result = stage === 'fresh' && action === 'txlist'
          ? [scanTransaction(wallet, '0xscan-refresh')]
          : [];
        return new Response(JSON.stringify({
          status: result.length > 0 ? '1' : '0',
          message: result.length > 0 ? 'OK' : 'No transactions found',
          result,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 503 });
    });

    try {
      const initial = await processWalletScan(wallet, [1]);
      assert.equal(initial.aggregated.totalTransactions, 0);
      const initialCalls = explorerCalls;

      timeOffset = (initial.cacheMetadata?.fetchedAt ?? initialTime) + 1_000 - realDateNow();
      stage = 'fresh';
      const refreshed = await processWalletScan(wallet, [1], '', false, { forceRefresh: true });
      assert.equal(refreshed.aggregated.totalTransactions, 1);
      assert.equal(explorerCalls, initialCalls + 3);

      timeOffset = (refreshed.cacheMetadata?.fetchedAt ?? initialTime) + 301_001 - realDateNow();
      stage = 'failed';
      const later = await processWalletScan(wallet, [1]);
      assert.equal(later.aggregated.totalTransactions, 1);
      assert.equal(explorerCalls, initialCalls + 3);
      assert.equal(later.cached, undefined);
    } finally {
      fetchMock.mock.restore();
      dateNowMock.mock.restore();
    }
  });

  it('does not extend a report when it is copied from shared cache locally', async () => {
    const wallet = '0x9999999999999999999999999999999999999995';
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const remoteStore = new Map<string, string>();
    const realDateNow = Date.now.bind(Date);
    const initialTime = realDateNow();
    let timeOffset = 0;
    let providerCalls = 0;
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const dateNowMock = mock.method(Date, 'now', () => realDateNow() + timeOffset);
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://redis.example.test') {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[0] === 'SET') {
          remoteStore.set(command[1], command[2]);
          return Response.json({ result: 'OK' });
        }
        if (command[0] === 'GET') return Response.json({ result: remoteStore.get(command[1]) ?? null });
        if (command[0] === 'INCRBY') return Response.json({ result: 1 });
        return Response.json({ result: 1 });
      }
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('api.etherscan.io') || url.includes('blockscout.com') || url.includes('routescan.io')) {
        providerCalls += 1;
        const result: never[] = [];
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 503 });
    });

    try {
      const first = await processWalletScan(wallet, [1]);
      assert.equal(first.cached, undefined);
      const reportKey = `wallet-analytics:report:v2:${wallet}:1`;
      scanResultCache.delete(reportKey);
      sharedCache.clearLocal();

      const fetchedAt = first.cacheMetadata?.fetchedAt ?? initialTime;
      timeOffset = fetchedAt + 299_000 - realDateNow();
      const firstSharedRead = await processWalletScan(wallet, [1]);
      assert.equal(firstSharedRead.cached, true);
      assert.equal(firstSharedRead.cacheMetadata?.source, 'shared');
      const callsAfterSharedRead = providerCalls;

      timeOffset = fetchedAt + 299_500 - realDateNow();
      const secondSharedRead = await processWalletScan(wallet, [1]);
      assert.equal(secondSharedRead.cached, true);
      assert.equal(providerCalls, callsAfterSharedRead);

      timeOffset = fetchedAt + 300_000 - realDateNow();
      const atExactExpiry = await processWalletScan(wallet, [1]);
      assert.equal(atExactExpiry.cached, undefined);
      assert.ok((atExactExpiry.cacheMetadata?.fetchedAt ?? 0) >= fetchedAt + 300_000);
      assert.equal(providerCalls, callsAfterSharedRead);
    } finally {
      fetchMock.mock.restore();
      dateNowMock.mock.restore();
      sharedCache.clearLocal();
      if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
      if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    }
  });
});
