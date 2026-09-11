import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteHeader from './SiteHeader';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('renders the logo as a home link when no guide action is provided', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
  }));

  assert.match(markup, /aria-label="WalletGenome home"[^>]*href="\/"/);
  assert.match(markup, />Beta<\/span>/);
  assert.doesNotMatch(markup, /aria-label="Open WalletGenome guide"/);
});

test('keeps the logo guide action available for a loaded dashboard', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
    onBrandClick: () => {},
  }));

  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-label="Open WalletGenome guide"/);
});

test('renders a single mobile navigation disclosure without a header state indicator', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
  }));

  assert.match(markup, /aria-controls="primary-navigation-menu"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /id="primary-navigation-menu" data-open="false" class="hidden [^"]*md:flex/);
  assert.doesNotMatch(markup, /Indexing status:/);
  assert.match(markup, /Open navigation/);
});

test('keeps sign-in and scanner controls on the same type and height scale', () => {
  const headerSource = readSource('./SiteHeader.tsx');
  const authSource = readSource('./auth/AuthActions.tsx');

  assert.match(headerSource, /inline-flex min-h-11 md:min-h-9 items-center gap-1\.5 px-3 py-1\.5 md:py-1 text-xs font-bold uppercase/);
  assert.match(authSource, /inline-flex min-h-11 items-center gap-1\.5 px-3 py-1\.5 text-xs font-bold uppercase[^\"]*md:min-h-9 md:py-1/);
});
