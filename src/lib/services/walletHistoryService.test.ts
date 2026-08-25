import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DataSourceResult, EtherscanTransaction } from '@/lib/types';
import { fetchWalletHistorySources, WalletHistorySources } from './walletHistoryService';

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
});
