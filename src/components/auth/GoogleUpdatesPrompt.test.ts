import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const promptSource = readFileSync(new URL('./GoogleUpdatesPrompt.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8');
const betaSource = readFileSync(new URL('./BetaUpdatesCard.tsx', import.meta.url), 'utf8');
const privacySource = readFileSync(new URL('../../app/privacy/page.tsx', import.meta.url), 'utf8');
const subscriptionSource = readFileSync(new URL('../../lib/auth/updateSubscriptions.ts', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('./AuthProvider.tsx', import.meta.url), 'utf8');

test('uses exact optional consent wording and explicit action labels', () => {
  assert.match(promptSource, /Get WalletGenome updates/);
  assert.match(promptSource, /Receive occasional beta and product updates at:/);
  assert.match(promptSource, /Email me updates/);
  assert.match(promptSource, /Not now/);
  assert.match(promptSource, /Unsubscribe anytime/);
  assert.match(promptSource, /href="\/privacy"/);
  assert.doesNotMatch(promptSource, /<input[^>]+type=["']checkbox/);
  assert.doesNotMatch(promptSource, />Continue</);
  assert.doesNotMatch(promptSource, />Accept</);
});

test('the prompt is post-scan only and excludes demos and wallet-only users', () => {
  assert.match(pageSource, /onLiveScanSuccess: handleLiveScanSuccess/);
  assert.match(pageSource, /!isLoading/);
  assert.match(promptSource, /getVerifiedGoogleEmail\(user\)/);
  assert.match(promptSource, /loadUpdateSubscription/);
  assert.match(promptSource, /recordGoogleUpdatesPromptShown/);
  assert.match(pageSource, /activeDemoSnapshot/);
  assert.match(pageSource, /handleDemoSnapshot/);
  assert.match(pageSource, /handleClusterDemoSnapshot/);
});

test('Google sign-in does not write an update subscription by itself', () => {
  const googleSignInBlock = authSource.slice(authSource.indexOf('const signInWithGoogle'), authSource.indexOf('const discoverEthereumWalletsForAuth'));
  assert.doesNotMatch(googleSignInBlock, /update_subscriptions|subscribeToUpdates|consented_at/);
  assert.match(pageSource, /onLiveScanSuccess: handleLiveScanSuccess/);
});

test('dismissal and subscription are separate mutations', () => {
  assert.match(promptSource, /dismissGoogleUpdatesPrompt/);
  assert.match(promptSource, /subscribeToUpdates/);
  assert.match(promptSource, /GOOGLE_UPDATE_CAPTURE_SOURCE/);
  assert.match(promptSource, /handledRef/);
  assert.match(betaSource, /unsubscribeFromUpdates/);
  assert.match(betaSource, /subscribeToUpdates/);
});

test('subscription mutations record only the action the user chose', () => {
  const subscribeBlock = subscriptionSource.slice(subscriptionSource.indexOf('export async function subscribeToUpdates'), subscriptionSource.indexOf('export async function unsubscribeFromUpdates'));
  const unsubscribeBlock = subscriptionSource.slice(subscriptionSource.indexOf('export async function unsubscribeFromUpdates'));
  const dismissBlock = subscriptionSource.slice(subscriptionSource.indexOf('export async function dismissGoogleUpdatesPrompt'), subscriptionSource.indexOf('export async function subscribeToUpdates'));

  assert.match(subscribeBlock, /subscribed: true/);
  assert.match(subscribeBlock, /consented_at: now/);
  assert.match(subscribeBlock, /consent_version: GOOGLE_UPDATE_CONSENT_VERSION/);
  assert.match(subscribeBlock, /source/);
  assert.match(unsubscribeBlock, /subscribed: false/);
  assert.match(unsubscribeBlock, /withdrawn_at: now/);
  assert.doesNotMatch(unsubscribeBlock, /consented_at: null/);
  assert.match(dismissBlock, /subscribed: false/);
  assert.doesNotMatch(dismissBlock, /consented_at/);
});

test('privacy copy states authentication separation, message scope, withdrawal, and retention', () => {
  assert.match(privacySource, /does not subscribe you to email updates/);
  assert.match(privacySource, /occasional beta and product updates/);
  assert.match(privacySource, /withdrawal timestamp/);
  assert.match(privacySource, /prior consent evidence is retained/);
  assert.match(privacySource, /Deleting the authenticated account removes its subscription row/);
});
