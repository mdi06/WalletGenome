import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeSiteUrl } from '@/lib/seo';
import { normalizeEmailAddress, validateEmailAddress } from './emailAddress';

export const WALLET_UPDATE_CONSENT_VERSION = '2026-09-11-v1';
export const WALLET_UPDATE_CAPTURE_SOURCE = 'wallet_post_first_scan';
export const WALLET_UPDATE_PROMPT_SOURCE = 'wallet_post_first_scan_prompt';
export const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
export const CONFIRMATION_RESEND_COOLDOWN_MS = 60 * 1000;

export type WalletUpdateStatus = 'prompted' | 'dismissed' | 'pending_confirmation' | 'confirmed' | 'unsubscribed';

export type StoredUpdateSubscription = {
  userId: string;
  email: string | null;
  pendingEmail: string | null;
  subscribed: boolean;
  subscriptionStatus: WalletUpdateStatus;
  consentedAt: string | null;
  confirmedAt: string | null;
  promptShownAt: string | null;
  promptDismissedAt: string | null;
  confirmationSentAt: string | null;
  confirmationExpiresAt: string | null;
};

export type EmailProviderConfig = {
  provider: 'resend';
  apiKey: string;
  from: string;
  confirmationTemplateId: string;
  siteUrl: URL;
};

export type EmailProviderConfigResult =
  | { configured: true; config: EmailProviderConfig }
  | { configured: false; missing: string[] };

export function getEmailProviderConfig(env: NodeJS.ProcessEnv = process.env): EmailProviderConfigResult {
  const provider = (env.EMAIL_PROVIDER ?? 'resend').trim().toLowerCase();
  const missing: string[] = [];
  if (provider !== 'resend') missing.push('EMAIL_PROVIDER=resend');
  if (!env.RESEND_API_KEY?.trim()) missing.push('RESEND_API_KEY');
  if (!env.EMAIL_FROM?.trim()) missing.push('EMAIL_FROM on a verified sending domain');
  if (!env.RESEND_CONFIRMATION_TEMPLATE_ID?.trim()) missing.push('RESEND_CONFIRMATION_TEMPLATE_ID for a published Resend template');
  const siteUrl = normalizeSiteUrl(env.SITE_URL);
  if (!siteUrl || (env.NODE_ENV === 'production' && siteUrl.protocol !== 'https:')) {
    missing.push('SITE_URL using the canonical HTTPS application URL');
  }

  if (missing.length > 0 || !env.RESEND_API_KEY?.trim() || !env.EMAIL_FROM?.trim() || !env.RESEND_CONFIRMATION_TEMPLATE_ID?.trim() || !siteUrl) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    config: {
      provider: 'resend',
      apiKey: env.RESEND_API_KEY.trim(),
      from: env.EMAIL_FROM.trim(),
      confirmationTemplateId: env.RESEND_CONFIRMATION_TEMPLATE_ID.trim(),
      siteUrl,
    },
  };
}

export function emailProviderConfigurationMessage(result: EmailProviderConfigResult): string {
  if (result.configured) return '';
  return `Email confirmation is not configured. Set ${result.missing.join(', ')} and a server-only SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Your address was not subscribed.`;
}

export function supabaseAdminConfigurationMessage(): string {
  return 'Email confirmation is not configured. Set a server-only SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Your address was not subscribed.';
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function buildScopedLink(siteUrl: URL, pathname: string, token: string): string {
  const url = new URL(pathname, siteUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function parseStoredUpdateSubscription(value: unknown): StoredUpdateSubscription | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.user_id !== 'string' || typeof record.subscribed !== 'boolean') return null;
  const status = record.subscription_status;
  if (status !== 'prompted' && status !== 'dismissed' && status !== 'pending_confirmation' && status !== 'confirmed' && status !== 'unsubscribed') return null;
  const nullableString = (candidate: unknown): string | null => typeof candidate === 'string' ? candidate : null;
  return {
    userId: record.user_id,
    email: nullableString(record.email),
    pendingEmail: nullableString(record.pending_email),
    subscribed: record.subscribed,
    subscriptionStatus: status,
    consentedAt: nullableString(record.consented_at),
    confirmedAt: nullableString(record.confirmed_at),
    promptShownAt: nullableString(record.prompt_shown_at),
    promptDismissedAt: nullableString(record.prompt_dismissed_at),
    confirmationSentAt: nullableString(record.confirmation_sent_at),
    confirmationExpiresAt: nullableString(record.confirmation_expires_at),
  };
}

export async function readStoredSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: StoredUpdateSubscription | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('update_subscriptions')
    .select('user_id,email,pending_email,subscribed,subscription_status,consented_at,confirmed_at,prompt_shown_at,prompt_dismissed_at,confirmation_sent_at,confirmation_expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  return { data: parseStoredUpdateSubscription(data), error };
}

export async function sendConfirmationEmail(
  config: EmailProviderConfig,
  email: string,
  confirmationLink: string,
  unsubscribeLink: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: 'Confirm your WalletGenome updates',
      template: {
        id: config.confirmationTemplateId,
        variables: {
          first_name: 'there',
          company_name: 'WalletGenome',
          confirmation_url: confirmationLink,
        },
      },
      headers: {
        'List-Unsubscribe': `<${unsubscribeLink}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  return response.ok;
}

export function validateAndNormalizeEmail(value: unknown) {
  const result = validateEmailAddress(value);
  return result.ok ? { ok: true as const, email: normalizeEmailAddress(result.email) } : result;
}
