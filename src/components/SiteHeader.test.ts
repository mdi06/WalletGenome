import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteHeader from './SiteHeader';

test('renders the logo as a home link when no guide action is provided', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
    indexingStatus: 'ready',
  }));

  assert.match(markup, /aria-label="WalletGenome home"[^>]*href="\/"/);
  assert.doesNotMatch(markup, /aria-label="Open WalletGenome guide"/);
});

test('keeps the logo guide action available for a loaded dashboard', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
    indexingStatus: 'ready',
    onBrandClick: () => {},
  }));

  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-label="Open WalletGenome guide"/);
});

test('renders a single mobile navigation disclosure with status outside the closed region', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
    indexingStatus: 'ready',
  }));

  assert.match(markup, /aria-controls="primary-navigation-menu"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /id="primary-navigation-menu" data-open="false" class="hidden [^"]*md:flex/);
  assert.match(markup, /role="status"[^>]*aria-label="Indexing status: Ready"/);
  assert.match(markup, /Open navigation/);
});
