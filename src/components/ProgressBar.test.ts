import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProgressBar from './ProgressBar';

describe('scan progress panel', () => {
  it('shows honest live scan evidence for only the selected chains', () => {
    const markup = renderToStaticMarkup(createElement(ProgressBar, {
      message: '1 of 2 chain histories complete; 1,234 records found so far.',
      progress: 53,
      scan: {
        phase: 'fetching',
        message: '1 of 2 chain histories complete; 1,234 records found so far.',
        progressPercent: 53,
        chainIds: [1, 8453],
        completedChains: 1,
        totalChains: 2,
        completedChainIds: [1],
        recordsFound: 1234,
        startedAt: Date.now(),
        lastUpdatedAt: Date.now(),
      },
    }));

    assert.match(markup, /1,234/);
    assert.match(markup, /history records found/i);
    assert.match(markup, /1 of 2 chains complete/i);
    assert.match(markup, /Ethereum/);
    assert.match(markup, /Base/);
    assert.doesNotMatch(markup, /Arbitrum/);
    assert.doesNotMatch(markup, /PARALLEL THREADS/);
    assert.match(markup, /role="progressbar"/);
    assert.match(markup, /aria-valuenow="53"/);
    assert.match(markup, /aria-live="polite"/);
  });
});
