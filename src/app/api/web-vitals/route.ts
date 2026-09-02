import { parsePerformanceMetricEvent } from '@/lib/performanceTelemetry';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 2_048;

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
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && Number.parseInt(declaredLength, 10) > MAX_BODY_BYTES) {
    return errorResponse(413, 'Performance telemetry payload is too large.');
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return errorResponse(400, 'Performance telemetry payload could not be read.');
  }

  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'Performance telemetry payload is too large.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return errorResponse(400, 'Performance telemetry payload must be valid JSON.');
  }

  const event = parsePerformanceMetricEvent(parsed);
  if (!event) return errorResponse(400, 'Performance telemetry payload is invalid.');

  // Vercel Observability is the approved destination for this aggregate event.
  // The allowlisted event contains no wallet target, query string, URL, secret,
  // provider response, or raw scan result.
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'wallet_web_vital',
    ...event,
  }));

  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
