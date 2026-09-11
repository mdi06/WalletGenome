import {
  calculatePerformanceRating,
  parsePerformanceMetricEvent,
  PERFORMANCE_APP_VERSION,
} from '@/lib/performanceTelemetry';
import {
  enforceRequestRateLimit,
  parseJsonBody,
  RequestPolicyError,
} from '@/lib/api/requestPolicy';

export const runtime = 'nodejs';

const EVENT_DEDUPE_WINDOW_MS = 5 * 60 * 1_000;
const MAX_REMEMBERED_EVENT_IDS = 4_096;
const seenEventIds = new Map<string, number>();

function errorResponse(status: number, message: string): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (origin === 'null' || new URL(origin).origin !== new URL(request.url).origin) {
        return errorResponse(403, 'Performance telemetry origin is not allowed.');
      }
    } catch {
      return errorResponse(403, 'Performance telemetry origin is not allowed.');
    }
  }

  try {
    enforceRequestRateLimit(request, 'telemetry');
  } catch (error) {
    if (error instanceof RequestPolicyError) return errorResponse(error.status, error.message);
    return errorResponse(429, 'Performance telemetry is temporarily limited.');
  }

  let parsed: unknown;
  try {
    parsed = await parseJsonBody(request, 'telemetry');
  } catch (error) {
    if (error instanceof RequestPolicyError) return errorResponse(error.status, error.message);
    return errorResponse(400, 'Performance telemetry payload could not be read.');
  }

  const event = parsePerformanceMetricEvent(parsed);
  if (!event) return errorResponse(400, 'Performance telemetry payload is invalid.');
  if (event.appVersion !== PERFORMANCE_APP_VERSION) {
    return errorResponse(400, 'Performance telemetry app version is not supported.');
  }

  const now = Date.now();
  for (const [eventId, seenAt] of seenEventIds) {
    if (now - seenAt >= EVENT_DEDUPE_WINDOW_MS) seenEventIds.delete(eventId);
  }
  if (seenEventIds.has(event.eventId)) {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
  seenEventIds.set(event.eventId, now);
  while (seenEventIds.size > MAX_REMEMBERED_EVENT_IDS) {
    const oldestId = seenEventIds.keys().next().value;
    if (typeof oldestId !== 'string') break;
    seenEventIds.delete(oldestId);
  }

  const serverRating = calculatePerformanceRating(event.metricName, event.value);

  // Vercel Observability is the approved destination for this aggregate event.
  // The allowlisted event contains no wallet target, query string, URL, secret,
  // provider response, or raw scan result.
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'wallet_web_vital',
    ...event,
    rating: serverRating,
  }));

  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
