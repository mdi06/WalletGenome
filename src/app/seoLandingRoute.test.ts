import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const pageSource = readFileSync(new URL('./[slug]/page.tsx', import.meta.url), 'utf8');

describe('SEO landing route fallback behavior', () => {
  it('renders unknown slugs through the explicit not-found branch', () => {
    assert.match(pageSource, /export const dynamicParams = true;/);
    assert.doesNotMatch(pageSource, /dynamicParams = false/);
    assert.match(pageSource, /if \(!page\) notFound\(\);/);
  });
});
