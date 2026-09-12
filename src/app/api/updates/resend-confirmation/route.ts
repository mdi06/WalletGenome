import { NextResponse } from 'next/server';
import { getWalletIdentity } from '@/lib/auth/ethereumWallet';
import { authentication } from '@/lib/supabase/requireUser';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  buildScopedLink,
  CONFIRMATION_RESEND_COOLDOWN_MS,
  CONFIRMATION_TTL_MS,
  createOpaqueToken,
  emailProviderConfigurationMessage,
  getEmailProviderConfig,
  hashOpaqueToken,
  readStoredSubscription,
  sendConfirmationEmail,
  supabaseAdminConfigurationMessage,
} from '@/lib/auth/walletUpdateSubscriptions';

export const runtime = 'nodejs';

const resendAttempts = new Map<string, number>();

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function isEthereumUser(admin: ReturnType<typeof supabaseAdmin.createClient>, userId: string): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  return !error && getWalletIdentity(data.user) !== null;
}

export async function POST() {
  const authenticatedUser = await authentication.getAuthenticatedUser();
  if (!authenticatedUser) return json({ code: 'authentication_required', message: 'Sign in with your Ethereum wallet first.' }, 401);

  const provider = getEmailProviderConfig();
  if (!provider.configured || !supabaseAdmin.hasConfiguration()) {
    return json({ code: 'email_delivery_not_configured', state: 'configuration_required', message: provider.configured ? supabaseAdminConfigurationMessage() : emailProviderConfigurationMessage(provider) }, 503);
  }

  let admin: ReturnType<typeof supabaseAdmin.createClient>;
  try {
    admin = supabaseAdmin.createClient();
  } catch {
    return json({ code: 'email_delivery_not_configured', state: 'configuration_required', message: 'Email confirmation is not configured. Add a server-only Supabase secret key. No email was sent.' }, 503);
  }
  if (!await isEthereumUser(admin, authenticatedUser.id)) return json({ code: 'wallet_auth_required', message: 'This action is available for an Ethereum wallet-authenticated account.' }, 403);

  const current = await readStoredSubscription(admin, authenticatedUser.id);
  if (current.error) return json({ code: 'subscription_unavailable', message: 'We could not read your update preference. Please try again.' }, 500);

  const email = current.data?.email;
  if (!current.data || current.data.subscriptionStatus !== 'pending_confirmation' || !email) {
    return json({ state: 'pending_confirmation', message: 'If a pending confirmation exists, a new message will be sent.' }, 202);
  }

  const now = Date.now();
  const inMemoryLastSent = resendAttempts.get(authenticatedUser.id) ?? 0;
  const storedLastSent = current.data.confirmationSentAt ? Date.parse(current.data.confirmationSentAt) : 0;
  const lastSent = Math.max(inMemoryLastSent, Number.isFinite(storedLastSent) ? storedLastSent : 0);
  if (now - lastSent < CONFIRMATION_RESEND_COOLDOWN_MS) {
    return json({ code: 'confirmation_resend_rate_limited', state: 'pending_confirmation', message: 'Please wait before requesting another confirmation email.' }, 429);
  }

  const confirmationToken = createOpaqueToken();
  const unsubscribeToken = createOpaqueToken();
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + CONFIRMATION_TTL_MS);
  const sentAtIso = sentAt.toISOString();
  const eligibleSince = new Date(now - CONFIRMATION_RESEND_COOLDOWN_MS).toISOString();
  const { data: saved, error: saveError } = await admin.from('update_subscriptions').update({
    confirmation_token_hash: hashOpaqueToken(confirmationToken),
    confirmation_expires_at: expiresAt.toISOString(),
    confirmation_sent_at: sentAtIso,
    unsubscribe_token_hash: hashOpaqueToken(unsubscribeToken),
    updated_at: sentAtIso,
  }).eq('user_id', authenticatedUser.id)
    .eq('subscription_status', 'pending_confirmation')
    .or(`confirmation_sent_at.is.null,confirmation_sent_at.lt.${eligibleSince}`)
    .select('user_id')
    .maybeSingle();
  if (saveError) return json({ code: 'subscription_unavailable', message: 'We could not prepare another confirmation email. Please try again.' }, 500);
  if (!saved) return json({ code: 'confirmation_resend_rate_limited', state: 'pending_confirmation', message: 'Please wait before requesting another confirmation email.' }, 429);

  resendAttempts.set(authenticatedUser.id, now);
  const confirmationLink = buildScopedLink(provider.config.siteUrl, '/api/updates/confirm', confirmationToken);
  const unsubscribeLink = buildScopedLink(provider.config.siteUrl, '/api/updates/unsubscribe', unsubscribeToken);
  let delivered = false;
  try {
    delivered = await sendConfirmationEmail(provider.config, email, confirmationLink, unsubscribeLink);
  } catch {
    delivered = false;
  }
  if (!delivered) return json({ code: 'confirmation_delivery_failed', state: 'pending_confirmation', message: 'The confirmation email could not be sent. Try again later.' }, 503);

  return json({ state: 'pending_confirmation', message: 'If a pending confirmation exists, check your inbox for the latest link.' }, 202);
}
