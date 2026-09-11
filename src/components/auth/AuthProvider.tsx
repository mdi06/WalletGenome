'use client';

import { type User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfiguration } from '@/lib/supabase/config';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const unavailableContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isConfigured: false,
  signInWithGoogle: async () => 'Sign-in is not configured yet.',
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextValue>(unavailableContext);

function safeNextPath(nextPath: string | undefined): string {
  return nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = hasSupabaseConfiguration();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) return;
    const supabase = createClient();
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user);
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signInWithGoogle = useCallback(async (nextPath?: string) => {
    if (!isConfigured) return 'Sign-in is not configured yet.';
    const supabase = createClient();
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', safeNextPath(nextPath));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });
    return error?.message ?? null;
  }, [isConfigured]);

  const signOut = useCallback(async () => {
    if (!isConfigured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
  }, [isConfigured]);

  const value = useMemo(() => ({ user, isLoading, isConfigured, signInWithGoogle, signOut }), [user, isLoading, isConfigured, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
