import assert from 'node:assert/strict';
import test from 'node:test';
import { redactAnalyticsEvent, redactAnalyticsUrl } from './vercelAnalytics';

test('removes wallet and authentication query parameters from tracked URLs', () => {
  assert.equal(
    redactAnalyticsUrl('/?address=0x1111111111111111111111111111111111111111&auth_error=failed'),
    '/',
  );
  assert.equal(
    redactAnalyticsUrl('/auth/callback?code=secret&next=/?address=0x1111111111111111111111111111111111111111'),
    '/auth/callback',
  );
});

test('preserves public paths and redacts wallet-shaped path segments', () => {
  assert.equal(redactAnalyticsUrl('/docs#methodology'), '/docs');
  assert.equal(
    redactAnalyticsUrl('/wallet/0x1111111111111111111111111111111111111111'),
    '/wallet/[wallet]',
  );
});

test('preserves the event type while replacing its URL', () => {
  assert.deepEqual(
    redactAnalyticsEvent({
      type: 'pageview',
      url: '/?address=0x1111111111111111111111111111111111111111',
    }),
    { type: 'pageview', url: '/' },
  );
});
