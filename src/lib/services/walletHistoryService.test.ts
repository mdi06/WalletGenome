import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
  DataSourceResult,
  EtherscanInternalTransaction,
  EtherscanTokenTransfer,
  EtherscanTransaction,
} from '@/lib/types';
import { fetchExplorerHistorySources, fetchWalletHistorySources, WalletHistorySources } from './walletHistoryService';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

function complete<T>(data: T[] = []): DataSourceResult<T> {
  return { data, status: 'complete', errors: [] };
}

function unavailable<T>(): DataSourceResult<T> {
  return {
    data: [],
    status: 'unavailable',
    errors: [{ code: 'provider_error', message: 'Explorer unavailable.' }],
  };
}

function transaction(hash: string): EtherscanTransaction {
  return {
    blockNumber: '1',
    timeStamp: '1',
    hash,
    nonce: '0',
    blockHash: '0xblock',
    transactionIndex: '0',
    from: WALLET,
    to: '0x0000000000000000000000000000000000000001',
    value: '1',
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

function completeExplorerHistory(): WalletHistorySources {
  return {
    transactions: complete([transaction('0xexplorer')]),
    tokenTransfers: complete(),
    internalTransactions: complete(),
  };
}

function tokenTransfer(hash: string): EtherscanTokenTransfer {
  return {
    blockNumber: '2',
    timeStamp: '2',
    hash,
    nonce: '0',
    blockHash: '0xtoken-block',
    from: '0x0000000000000000000000000000000000000001',
    contractAddress: '0x0000000000000000000000000000000000000002',
    to: WALLET,
    value: '100',
    tokenName: 'USD Coin',
    tokenSymbol: 'USDC',
    tokenDecimal: '6',
    transactionIndex: '0',
    logIndex: '0',
    gas: '0',
    gasPrice: '0',
    gasUsed: '0',
    cumulativeGasUsed: '0',
    input: '0x',
    confirmations: '1',
  };
}

function internalTransaction(hash: string): EtherscanInternalTransaction {
  return {
    blockNumber: '3',
    timeStamp: '3',
    hash,
    from: WALLET,
    to: '0x0000000000000000000000000000000000000003',
    value: '42',
    contractAddress: '',
    input: '0x',
    type: 'call',
    gas: '21000',
    gasUsed: '21000',
    traceId: '0',
    isError: '0',
    errCode: '',
  };
}

function incompleteExplorerHistory(): WalletHistorySources {
  return {
    transactions: unavailable(),
    tokenTransfers: unavailable(),
    internalTransactions: unavailable(),
  };
}

describe('wallet-history provider orchestration', () => {
  it('never calls Moralis when every explorer dataset is complete', async () => {
    let moralisCalls = 0;
    const unexpectedMoralisCall = async () => {
      moralisCalls += 1;
      return complete<EtherscanTransaction>();
    };

    const result = await fetchWalletHistorySources(WALLET, 1, '', {
      explorerFetcher: async () => completeExplorerHistory(),
      moralisTransactionsFetcher: unexpectedMoralisCall,
      moralisTokenTransfersFetcher: async () => {
        moralisCalls += 1;
        return null;
      },
      moralisInternalTransactionsFetcher: async () => {
        moralisCalls += 1;
        return null;
      },
    });

    assert.equal(moralisCalls, 0);
    assert.equal(result.transactions.data[0]?.hash, '0xexplorer');
  });

  it('calls only the Moralis dataset whose explorer result is incomplete', async () => {
    const calls = { transactions: 0, tokens: 0, internals: 0 };
    const result = await fetchWalletHistorySources(WALLET, 56, '', {
      explorerFetcher: async () => ({
        transactions: unavailable(),
        tokenTransfers: complete(),
        internalTransactions: complete(),
      }),
      moralisTransactionsFetcher: async () => {
        calls.transactions += 1;
        return complete([transaction('0xmoralis')]);
      },
      moralisTokenTransfersFetcher: async () => {
        calls.tokens += 1;
        return null;
      },
      moralisInternalTransactionsFetcher: async () => {
        calls.internals += 1;
        return null;
      },
    });

    assert.deepEqual(calls, { transactions: 1, tokens: 0, internals: 0 });
    assert.equal(result.transactions.status, 'complete');
    assert.equal(result.transactions.data[0]?.hash, '0xmoralis');
  });

  it('merges and deduplicates partial explorer and Moralis evidence truthfully', async () => {
    const result = await fetchWalletHistorySources(WALLET, 1, '', {
      explorerFetcher: async () => ({
        transactions: {
          data: [transaction('0xshared'), transaction('0xexplorer-only')],
          status: 'partial',
          errors: [{ code: 'result_truncated', message: 'Explorer stopped early.' }],
        },
        tokenTransfers: complete(),
        internalTransactions: complete(),
      }),
      moralisTransactionsFetcher: async () => ({
        data: [transaction('0xshared'), transaction('0xmoralis-only')],
        status: 'partial',
        errors: [{ code: 'quota_exhausted', message: 'Fallback CU budget reached.' }],
      }),
    });

    assert.equal(result.transactions.status, 'partial');
    assert.deepEqual(
      result.transactions.data.map(item => item.hash),
      ['0xshared', '0xexplorer-only', '0xmoralis-only'],
    );
    assert.deepEqual(
      result.transactions.errors.map(error => error.code),
      ['result_truncated', 'quota_exhausted'],
    );
  });

  it('runs Moralis fallbacks sequentially in transaction, token, then internal priority order', async () => {
    const calls: string[] = [];
    let releaseTransactions: (() => void) | undefined;
    let releaseTokens: (() => void) | undefined;
    const transactionsGate = new Promise<void>(resolve => { releaseTransactions = resolve; });
    const tokensGate = new Promise<void>(resolve => { releaseTokens = resolve; });

    const resultPromise = fetchWalletHistorySources(WALLET, 8453, '', {
      explorerFetcher: async () => ({
        transactions: unavailable(),
        tokenTransfers: unavailable(),
        internalTransactions: unavailable(),
      }),
      moralisTransactionsFetcher: async () => {
        calls.push('transactions');
        await transactionsGate;
        return complete<EtherscanTransaction>();
      },
      moralisTokenTransfersFetcher: async () => {
        calls.push('tokens');
        await tokensGate;
        return complete();
      },
      moralisInternalTransactionsFetcher: async () => {
        calls.push('internals');
        return complete();
      },
    });

    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ['transactions']);

    releaseTransactions?.();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ['transactions', 'tokens']);

    releaseTokens?.();
    const result = await resultPromise;
    assert.deepEqual(calls, ['transactions', 'tokens', 'internals']);
    assert.equal(result.transactions.status, 'complete');
    assert.equal(result.tokenTransfers.status, 'complete');
    assert.equal(result.internalTransactions.status, 'complete');
  });

  it('reuses each complete explorer dataset independently', async () => {
    const cacheWallet = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    let failProvider = false;
    const providerCalls: string[] = [];
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('etherscan') || url.includes('blockscout')) {
        providerCalls.push(url);
        if (failProvider) return new Response('', { status: 503 });
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 503 });
    });

    try {
      const first = await fetchExplorerHistorySources(cacheWallet, 1, '');
      const firstCallCount = providerCalls.length;
      failProvider = true;
      const second = await fetchExplorerHistorySources(cacheWallet, 1, '');
      assert.equal(firstCallCount, 3);
      assert.equal(providerCalls.length, firstCallCount);
      assert.equal(first.transactions.status, 'complete');
      assert.equal(second.transactions.status, 'complete');
      assert.equal(first.cacheMetadata?.datasets.transactions?.source, 'live');
      assert.equal(second.cacheMetadata?.datasets.transactions?.source, 'memory');
      assert.equal(typeof second.cacheMetadata?.datasets.transactions?.fetchedAt, 'number');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('replaces all explorer dataset caches on refresh and preserves them after a failed refresh', async () => {
    const cacheWallet = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    let stage: 'empty' | 'fresh' | 'failed' = 'empty';
    const providerCalls: string[] = [];
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (!url.includes('etherscan') && !url.includes('blockscout') && !url.includes('routescan')) {
        return new Response('', { status: 503 });
      }
      providerCalls.push(url);
      if (stage === 'failed') return new Response('', { status: 503 });

      const action = new URL(url).searchParams.get('action');
      const result = stage === 'empty'
        ? []
        : action === 'txlist'
          ? [transaction('0xexplorer-refresh')]
          : action === 'tokentx'
            ? [tokenTransfer('0xexplorer-token-refresh')]
            : [internalTransaction('0xexplorer-internal-refresh')];
      return new Response(JSON.stringify({ status: result.length > 0 ? '1' : '0', message: result.length > 0 ? 'OK' : 'No transactions found', result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      const cacheOptions = { cacheReadEnabled: true, cacheWriteEnabled: true } as const;
      const initial = await fetchExplorerHistorySources(cacheWallet, 1, '', cacheOptions);
      assert.equal(initial.transactions.data.length, 0);
      assert.equal(initial.tokenTransfers.data.length, 0);
      assert.equal(initial.internalTransactions.data.length, 0);
      const initialCallCount = providerCalls.length;

      stage = 'fresh';
      const refreshed = await fetchExplorerHistorySources(cacheWallet, 1, '', {
        cacheReadEnabled: false,
        cacheWriteEnabled: true,
      });
      assert.equal(providerCalls.length, initialCallCount + 3);
      assert.equal(refreshed.transactions.data[0]?.hash, '0xexplorer-refresh');
      assert.equal(refreshed.tokenTransfers.data[0]?.hash, '0xexplorer-token-refresh');
      assert.equal(refreshed.internalTransactions.data[0]?.hash, '0xexplorer-internal-refresh');

      stage = 'failed';
      await fetchExplorerHistorySources(cacheWallet, 1, '', {
        cacheReadEnabled: false,
        cacheWriteEnabled: true,
      });
      const callsAfterFailedRefresh = providerCalls.length;

      const later = await fetchExplorerHistorySources(cacheWallet, 1, '', cacheOptions);
      assert.equal(providerCalls.length, callsAfterFailedRefresh);
      assert.equal(later.transactions.data[0]?.hash, '0xexplorer-refresh');
      assert.equal(later.tokenTransfers.data[0]?.hash, '0xexplorer-token-refresh');
      assert.equal(later.internalTransactions.data[0]?.hash, '0xexplorer-internal-refresh');
      assert.equal(later.cacheMetadata?.datasets.transactions?.source, 'memory');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('replaces all Moralis fallback dataset caches on refresh', async () => {
    const cacheWallet = '0xcccccccccccccccccccccccccccccccccccccccc';
    let stage: 'empty' | 'fresh' | 'failed' = 'empty';
    const calls = { transactions: 0, tokens: 0, internals: 0 };
    const makeOptions = (cacheReadEnabled: boolean, cacheWriteEnabled: boolean) => ({
      explorerFetcher: async () => incompleteExplorerHistory(),
      cacheReadEnabled,
      cacheWriteEnabled,
      moralisTransactionsFetcher: async (): Promise<DataSourceResult<EtherscanTransaction>> => {
        calls.transactions += 1;
        return stage === 'failed' ? unavailable() : complete(stage === 'empty' ? [] : [transaction('0xmoralis-refresh')]);
      },
      moralisTokenTransfersFetcher: async (): Promise<DataSourceResult<EtherscanTokenTransfer>> => {
        calls.tokens += 1;
        return stage === 'failed' ? unavailable() : complete(stage === 'empty' ? [] : [tokenTransfer('0xmoralis-token-refresh')]);
      },
      moralisInternalTransactionsFetcher: async (): Promise<DataSourceResult<EtherscanInternalTransaction>> => {
        calls.internals += 1;
        return stage === 'failed' ? unavailable() : complete(stage === 'empty' ? [] : [internalTransaction('0xmoralis-internal-refresh')]);
      },
    });

    const initial = await fetchWalletHistorySources(cacheWallet, 1, '', makeOptions(true, true));
    assert.equal(initial.transactions.data.length, 0);
    assert.equal(initial.tokenTransfers.data.length, 0);
    assert.equal(initial.internalTransactions.data.length, 0);
    assert.deepEqual(calls, { transactions: 1, tokens: 1, internals: 1 });

    stage = 'fresh';
    const refreshed = await fetchWalletHistorySources(cacheWallet, 1, '', makeOptions(false, true));
    assert.equal(refreshed.transactions.data[0]?.hash, '0xmoralis-refresh');
    assert.equal(refreshed.tokenTransfers.data[0]?.hash, '0xmoralis-token-refresh');
    assert.equal(refreshed.internalTransactions.data[0]?.hash, '0xmoralis-internal-refresh');
    assert.deepEqual(calls, { transactions: 2, tokens: 2, internals: 2 });

    stage = 'failed';
    await fetchWalletHistorySources(cacheWallet, 1, '', makeOptions(false, true));
    const callsAfterFailedRefresh = { ...calls };

    const later = await fetchWalletHistorySources(cacheWallet, 1, '', makeOptions(true, true));
    assert.deepEqual(calls, callsAfterFailedRefresh);
    assert.equal(later.transactions.data[0]?.hash, '0xmoralis-refresh');
    assert.equal(later.tokenTransfers.data[0]?.hash, '0xmoralis-token-refresh');
    assert.equal(later.internalTransactions.data[0]?.hash, '0xmoralis-internal-refresh');
    assert.equal(later.cacheMetadata?.datasets.transactions?.source, 'memory');
  });
});
