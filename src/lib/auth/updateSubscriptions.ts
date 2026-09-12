import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js';
import { getWalletIdentity } from './ethereumWallet';
import { normalizeEmailAddress, validateEmailAddress } from './emailAddress';

export const GOOGLE_UPDATE_CONSENT_VERSION = '2026-09-11-v1';
export const GOOGLE_UPDATE_CAPTURE_SOURCE = 'google_post_first_scan';
export const GOOGLE_UPDATE_PROMPT_SOURCE = 'google_post_first_scan_prompt';
export const WALLET_UPDATE_PROMPT_SOURCE = 'wallet_post_first_scan_prompt';

export type UpdateSubscriptionRecord = {
  email: string | null;
  subscribed: boolean;
  subscriptionStatus: 'prompted' | 'dismissed' | 'pending_confirmation' | 'confirmed' | 'unsubscribed' | null;
  promptShownAt: string | null;
  promptDismissedAt: string | null;
  confirmationSentAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseSubscriptionRecord(value: unknown): UpdateSubscriptionRecord | null {
  if (!isRecord(value) || typeof value.subscribed !== 'boolean') return null;
  const status = value.subscription_status;
  return {
    email: nullableString(value.email),
    subscribed: value.subscribed,
    subscriptionStatus: status === 'prompted'
      || status === 'dismissed'
      || status === 'pending_confirmation'
      || status === 'confirmed'
      || status === 'unsubscribed'
      ? status
      : null,
    promptShownAt: nullableString(value.prompt_shown_at),
    promptDismissedAt: nullableString(value.prompt_dismissed_at),
    confirmationSentAt: nullableString(value.confirmation_sent_at),
  };
}

export function getVerifiedGoogleEmail(user: User | null): string | null {
  if (!user?.email) return null;

  const googleIdentity = user.identities?.find(identity => identity.provider === 'google');
  if (!googleIdentity || !isRecord(googleIdentity.identity_data)) return null;

  const identityEmail = googleIdentity.identity_data.email;
  if (googleIdentity.identity_data.email_verified !== true || typeof identityEmail !== 'string') return null;
  if (identityEmail.toLowerCase() !== user.email.toLowerCase()) return null;

  return user.email;
}

export function maskEmail(email: string): string {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === email.length - 1) return 'm••••@email address';
  return `${email.slice(0, 1)}••••${email.slice(atIndex)}`;
}

export function isSuccessfulLiveScan(status: 'complete' | 'partial' | 'unavailable'): boolean {
  return status === 'complete' || status === 'partial';
}

export function shouldOfferGoogleUpdatesPrompt(
  user: User | null,
  liveScanUserId: string | null,
  isAuthLoading: boolean,
  isScanLoading: boolean,
): boolean {
  return Boolean(
    user
    && !isAuthLoading
    && !isScanLoading
    && liveScanUserId === user.id
    && getVerifiedGoogleEmail(user),
  );
}

export function shouldOfferWalletUpdatesPrompt(
  user: User | null,
  liveScanUserId: string | null,
  isAuthLoading: boolean,
  isScanLoading: boolean,
): boolean {
  return Boolean(
    user
    && !isAuthLoading
    && !isScanLoading
    && liveScanUserId === user.id
    && !getVerifiedGoogleEmail(user)
    && getWalletIdentity(user),
  );
}

async function readUpdateSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: UpdateSubscriptionRecord | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('update_subscriptions')
    .select('email,subscribed,subscription_status,prompt_shown_at,prompt_dismissed_at,confirmation_sent_at')
    .eq('user_id', userId)
    .maybeSingle();

  return { data: parseSubscriptionRecord(data), error };
}

export async function loadUpdateSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: UpdateSubscriptionRecord | null; error: PostgrestError | null }> {
  return readUpdateSubscription(supabase, userId);
}

