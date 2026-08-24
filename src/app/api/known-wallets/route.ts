import { NextResponse } from 'next/server';

export function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      error: 'Known-wallet labels are read-only configuration and cannot be changed through the API.',
    },
    {
      status: 405,
      headers: {
        Allow: 'GET',
        'Cache-Control': 'no-store',
      },
    },
  );
}
