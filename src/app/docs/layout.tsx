import type { Metadata } from 'next';
import JsonLd, { type JsonLdObject } from '@/components/JsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/seo';

const title = 'Methodology & Algorithmic Documentation';
const description =
  'Read how WalletGenome sources data and calculates wallet behavior, risk, approval exposure, capital flow, activity, identity, and Sybil signals.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/docs') },
  openGraph: {
    type: 'article',
    url: absoluteUrl('/docs'),
    siteName: SITE_NAME,
    title: `${title} | ${SITE_NAME}`,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | ${SITE_NAME}`,
    description,
  },
};

const docsJsonLd: JsonLdObject = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  '@id': absoluteUrl('/docs#article'),
  headline: 'How WalletGenome Computes On-Chain Intelligence',
  description,
  url: absoluteUrl('/docs'),
  isPartOf: {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
  },
  about: [
    'EVM wallet analytics',
    'Blockchain forensics',
    'Wallet risk scoring',
    'Token approval analysis',
  ],
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={docsJsonLd} />
      {children}
    </>
  );
}