export async function recordGoogleUpdatesPromptShown(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<PostgrestError | null> {
  const current = await readUpdateSubscription(supabase, userId);
  if (current.error) return current.error;
  if (current.data?.subscribed || current.data?.promptShownAt || current.data?.promptDismissedAt) return null;

  const now = new Date().toISOString();
  if (current.data) {
    const { error } = await supabase
      .from('update_subscriptions')
      .update({ prompt_shown_at: now, source: GOOGLE_UPDATE_PROMPT_SOURCE, updated_at: now })
      .eq('user_id', userId)
      .eq('subscribed', false);
    return error;
  }

  const { error } = await supabase.from('update_subscriptions').insert({
    user_id: userId,
    email,
    subscribed: false,
    subscription_status: 'prompted',
    source: GOOGLE_UPDATE_PROMPT_SOURCE,
    prompt_shown_at: now,
    updated_at: now,
  });
  return error;
}

export async function dismissGoogleUpdatesPrompt(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<PostgrestError | null> {
  const current = await readUpdateSubscription(supabase, userId);
  if (current.error) return current.error;
  if (current.data?.subscribed) return null;

  const now = new Date().toISOString();
  if (current.data) {
    const { error } = await supabase
      .from('update_subscriptions')
      .update({ prompt_dismissed_at: now, updated_at: now })
      .eq('user_id', userId)
      .eq('subscribed', false);
    return error;
  }

  const { error } = await supabase.from('update_subscriptions').insert({
    user_id: userId,
    email,
    subscribed: false,
    subscription_status: 'dismissed',
    source: GOOGLE_UPDATE_PROMPT_SOURCE,
    prompt_shown_at: now,
    prompt_dismissed_at: now,
    updated_at: now,
  });
  return error;
}

export async function recordWalletUpdatesPromptShown(
  supabase: SupabaseClient,
  userId: string,
): Promise<PostgrestError | null> {
  const current = await readUpdateSubscription(supabase, userId);
  if (current.error) return current.error;
  if (current.data?.subscribed || current.data?.promptShownAt || current.data?.promptDismissedAt) return null;

  const now = new Date().toISOString();
  if (current.data) {
    const { error } = await supabase
      .from('update_subscriptions')
      .update({ prompt_shown_at: now, subscription_status: 'prompted', source: WALLET_UPDATE_PROMPT_SOURCE, updated_at: now })
      .eq('user_id', userId)
      .is('email', null);
    return error;
  }

  const { error } = await supabase.from('update_subscriptions').insert({
    user_id: userId,
    email: null,
    subscribed: false,
    subscription_status: 'prompted',
    source: WALLET_UPDATE_PROMPT_SOURCE,
    prompt_shown_at: now,
    updated_at: now,
  });
  return error;
}

export async function dismissWalletUpdatesPrompt(
  supabase: SupabaseClient,
  userId: string,
): Promise<PostgrestError | null> {
  const current = await readUpdateSubscription(supabase, userId);
  if (current.error) return current.error;
  if (current.data?.subscribed || current.data?.subscriptionStatus === 'pending_confirmation' || current.data?.subscriptionStatus === 'confirmed') return null;

  const now = new Date().toISOString();
  if (current.data) {
    const { error } = await supabase
      .from('update_subscriptions')
      .update({
        prompt_shown_at: current.data.promptShownAt ?? now,
        prompt_dismissed_at: now,
        subscription_status: 'dismissed',
        updated_at: now,
      })
      .eq('user_id', userId)
      .is('email', null);
    return error;
  }

  const { error } = await supabase.from('update_subscriptions').insert({
    user_id: userId,
    email: null,
    subscribed: false,
    subscription_status: 'dismissed',
    source: WALLET_UPDATE_PROMPT_SOURCE,
    prompt_shown_at: now,
    prompt_dismissed_at: now,
    updated_at: now,
  });
  return error;
}

export { normalizeEmailAddress, validateEmailAddress };

export async function subscribeToUpdates(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  source: string,
): Promise<PostgrestError | null> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('update_subscriptions').upsert({
    user_id: userId,
    email,
    subscribed: true,
    subscription_status: 'confirmed',
    consented_at: now,
    confirmed_at: now,
    consent_version: GOOGLE_UPDATE_CONSENT_VERSION,
    source,
    updated_at: now,
  }, { onConflict: 'user_id' });
  return error;
}

export async function unsubscribeFromUpdates(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<PostgrestError | null> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('update_subscriptions')
    .update({ subscribed: false, subscription_status: 'unsubscribed', withdrawn_at: now, updated_at: now })
    .eq('user_id', userId)
    .eq('email', email);
  return error;
}
