import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyTargetAccounts, getClusterHistoryFailureReasons, processBatchScan } from './batchScanService';
import type { ChainDataAvailability } from '@/lib/types';

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

describe('Cluster scan eligibility', () => {
  it('classifies every selected chain before cluster history is fetched', async () => {
    const checked: number[] = [];
    const classifications = await classifyTargetAccounts(
      '0x1234567890123456789012345678901234567890',
      [1, 8453, 42161],
      {
        classifier: async chainId => {
          checked.push(chainId);
          return {
            address: '0x1234567890123456789012345678901234567890',
            chainId,
            chainName: chainId === 1 ? 'Ethereum' : chainId === 8453 ? 'Base' : 'Arbitrum',
            type: chainId === 42161 ? 'regular_contract' : 'eoa',
            confidence: 'verified',
            evidence: 'test',
          };
        },
      },
    );

    assert.deepStrictEqual(classifications.map(item => item.type), ['eoa', 'eoa', 'regular_contract']);
    assert.deepStrictEqual(checked.sort((left, right) => left - right), [1, 8453, 42161]);
  });

  it('rejects unsupported account classes before starting the expensive wallet scan', async () => {
    const result = await processBatchScan(
      ['0x1234567890123456789012345678901234567890'],
      [42161],
      {
        classifier: async (chainId, address) => ({
          address,
          chainId,
          chainName: 'Arbitrum',
          type: 'smart_account',
          confidence: 'verified',
          evidence: 'test smart-account signal',
        }),
      },
    );

    assert.equal(result.totalWallets, 0);
    assert.equal(result.failedWallets.length, 1);
    assert.match(result.failedWallets[0]?.reasons[0]?.message ?? '', /Smart account on Arbitrum \(chain 42161\)/i);
  });

  it('accepts complete wallet history when prices are incomplete', () => {
    const reasons = getClusterHistoryFailureReasons({
      status: 'complete',
      availability: [availability({
        prices: 'unavailable',
        errors: [{ source: 'prices', code: 'unpriced', message: 'No historical price.' }],
      })],
    });

    assert.strictEqual(reasons, null);
  });

  it('rejects incomplete wallet history without presenting price gaps as the cause', () => {
    const reasons = getClusterHistoryFailureReasons({
      status: 'partial',
      availability: [availability({
        transactions: 'partial',
        prices: 'unavailable',
        errors: [
          { source: 'transactions', code: 'timeout', message: 'Explorer timed out.' },
          { source: 'prices', code: 'unpriced', message: 'No historical price.' },
        ],
      })],
    });

    assert.deepStrictEqual(reasons, [
      { source: 'transactions', code: 'timeout', message: 'Explorer timed out.' },
    ]);
  });
});
