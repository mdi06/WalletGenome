import assert from 'node:assert/strict';
import test from 'node:test';
import { redactAnalyticsEvent, redactAnalyticsUrl } from './vercelAnalytics';

test('removes wallet and authentication query parameters from tracked URLs', () => {
  assert.equal(
    redactAnalyticsUrl('/?address=0x1111111111111111111111111111111111111111&auth_error=failed'),
    'https://walletgenome.invalid/',
  );
  assert.equal(
    redactAnalyticsUrl('/auth/callback?code=secret&next=/?address=0x1111111111111111111111111111111111111111'),
    'https://walletgenome.invalid/auth/callback',
  );
});

test('preserves the source origin and redacts wallet-shaped path segments', () => {
  assert.equal(redactAnalyticsUrl('https://walletgenome.space/docs#methodology'), 'https://walletgenome.space/docs');
  assert.equal(
    redactAnalyticsUrl('https://walletgenome.space/wallet/0x1111111111111111111111111111111111111111'),
    'https://walletgenome.space/wallet/[wallet]',
  );
});

test('preserves the event type while replacing its URL', () => {
  assert.deepEqual(
    redactAnalyticsEvent({
      type: 'pageview',
      url: 'https://walletgenome.space/?address=0x1111111111111111111111111111111111111111',
    }),
    { type: 'pageview', url: 'https://walletgenome.space/' },
  );
});
