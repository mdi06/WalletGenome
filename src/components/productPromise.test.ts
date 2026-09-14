import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('R02 product promise and coverage copy', () => {
  it('bounds the home promise to observable activity on the four supported EVM networks', () => {
    const pageSource = readSource('../app/page.tsx');
    const guideSource = readSource('./WelcomeGuide.tsx');

    assert.match(pageSource, /Investigate observable activity across supported EVM networks/);
    assert.match(pageSource, /Ethereum, Base, Arbitrum, and Optimism/);
    assert.doesNotMatch(pageSource, /complete story behind any crypto wallet/i);
    assert.doesNotMatch(guideSource, /WHAT YOU CAN UNCOVER ON ANY WALLET/);
    assert.doesNotMatch(guideSource, /Universal Social Identities/);
    assert.doesNotMatch(guideSource, /filters out spoofed\/scam meme tokens/i);
    assert.doesNotMatch(guideSource, /Protects assets by/i);
    assert.match(guideSource, /not proof of safety, ownership, or intent/);
    assert.match(guideSource, /FOCUSED ANALYSIS GUIDES/);
    assert.match(guideSource, /four supported networks/);
  });

  it('keeps public metadata and documentation aligned with the bounded promise', () => {
    const seoSource = readSource('../lib/seo.ts');
    const docsSource = readSource('../app/docs/page.tsx');
    const readmeSource = readSource('../../README.md');

    assert.match(seoSource, /observable EVM wallet activity/);
    assert.match(seoSource, /Ethereum, Base, Arbitrum, and Optimism/);
    assert.match(docsSource, /observable public activity on four supported EVM networks/);
    assert.match(readmeSource, /observable wallet activity, behavioral patterns, and security signals/);
  });

  it('retains explicit partial and unavailable result-state caveats', () => {
    const dashboardStatusSource = readSource('./status/DashboardStatusPanel.tsx');

    assert.match(dashboardStatusSource, /Partial history scan/);
    assert.match(dashboardStatusSource, /Scan unavailable/);
    assert.match(dashboardStatusSource, /require complete wallet history/);
  });
});
