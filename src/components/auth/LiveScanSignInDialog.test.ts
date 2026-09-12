import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import LiveScanSignInDialog from './LiveScanSignInDialog';

const returnFocusRef = createRef<HTMLElement>();

test('renders the live-scan sign-in dialog with accessible labeling and wallet safety copy', () => {
  const markup = renderToStaticMarkup(createElement(LiveScanSignInDialog, {
    open: true,
    isStarting: false,
    error: null,
    onContinue: () => {},
    onClose: () => {},
    returnFocusRef,
  }));

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="live-scan-sign-in-title"/);
  assert.match(markup, /aria-describedby="live-scan-sign-in-description"/);
  assert.match(markup, /Sign in to run a live scan/);
  assert.match(markup, /Choose Google or an injected Ethereum wallet\. Your scan target and selected networks stay preserved\./);
  assert.match(markup, />Continue with Google</);
  assert.match(markup, />Sign in with wallet</);
  assert.match(markup, />Cancel</);
  assert.match(markup, /Wallet authentication signs a login message only\. It does not create a transaction, cost gas or grant access to funds\./);
  assert.match(markup, /aria-label="Close sign-in dialog"/);
  assert.match(markup, /class="[^"]*animate-fade-in-up/);
  assert.doesNotMatch(markup, /Sign in to subscribe/i);
});

test('owns keyboard dismissal, focus trapping, inert background, and focus restoration', () => {
  const dialogSource = readFileSync(new URL('../AppDialog.tsx', import.meta.url), 'utf8');

  assert.match(dialogSource, /event\.key === 'Escape'/);
  assert.match(dialogSource, /event\.key !== 'Tab'/);
  assert.match(dialogSource, /appShell\.inert = true/);
  assert.match(dialogSource, /focusReturnTarget\?\.focus\(\)/);
  assert.match(dialogSource, /aria-modal="true"/);
  assert.match(dialogSource, /max-h-\[calc\(100svh-2rem\)\]/);
});

test('keeps the dialog motion inside the existing reduced-motion contract', () => {
  const globalsSource = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

  assert.match(globalsSource, /\.animate-fade-in-up\s*\{/);
  assert.match(globalsSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.001ms !important/);
});
