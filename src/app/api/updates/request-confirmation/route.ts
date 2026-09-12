import { NextRequest, NextResponse } from 'next/server';
import { getWalletIdentity } from '@/lib/auth/ethereumWallet';
import { authentication } from '@/lib/supabase/requireUser';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  buildScopedLink,
  CONFIRMATION_TTL_MS,
  createOpaqueToken,
  emailProviderConfigurationMessage,
  getEmailProviderConfig,
  hashOpaqueToken,
  readStoredSubscription,
  sendConfirmationEmail,
  supabaseAdminConfigurationMessage,
  validateAndNormalizeEmail,
  WALLET_UPDATE_CAPTURE_SOURCE,
  WALLET_UPDATE_CONSENT_VERSION,
} from '@/lib/auth/walletUpdateSubscriptions';

export const runtime = 'nodejs';

function noStoreJson(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readEmail(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) return null;
    return (body as Record<string, unknown>).email;
  } catch {
    return null;
  }
}

async function isEthereumUser(admin: ReturnType<typeof supabaseAdmin.createClient>, userId: string): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  return !error && getWalletIdentity(data.user) !== null;
}

export async function POST(request: NextRequest) {
  const authenticatedUser = await authentication.getAuthenticatedUser();
  if (!authenticatedUser) return noStoreJson({ code: 'authentication_required', message: 'Sign in with your Ethereum wallet first.' }, 401);

  const validation = validateAndNormalizeEmail(await readEmail(request));
  if (!validation.ok) return noStoreJson({ code: 'invalid_email', field: 'email', message: validation.message }, 400);

  const provider = getEmailProviderConfig();
  if (!provider.configured || !supabaseAdmin.hasConfiguration()) {
    return noStoreJson({
      code: 'email_delivery_not_configured',
      state: 'configuration_required',
      message: provider.configured ? supabaseAdminConfigurationMessage() : emailProviderConfigurationMessage(provider),
    }, 503);
  }

  let admin: ReturnType<typeof supabaseAdmin.createClient>;
  try {
    admin = supabaseAdmin.createClient();
  } catch {
    return noStoreJson({
      code: 'email_delivery_not_configured',
      state: 'configuration_required',
      message: emailProviderConfigurationMessage({ configured: false, missing: ['SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)'] }),
    }, 503);
  }

  if (!await isEthereumUser(admin, authenticatedUser.id)) {
    return noStoreJson({ code: 'wallet_auth_required', message: 'This email capture is available for an Ethereum wallet-authenticated account.' }, 403);
  }

  const current = await readStoredSubscription(admin, authenticatedUser.id);
  if (current.error) return noStoreJson({ code: 'subscription_unavailable', message: 'We could not read your update preference. Please try again.' }, 500);

  if (current.data?.subscriptionStatus === 'confirmed' && current.data.email === validation.email) {
    return noStoreJson({ state: 'confirmed', message: 'This email is already confirmed for WalletGenome updates.' }, 200);
  }
  if (current.data?.subscriptionStatus === 'confirmed' && current.data.email !== validation.email) {
    return noStoreJson({ code: 'different_confirmed_address', message: 'A different email is already confirmed for this wallet account. Unsubscribe before requesting another address.' }, 409);
  }

  const confirmationToken = createOpaqueToken();
  const unsubscribeToken = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONFIRMATION_TTL_MS);
  const nowIso = now.toISOString();
  const { error: saveError } = await admin.from('update_subscriptions').upsert({
    user_id: authenticatedUser.id,
    email: validation.email,
    pending_email: null,
    subscribed: false,
    subscription_status: 'pending_confirmation',
    consented_at: nowIso,
    consent_version: WALLET_UPDATE_CONSENT_VERSION,
    source: WALLET_UPDATE_CAPTURE_SOURCE,
    confirmed_at: null,
    confirmation_token_hash: hashOpaqueToken(confirmationToken),
    confirmation_expires_at: expiresAt.toISOString(),
    confirmation_sent_at: nowIso,
    unsubscribe_token_hash: hashOpaqueToken(unsubscribeToken),
    updated_at: nowIso,
  }, { onConflict: 'user_id' });

  if (saveError) return noStoreJson({ code: 'subscription_unavailable', message: 'We could not save your update request. Please try again.' }, 500);

  const confirmationLink = buildScopedLink(provider.config.siteUrl, '/api/updates/confirm', confirmationToken);
  const unsubscribeLink = buildScopedLink(provider.config.siteUrl, '/api/updates/unsubscribe', unsubscribeToken);
  let delivered = false;
  try {
    delivered = await sendConfirmationEmail(provider.config, validation.email, confirmationLink, unsubscribeLink);
  } catch {
    delivered = false;
  }

  if (!delivered) {
    return noStoreJson({
      code: 'confirmation_delivery_failed',
      state: 'pending_confirmation',
      message: 'Your request is pending, but the confirmation email could not be sent. Try again later.',
    }, 503);
  }

  return noStoreJson({
    state: 'pending_confirmation',
    message: 'Check your inbox for a confirmation link. Your updates subscription stays pending until you confirm it.',
  }, 202);
}
