'use client';

import { type User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfiguration } from '@/lib/supabase/config';
import {
  discoverEthereumWallets,
  signInWithEthereumWallet,
  type DiscoveredEthereumWallet,
  type EthereumAuthPhase,
  type EthereumSignInResult,
  type EthereumWalletDiscoveryResult,
} from '@/lib/auth/ethereumWallet';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<string | null>;
  discoverEthereumWallets: () => Promise<EthereumWalletDiscoveryResult>;
  signInWithEthereum: (
    wallet: DiscoveredEthereumWallet,
    onPhase?: (phase: EthereumAuthPhase) => void,
  ) => Promise<EthereumSignInResult>;
  signOut: () => Promise<void>;
};

const unavailableContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isConfigured: false,
  signInWithGoogle: async () => 'Sign-in is not configured yet.',
  discoverEthereumWallets: async () => ({ wallets: [], usedLegacyFallback: false }),
  signInWithEthereum: async () => ({
    ok: false,
    error: { code: 'verification_failed', message: 'Sign-in is not configured yet.' },
  }),
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

  const discoverEthereumWalletsForAuth = useCallback(async () => {
    return discoverEthereumWallets();
  }, []);

  const signInWithEthereum = useCallback(async (
    wallet: DiscoveredEthereumWallet,
    onPhase: (phase: EthereumAuthPhase) => void = () => {},
  ): Promise<EthereumSignInResult> => {
    if (!isConfigured) {
      return {
        ok: false,
        error: { code: 'verification_failed', message: 'Sign-in is not configured yet.' },
      };
    }

    const supabase = createClient();
    const url = new URL(window.location.pathname, window.location.origin);
    const result = await signInWithEthereumWallet(supabase, wallet, url.toString(), onPhase);
    if (result.ok) setUser(result.user);
    return result;
  }, [isConfigured]);

  const signOut = useCallback(async () => {
    if (!isConfigured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
  }, [isConfigured]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isConfigured,
    signInWithGoogle,
    discoverEthereumWallets: discoverEthereumWalletsForAuth,
    signInWithEthereum,
    signOut,
  }), [user, isLoading, isConfigured, signInWithGoogle, discoverEthereumWalletsForAuth, signInWithEthereum, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
