import type { Metadata } from 'next';

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
  title: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  capabilities: readonly { title: string; description: string }[];
  usefulFor: readonly string[];
  limitations: readonly string[];
  faqs: readonly { question: string; answer: string }[];
  keywords: readonly string[];
}

export const SEO_LANDING_PAGES = [
  {
    slug: 'evm-wallet-analytics',
    title: 'EVM Wallet Analytics',
    metaDescription:
      'Analyze observable EVM wallet activity, counterparties, gas usage, protocol interactions, identities, and behavioral patterns across Ethereum, Base, Arbitrum, and Optimism.',
    eyebrow: 'MULTI-CHAIN WALLET INTELLIGENCE',
    heading: 'EVM Wallet Analytics Across Four Supported Networks',
    intro:
      'WalletGenome converts public transaction history into an evidence-backed view of how an address operates across Ethereum, Base, Arbitrum, and Optimism.',
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
        question: 'What is EVM wallet analytics?',
        answer:
          'EVM wallet analytics examines public address activity on Ethereum-compatible networks, including transactions, token transfers, contract interactions, gas usage, and counterparties.',
      },
      {
        question: 'Do I need to connect a wallet?',
        answer:
          'No. WalletGenome only needs a public address or ENS name and does not request signatures, private keys, or wallet permissions.',
      },
      {
        question: 'Which networks are supported?',
        answer:
          'The current scanner supports Ethereum, Base, Arbitrum, and Optimism.',
      },
    ],
    keywords: ['EVM wallet analytics', 'Ethereum wallet analytics', 'on-chain wallet analysis'],
  },
  {
    slug: 'crypto-wallet-risk-checker',
    title: 'Crypto Wallet Risk Checker',
    metaDescription:
      'Review explainable wallet risk factors, blacklist availability, failed transactions, approvals, and unknown-contract interactions across supported EVM chains.',
    eyebrow: 'EXPLAINABLE SECURITY REVIEW',
    heading: 'Check an EVM Wallet for Observable Risk Signals',
    intro:
      'WalletGenome summarizes public, observable risk indicators and shows the factors behind its score instead of presenting an unexplained safety verdict.',
    capabilities: [
      {
        title: 'Explainable risk factors',
        description:
          'Inspect the recorded contribution of approval, failure-rate, stale-approval, and unknown-contract heuristics.',
      },
      {
        title: 'Blacklist status',
        description:
          'Keep non-behavioral blacklist checks distinct from behavioral scoring, including explicit unavailable states.',
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
        question: 'How is the WalletGenome risk score calculated?',
        answer:
          'The score combines documented factors such as risky approvals, failed transaction ratio, stale approvals, and interaction with unknown contracts. The methodology page lists the current rules.',
      },
      {
        question: 'What happens when wallet history is incomplete?',
        answer:
          'WalletGenome labels the affected datasets and withholds definitive risk conclusions instead of interpreting missing records as clean activity.',
      },
    ],
    keywords: ['crypto wallet risk checker', 'wallet security checker', 'EVM address risk'],
  },
  {
    slug: 'token-approval-checker',
    title: 'Token Approval Checker',
    metaDescription:
      'Inspect observable ERC-20 approval activity, unlimited allowances, spender addresses, stale approvals, and available exposure estimates for an EVM wallet.',
    eyebrow: 'ERC-20 ALLOWANCE AUDIT',
    heading: 'Inspect Token Approvals and Unlimited Allowance Signals',
    intro:
      'WalletGenome decodes observable ERC-20 approval transactions and organizes allowance-related warning signs by supported chain and spender.',
    capabilities: [
      {
        title: 'Approval decoding',
        description:
          'Decode ERC-20 approve calls to identify spender addresses and distinguish finite from unlimited allowance values.',
      },
      {
        title: 'Stale approval review',
        description:
          'Surface older approvals and interactions with unknown contracts as review signals rather than automatic proof of compromise.',
      },
      {
        title: 'Exposure completeness',
        description:
          'Keep unknown balances or prices unavailable instead of silently converting missing exposure data to zero dollars.',
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
        question: 'Does an old approve transaction mean the allowance is still active?',
        answer:
          'Not necessarily. A later transaction may have changed or revoked it, so approval history should be reviewed with current chain state when making a security decision.',
      },
      {
        question: 'Does WalletGenome revoke approvals?',
        answer:
          'No. WalletGenome is read-only and does not request signatures or submit transactions.',
      },
    ],
    keywords: ['token approval checker', 'ERC-20 allowance checker', 'unlimited token approvals'],
  },
  {
    slug: 'sybil-wallet-analysis',
    title: 'Sybil Wallet Analysis',
    metaDescription:
      'Review behavioral Sybil signals and available public blacklist matches while keeping heuristics, source coverage, and confirmed matches clearly separated.',
    eyebrow: 'BEHAVIORAL AND LIST-BASED SIGNALS',
    heading: 'Analyze Observable Sybil Signals Without Hiding Uncertainty',
    intro:
      'WalletGenome separates behavioral probability from non-behavioral blacklist matches so each conclusion can be traced to the kind of evidence that produced it.',
    capabilities: [
      {
        title: 'Behavioral probability',
        description:
          'Summarize supported transaction, timing, diversity, and funding behavior as a heuristic rather than a definitive identity judgment.',
      },
      {
        title: 'Public-list checks',
        description:
          'Report available matches from configured public Sybil and sanctions sources with source-specific status.',
      },
      {
        title: 'Evidence precedence',
        description:
          'Keep a confirmed list match visible even when behavioral scoring is unavailable or produces a different signal.',
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
        question: 'Are blacklist matches and behavioral scores the same?',
        answer:
          'No. WalletGenome reports direct public-list matches separately from its behavioral probability model.',
      },
    ],
    keywords: ['Sybil wallet analysis', 'Sybil checker', 'crypto address blacklist check'],
  },
  {
    slug: 'multi-chain-wallet-forensics',
    title: 'Multi-Chain Wallet Forensics',
    metaDescription:
      'Investigate wallet activity, capital-flow evidence, counterparties, gas usage, approvals, and data completeness across supported EVM networks.',
    eyebrow: 'CROSS-NETWORK INVESTIGATION',
    heading: 'Multi-Chain Wallet Forensics With Explicit Data Coverage',
    intro:
      'WalletGenome brings supported EVM activity into one report while preserving chain provenance and showing where provider or pricing coverage is incomplete.',
    capabilities: [
      {
        title: 'Chain-aware evidence',
        description:
          'Keep transactions, contracts, gas units, and protocol attribution tied to the network where the activity occurred.',
      },
      {
        title: 'Capital-flow topology',
        description:
          'Explore verified transfer legs, recurring counterparties, and supported protocol interactions through an interactive flow view.',
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
        question: 'Does WalletGenome calculate total portfolio value?',
        answer:
          'No. Its verified inflow, outflow, and protocol-volume metrics describe supported historical transfer evidence and should not be interpreted as current portfolio value.',
      },
      {
        question: 'How are missing prices handled?',
        answer:
          'Missing historical values remain estimated or unpriced with explicit provenance; they are not silently presented as exact historical dollars or zero.',
      },
    ],
    keywords: ['multi-chain wallet forensics', 'blockchain forensics tool', 'EVM wallet investigation'],
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
    keywords: [...page.keywords],
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: SITE_NAME,
      title: `${page.title} | ${SITE_NAME}`,
      description: page.metaDescription,
      images: [
        {
          url: '/opengraph-image',
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
      images: ['/twitter-image'],
    },
  };
}
