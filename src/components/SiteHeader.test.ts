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

test('renders Scanner as an action button when a scanner callback is provided', () => {
  const markup = renderToStaticMarkup(createElement(SiteHeader, {
    activePage: 'scanner',
    onScannerClick: () => {},
  }));
  const source = readSource('./SiteHeader.tsx');

  assert.match(markup, /<button type="button" aria-current="page" class="[^"]*">[\s\S]*<span>Scanner<\/span>[\s\S]*<\/button>/);
  assert.doesNotMatch(markup, /<a href="\/"[^>]*>[\s\S]*<span>Scanner<\/span>/);
  assert.match(source, /onScannerClick\?: \(\) => void/);
  assert.match(source, /onScannerClick\(\);[\s\S]*closeMenu\(\);/);
});

test('keeps authentication inside the responsive navigation disclosure', () => {
  const source = readSource('./SiteHeader.tsx');
  const disclosureStart = source.indexOf('id="primary-navigation-menu"');
  const authStart = source.indexOf('<AuthActions ');

  assert.ok(disclosureStart >= 0);
  assert.ok(authStart > disclosureStart, 'auth should render inside the disclosure');
  assert.doesNotMatch(source.slice(0, disclosureStart), /<AuthActions /);
});

test('keeps mobile auth and navigation controls visually aligned', () => {
  const headerSource = readSource('./SiteHeader.tsx');
  const authSource = readSource('./auth/AuthActions.tsx');

  assert.match(headerSource, /btn-3d-black inline-flex min-h-11 w-full items-center justify-start gap-1\.5 px-3 py-1\.5 text-xs font-bold uppercase text-white md:min-h-9 md:w-auto md:py-1/);
  assert.match(headerSource, /isActive\s+\? 'md:text-white'\s+: 'md:text-\[#0a0a0a\] md:border-\[#d9dbe1\] md:\[background:linear-gradient/);
  assert.match(headerSource, /flex w-full flex-col gap-2 md:w-auto md:flex-row/);
  assert.match(headerSource, /text-\[#ff5500\] md:text-orange-ink/);
  assert.doesNotMatch(headerSource, /activePage === 'scanner' && <span className="h-1\.5 w-1\.5 shrink-0 rounded-full bg-\[#ff5500\] md:hidden"/);
  assert.match(headerSource, /h-1\.5 w-1\.5 shrink-0 rounded-full bg-\[#ff5500\] md:hidden/);
  assert.match(authSource, /flex w-full flex-col items-start gap-1 md:w-auto md:items-end/);
  assert.match(authSource, /btn-3d-black inline-flex min-h-11 w-full items-center justify-start gap-1\.5 px-3 py-1\.5 text-xs font-bold uppercase text-white md:min-h-9 md:w-auto md:py-1/);
  assert.match(authSource, /flex w-full items-center gap-1\.5 md:w-auto/);
  assert.match(authSource, /btn-3d-black inline-flex min-h-11 w-full items-center justify-start gap-1\.5 px-3 py-1\.5 text-xs font-bold uppercase text-white md:min-h-9 md:w-auto md:py-1 md:text-\[#0a0a0a\] md:border-\[#d9dbe1\] md:\[background:linear-gradient/);
  assert.match(authSource, /LogOut size=\{12\} className="text-\[#ff5500\] md:text-current"/);
});
