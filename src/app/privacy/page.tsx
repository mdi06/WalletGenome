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
        <p>WalletGenome analyses publicly observable EVM activity. Live scans require either Google sign-in or an Ethereum wallet sign-in message. Wallet authentication does not request a transaction, private key, or access to funds.</p>
        <section><h2 className="text-base font-black text-[#0a0a0a]">Account information</h2><p>Google sign-in provides a Google account identifier and email address. An Ethereum wallet provides a wallet identity, not an email address. A wallet-entered email is never collected during connection or inside the EIP-4361 authentication message, and it is not automatically made into a login method or linked to another account.</p></section>
        <section><h2 className="text-base font-black text-[#0a0a0a]">Product updates</h2><p>Updates are optional and separate from authentication. After a successful live scan, a wallet user may choose “Email me updates” and enter an address for occasional beta and product updates. That explicit request records the authenticated wallet user ID, email address, wallet-auth source, consent timestamp, consent-copy version, subscription state, and update timestamp.</p><p>Wallet-entered addresses remain pending until a confirmation link is used. Confirmation links and unsubscribe links are cryptographically random, single-use, expiry- or account-scoped security links; token hashes, not raw confirmation tokens, are stored. If email delivery is not configured, the address is not claimed to be confirmed or subscribed. “Not now” records prompt dismissal separately from consent, does not subscribe you to email updates, and does not reduce product access. Consent can be withdrawn through the unsubscribe link in an update email, with a withdrawal timestamp retained.</p><p>Subscription records are retained while needed to operate the update list and honor preferences. An unsubscribe record remains as a suppression and consent-audit record; prior consent evidence is retained. Deleting the authenticated account removes its subscription row through the account foreign-key cascade. Scan inputs and reports remain request-only and are not saved as account history.</p></section>
        <section><h2 className="text-base font-black text-[#0a0a0a]">Wallet addresses</h2><p>A submitted address is used to run the requested analysis. Submitting an address does not prove that you own it.</p></section>
      </article>
    </main>
  );
}
