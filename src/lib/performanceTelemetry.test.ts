import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizePerformanceRoute,
  parsePerformanceMetricEvent,
} from './performanceTelemetry';

describe('performance telemetry contract', () => {
  it('normalizes paths without carrying query strings or user targets', () => {
    assert.equal(normalizePerformanceRoute('/'), '/');
    assert.equal(normalizePerformanceRoute('/docs'), '/docs');
    assert.equal(normalizePerformanceRoute('/crypto-wallet-risk-checker'), '/[slug]');
    assert.equal(normalizePerformanceRoute('/docs/risk?address=0x123'), '/other');
    assert.equal(normalizePerformanceRoute('/scan/0x123'), '/other');
    assert.equal(normalizePerformanceRoute('/?address=0x123'), '/[slug]');
  });

  it('accepts only the allowlisted aggregate metric shape', () => {
    const event = parsePerformanceMetricEvent({
      eventId: 'metric-12345678',
      routeTemplate: '/[slug]',
      deviceCategory: 'mobile',
      metricName: 'LCP',
      value: 2_100,
      rating: 'good',
      appVersion: '0.1.0',
    });

    assert.deepEqual(event, {
      eventId: 'metric-12345678',
      routeTemplate: '/[slug]',
      deviceCategory: 'mobile',
      metricName: 'LCP',
      value: 2_100,
      rating: 'good',
      appVersion: '0.1.0',
    });
  });

  it('rejects target-bearing, expanded, and out-of-range payloads', () => {
    const baseEvent = {
      eventId: 'metric-12345678',
      routeTemplate: '/',
      deviceCategory: 'desktop',
      metricName: 'CLS',
      value: 0.05,
      rating: 'good',
      appVersion: '0.1.0',
    };

    assert.equal(parsePerformanceMetricEvent({ ...baseEvent, url: '/?address=0x123' }), null);
    assert.equal(parsePerformanceMetricEvent({ ...baseEvent, routeTemplate: '/[slug]?address=0x123' }), null);
    assert.equal(parsePerformanceMetricEvent({ ...baseEvent, entries: [] }), null);
    assert.equal(parsePerformanceMetricEvent({ ...baseEvent, value: 101 }), null);
    assert.equal(parsePerformanceMetricEvent({ ...baseEvent, metricName: 'LCP', value: 600_001 }), null);
    assert.equal(parsePerformanceMetricEvent({ ...baseEvent, appVersion: 'secret value' }), null);
  });
});
