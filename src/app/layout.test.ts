import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');
const backgroundSource = readFileSync(
  new URL('../components/BackgroundNodes.tsx', import.meta.url),
  'utf8',
);

test('keeps the negative-z decorative canvas inside the application stacking context', () => {
  assert.match(layoutSource, /<div data-app-shell className="isolate">/);
  assert.match(backgroundSource, /className="fixed inset-0 pointer-events-none -z-10"/);
});
