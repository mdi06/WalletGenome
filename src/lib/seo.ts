import type { Metadata } from 'next';
import type { JsonLdObject } from '@/components/JsonLd';

export const SITE_NAME = 'WalletGenome';
export const SITE_DESCRIPTION =
  'Analyze observable EVM wallet activity, security signals, approvals, capital flows, and Sybil patterns across Ethereum, Base, Arbitrum, and Optimism.';

const LOCAL_SITE_URL = 'http://localhost:3000';

export function normalizeSiteUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;

  const candidate = value.trim();
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

export function getSiteUrl(): URL {
  return (
    normalizeSiteUrl(process.env.SITE_URL) ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL) ??
    new URL(LOCAL_SITE_URL)
  );
}

export function absoluteUrl(path = '/'): string {
  return new URL(path, getSiteUrl()).toString();
}

export interface SeoLandingPage {
  slug: string;
  primaryIntent: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  scopeNote: string;
  capabilities: readonly { title: string; description: string }[];
  usefulFor: readonly string[];
  limitations: readonly string[];
  faqs: readonly { question: string; answer: string }[];
  relatedSlugs: readonly string[];
}

export const SEO_LANDING_PAGES = [
  {
    slug: 'evm-wallet-analytics',
    primaryIntent: 'Understand a wallet’s observable behavior across supported EVM networks.',
    title: 'EVM Wallet Analytics',
    metaDescription:
      'Analyze a wallet’s observable behavior across Ethereum, Base, Arbitrum, and Optimism, including activity cadence, counterparties, protocol use, gas, and public identity context.',
    eyebrow: 'MULTI-CHAIN WALLET INTELLIGENCE',
    heading: 'Analyze EVM Wallet Behavior Across Four Networks',
    intro:
      'Use WalletGenome to turn returned public transactions, transfers, contract calls, and identity records into a readable cross-chain behavior profile. It is an analytics report, not a trading service.',
    scopeNote:
      'Scope: public indexed activity only. Off-chain actions and wallet control are not visible, and incomplete provider history remains partial or unavailable.',
    capabilities: [
      {
        title: 'Behavioral fingerprinting',
        description:
          'Review activity intensity, wallet maturity, counterparty breadth, protocol diversity, and other explainable behavioral dimensions.',
      },
      {
        title: 'Cross-chain activity',
        description:
          'Compare verified transaction history and activity coverage across supported EVM networks without connecting the wallet.',
      },
      {
        title: 'Identity context',
        description:
          'Resolve available public ENS and Web3 identity records while keeping unverified identity claims separate from confirmed data.',
      },
    ],
    usefulFor: [
      'Understanding how an address uses DeFi and other smart contracts',
      'Reviewing wallet maturity, cadence, counterparties, and network breadth',
      'Investigating a wallet before deeper manual on-chain research',
    ],
    limitations: [
      'The report covers supported public EVM data sources, not off-chain activity.',
      'Incomplete provider history is labeled partial or unavailable rather than treated as zero.',
      'Behavioral classifications are analytical summaries, not proof of ownership or intent.',
    ],
    faqs: [
      {
        question: 'What does an EVM wallet analytics report include?',
        answer:
          'It summarizes returned public transactions, token transfers, contract interactions, gas usage, counterparties, activity cadence, and available identity records on the supported networks.',
      },
      {
        question: 'Do I need to connect a wallet?',
        answer:
          'No wallet connection is required if you use Google sign-in. Fresh live scans require an authenticated session; Ethereum wallet sign-in uses a login message only and never requests a transaction or private key.',
      },
      {
        question: 'Which networks does WalletGenome support?',
        answer:
          'The current scanner supports Ethereum, Base, Arbitrum, and Optimism.',
      },
    ],
    relatedSlugs: ['multi-chain-wallet-forensics', 'crypto-wallet-risk-checker'],
  },
  {
    slug: 'crypto-wallet-risk-checker',
    primaryIntent: 'Screen an EVM address for configured on-chain security risk signals.',
    title: 'Crypto Wallet Risk Checker',
    metaDescription:
      'Screen an EVM address for observable security signals from approvals, failed transactions, stale approvals, and unidentified contract interactions across four supported networks.',
    eyebrow: 'EXPLAINABLE SECURITY REVIEW',
    heading: 'Screen an EVM Wallet for Observable Security Signals',
    intro:
      'Use WalletGenome to review the configured factors behind an address’s risk score without turning a heuristic into a safety verdict. The tool is read-only and does not trade or submit transactions.',
    scopeNote:
      'A score is a screening signal, not proof of safety, compromise, malicious intent, or ownership.',
    capabilities: [
      {
        title: 'Explainable risk factors',
        description:
          'Inspect the recorded contribution of approval, failure-rate, stale-approval, and unknown-contract heuristics.',
      },
      {
        title: 'Data completeness',
        description:
          'See when the risk headline is withheld because required wallet history is partial or unavailable instead of treating missing records as clean activity.',
      },
      {
        title: 'Worst-chain summary',
        description:
          'Use the highest supported-chain risk score as the aggregate headline when the underlying history is complete.',
      },
    ],
    usefulFor: [
      'Reviewing visible warning signs before interacting with an address',
      'Finding which supported chain contributes the highest observed risk',
      'Identifying factors that deserve manual investigation',
    ],
    limitations: [
      'A score is not proof that a wallet is safe, malicious, or controlled by a particular person.',
      'Definitive risk conclusions are withheld when required provider history is incomplete.',
      'The scanner does not detect every exploit, compromise, or off-chain threat.',
    ],
    faqs: [
      {
        question: 'Can a wallet risk checker prove that an address is safe?',
        answer:
          'No. It can surface observable on-chain warning signs, but it cannot prove safety or predict every compromise.',
      },
      {
        question: 'Which factors can affect the risk score?',
        answer:
          'The score combines documented factors such as observed high-risk approvals, failed transaction ratio, stale approvals, and unidentified contract interactions. The methodology page lists the current rules.',
      },
      {
        question: 'What happens when wallet history is incomplete?',
        answer:
          'WalletGenome labels the affected datasets and withholds definitive risk conclusions instead of interpreting missing records as clean activity.',
      },
    ],
    relatedSlugs: ['token-approval-checker', 'sybil-wallet-analysis'],
  },
  {
    slug: 'token-approval-checker',
    primaryIntent: 'Inspect observed ERC-20 allowance approvals and their estimated exposure.',
    title: 'Token Approval Checker',
    metaDescription:
      'Review observed ERC-20 approvals for an EVM address, including spender, allowance size, approval age, and exposure estimates based on returned history and available prices.',
    eyebrow: 'ERC-20 ALLOWANCE AUDIT',
    heading: 'Check Observed ERC-20 Approvals and Allowance Exposure',
    intro:
      'Use WalletGenome to review the latest approval states it can reconstruct from returned transaction history. It does not query a live allowance or revoke anything.',
    scopeNote:
      'An approval row is historical evidence. Confirm the current allowance on-chain before acting, and treat unavailable balance or price data as unavailable—not zero.',
    capabilities: [
      {
        title: 'Approval decoding',
        description:
          'Decode ERC-20 approve calls to identify spender addresses and distinguish finite from unlimited allowance values.',
      },
      {
        title: 'Spender and age context',
        description:
          'Review spender labels, approval age, and observed non-revoked state without treating an old approval as proof that an allowance is still active.',
      },
      {
        title: 'Exposure estimates',
        description:
          'Estimate exposure from reconstructed positive balances and available current prices; unknown balances or prices remain unavailable.',
      },
    ],
    usefulFor: [
      'Finding observable unlimited ERC-20 approval transactions',
      'Reviewing spender addresses and approval age',
      'Separating approval counts from estimated monetary exposure',
    ],
    limitations: [
      'Historical approval transactions do not always prove that an allowance remains active today.',
      'Exposure estimates depend on available current balances and prices.',
      'Users should verify and revoke allowances through a trusted chain-specific tool when action is required.',
    ],
    faqs: [
      {
        question: 'What is an unlimited token approval?',
        answer:
          'It is an ERC-20 allowance that authorizes a spender to transfer a very large maximum amount, often used so an application does not need approval before every transaction.',
      },
      {
        question: 'Does an old approval prove the allowance is still active?',
        answer:
          'Not necessarily. A later transaction may have changed or revoked it, so approval history should be reviewed with current chain state when making a security decision.',
      },
      {
        question: 'Does WalletGenome revoke approvals?',
        answer:
          'No. WalletGenome is read-only and does not submit transactions. Ethereum wallet authentication, when used, is a login message rather than a transaction.',
      },
    ],
    relatedSlugs: ['crypto-wallet-risk-checker', 'multi-chain-wallet-forensics'],
  },
  {
    slug: 'sybil-wallet-analysis',
    primaryIntent: 'Review configured Sybil and blacklist signals for an EVM address.',
    title: 'Sybil Wallet Analysis',
    metaDescription:
      'Review configured Sybil, sanctions, and blacklist signals for an EVM address, with behavioral heuristics and source availability kept separate.',
    eyebrow: 'BEHAVIORAL AND LIST-BASED SIGNALS',
    heading: 'Review Sybil and Blacklist Signals for an EVM Address',
    intro:
      'WalletGenome compares returned wallet behavior with configured public-list snapshots and a local MEDIA-style heuristic. These outputs prioritize review; they do not establish common ownership or wrongdoing.',
    scopeNote:
      'A positive match reflects a configured source record, while a clear or unavailable result does not prove the absence of Sybil activity.',
    capabilities: [
      {
        title: 'Behavioral heuristic',
        description:
          'Summarize activity duration, cadence, diversity, cross-chain breadth, and available value signals as a heuristic rather than a definitive identity judgment.',
      },
      {
        title: 'Source-specific matches',
        description:
          'Report positive matches from configured public Sybil, sanctions, and blacklist sources with each source’s status kept visible.',
      },
      {
        title: 'Separate evidence states',
        description:
          'Keep list matches, behavioral scores, and unavailable checks separate so one signal does not masquerade as another kind of evidence.',
      },
    ],
    usefulFor: [
      'Screening addresses for public-list matches',
      'Comparing behavioral indicators across supported chains',
      'Prioritizing addresses for deeper graph and funding-path investigation',
    ],
    limitations: [
      'Behavioral similarity does not prove common ownership or coordinated control.',
      'Public lists may be incomplete, delayed, or unavailable at scan time.',
      'A clear result is not proof that an address has never participated in Sybil activity.',
    ],
    faqs: [
      {
        question: 'What is Sybil wallet analysis?',
        answer:
          'It reviews public address behavior and available list-based evidence for patterns sometimes associated with coordinated or duplicate identities.',
      },
      {
        question: 'Can behavioral analysis prove common wallet ownership?',
        answer:
          'No. Similar timing, funding, or protocol activity can support further investigation but does not prove that addresses share an owner.',
      },
      {
        question: 'Are blacklist matches and behavioral scores the same thing?',
        answer:
          'No. WalletGenome reports direct public-list matches separately from its behavioral probability model.',
      },
    ],
    relatedSlugs: ['multi-chain-wallet-forensics', 'crypto-wallet-risk-checker'],
  },
  {
    slug: 'multi-chain-wallet-forensics',
    primaryIntent: 'Investigate cross-chain transfers, counterparties, and evidence coverage.',
    title: 'Multi-Chain Wallet Forensics',
    metaDescription:
      'Investigate cross-chain EVM wallet activity, transfer paths, counterparties, gas, approvals, and evidence coverage across Ethereum, Base, Arbitrum, and Optimism.',
    eyebrow: 'CROSS-NETWORK INVESTIGATION',
    heading: 'Investigate Cross-Chain Wallet Activity With Evidence Coverage',
    intro:
      'Use WalletGenome to assemble a chain-aware view of returned transactions, transfers, counterparties, protocol labels, gas, approvals, and identity records. It is for investigation, not trading or portfolio custody.',
    scopeNote:
      'Coverage is limited to four EVM networks and returned provider data; flow totals and prices stay labelled when history or pricing is incomplete.',
    capabilities: [
      {
        title: 'Chain-aware evidence',
        description:
          'Keep transactions, contracts, gas units, and protocol attribution tied to the network where the activity occurred.',
      },
      {
        title: 'Transfer-flow evidence',
        description:
          'Explore returned transfer legs, recurring counterparties, and supported protocol interactions through an interactive flow view.',
      },
      {
        title: 'Coverage reporting',
        description:
          'Distinguish complete, partial, and unavailable datasets and label historical, estimated, assumed, and unpriced values.',
      },
    ],
    usefulFor: [
      'Building an initial cross-chain picture of an address',
      'Finding high-frequency counterparties and protocol interactions',
      'Separating verified historical values from estimates and unpriced activity',
    ],
    limitations: [
      'The scanner currently covers four EVM networks rather than every blockchain.',
      'Capital-flow views describe public transfer evidence, not beneficial ownership.',
      'Partial price coverage produces labeled lower bounds, not complete portfolio valuation.',
    ],
    faqs: [
      {
        question: 'What does multi-chain wallet forensics examine?',
        answer:
          'It combines public transaction, transfer, contract, counterparty, gas, approval, and identity evidence from multiple networks into a chain-aware investigation view.',
      },
      {
        question: 'Does WalletGenome calculate current portfolio value?',
        answer:
          'No. Its verified inflow, outflow, and protocol-volume metrics describe supported historical transfer evidence and should not be interpreted as current portfolio value.',
      },
      {
        question: 'How are missing prices handled?',
        answer:
          'Missing historical values remain estimated or unpriced with explicit provenance; they are not silently presented as exact historical dollars or zero.',
      },
    ],
    relatedSlugs: ['evm-wallet-analytics', 'sybil-wallet-analysis'],
  },
] as const satisfies readonly SeoLandingPage[];

export type SeoLandingSlug = (typeof SEO_LANDING_PAGES)[number]['slug'];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find(page => page.slug === slug);
}

export function buildPageMetadata(page: SeoLandingPage): Metadata {
  const path = `/${page.slug}`;

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: 'website',
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      title: `${page.title} | ${SITE_NAME}`,
      description: page.metaDescription,
      images: [
        {
          url: absoluteUrl('/opengraph-image'),
          width: 1200,
          height: 630,
          alt: 'WalletGenome — EVM Wallet Analytics & Forensics',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | ${SITE_NAME}`,
      description: page.metaDescription,
      images: [absoluteUrl('/twitter-image')],
    },
  };
}

export function buildLandingStructuredData(page: SeoLandingPage): JsonLdObject[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': absoluteUrl(`/${page.slug}#webpage`),
      name: page.heading,
      description: page.metaDescription,
      url: absoluteUrl(`/${page.slug}`),
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'WalletGenome',
          item: absoluteUrl('/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.title,
          item: absoluteUrl(`/${page.slug}`),
        },
      ],
    },
  ];
}
