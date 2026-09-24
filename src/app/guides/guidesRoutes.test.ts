import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GuideArticle from '@/components/GuideArticle';
import {
  buildGuideIndexMetadata,
  buildGuideIndexStructuredData,
  buildGuideMetadata,
  buildGuideStructuredData,
  GUIDE_INDEX,
  GUIDES,
  getGuidesForLandingSlug,
} from '@/lib/guides';
import { getSiteUrl } from '@/lib/seo';
import GuidesPage from './page';

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

function metadataRobots(metadata: ReturnType<typeof buildGuideMetadata>) {
  const robots = metadata.robots;
  assert.ok(robots && typeof robots !== 'string');
  return robots;
}

describe('first-party guide routes', () => {
  it('defines the index and two requested public routes', () => {
    assert.equal(GUIDES.length, 2);
    assert.deepEqual(GUIDES.map(guide => guide.slug), [
      'how-to-analyze-an-evm-wallet',
      'understanding-wallet-risk-signals',
    ]);
    assert.ok(existsSync(join(process.cwd(), 'src/app/guides/page.tsx')));
    assert.ok(existsSync(join(process.cwd(), 'src/app/guides/[slug]/page.tsx')));
  });

  it('keeps titles, descriptions, canonical paths, and indexing metadata unique and explicit', () => {
    const metadata = [buildGuideIndexMetadata(), ...GUIDES.map(buildGuideMetadata)];
    const titles = metadata.map(item => item.title);
    const descriptions = metadata.map(item => item.description);

    assert.equal(new Set(titles).size, metadata.length);
    assert.equal(new Set(descriptions).size, metadata.length);
    assert.deepEqual(metadata.map(item => item.alternates?.canonical), [
      'http://localhost:3000/guides',
      ...GUIDES.map(guide => `http://localhost:3000/guides/${guide.slug}`),
    ]);

    for (const item of metadata) {
      const robots = metadataRobots(item);
      assert.equal(robots.index, true);
      assert.equal(robots.follow, true);
    }
  });

  it('uses the configured production origin for canonical, Open Graph, Twitter, and structured-data URLs', () => {
    const previousSiteUrl = process.env.SITE_URL;
    process.env.SITE_URL = 'https://wallet.example/preview?source=test';

    try {
      const indexMetadata = buildGuideIndexMetadata();
      const guideMetadata = buildGuideMetadata(GUIDES[0]);
      const twitter = guideMetadata.twitter;
      assert.ok(twitter && typeof twitter !== 'string' && 'images' in twitter);

      assert.equal(indexMetadata.alternates?.canonical, 'https://wallet.example/guides');
      assert.equal(indexMetadata.openGraph?.url, 'https://wallet.example/guides');
      assert.equal(guideMetadata.alternates?.canonical, `https://wallet.example/guides/${GUIDES[0].slug}`);
      assert.equal(guideMetadata.openGraph?.url, `https://wallet.example/guides/${GUIDES[0].slug}`);
      assert.deepEqual(twitter.images, ['https://wallet.example/twitter-image']);

      for (const item of [...buildGuideIndexStructuredData(), ...buildGuideStructuredData(GUIDES[0])]) {
        const serialized = JSON.stringify(item);
        assert.doesNotMatch(serialized, /localhost/);
        assert.match(serialized, /https:\/\/wallet\.example\//);
      }
    } finally {
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
    }
  });

  it('retains the localhost fallback for local development', () => {
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
      assert.equal(buildGuideIndexMetadata().openGraph?.url, 'http://localhost:3000/guides');
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('renders exactly one visible H1 on the index and each guide', () => {
    const indexMarkup = renderToStaticMarkup(createElement(GuidesPage));
    assert.equal(indexMarkup.match(/<h1\b/g)?.length, 1);

    for (const guide of GUIDES) {
      const guideMarkup = renderToStaticMarkup(createElement(GuideArticle, { guide }));
      assert.equal(guideMarkup.match(/<h1\b/g)?.length, 1);
      assert.match(guideMarkup, new RegExp(guide.heading));
    }
  });

  it('states the supported networks and required factual limits in visible guide copy', () => {
    const analyzeCopy = collectStrings(GUIDES[0]).join(' ');
    const riskCopy = collectStrings(GUIDES[1]).join(' ');

    assert.match(analyzeCopy, /Ethereum, Base, Arbitrum, and Optimism/);
    assert.match(analyzeCopy, /does not provide custody, trading, transaction execution, or investment advice/);
    assert.match(analyzeCopy, /cannot be interpreted as clean, safe, inactive, or zero/);
    assert.match(analyzeCopy, /not a live allowance query/);
    assert.match(analyzeCopy, /does not request a transaction, token approval, private key, spending permission, or chain switch/);

    assert.match(riskCopy, /A low score cannot establish safety/);
    assert.match(riskCopy, /A high score cannot establish fraud, malicious intent, compromise, or wrongdoing/);
    assert.match(riskCopy, /cannot be represented as safe, clean, inactive, or zero/);
    assert.match(riskCopy, /separately from its local MEDIA-style behavioral heuristic/);
  });

  it('includes guide cards and every required contextual destination', () => {
    const indexMarkup = renderToStaticMarkup(createElement(GuidesPage));
    for (const guide of GUIDES) {
      assert.match(indexMarkup, new RegExp(`/guides/${guide.slug}`));
    }
    assert.match(indexMarkup, /href="\/"/);
    assert.match(indexMarkup, /href="\/docs"/);

    const analyzeLinks = GUIDES[0].resources.map(resource => resource.href);
    assert.deepEqual(analyzeLinks, ['/docs', '/evm-wallet-analytics', '/multi-chain-wallet-forensics']);
    const riskLinks = GUIDES[1].resources.map(resource => resource.href);
    assert.deepEqual(riskLinks, ['/crypto-wallet-risk-checker', '/token-approval-checker', '/sybil-wallet-analysis', '/docs']);

    assert.deepEqual(getGuidesForLandingSlug('evm-wallet-analytics').map(guide => guide.slug), [GUIDES[0].slug]);
    assert.deepEqual(getGuidesForLandingSlug('crypto-wallet-risk-checker').map(guide => guide.slug), [GUIDES[1].slug]);
  });

  it('uses WebPage and visible BreadcrumbList structured data with the configured URL model', () => {
    const indexData = buildGuideIndexStructuredData();
    assert.deepEqual(indexData.map(item => item['@type']), ['WebPage', 'BreadcrumbList']);
    assert.equal(indexData[0].name, GUIDE_INDEX.heading);

    for (const guide of GUIDES) {
      const data = buildGuideStructuredData(guide);
      assert.deepEqual(data.map(item => item['@type']), ['WebPage', 'BreadcrumbList']);
      assert.equal(data[0].name, guide.heading);
      assert.equal(data[0].description, guide.metaDescription);
      assert.match(JSON.stringify(data[1]), new RegExp(guide.title));
    }
  });

  it('does not reuse substantial paragraphs between the two original guides', () => {
    const paragraphText = (guide: (typeof GUIDES)[number]) => guide.sections.flatMap(section => (
      section.blocks
        .filter(block => block.type === 'paragraph')
        .map(block => collectStrings(block.content).join('').replace(/\s+/g, ' ').trim())
        .filter(paragraph => paragraph.length >= 100)
    ));

    const firstParagraphs = new Set(paragraphText(GUIDES[0]));
    const reused = paragraphText(GUIDES[1]).filter(paragraph => firstParagraphs.has(paragraph));
    assert.deepEqual(reused, []);
  });

  it('keeps new copy free of prohibited rhetorical templates and named generic-AI phrases', () => {
    const copy = collectStrings({ GUIDE_INDEX, GUIDES }).join('\n');
    const prohibited = [
      /\bnot\b[^.!?\n]{0,100}\bbut\b/i,
      /\bnot because\b[^.!?\n]{0,100}\bbut because\b/i,
      /\bwhat matters is not\b/i,
      /\bthe problem is not\b/i,
      /\bnot that\b[^.!?\n]{0,100}\brather\b/i,
      /\b(the takeaway is|the conclusion is|the gist is|to put it simply)\b/i,
      /\b(the deeper issue|the real story|the real question|the essence|the point is|the thing is)\b/i,
      /\b(delv(e|ing)|unlock|navigate the landscape|powerful insights|ever-evolving|game-changing|comprehensive solution)\b/i,
      /\b(actually|in reality)\b/i,
    ];

    for (const pattern of prohibited) assert.doesNotMatch(copy, pattern);
  });
});
