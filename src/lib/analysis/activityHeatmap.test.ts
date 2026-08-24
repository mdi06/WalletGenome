import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ProcessedTransaction } from '../types';
import { aggregateActivityProfiles, analyzeActivityProfile } from './activityHeatmap';

function transaction(isoDate: string, hash: string): ProcessedTransaction {
  return {
    hash,
    timestamp: Date.parse(isoDate) / 1000,
    date: isoDate.slice(0, 10),
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '0',
    valueFormatted: 0,
    valueUSD: 0,
    valueUSDProvenance: 'historical',
    gasUsed: 0,
    gasPrice: 0,
    gasCostETH: 0,
    gasCostUSD: 0,
    gasCostUSDProvenance: 'historical',
    isError: false,
    methodId: '0x',
    functionName: 'transfer',
    category: 'transfer',
    chainId: 1,
  };
}

describe('Cross-chain UTC activity aggregation', () => {
  it('unions dates and derives peaks and streaks from the merged distribution', () => {
    const ethereum = analyzeActivityProfile([
      transaction('2026-01-05T10:00:00Z', '0x1'),
      transaction('2026-01-05T10:30:00Z', '0x2'),
      transaction('2026-01-06T11:00:00Z', '0x3'),
    ]);
    const arbitrum = analyzeActivityProfile([
      transaction('2026-01-05T10:45:00Z', '0x4'),
      transaction('2026-01-07T10:00:00Z', '0x5'),
      transaction('2026-01-07T10:10:00Z', '0x6'),
      transaction('2026-01-07T10:20:00Z', '0x7'),
      transaction('2026-01-07T10:30:00Z', '0x8'),
    ]);

    const combined = aggregateActivityProfiles([ethereum, arbitrum]);

    assert.deepStrictEqual(combined.activeDates, ['2026-01-05', '2026-01-06', '2026-01-07']);
    assert.strictEqual(combined.totalActiveDays, 3);
    assert.strictEqual(combined.mostActiveDay, 'Wednesday');
    assert.strictEqual(combined.mostActiveHour, 10);
    assert.strictEqual(combined.longestStreakDays, 3);
    assert.strictEqual(combined.currentStreakDays, 3);
    assert.strictEqual(combined.avgTxsPerActiveDay, 8 / 3);
    assert.strictEqual(combined.heatmap.find(cell => cell.day === 3 && cell.hour === 10)?.count, 4);
  });

  it('returns an explicit empty profile when no chain has activity', () => {
    const combined = aggregateActivityProfiles([]);

    assert.strictEqual(combined.totalActiveDays, 0);
    assert.strictEqual(combined.mostActiveDay, 'N/A');
    assert.strictEqual(combined.longestStreakDays, 0);
    assert.strictEqual(combined.currentStreakDays, 0);
    assert.strictEqual(combined.heatmap.length, 168);
  });
});
