'use client';

import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppDialog from '@/components/AppDialog';
import { createClient } from '@/lib/supabase/client';
import {
  dismissGoogleUpdatesPrompt,
  getVerifiedGoogleEmail,
  loadUpdateSubscription,
  maskEmail,
  recordGoogleUpdatesPromptShown,
  subscribeToUpdates,
  GOOGLE_UPDATE_CAPTURE_SOURCE,
} from '@/lib/auth/updateSubscriptions';
import { useAuth } from './AuthProvider';

interface GoogleUpdatesPromptProps {
  eligible: boolean;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

export default function GoogleUpdatesPrompt({ eligible, returnFocusRef }: GoogleUpdatesPromptProps) {
  const { user, isConfigured } = useAuth();
  const googleEmail = getVerifiedGoogleEmail(user);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notNowButtonRef = useRef<HTMLButtonElement>(null);
  const checkedUserIdRef = useRef<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!eligible || !isConfigured || !user || !googleEmail) {
      if (!user) checkedUserIdRef.current = null;
      return;
    }
    if (checkedUserIdRef.current === user.id) return;
    checkedUserIdRef.current = user.id;
    handledRef.current = false;
    let active = true;
    const supabase = createClient();

    void loadUpdateSubscription(supabase, user.id).then(async ({ data, error: loadError }) => {
      if (!active || loadError || data?.subscribed || data?.promptShownAt || data?.promptDismissedAt) return;
      const shownError = await recordGoogleUpdatesPromptShown(supabase, user.id, googleEmail);
      if (!active || shownError) return;
      setError(null);
      setOpen(true);
    });

    return () => {
      active = false;
    };
  }, [eligible, googleEmail, isConfigured, user]);

  const handleDismiss = useCallback(() => {
    if (isSaving || handledRef.current || !user || !googleEmail || !isConfigured) return;
    handledRef.current = true;
    setOpen(false);
    const supabase = createClient();
    void dismissGoogleUpdatesPrompt(supabase, user.id, googleEmail);
  }, [googleEmail, isConfigured, isSaving, user]);

  const handleSubscribe = useCallback(async () => {
    if (isSaving || handledRef.current || !user || !googleEmail || !isConfigured) return;
    setIsSaving(true);
    setError(null);
    const supabase = createClient();
    const saveError = await subscribeToUpdates(
      supabase,
      user.id,
      googleEmail,
      GOOGLE_UPDATE_CAPTURE_SOURCE,
    );
    if (saveError) {
      setError('We could not save your update preference. Please try again.');
      setIsSaving(false);
      return;
    }
    handledRef.current = true;
    setIsSaving(false);
    setOpen(false);
  }, [googleEmail, isConfigured, isSaving, user]);

  const isVisible = open && eligible && isConfigured && Boolean(googleEmail);
  if (!isVisible || !googleEmail) return null;

  return (
    <AppDialog
      open={open}
      onClose={handleDismiss}
      titleId="google-updates-title"
      descriptionId="google-updates-description"
      initialFocusRef={notNowButtonRef}
      returnFocusRef={returnFocusRef}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">
            <Mail size={14} aria-hidden="true" />
            <span>Optional email updates</span>
          </div>
          <h2 id="google-updates-title" className="text-xl font-black leading-tight text-[#0a0a0a]">
            Get WalletGenome updates
          </h2>
        </div>

        <div id="google-updates-description" className="space-y-2 text-sm font-medium leading-relaxed text-[#4b5563]">
          <p>Receive occasional beta and product updates at:</p>
          <p className="font-mono font-bold text-[#0a0a0a]" aria-label={`Google email destination: ${googleEmail}`}>
            <span aria-hidden="true">{maskEmail(googleEmail)}</span>
          </p>
        </div>

        {error && (
          <p role="alert" className="border-l-4 border-l-[#ef4444] bg-[#fff1f2] p-3 text-xs font-bold leading-relaxed text-[#991b1b]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleSubscribe()}
            disabled={isSaving}
            aria-busy={isSaving}
            className="btn-3d-orange inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            <span>Email me updates</span>
          </button>
          <button
            ref={notNowButtonRef}
            type="button"
            onClick={handleDismiss}
            disabled={isSaving}
            className="btn-3d-neutral inline-flex min-h-11 items-center justify-center px-4 py-2 text-xs font-black text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
          >
            Not now
          </button>
        </div>

        <p className="border-t border-[#e2e2e6] pt-3 text-[11px] font-bold leading-relaxed text-[#6b7280]">
          Unsubscribe anytime.{' '}
          <Link href="/privacy" className="text-orange-ink underline underline-offset-2 hover:text-[#0a0a0a]">
            Privacy policy
          </Link>
        </p>
      </div>
    </AppDialog>
  );
}
