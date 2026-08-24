import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SybilRadar from './SybilRadar';
import { SybilReport } from '@/lib/types';

const report: SybilReport = {
  isFlagged: true,
  totalFlagged: 1,
  overallStatus: 'flagged',
  matches: [
    {
      databaseId: 'ofac',
      databaseName: 'OFAC Sanctions',
      flagged: true,
      severity: 'critical',
      details: 'Fixture match',
      sourceUrl: 'https://ofac.treasury.gov/',
    },
    {
      databaseId: 'trusta',
      databaseName: 'Trusta MEDIA',
      flagged: false,
      severity: 'clean',
      details: 'Low behavioral probability',
      sourceUrl: 'https://example.com/',
    },
  ],
  lastSyncDate: '2026-08-23',
  totalDatabasesChecked: 2,
  mediaScore: {
    monetary: 90,
    engagement: 90,
    diversity: 90,
    identity: 90,
    age: 90,
    compositeScore: 88,
    sybilProbability: 12,
    monetaryIncluded: true,
    classification: 'Organic Human',
    explanation: 'Organic-like behavioral fixture.',
  },
};

describe('Sybil and blacklist precedence', () => {
  it('lets a positive blacklist match override an organic behavioral headline', () => {
    const markup = renderToStaticMarkup(createElement(SybilRadar, { report }));

    assert.match(markup, /Blacklist Match/);
    assert.match(markup, /12%/);
    assert.match(markup, /separate secondary heuristic/);
    assert.doesNotMatch(markup, />Organic Human</);
  });

  it('shows blacklist checks while marking the gated behavioral model unavailable', () => {
    const withoutBehavior: SybilReport = {
      ...report,
      isFlagged: false,
      totalFlagged: 0,
      overallStatus: 'clean',
      matches: report.matches.map(match => ({ ...match, flagged: false, severity: 'clean' })),
      mediaScore: undefined,
    };
    const markup = renderToStaticMarkup(createElement(SybilRadar, { report: withoutBehavior }));

    assert.match(markup, /OFAC Sanctions[\s\S]*CLEAN/);
    assert.match(markup, /Behavioral Score Unavailable/);
    assert.match(markup, /Trusta MEDIA[\s\S]*UNAVAILABLE/);
  });
});
