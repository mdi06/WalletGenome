import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPageMetadata,
  getSeoLandingPage,
  normalizeSiteUrl,
  SEO_LANDING_PAGES,
} from './seo';

describe('SEO route configuration', () => {
  it('defines unique, lookup-safe landing page slugs', () => {
    const slugs = SEO_LANDING_PAGES.map(page => page.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.equal(slugs.length, 5);

    for (const slug of slugs) {
      assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.equal(getSeoLandingPage(slug)?.slug, slug);
    }
  });

  it('builds a self-referencing canonical URL for every landing page', () => {
    for (const page of SEO_LANDING_PAGES) {
      const metadata = buildPageMetadata(page);
      assert.deepEqual(metadata.alternates, { canonical: `/${page.slug}` });
      assert.equal(metadata.openGraph?.url, `/${page.slug}`);
      assert.deepEqual(metadata.openGraph?.images, [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'WalletGenome — EVM Wallet Analytics & Forensics',
        },
      ]);
      assert.deepEqual(metadata.twitter?.images, ['/twitter-image']);
      assert.equal(metadata.title, page.title);
      assert.equal(metadata.description, page.metaDescription);
    }
  });

  it('normalizes configured domains and rejects invalid URLs', () => {
    assert.equal(normalizeSiteUrl('wallet.example/path?q=1')?.toString(), 'https://wallet.example/');
    assert.equal(normalizeSiteUrl('http://localhost:3000/docs')?.toString(), 'http://localhost:3000/');
    assert.equal(normalizeSiteUrl('not a url'), null);
    assert.equal(normalizeSiteUrl(undefined), null);
  });
});
