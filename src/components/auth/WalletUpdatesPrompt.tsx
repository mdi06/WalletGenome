'use client';

import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppDialog from '@/components/AppDialog';
import { createClient } from '@/lib/supabase/client';
import {
  dismissWalletUpdatesPrompt,
  loadUpdateSubscription,
  recordWalletUpdatesPromptShown,
  validateEmailAddress,
} from '@/lib/auth/updateSubscriptions';
import { useAuth } from './AuthProvider';

interface WalletUpdatesPromptProps {
  eligible: boolean;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

type ConfirmationState = 'form' | 'pending';

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export default function WalletUpdatesPrompt({ eligible, returnFocusRef }: WalletUpdatesPromptProps) {
  const { user, isConfigured } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<ConfirmationState>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const checkedUserIdRef = useRef<string | null>(null);
  const handledRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!eligible || !isConfigured || !user) {
      if (!user) checkedUserIdRef.current = null;
      return;
    }
    if (checkedUserIdRef.current === user.id) return;
    checkedUserIdRef.current = user.id;
    handledRef.current = false;
    let active = true;
    const supabase = createClient();

    void loadUpdateSubscription(supabase, user.id).then(async ({ data, error: loadError }) => {
      if (!active || loadError || data?.subscribed || data?.promptShownAt || data?.promptDismissedAt || data?.subscriptionStatus === 'pending_confirmation' || data?.subscriptionStatus === 'confirmed' || data?.subscriptionStatus === 'unsubscribed') return;
      const shownError = await recordWalletUpdatesPromptShown(supabase, user.id);
      if (!active || shownError) return;
      setEmail('');
      setState('form');
      setError(null);
      setOpen(true);
    });

    return () => {
      active = false;
    };
  }, [eligible, isConfigured, user]);

  const handleDismiss = useCallback(() => {
    if (isSaving || savingRef.current || handledRef.current || !user || !isConfigured) return;
    handledRef.current = true;
    setOpen(false);
    void dismissWalletUpdatesPrompt(createClient(), user.id);
  }, [isConfigured, isSaving, user]);

  const handleClose = useCallback(() => {
    if (isSaving || savingRef.current) return;
    if (state === 'form' && !handledRef.current && user && isConfigured) {
      handledRef.current = true;
      void dismissWalletUpdatesPrompt(createClient(), user.id);
    }
    setOpen(false);
  }, [isConfigured, isSaving, state, user]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || savingRef.current || handledRef.current || !user || !isConfigured) return;
    const validation = validateEmailAddress(email);
    if (!validation.ok) {
      setError(validation.message);
      emailInputRef.current?.focus();
      return;
    }

    setEmail(validation.email);
    setError(null);
    savingRef.current = true;
    setIsSaving(true);
    try {
      const response = await fetch('/api/updates/request-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validation.email }),
      });
      const body = await readResponse(response);
      if (response.ok && body.state === 'confirmed') {
        handledRef.current = true;
        setState('pending');
        setError('This email is already confirmed for WalletGenome updates.');
        return;
      }
      if (response.ok || response.status === 202) {
        handledRef.current = true;
        setState('pending');
        setError(null);
        return;
      }
      setError(typeof body.message === 'string' ? body.message : 'We could not start email confirmation. Please try again.');
    } catch {
      setError('We could not reach the email confirmation service. Your address was not subscribed. Try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [email, isConfigured, isSaving, user]);

  const isVisible = open && eligible && isConfigured && Boolean(user);
  if (!isVisible) return null;

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      titleId="wallet-updates-title"
      descriptionId="wallet-updates-description"
      initialFocusRef={emailInputRef}
      returnFocusRef={returnFocusRef}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">
            <Mail size={14} aria-hidden="true" />
            <span>Optional email updates</span>
          </div>
          <h2 id="wallet-updates-title" className="text-xl font-black leading-tight text-[#0a0a0a]">Get WalletGenome updates</h2>
        </div>

        {state === 'form' ? (
          <>
            <p id="wallet-updates-description" className="text-sm font-medium leading-relaxed text-[#4b5563]">Wallets do not provide an email address. Add one if you want occasional beta and product updates.</p>
            {error && <p id="wallet-updates-email-error" role="alert" className="border-l-4 border-l-[#ef4444] bg-[#fff1f2] p-3 text-xs font-bold leading-relaxed text-[#991b1b]">{error}</p>}
            <form noValidate onSubmit={event => void handleSubmit(event)} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="wallet-updates-email" className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4b5563]">Email address</label>
                <input
                  ref={emailInputRef}
                  id="wallet-updates-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'wallet-updates-email-error' : undefined}
                  className="well-recessed-light min-h-11 w-full px-3 py-2 text-sm font-medium text-[#0a0a0a] placeholder:text-[#6b7280]"
                  placeholder="name@example.com"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="submit" disabled={isSaving} aria-busy={isSaving} className="btn-3d-orange inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-60">
                  {isSaving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  <span>Email me updates</span>
                </button>
                <button type="button" onClick={handleDismiss} disabled={isSaving} className="btn-3d-neutral inline-flex min-h-11 items-center justify-center px-4 py-2 text-xs font-black text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60">Not now</button>
              </div>
            </form>
          </>
        ) : (
          <div id="wallet-updates-description" className="space-y-3 text-sm font-medium leading-relaxed text-[#4b5563]">
            <p role="status">Check your inbox for a confirmation link. Your updates subscription stays pending until you confirm it.</p>
            <button type="button" onClick={() => setOpen(false)} className="btn-3d-neutral inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-xs font-black text-[#0a0a0a]">Close</button>
          </div>
        )}

        <p className="border-t border-[#e2e2e6] pt-3 text-[11px] font-bold leading-relaxed text-[#6b7280]">Unsubscribe anytime.{' '}<Link href="/privacy" className="text-orange-ink underline underline-offset-2 hover:text-[#0a0a0a]">Privacy policy</Link></p>
      </div>
    </AppDialog>
  );
}
