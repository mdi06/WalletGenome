import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
  countAvailabilityStatuses,
  createScanRequestTelemetry,
  logScanRequest,
} from '@/lib/api/requestTelemetry';

describe('scan request telemetry', () => {
  it('accepts a safe request id and records aggregate operational fields only', () => {
    const telemetry = createScanRequestTelemetry(new Request('http://localhost/api/scan', {
      headers: { 'x-request-id': 'request-12345678' },
    }), 'scan');
    const messages: string[] = [];
    const infoMock = mock.method(console, 'info', (message: string) => messages.push(message));

    try {
      logScanRequest(telemetry, {
        outcome: 'completed',
        statusCode: 200,
        targetCount: 1,
        chainCount: 2,
        resultStatus: 'partial',
        availabilityCounts: countAvailabilityStatuses(['complete', 'partial', 'unavailable', 'partial']),
        failureCodes: ['provider_error', 'provider_error', 'unpriced'],
      });
    } finally {
      infoMock.mock.restore();
    }

    assert.equal(messages.length, 1);
    const event = JSON.parse(messages[0]) as Record<string, unknown>;
    assert.equal(event.requestId, 'request-12345678');
    assert.equal(event.route, 'scan');
    assert.equal(event.targetCount, 1);
    assert.deepEqual(event.availabilityCounts, { complete: 1, partial: 2, unavailable: 1 });
    assert.deepEqual(event.failureCodes, ['provider_error', 'unpriced']);
    assert.equal('address' in event, false);
    assert.equal('addresses' in event, false);
    assert.equal('apiKey' in event, false);
  });

  it('replaces unsafe client-supplied request ids', () => {
    const telemetry = createScanRequestTelemetry(new Request('http://localhost/api/batch-scan', {
      headers: { 'x-request-id': 'wallet=0x123 secret=value' },
    }), 'batch-scan');

    assert.match(telemetry.requestId, /^[0-9a-f-]{36}$/);
  });
});
