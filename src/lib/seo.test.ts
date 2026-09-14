import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  absoluteUrl,
  buildLandingStructuredData,
  buildPageMetadata,
  getSeoLandingPage,
  getSiteUrl,
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

  it('keeps each public landing page focused with unique search-facing copy', () => {
    const titles = SEO_LANDING_PAGES.map(page => page.title);
    const descriptions = SEO_LANDING_PAGES.map(page => page.metaDescription);
    const headings = SEO_LANDING_PAGES.map(page => page.heading);
    const intents = SEO_LANDING_PAGES.map(page => page.primaryIntent);

    assert.equal(new Set(titles).size, titles.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
    assert.equal(new Set(headings).size, headings.length);
    assert.equal(new Set(intents).size, intents.length);

    for (const page of SEO_LANDING_PAGES) {
      assert.ok(page.intro.length > 80);
      assert.ok(page.scopeNote.length > 40);
      assert.equal(page.relatedSlugs.some(slug => slug === page.slug), false);
      assert.equal(page.relatedSlugs.length, 2);
      assert.ok(page.relatedSlugs.every(slug => getSeoLandingPage(slug)));
      assert.ok(page.capabilities.length >= 3);
      assert.ok(page.limitations.length >= 3);
      assert.ok(page.faqs.length >= 3);
    }
  });

  it('builds a self-referencing canonical URL for every landing page', () => {
    for (const page of SEO_LANDING_PAGES) {
      const metadata = buildPageMetadata(page);
      assert.deepEqual(metadata.alternates, { canonical: absoluteUrl(`/${page.slug}`) });
      assert.equal(metadata.openGraph?.url, absoluteUrl(`/${page.slug}`));
      assert.deepEqual(metadata.openGraph?.images, [
        {
          url: absoluteUrl('/opengraph-image'),
          width: 1200,
          height: 630,
          alt: 'WalletGenome — EVM Wallet Analytics & Forensics',
        },
      ]);
      assert.deepEqual(metadata.twitter?.images, [absoluteUrl('/twitter-image')]);
      assert.equal(metadata.title, page.title);
      assert.equal(metadata.description, page.metaDescription);
      assert.equal(metadata.keywords, undefined);
    }
  });

  it('keeps landing-page structured data aligned with the visible page model', () => {
    for (const page of SEO_LANDING_PAGES) {
      const structuredData = buildLandingStructuredData(page);
      const webPage = structuredData.find(item => item['@type'] === 'WebPage');
      const faqPage = structuredData.find(item => item['@type'] === 'FAQPage');

      assert.equal(webPage?.name, page.heading);
      assert.equal(webPage?.description, page.metaDescription);
      assert.ok(faqPage);
      assert.deepEqual(faqPage.mainEntity, page.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })));
    }
  });

  it('normalizes configured domains and rejects invalid URLs', () => {
    assert.equal(normalizeSiteUrl('wallet.example/path?q=1')?.toString(), 'https://wallet.example/');
    assert.equal(normalizeSiteUrl('http://localhost:3000/docs')?.toString(), 'http://localhost:3000/');
    assert.equal(normalizeSiteUrl('not a url'), null);
    assert.equal(normalizeSiteUrl(undefined), null);
  });

  it('resolves canonical, social, and structured-data URLs from SITE_URL', () => {
    const previousSiteUrl = process.env.SITE_URL;
    process.env.SITE_URL = 'https://wallet.example/preview?source=test';

    try {
      const page = SEO_LANDING_PAGES[0];
      const metadata = buildPageMetadata(page);

      assert.equal(getSiteUrl().toString(), 'https://wallet.example/');
      assert.equal(metadata.alternates?.canonical, 'https://wallet.example/evm-wallet-analytics');
      assert.equal(metadata.openGraph?.url, 'https://wallet.example/evm-wallet-analytics');
      assert.deepEqual(metadata.openGraph?.images, [
        {
          url: 'https://wallet.example/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'WalletGenome — EVM Wallet Analytics & Forensics',
        },
      ]);
      assert.deepEqual(metadata.twitter?.images, ['https://wallet.example/twitter-image']);
      assert.equal(absoluteUrl('/#application'), 'https://wallet.example/#application');
      assert.equal(absoluteUrl('/docs#article'), 'https://wallet.example/docs#article');
      assert.equal(absoluteUrl('/evm-wallet-analytics#webpage'), 'https://wallet.example/evm-wallet-analytics#webpage');
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
    }
  });

  it('falls back to the local development origin when no site URL is configured', () => {
    const previous = {
      SITE_URL: process.env.SITE_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    };

    try {
      delete process.env.SITE_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;
      assert.equal(getSiteUrl().toString(), 'http://localhost:3000/');
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
