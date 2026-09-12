import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfiguration } from './config';

export function getSupabaseAdminSecret(): string | null {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secretKey || legacyServiceRoleKey || null;
}

export function hasSupabaseAdminConfiguration(): boolean {
  return Boolean(getSupabaseAdminSecret() && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Server-only client for mutations that cannot safely be performed from the browser. */
export function createAdminClient() {
  const { url } = getSupabaseConfiguration();
  const secret = getSupabaseAdminSecret();
  if (!secret) throw new Error('Server Supabase secret key is not configured.');

  return createSupabaseClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

// Keep server dependencies behind a small object so route tests can replace
// the provider without ever constructing a real privileged client.
export const supabaseAdmin = {
  createClient: createAdminClient,
  hasConfiguration: hasSupabaseAdminConfiguration,
};
