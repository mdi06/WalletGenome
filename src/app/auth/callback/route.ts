import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  const signInUrl = new URL('/', requestUrl.origin);
  signInUrl.searchParams.set('auth_error', 'google_sign_in_failed');
  return NextResponse.redirect(signInUrl);
}
