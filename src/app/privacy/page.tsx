import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SiteHeader activePage="privacy" />
      <article className="card-3d space-y-5 p-5 text-sm leading-relaxed text-[#374151] sm:p-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">WalletGenome beta</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0a0a0a]">Privacy</h1>
        </div>
        <p>WalletGenome analyses publicly observable EVM activity. It does not request wallet connections, private keys, or signatures.</p>
        <section><h2 className="text-base font-black text-[#0a0a0a]">Account information</h2><p>When you sign in with Google, Supabase stores your account identifier and email address so WalletGenome can limit live scans to signed-in users.</p></section>
        <section><h2 className="text-base font-black text-[#0a0a0a]">Product updates</h2><p>Updates are optional. If you enable them, WalletGenome stores your subscription preference and consent time. You can turn updates off from the scanner at any time.</p></section>
        <section><h2 className="text-base font-black text-[#0a0a0a]">Wallet addresses</h2><p>A submitted address is used to run the requested analysis. Submitting an address does not prove that you own it.</p></section>
      </article>
    </main>
  );
}
