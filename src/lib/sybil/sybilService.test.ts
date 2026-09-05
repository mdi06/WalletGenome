import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { checkSybilStatus } from './sybilService';
import type { MediaScoreBreakdown } from '@/lib/types';

const ARBITRUM_SAMPLES = [
  { address: '0x1ddbf60792aac896aed180eaa6810fccd7839ada', cluster: 319 },
  { address: '0xc7bb9b943fd2a04f651cc513c17eb5671b90912d', cluster: 1544 },
  { address: '0x3fb4c01b5ceecf307010f84c9a858aeaeab0b9fa', cluster: 2554 },
  { address: '0x15bc18bb8c378c94c04795d72621957497130400', cluster: 3316 },
] as const;

function mediaScore(sybilProbability: number): MediaScoreBreakdown {
  return {
    monetary: 100,
    engagement: 100,
    diversity: 100,
    identity: 100,
    age: 100,
    compositeScore: 100 - sybilProbability,
    sybilProbability,
    monetaryIncluded: true,
    classification: sybilProbability > 55 ? 'High Sybil Risk' : 'Organic Human',
    explanation: 'Test behavioral score.',
  };
}

describe('Arbitrum Foundation Sybil samples', () => {
  it('flags all four published sample addresses with their published clusters', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('', { status: 200 }));

    try {
      for (const sample of ARBITRUM_SAMPLES) {
        const report = await checkSybilStatus(sample.address, mediaScore(0));
        const match = report.matches.find(item => item.databaseId === 'arbitrumFoundation');

        assert.ok(match);
        assert.equal(match.flagged, true);
        assert.equal(match.severity, 'critical');
        assert.equal(match.matchedReason, `Arbitrum Foundation Cluster ${sample.cluster}`);
        assert.match(match.details, new RegExp(`Cluster ${sample.cluster}`));
      }
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('keeps the Cluster 3316 match independent from behavioral scoring', async () => {
    const sample = ARBITRUM_SAMPLES[3];
    const report = await checkSybilStatus(sample.address, mediaScore(0));

    assert.equal(report.matches.find(item => item.databaseId === 'arbitrumFoundation')?.flagged, true);
    assert.equal(report.overallStatus, 'flagged');
  });
});
