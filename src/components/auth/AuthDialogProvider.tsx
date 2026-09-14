'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { PENDING_LIVE_SCAN_KEY } from '@/lib/auth/pendingLiveScan';
import LiveScanSignInDialog from './LiveScanSignInDialog';
import { useAuth } from './AuthProvider';

export type SignInDialogRequest = {
  onGoogleContinue?: () => Promise<string | null>;
  onWalletAuthenticated?: () => void;
  onClose?: () => void;
  returnFocusFallbackRef?: React.RefObject<HTMLElement | null>;
};

type AuthDialogContextValue = {
  openSignInDialog: (
    request?: SignInDialogRequest,
    trigger?: HTMLElement | null,
  ) => void;
};

const unavailableContext: AuthDialogContextValue = {
  openSignInDialog: () => {},
};

const AuthDialogContext = createContext<AuthDialogContextValue>(unavailableContext);

const GOOGLE_SIGN_IN_ERROR = 'Google sign-in could not start. Please try again, or cancel and return to your page.';

function currentPathWithSearch(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function clearPendingLiveScan(): void {
  try {
    window.localStorage.removeItem(PENDING_LIVE_SCAN_KEY);
  } catch {
    // Storage may be unavailable; header authentication still remains independent of scans.
  }
}

export function AuthDialogProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading, signInWithGoogle } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<SignInDialogRequest>({});
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [returnFocusFallbackRef, setReturnFocusFallbackRef] = useState<React.RefObject<HTMLElement | null> | undefined>(undefined);

  const resetDialog = useCallback(() => {
    requestRef.current = {};
    setError(null);
    setIsStarting(false);
    setIsOpen(false);
    setReturnFocusFallbackRef(undefined);
  }, []);

  const closeSignInDialog = useCallback(() => {
    requestRef.current.onClose?.();
    resetDialog();
  }, [resetDialog]);

  const openSignInDialog = useCallback((request: SignInDialogRequest = {}, trigger?: HTMLElement | null) => {
    if (isStarting) return;
    if (!request.onGoogleContinue && !request.onWalletAuthenticated) clearPendingLiveScan();
    requestRef.current = request;
    returnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setReturnFocusFallbackRef(request.returnFocusFallbackRef);
    setError(null);
    setIsOpen(true);
  }, [isStarting]);

  const continueWithGoogle = useCallback(async () => {
    if (isStarting) return;
    if (isAuthLoading) {
      setError('Checking your sign-in status. Please try again in a moment.');
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const request = requestRef.current;
      const message = request.onGoogleContinue
        ? await request.onGoogleContinue()
        : await signInWithGoogle(currentPathWithSearch());
      if (message) {
        setError(message || GOOGLE_SIGN_IN_ERROR);
        return;
      }
      resetDialog();
    } catch {
      setError(GOOGLE_SIGN_IN_ERROR);
    } finally {
      setIsStarting(false);
    }
  }, [isAuthLoading, isStarting, resetDialog, signInWithGoogle]);

  const handleWalletAuthenticated = useCallback(() => {
    requestRef.current.onWalletAuthenticated?.();
    resetDialog();
  }, [resetDialog]);

  const value = { openSignInDialog };

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <LiveScanSignInDialog
        open={isOpen}
        isStarting={isStarting}
        error={error}
        onContinue={() => void continueWithGoogle()}
        onWalletAuthenticated={handleWalletAuthenticated}
        onClose={closeSignInDialog}
        returnFocusRef={returnFocusRef}
        returnFocusFallbackRef={returnFocusFallbackRef}
      />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}
