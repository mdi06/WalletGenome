import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const promptSource = readFileSync(new URL('./WalletUpdatesPrompt.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8');
const subscriptionSource = readFileSync(new URL('../../lib/auth/updateSubscriptions.ts', import.meta.url), 'utf8');

test('keeps wallet consent optional and separate from wallet authentication', () => {
  assert.match(promptSource, /Optional email updates/);
  assert.match(promptSource, /Email me updates/);
  assert.match(promptSource, /Not now/);
  assert.match(promptSource, /Wallets do not provide an email address/);
  assert.doesNotMatch(promptSource, /signInWithWeb3|WALLET_AUTH_STATEMENT/);
});

test('opens only from the fresh live-scan eligibility path and records prompt state', () => {
  assert.match(pageSource, /onLiveScanSuccess: handleLiveScanSuccess/);
  assert.match(pageSource, /shouldOfferWalletUpdatesPrompt\(user, liveScanUserId, isAuthLoading, isLoading\)/);
  assert.match(pageSource, /activeDemoSnapshot/);
  assert.match(promptSource, /loadUpdateSubscription/);
  assert.match(promptSource, /recordWalletUpdatesPromptShown/);
  assert.match(subscriptionSource, /getWalletIdentity\(user\)/);
});

test('uses the server confirmation endpoint for wallet email capture', () => {
  assert.match(promptSource, /fetch\('\/api\/updates\/request-confirmation'/);
  assert.match(promptSource, /body: JSON\.stringify\(\{ email: validation\.email \}\)/);
  assert.match(promptSource, /pending_confirmation/);
});
