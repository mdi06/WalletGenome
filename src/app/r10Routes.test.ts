import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { join } from 'node:path';
import nextConfig, { buildContentSecurityPolicy } from '../../next.config';
import { metadata as docsMetadata } from './docs/layout';
import { metadata as privacyMetadata } from './privacy/page';
import { metadata as confirmationMetadata } from './updates/confirmation/page';
import robots from './robots';
import sitemap from './sitemap';
import { absoluteUrl, SEO_LANDING_PAGES } from '@/lib/seo';

describe('R10 public route and security contracts', () => {
  it('generates the eight public sitemap URLs from one HTTPS origin without query or status routes', () => {
    const previousSiteUrl = process.env.SITE_URL;
    process.env.SITE_URL = 'https://wallet.example/preview?source=test';

    try {
      const entries = sitemap();
      assert.deepEqual(entries.map(entry => entry.url), [
        absoluteUrl('/'),
        absoluteUrl('/docs'),
        absoluteUrl('/privacy'),
        ...SEO_LANDING_PAGES.map(page => absoluteUrl(`/${page.slug}`)),
      ]);
      assert.equal(entries.length, 8);
      assert.ok(entries.every(entry => entry.url.startsWith('https://wallet.example/')));
      assert.ok(entries.every(entry => !new URL(entry.url).search));
      assert.ok(entries.every(entry => entry.lastModified === '2026-09-14'));
      assert.ok(entries.every(entry => !entry.url.includes('/api/')));
      assert.ok(entries.every(entry => !entry.url.includes('/auth/')));
      assert.ok(entries.every(entry => !entry.url.includes('/updates/')));

      const robotsConfig = robots();
      assert.equal(robotsConfig.host, 'https://wallet.example');
      assert.equal(robotsConfig.sitemap, 'https://wallet.example/sitemap.xml');
      assert.deepEqual(robotsConfig.rules, {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/*?address=', '/*?demo=', '/*?cluster='],
      });
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
    }
  });

  it('keeps docs metadata distinct and canonical to /docs', () => {
    assert.equal(docsMetadata.title, 'Methodology & Algorithmic Documentation');
    assert.equal(docsMetadata.description, 'Read how WalletGenome sources data and calculates wallet behavior, risk, approval exposure, capital flow, activity, identity, and Sybil signals.');
    assert.deepEqual(docsMetadata.alternates, { canonical: absoluteUrl('/docs') });
    assert.equal(docsMetadata.openGraph?.url, absoluteUrl('/docs'));
    assert.match(JSON.stringify(docsMetadata.twitter), /summary_large_image/);
  });

  it('keeps contextual links between public guides, scanner, methodology, and privacy', () => {
    const docsPage = readFileSync(join(process.cwd(), 'src/app/docs/page.tsx'), 'utf8');
    const privacyPage = readFileSync(join(process.cwd(), 'src/app/privacy/page.tsx'), 'utf8');
    const landingPage = readFileSync(join(process.cwd(), 'src/app/[slug]/page.tsx'), 'utf8');

    assert.match(docsPage, /Focused guides:[\s\S]*SEO_LANDING_PAGES\.map/);
    assert.match(docsPage, /href=\{`\//);
    assert.match(landingPage, /href="\/"[\s\S]*OPEN WALLET SCANNER/);
    assert.match(landingPage, /href="\/docs"[\s\S]*REVIEW THE METHODOLOGY/);
    assert.match(landingPage, /Continue with a focused guide/);
    assert.match(privacyPage, /href="\/"[\s\S]*Return to scanner/);
    assert.match(privacyPage, /href="\/docs"[\s\S]*Read methodology/);
  });

  it('keeps privacy indexable with route-specific metadata', () => {
    const privacyTwitter = privacyMetadata.twitter;
    const privacyRobots = privacyMetadata.robots;
    assert.ok(privacyTwitter && typeof privacyTwitter !== 'string' && 'card' in privacyTwitter);
    assert.ok(privacyRobots && typeof privacyRobots !== 'string');

    assert.equal(privacyMetadata.title, 'Privacy');
    assert.match(privacyMetadata.description ?? '', /account information, wallet addresses, optional product updates/);
    assert.deepEqual(privacyMetadata.alternates, { canonical: absoluteUrl('/privacy') });
    assert.equal(privacyMetadata.openGraph?.url, absoluteUrl('/privacy'));
    assert.deepEqual(privacyMetadata.openGraph?.images, [
      {
        url: absoluteUrl('/opengraph-image'),
        width: 1200,
        height: 630,
        alt: 'WalletGenome — EVM Wallet Analytics & Forensics',
      },
    ]);
    assert.equal(privacyTwitter.card, 'summary_large_image');
    assert.deepEqual(privacyTwitter.images, [absoluteUrl('/twitter-image')]);
    assert.equal(privacyRobots.index, true);
    assert.equal(privacyRobots.follow, true);
  });

  it('keeps the update status route out of indexing and strips status query parameters from its canonical', () => {
    const confirmationTwitter = confirmationMetadata.twitter;
    const confirmationRobots = confirmationMetadata.robots;
    assert.ok(confirmationTwitter && typeof confirmationTwitter !== 'string' && 'card' in confirmationTwitter);
    assert.ok(confirmationRobots && typeof confirmationRobots !== 'string');
    const confirmationGoogleBot = confirmationRobots.googleBot;
    assert.ok(confirmationGoogleBot && typeof confirmationGoogleBot !== 'string');

    assert.equal(confirmationMetadata.title, 'Update email status');
    assert.match(confirmationMetadata.description ?? '', /Confirmation and unsubscribe status/);
    assert.deepEqual(confirmationMetadata.alternates, { canonical: absoluteUrl('/updates/confirmation') });
    assert.equal(confirmationMetadata.openGraph?.url, absoluteUrl('/updates/confirmation'));
    assert.deepEqual(confirmationMetadata.openGraph?.images, []);
    assert.deepEqual(confirmationTwitter.images, []);
    assert.equal(confirmationTwitter.card, 'summary');
    assert.equal(confirmationRobots.index, false);
    assert.equal(confirmationRobots.follow, false);
    assert.equal(confirmationGoogleBot.index, false);
    assert.equal(confirmationGoogleBot.follow, false);
    assert.doesNotMatch(String(confirmationMetadata.alternates?.canonical), /[?&]status=/);
  });

  it('describes rate-limit resilience without guaranteeing retrieval', () => {
    const docsPage = readFileSync(join(process.cwd(), 'src/app/docs/page.tsx'), 'utf8');

    assert.match(docsPage, /reduce the impact of provider rate limits and improve retrieval resilience/);
    assert.doesNotMatch(docsPage, /bypass block explorer rate limits, ensuring fast and reliable data retrieval/);
    assert.doesNotMatch(docsPage, /0 \(Safe\) to 100 \(Critical\)/);
    assert.match(docsPage, /0–100 heuristic score/);
    assert.match(docsPage, /1 to 4 supported chains/);
    assert.doesNotMatch(docsPage, /Algorithmic Complexity & Execution Guarantees/);
  });

  it('keeps root structured data free of unsupported price and keyword metadata', () => {
    const layoutSource = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

    assert.match(layoutSource, /@type": "WebApplication"/);
    assert.match(layoutSource, /featureList:/);
    assert.doesNotMatch(layoutSource, /keywords:/);
    assert.doesNotMatch(layoutSource, /offers:/);
    assert.doesNotMatch(layoutSource, /priceCurrency:/);
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

  it('allows browser connections to the configured Supabase origin and GA only when GA is configured', () => {
    const policy = buildContentSecurityPolicy('https://project-ref.supabase.co/auth/v1', 'G-8GTTB08JJ2');

    assert.match(policy, /connect-src 'self' https:\/\/project-ref\.supabase\.co/);
    assert.doesNotMatch(policy, /\/auth\/v1/);
    assert.equal(buildContentSecurityPolicy('not a URL').includes('not a URL'), false);
    assert.match(policy, /script-src[^;]*https:\/\/www\.googletagmanager\.com/);
    assert.match(policy, /connect-src[^;]*https:\/\/www\.google-analytics\.com/);
    assert.match(policy, /connect-src[^;]*https:\/\/region1\.google-analytics\.com/);
    assert.doesNotMatch(buildContentSecurityPolicy(undefined, 'not-a-measurement-id'), /google-analytics|googletagmanager/);
  });
});
