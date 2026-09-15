import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGoogleAnalyticsPageView,
  createGoogleAnalyticsBootstrap,
  normalizeGoogleAnalyticsMeasurementId,
} from './googleAnalytics';

test('accepts only normalized GA4 measurement IDs', () => {
  assert.equal(normalizeGoogleAnalyticsMeasurementId(' g-8gttb08jj2 '), 'G-8GTTB08JJ2');
  assert.equal(normalizeGoogleAnalyticsMeasurementId('UA-123456-1'), null);
  assert.equal(normalizeGoogleAnalyticsMeasurementId('G-<script>'), null);
});

test('disables automatic page views before sending sanitized ones', () => {
  const bootstrap = createGoogleAnalyticsBootstrap('G-8GTTB08JJ2');
  assert.match(bootstrap, /send_page_view: false/);
  assert.match(bootstrap, /gtag\('config', 'G-8GTTB08JJ2'/);
});

test('removes query data, fragments, and wallet addresses from GA page views', () => {
  assert.deepEqual(
    buildGoogleAnalyticsPageView('https://www.walletgenome.space/wallet/0x1111111111111111111111111111111111111111?token=secret#report'),
    {
      page_location: 'https://www.walletgenome.space/wallet/[wallet]',
      page_path: '/wallet/[wallet]',
    },
  );
});
