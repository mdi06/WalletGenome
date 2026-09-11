import { createClient } from './server';
import { hasSupabaseConfiguration } from './config';

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  if (!hasSupabaseConfiguration()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const subject = claims?.sub;

  if (error || typeof subject !== 'string') return null;
  return {
    id: subject,
    email: typeof claims?.email === 'string' ? claims.email : null,
  };
}

// Kept as a narrow dependency object so route tests can exercise the
// authorization boundary without manufacturing a signed Supabase cookie.
export const authentication = { getAuthenticatedUser };
