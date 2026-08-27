import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unsuccessfulResponseError } from './scanClientError';

describe('unsuccessful scan response errors', () => {
  it('preserves a structured API error', async () => {
    const error = await unsuccessfulResponseError(Response.json(
      { error: 'Provider quota exhausted.' },
      { status: 429 },
    ));

    assert.equal(error.message, 'Provider quota exhausted.');
  });

  it('uses the HTTP status when the response is not JSON', async () => {
    const error = await unsuccessfulResponseError(
      new Response('upstream unavailable', { status: 503 }),
    );

    assert.equal(error.message, 'HTTP 503');
  });
});
