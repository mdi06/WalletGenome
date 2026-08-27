import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

it('limits navigation motion to users who allow it and keeps Docs scrolls preference-aware', () => {
  const docsSource = readFileSync(new URL('./docs/page.tsx', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*html\s*\{\s*scroll-behavior: smooth;/);
  assert.match(css, /@media \(max-width: 767px\) and \(prefers-reduced-motion: no-preference\)\s*\{\s*\.mobile-navigation-disclosure\[data-open='true'\]/);
  assert.match(docsSource, /getElementById\(nextSectionId\)\?\.scrollIntoView\(\{ behavior: 'auto'/);
  assert.match(docsSource, /window\.scrollTo\(\{ top: 0, behavior: 'auto' \}\)/);
});

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map(offset => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255);
  const linearChannels = channels.map(channel => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linearChannels[0] + 0.7152 * linearChannels[1] + 0.0722 * linearChannels[2];
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

describe('brand contrast tokens', () => {
  it('defines contrast-safe orange text, badges, focus outlines, and live indicators', () => {
    assert.match(css, /--color-orange: #ff5500/);
    assert.match(css, /--color-orange-ink: #963300/);
    assert.match(css, /\.text-orange-ink\s*\{\s*color: var\(--color-orange-ink\)/);
    assert.match(css, /\.badge-brand-orange\s*\{[\s\S]*color: var\(--text-main\)/);
    assert.match(css, /:focus-visible\s*\{\s*outline: 2px solid var\(--color-orange-ink\)/);
    assert.match(css, /\.led-live\s*\{[\s\S]*background-color: var\(--color-orange-ink\)/);
    assert.ok(contrastRatio('#963300', '#eaebef') >= 4.5);
    assert.ok(contrastRatio('#963300', '#d0d0d0') >= 4.5);
    assert.ok(contrastRatio('#0a0a0a', '#ff5500') >= 4.5);
  });
});
