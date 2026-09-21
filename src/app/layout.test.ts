import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');
const backgroundSource = readFileSync(
  new URL('../components/BackgroundNodes.tsx', import.meta.url),
  'utf8',
);
const iconSource = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8');

test('keeps the negative-z decorative canvas inside the application stacking context', () => {
  assert.match(layoutSource, /<div data-app-shell className="isolate">/);
  assert.match(backgroundSource, /className="fixed inset-0 pointer-events-none -z-10"/);
});

test('uses the centered WalletGenome mark for the browser tab icon', () => {
  assert.match(iconSource, /<title id="title">WalletGenome browser tab icon<\/title>/);
  assert.match(iconSource, /#ff5500/);
  assert.match(iconSource, /#0a0a0a/);
  assert.doesNotMatch(iconSource, /<text\b/);
});
