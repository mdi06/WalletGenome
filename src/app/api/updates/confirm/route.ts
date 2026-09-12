import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashOpaqueToken } from '@/lib/auth/walletUpdateSubscriptions';

export const runtime = 'nodejs';

function redirect(request: Request, status: string): NextResponse {
  const destination = new URL('/updates/confirmation', request.url);
  destination.searchParams.set('status', status);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
  const adminConfigured = supabaseAdmin.hasConfiguration();
  if (!token || token.length > 256 || !adminConfigured) return redirect(request, adminConfigured ? 'invalid' : 'configuration');

  let admin: ReturnType<typeof supabaseAdmin.createClient>;
  try {
    admin = supabaseAdmin.createClient();
  } catch {
    return redirect(request, 'configuration');
  }

  const tokenHash = hashOpaqueToken(token);
  const { data, error } = await admin.from('update_subscriptions')
    .select('user_id,email,pending_email,subscription_status,confirmation_expires_at')
    .eq('confirmation_token_hash', tokenHash)
    .maybeSingle();
  if (error || !data || typeof data.user_id !== 'string') return redirect(request, 'invalid');

  const record = data as Record<string, unknown>;
  if (record.subscription_status !== 'pending_confirmation') return redirect(request, 'invalid');
  const expiresAt = typeof record.confirmation_expires_at === 'string' ? Date.parse(record.confirmation_expires_at) : NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await admin.from('update_subscriptions').update({
      confirmation_token_hash: null,
      confirmation_expires_at: null,
      confirmation_sent_at: null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', record.user_id).eq('confirmation_token_hash', tokenHash);
    return redirect(request, 'expired');
  }

  const email = typeof record.pending_email === 'string' ? record.pending_email : record.email;
  if (typeof email !== 'string' || email.length === 0) return redirect(request, 'invalid');

  const { data: updated, error: updateError } = await admin.from('update_subscriptions').update({
    email,
    pending_email: null,
    subscribed: true,
    subscription_status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    confirmation_token_hash: null,
    confirmation_expires_at: null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', record.user_id)
    .eq('confirmation_token_hash', tokenHash)
    .eq('subscription_status', 'pending_confirmation')
    .select('user_id')
    .maybeSingle();

  return updateError || !updated ? redirect(request, 'invalid') : redirect(request, 'confirmed');
}
