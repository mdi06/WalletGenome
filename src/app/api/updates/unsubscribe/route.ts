import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashOpaqueToken } from '@/lib/auth/walletUpdateSubscriptions';

export const runtime = 'nodejs';

function redirect(request: Request, status: string): NextResponse {
  const destination = new URL('/updates/confirmation', request.url);
  destination.searchParams.set('status', status);
  return NextResponse.redirect(destination);
}

async function unsubscribe(request: NextRequest): Promise<boolean> {
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
  if (!token || token.length > 256 || !supabaseAdmin.hasConfiguration()) return false;

  let admin: ReturnType<typeof supabaseAdmin.createClient>;
  try {
    admin = supabaseAdmin.createClient();
  } catch {
    return false;
  }

  const tokenHash = hashOpaqueToken(token);
  const { data, error } = await admin.from('update_subscriptions')
    .select('user_id')
    .eq('unsubscribe_token_hash', tokenHash)
    .maybeSingle();
  if (error || !data || typeof data.user_id !== 'string') return false;

  const { data: updated, error: updateError } = await admin.from('update_subscriptions').update({
    subscribed: false,
    subscription_status: 'unsubscribed',
    withdrawn_at: new Date().toISOString(),
    confirmation_token_hash: null,
    confirmation_expires_at: null,
    confirmation_sent_at: null,
    unsubscribe_token_hash: null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', data.user_id)
    .eq('unsubscribe_token_hash', tokenHash)
    .select('user_id')
    .maybeSingle();
  return !updateError && Boolean(updated);
}

export async function GET(request: NextRequest) {
  return redirect(request, await unsubscribe(request) ? 'unsubscribed' : 'invalid');
}

export async function POST(request: NextRequest) {
  // RFC 8058 one-click unsubscribe expects a successful empty response. The
  // scoped token is in the List-Unsubscribe URL, so do not reveal row state.
  await unsubscribe(request);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
