'use client';

import { Bell, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';

export default function BetaUpdatesCard() {
  const { user, isConfigured } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isConfigured) return;
    const supabase = createClient();
    void supabase
      .from('update_subscriptions')
      .select('subscribed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setSubscribed(data?.subscribed === true);
      });
  }, [user, isConfigured]);

  if (!user || !isConfigured) return null;

  const updateSubscription = async (nextSubscribed: boolean) => {
    if (!user?.email || !isConfigured) return;
    setIsSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from('update_subscriptions').upsert({
      user_id: user.id,
      email: user.email,
      subscribed: nextSubscribed,
      consented_at: nextSubscribed ? new Date().toISOString() : null,
      source: 'scanner_beta_card',
      updated_at: new Date().toISOString(),
    });
    setIsSaving(false);
    if (error) {
      setMessage('We could not save that preference. Please try again.');
      return;
    }
    setSubscribed(nextSubscribed);
    setMessage(nextSubscribed ? 'You are on the WalletGenome beta update list.' : 'You will no longer receive product updates.');
  };

  return (
    <section aria-labelledby="beta-updates-title" className="card-3d mx-auto flex max-w-3xl flex-col gap-3 border-l-4 border-l-[#ff5500] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">WalletGenome beta</p>
        <h2 id="beta-updates-title" className="mt-0.5 text-sm font-black text-[#0a0a0a]">Join the beta update list</h2>
        <p className="mt-1 text-xs font-medium leading-relaxed text-[#4b5563]">This is an early version. Subscribe only if you want occasional product and beta updates.</p>
      </div>
      <div className="shrink-0">
        <button type="button" disabled={isSaving} onClick={() => void updateSubscription(!subscribed)} className="btn-3d-orange inline-flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-xs font-black disabled:opacity-60">
          {subscribed ? <CheckCircle2 size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
          {subscribed ? 'UPDATES ON' : 'GET UPDATES'}
        </button>
        {message && <p role="status" className="mt-1.5 max-w-56 text-right text-[10px] font-bold text-[#4b5563]">{message}</p>}
      </div>
    </section>
  );
}
