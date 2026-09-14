import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { SEO_LANDING_PAGES } from '@/lib/seo';

const pageSource = readFileSync(new URL('./[slug]/page.tsx', import.meta.url), 'utf8');

describe('SEO landing route fallback behavior', () => {
  it('renders unknown slugs through the explicit not-found branch', () => {
    assert.match(pageSource, /export const dynamicParams = true;/);
    assert.doesNotMatch(pageSource, /dynamicParams = false/);
    assert.match(pageSource, /if \(!page\) notFound\(\);/);
  });

  it('renders one data-driven H1, scanner CTA, methodology CTA, and focused related links', () => {
    assert.match(pageSource, /<h1[\s\S]*>\s*\{page\.heading\}\s*<\/h1>/);
    assert.match(pageSource, /href="\/"[\s\S]*>\s*OPEN WALLET SCANNER/);
    assert.match(pageSource, /href="\/docs"[\s\S]*>\s*REVIEW THE METHODOLOGY/);
    assert.match(pageSource, /page\.relatedSlugs[\s\S]*map\(slug => getSeoLandingPage\(slug\)\)/);

    for (const page of SEO_LANDING_PAGES) {
      assert.match(page.heading, /[A-Za-z]/);
      assert.match(page.scopeNote, /partial|unavailable|not proof|historical evidence|incomplete/i);
    }
  });
});
