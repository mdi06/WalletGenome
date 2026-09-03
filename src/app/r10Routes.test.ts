import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { join } from 'node:path';
import nextConfig from '../../next.config';
import { metadata as docsMetadata } from './docs/layout';
import robots from './robots';
import sitemap from './sitemap';
import { absoluteUrl, SEO_LANDING_PAGES } from '@/lib/seo';

describe('R10 public route and security contracts', () => {
  it('generates the seven public sitemap URLs from one HTTPS origin', () => {
    const previousSiteUrl = process.env.SITE_URL;
    process.env.SITE_URL = 'https://wallet.example/preview?source=test';

    try {
      const entries = sitemap();
      assert.deepEqual(entries.map(entry => entry.url), [
        absoluteUrl('/'),
        absoluteUrl('/docs'),
        ...SEO_LANDING_PAGES.map(page => absoluteUrl(`/${page.slug}`)),
      ]);
      assert.equal(entries.length, 7);
      assert.ok(entries.every(entry => entry.url.startsWith('https://wallet.example/')));

      const robotsConfig = robots();
      assert.equal(robotsConfig.host, 'https://wallet.example');
      assert.equal(robotsConfig.sitemap, 'https://wallet.example/sitemap.xml');
      assert.deepEqual(robotsConfig.rules, {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/*?address='],
      });
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
    }
  });

  it('keeps docs metadata distinct and canonical to /docs', () => {
    assert.equal(docsMetadata.title, 'Methodology & Algorithmic Documentation');
    assert.equal(docsMetadata.description, 'Read how WalletGenome sources data and calculates wallet behavior, risk, approval exposure, capital flow, activity, identity, and Sybil signals.');
    assert.deepEqual(docsMetadata.alternates, { canonical: '/docs' });
    assert.equal(docsMetadata.openGraph?.url, '/docs');
    assert.match(JSON.stringify(docsMetadata.twitter), /summary_large_image/);
  });

  it('describes rate-limit resilience without guaranteeing retrieval', () => {
    const docsPage = readFileSync(join(process.cwd(), 'src/app/docs/page.tsx'), 'utf8');

    assert.match(docsPage, /reduce the impact of provider rate limits and improve retrieval resilience/);
    assert.doesNotMatch(docsPage, /bypass block explorer rate limits, ensuring fast and reliable data retrieval/);
  });

  it('declares the required response headers and disables powered-by disclosure', async () => {
    assert.equal(nextConfig.poweredByHeader, false);
    const routes = await nextConfig.headers?.();
    assert.ok(routes);
    const headers = new Map(routes[0].headers.map(header => [header.key, header.value]));

    assert.match(headers.get('Content-Security-Policy') ?? '', /default-src 'self'/);
    assert.match(headers.get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(headers.get('X-Frame-Options'), 'DENY');
    assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.match(headers.get('Permissions-Policy') ?? '', /camera=\(\)/);
    assert.equal(headers.has('X-Powered-By'), false);
  });
});
