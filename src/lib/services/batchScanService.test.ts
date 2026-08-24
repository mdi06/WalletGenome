import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getClusterHistoryFailureReasons } from './batchScanService';
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
