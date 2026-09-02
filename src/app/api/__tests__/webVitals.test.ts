import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { POST } from '../web-vitals/route';

const validEvent = {
  eventId: 'metric-12345678',
  routeTemplate: '/',
  deviceCategory: 'desktop',
  metricName: 'LCP',
  value: 1_850,
  rating: 'good',
  appVersion: '0.1.0',
} as const;

describe('POST /api/web-vitals', () => {
  it('writes only the privacy-safe event to the approved structured-log sink', async () => {
    const messages: string[] = [];
    const infoMock = mock.method(console, 'info', (message: string) => messages.push(message));

    try {
      const response = await POST(new Request('http://localhost/api/web-vitals?address=0x123', {
        method: 'POST',
        body: JSON.stringify(validEvent),
      }));

      assert.equal(response.status, 204);
    } finally {
      infoMock.mock.restore();
    }

    assert.equal(messages.length, 1);
    const event = JSON.parse(messages[0]) as Record<string, unknown>;
    assert.equal(event.event, 'wallet_web_vital');
    assert.equal(event.eventId, validEvent.eventId);
    assert.equal(event.routeTemplate, '/');
    assert.equal(event.metricName, 'LCP');
    assert.equal(event.value, 1_850);
    assert.deepEqual(
      Object.keys(event).sort(),
      ['appVersion', 'deviceCategory', 'event', 'eventId', 'metricName', 'rating', 'routeTemplate', 'timestamp', 'value'].sort(),
    );
    assert.equal('address' in event, false);
    assert.equal('url' in event, false);
    assert.equal('entries' in event, false);
  });

  it('rejects malformed, expanded, and oversized payloads without logging them', async () => {
    const messages: string[] = [];
    const infoMock = mock.method(console, 'info', (message: string) => messages.push(message));

    try {
      const malformed = await POST(new Request('http://localhost/api/web-vitals', {
        method: 'POST',
        body: '{',
      }));
      assert.equal(malformed.status, 400);

      const expanded = await POST(new Request('http://localhost/api/web-vitals', {
        method: 'POST',
        body: JSON.stringify({ ...validEvent, walletAddress: '0x123' }),
      }));
      assert.equal(expanded.status, 400);

      const oversized = await POST(new Request('http://localhost/api/web-vitals', {
        method: 'POST',
        body: 'x'.repeat(2_049),
      }));
      assert.equal(oversized.status, 413);
    } finally {
      infoMock.mock.restore();
    }

    assert.deepEqual(messages, []);
  });
});
