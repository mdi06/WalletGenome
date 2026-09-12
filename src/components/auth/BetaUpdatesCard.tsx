'use client';

import { Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getVerifiedGoogleEmail,
  loadUpdateSubscription,
  maskEmail,
  subscribeToUpdates,
  unsubscribeFromUpdates,
} from '@/lib/auth/updateSubscriptions';
import { getWalletIdentity } from '@/lib/auth/ethereumWallet';
import type { UpdateSubscriptionRecord } from '@/lib/auth/updateSubscriptions';
import { useAuth } from './AuthProvider';

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export default function BetaUpdatesCard() {
  const { user, isConfigured } = useAuth();
  const googleEmail = getVerifiedGoogleEmail(user);
  const walletUser = Boolean(user && getWalletIdentity(user));
  const [record, setRecord] = useState<UpdateSubscriptionRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isConfigured) return;
    const supabase = createClient();
    void loadUpdateSubscription(supabase, user.id).then(({ data, error }) => {
      if (!error) setRecord(data);
    });
  }, [user, isConfigured]);

  if (!user || !isConfigured || (!googleEmail && (!walletUser || !record))) return null;

  const updateGoogleSubscription = async (nextSubscribed: boolean) => {
    if (!googleEmail || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    const supabase = createClient();
    const error = nextSubscribed
      ? await subscribeToUpdates(supabase, user.id, googleEmail, 'scanner_beta_card')
      : await unsubscribeFromUpdates(supabase, user.id, googleEmail);
    setIsSaving(false);
    if (error) {
      setMessage('We could not save that preference. Please try again.');
      return;
    }
    setRecord({
      email: googleEmail,
      subscribed: nextSubscribed,
      subscriptionStatus: nextSubscribed ? 'confirmed' : 'unsubscribed',
      promptShownAt: record?.promptShownAt ?? null,
      promptDismissedAt: record?.promptDismissedAt ?? null,
      confirmationSentAt: record?.confirmationSentAt ?? null,
    });
    setMessage(nextSubscribed ? 'You are on the WalletGenome beta update list.' : 'You will no longer receive product updates.');
  };

  const resendConfirmation = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/updates/resend-confirmation', { method: 'POST' });
      const body = await readResponse(response);
      setMessage(typeof body.message === 'string' ? body.message : response.ok ? 'Check your inbox for the latest confirmation link.' : 'We could not resend confirmation. Please try again later.');
    } catch {
      setMessage('We could not reach the confirmation service. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  if (walletUser && !googleEmail) {
    const status = record?.subscriptionStatus;
    const isConfirmed = status === 'confirmed' && record?.subscribed;
    return (
      <section aria-labelledby="beta-updates-title" className="card-3d mx-auto flex max-w-3xl flex-col gap-3 border-l-4 border-l-[#ff5500] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">WalletGenome beta</p>
          <h2 id="beta-updates-title" className="mt-0.5 text-sm font-black text-[#0a0a0a]">Wallet update preference</h2>
          <p className="mt-1 text-xs font-medium leading-relaxed text-[#4b5563]">
            {status === 'pending_confirmation' && 'Confirmation is pending. We will not send product updates until you confirm your email.'}
            {isConfirmed && `Updates are on for ${maskEmail(record.email ?? '')}.`}
            {status === 'unsubscribed' && 'Updates are off for this wallet account.'}
            {status !== 'pending_confirmation' && !isConfirmed && status !== 'unsubscribed' && 'No product updates are enabled for this wallet account.'}
          </p>
        </div>
        {status === 'pending_confirmation' && (
          <button type="button" disabled={isSaving} onClick={() => void resendConfirmation()} className="btn-3d-orange inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-3 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-60">
            {isSaving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Resend confirmation
          </button>
        )}
        {message && <p role="status" className="text-[10px] font-bold text-[#4b5563] sm:max-w-56 sm:text-right">{message}</p>}
      </section>
    );
  }

  const subscribed = record?.subscribed === true;
  return (
    <section aria-labelledby="beta-updates-title" className="card-3d mx-auto flex max-w-3xl flex-col gap-3 border-l-4 border-l-[#ff5500] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">WalletGenome beta</p>
        <h2 id="beta-updates-title" className="mt-0.5 text-sm font-black text-[#0a0a0a]">Join the beta update list</h2>
        <p className="mt-1 text-xs font-medium leading-relaxed text-[#4b5563]">This is an early version. Subscribe only if you want occasional product and beta updates.</p>
      </div>
      <div className="shrink-0">
        <button type="button" disabled={isSaving} onClick={() => void updateGoogleSubscription(!subscribed)} className="btn-3d-orange inline-flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-xs font-black disabled:opacity-60">
          {subscribed ? <CheckCircle2 size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
          {subscribed ? 'UPDATES ON' : 'GET UPDATES'}
        </button>
        {message && <p role="status" className="mt-1.5 max-w-56 text-right text-[10px] font-bold text-[#4b5563]">{message}</p>}
      </div>
    </section>
  );
}
