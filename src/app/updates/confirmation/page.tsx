import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { absoluteUrl, SITE_NAME } from '@/lib/seo';

const title = 'Update email status';
const description = 'Confirmation and unsubscribe status for optional WalletGenome product updates.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/updates/confirmation') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/updates/confirmation'),
    siteName: SITE_NAME,
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [],
  },
  twitter: {
    card: 'summary',
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type ConfirmationStatus = 'confirmed' | 'expired' | 'unsubscribed' | 'configuration' | 'invalid';

function getCopy(status: string | undefined): { eyebrow: string; title: string; body: string } {
  switch (status as ConfirmationStatus) {
    case 'confirmed':
      return { eyebrow: 'Updates confirmed', title: 'Your WalletGenome updates are on.', body: 'You confirmed this email for occasional beta and product updates. Every update email includes a scoped unsubscribe link.' };
    case 'unsubscribed':
      return { eyebrow: 'Updates stopped', title: 'You are unsubscribed.', body: 'This scoped link turned off WalletGenome product updates. No wallet reconnection was required.' };
    case 'expired':
      return { eyebrow: 'Confirmation expired', title: 'That link is no longer valid.', body: 'Confirmation links expire after 24 hours. Return to the scanner and request another confirmation email if you still want updates.' };
    case 'configuration':
      return { eyebrow: 'Email unavailable', title: 'Confirmation is temporarily unavailable.', body: 'The project email-confirmation service is not configured. Your address was not confirmed or subscribed.' };
    default:
      return { eyebrow: 'Link not accepted', title: 'That link is invalid or already used.', body: 'Confirmation and unsubscribe links are single-use, security-scoped links. Request a fresh confirmation email if needed.' };
  }
}

export default async function UpdateConfirmationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const copy = getCopy(params.status);
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SiteHeader activePage="privacy" />
      <article className="card-3d space-y-5 p-5 text-sm leading-relaxed text-[#374151] sm:p-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">{copy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0a0a0a]">{copy.title}</h1>
        </div>
        <p>{copy.body}</p>
        <Link href="/" className="btn-3d-orange inline-flex min-h-11 items-center justify-center px-4 py-2 text-xs font-black uppercase text-[#0a0a0a]">Return to scanner</Link>
      </article>
    </main>
  );
}
