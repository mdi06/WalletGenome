import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeBehavioralFingerprint } from './behavioralFingerprint';
import { ProcessedTransaction } from '../types';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

function transaction(timestamp: number, index: number): ProcessedTransaction {
  return {
    hash: `0x${index.toString(16).padStart(64, '0')}`,
    timestamp,
    date: new Date(timestamp * 1000).toISOString(),
    from: WALLET,
    to: '0x0000000000000000000000000000000000000001',
    value: '0',
    valueFormatted: 0,
    valueUSD: null,
    valueUSDProvenance: 'unpriced',
    gasUsed: 21_000,
    gasPrice: 1,
    gasCostETH: 0,
    gasCostUSD: null,
    gasCostUSDProvenance: 'unpriced',
    isError: false,
    methodId: '',
    functionName: '',
    category: 'transfer',
    chainId: 1,
  };
}

describe('Behavioral fingerprint high-volume history', () => {
  it('computes timestamp bounds without overflowing the JavaScript call stack', () => {
    const firstTimestamp = 1_600_000_000;
    const transactions = Array.from(
      { length: 150_000 },
      (_, index) => transaction(firstTimestamp + index, index),
    );

    const fingerprint = analyzeBehavioralFingerprint(transactions, [], WALLET);

    assert.equal(fingerprint.firstActivityDate, '2020-09-13');
    assert.equal(fingerprint.lastActivityDate, '2020-09-15');
    assert.equal(fingerprint.activeMonths, 1);
  });
});
