import type { Metadata } from 'next';
import type { JsonLdObject } from '@/components/JsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/seo';

export const GUIDES_CONTENT_LAST_REVIEWED = '2026-09-24';

export interface GuideLinkPart {
  text: string;
  href: string;
}

export type GuideTextPart = string | GuideLinkPart;

export interface GuideStep {
  title: string;
  body: readonly GuideTextPart[];
}

export type GuideBlock =
  | { type: 'paragraph'; content: readonly GuideTextPart[] }
  | { type: 'list'; items: readonly (readonly GuideTextPart[])[] }
  | { type: 'steps'; items: readonly GuideStep[] }
  | { type: 'callout'; label: string; content: readonly GuideTextPart[] };

export interface GuideSection {
  id: string;
  title: string;
  blocks: readonly GuideBlock[];
}

export interface GuideResource {
  title: string;
  description: string;
  href: string;
}

export interface GuidePage {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  summary: string;
  primaryIntent: string;
  sections: readonly GuideSection[];
  resources: readonly GuideResource[];
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    label: string;
  };
}

export const GUIDE_INDEX = {
  title: 'EVM Wallet Investigation Guides',
  metaDescription:
    'Learn how to investigate observable EVM wallet activity and interpret WalletGenome risk signals across Ethereum, Base, Arbitrum, and Optimism.',
  heading: 'Practical Guides for EVM Wallet Investigation',
  summary:
    'Use these field guides to inspect WalletGenome reports, track the limits of returned data, and decide which on-chain evidence deserves closer review.',
} as const;

export const GUIDES = [
  {
    slug: 'how-to-analyze-an-evm-wallet',
    title: 'How to Analyze an EVM Wallet',
    metaDescription:
      'Learn how to investigate observable EVM wallet activity, data coverage, transfers, approvals, risk signals, and Sybil signals with WalletGenome.',
    eyebrow: 'FIELD GUIDE 01 · WALLET INVESTIGATION',
    heading: 'How to Analyze an EVM Wallet',
    summary:
      'A disciplined wallet review starts with data coverage, moves through observable activity, and keeps every interpretation tied to the evidence that supports it.',
    primaryIntent:
      'Teach a reader how to investigate observable EVM wallet activity with WalletGenome.',
    sections: [
      {
        id: 'analysis-scope',
        title: 'What WalletGenome analyzes',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'WalletGenome is an analytics and forensics tool for observable public activity on Ethereum, Base, Arbitrum, and Optimism. A scan assembles returned transactions, native and token transfers, contract calls, counterparties, protocol labels, gas use, ERC-20 approval history, and available public identity records. The report also derives activity, capital-flow, risk, and Sybil signals when their required datasets are available.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'The report describes the address and networks you selected. It cannot see off-chain agreements, private exchange records, a person’s intent, or activity on unsupported networks. WalletGenome does not provide custody, trading, transaction execution, or investment advice.',
            ],
          },
          {
            type: 'callout',
            label: 'Evidence boundary',
            content: [
              'A wallet report is a point-in-time view of public records returned by the configured providers. It is an investigation aid. It does not establish ownership, intent, safety, or wrongdoing.',
            ],
          },
        ],
      },
      {
        id: 'start-scan',
        title: 'Start a scan with a clear scope',
        blocks: [
          {
            type: 'steps',
            items: [
              {
                title: 'Choose Single Wallet',
                body: [
                  'Open the ',
                  { text: 'wallet scanner', href: '/' },
                  ' and keep the single-wallet mode selected. Cluster mode answers a different question about relationships among several submitted addresses.',
                ],
              },
              {
                title: 'Enter an address or supported name',
                body: [
                  'Use the EVM address under investigation. An ENS name can be resolved when the configured identity service returns a valid address.',
                ],
              },
              {
                title: 'Select the relevant networks',
                body: [
                  'Choose Ethereum, Base, Arbitrum, Optimism, or a combination. Include every supported network relevant to the question so the aggregate view does not omit known activity.',
                ],
              },
              {
                title: 'Run the scan and retain the scope',
                body: [
                  'Fresh scans require an authenticated session. Google sign-in or Ethereum wallet authentication establishes access to the scan. Wallet authentication requests a login message. It does not request a transaction, token approval, private key, spending permission, or chain switch.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'coverage-first',
        title: 'Check evidence coverage before reading the numbers',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'Provider responses determine what the report can support. WalletGenome distinguishes complete, partial, and unavailable data. Read the status and warning panels before comparing totals or drawing conclusions. A provider can return normal transactions while token transfers, internal transfers, identity records, prices, or blacklist checks remain incomplete.',
            ],
          },
          {
            type: 'list',
            items: [
              ['Complete means the required returned dataset passed the report’s completeness rule. It does not mean every real-world action by the wallet is known.'],
              ['Partial means some usable records were returned and a stated part of the requested evidence is missing.'],
              ['Unavailable means the report cannot publish that result from the available inputs.'],
              ['A lower bound counts verified returned evidence while explicitly excluding missing history, spot estimates, or unpriced transfer legs.'],
            ],
          },
          {
            type: 'callout',
            label: 'Missing stays unknown',
            content: [
              'Missing data cannot be interpreted as clean, safe, inactive, or zero. An unavailable approval exposure is not $0. Missing history does not describe an inactive wallet. An unavailable blacklist check is not a clear result.',
            ],
          },
        ],
      },
      {
        id: 'read-report',
        title: 'Read the report in layers',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'Begin with transaction activity. Review the active dates, cadence, failed transactions, categories, and network distribution. The activity heatmap uses UTC, so a visible hour-of-day pattern needs timezone context before it supports a behavioral interpretation.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Next, inspect transfers and capital flows. Separate inbound from outbound legs, identify recurring counterparties, and check whether labels connect an address to a known exchange, bridge, or protocol. A label describes a configured address match. It does not prove the purpose of every transfer. Verified inflow, outflow, and protocol volume depend on historical or stablecoin price coverage; spot estimates and unpriced legs remain outside definitive historical totals.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Review gas behavior beside activity. Gas totals, failed gas, monthly patterns, and transaction categories can show how frequently the address uses contracts and where execution fails. High gas use can come from active use, expensive periods, complex calls, or repeated failures. The surrounding transactions provide the useful context.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Then inspect approvals. WalletGenome decodes ERC-20 approval calls and reconstructs the latest non-revoked state observed in returned history for each token and spender pair. This is historical reconstruction. It is not a live allowance query. The exposure estimate uses reconstructed positive token balances and available current prices, capped by the observed allowance when finite. Unknown balances or prices leave exposure unavailable.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Identity records add public context from available naming and social services. Treat a resolved name, avatar, or linked profile as a provider-returned record. Compare the record with the address and chain evidence before using it in an attribution decision.',
            ],
          },
        ],
      },
      {
        id: 'risk-and-sybil',
        title: 'Keep risk and Sybil evidence in their own lanes',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'The security risk score summarizes configured approval, failed-transaction, stale-approval, and unknown-contract factors for each chain. The aggregate headline uses the highest selected-chain score when wallet history is complete. Use the factor list to locate the transactions and approvals that deserve review.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Sybil analysis has two evidence families. Public-list and blacklist checks report source-specific matches. A separate local MEDIA-style behavioral heuristic evaluates engagement, diversity, cross-chain breadth, wallet age, and a monetary dimension when pricing permits. These states answer different questions. Neither one proves common ownership, coordinated control, malicious intent, or wrongdoing.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'For a fuller explanation of these outputs, read ',
              { text: 'Understanding Wallet Risk Signals', href: '/guides/understanding-wallet-risk-signals' },
              '.',
            ],
          },
        ],
      },
      {
        id: 'evidence-and-interpretation',
        title: 'Separate observation from interpretation',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'Write down the observation first: chain, transaction hash, timestamp, direction, asset, counterparty, decoded method, label, status, and data provenance. Add the interpretation in a separate sentence. This discipline makes uncertainty visible and gives another reviewer a path back to the source record.',
            ],
          },
          {
            type: 'list',
            items: [
              ['Observation: the returned Optimism history contains five failed contract calls within one hour. Interpretation: the pattern may deserve review for automation or repeated execution errors.'],
              ['Observation: an unlimited approval to an unidentified spender remains the latest observed state in returned history. Interpretation: current allowance state should be verified on-chain before any remediation decision.'],
              ['Observation: historical prices cover 64 of 80 eligible transfer legs. Interpretation: the verified USD total is a lower bound for the returned transfers.'],
            ],
          },
        ],
      },
      {
        id: 'investigation-questions',
        title: 'Questions to ask while reviewing a report',
        blocks: [
          {
            type: 'list',
            items: [
              ['Which selected chains returned complete transaction, transfer, and pricing data?'],
              ['Does activity cluster around one period, protocol, counterparty, or network?'],
              ['Which inbound sources appear before major protocol activity or outbound transfers?'],
              ['Do repeated counterparties have configured labels, and can the underlying transactions confirm the apparent role?'],
              ['Which failed calls, unknown contracts, or stale approvals contribute to the risk factors?'],
              ['Are approval rows current enough for the question, or is a separate live allowance check required?'],
              ['Does a Sybil result come from a source match, the behavioral heuristic, or both?'],
              ['Which conclusions change if every partial or unavailable dataset is removed from consideration?'],
            ],
          },
        ],
      },
      {
        id: 'walkthrough',
        title: 'A concise WalletGenome walkthrough',
        blocks: [
          {
            type: 'steps',
            items: [
              {
                title: 'Define the question',
                body: ['Example: identify the address’s main protocols, funding paths, and observed approval exposure across the four supported networks.'],
              },
              {
                title: 'Record the coverage',
                body: ['Note every complete, partial, and unavailable dataset before reading aggregate figures.'],
              },
              {
                title: 'Build the activity picture',
                body: ['Use transaction cadence, transfers, counterparties, protocol labels, and gas behavior to describe the returned history chain by chain.'],
              },
              {
                title: 'Inspect security evidence',
                body: ['Open the risk factors and approval rows. Trace each relevant item to its chain, spender, transaction, age, and completeness state.'],
              },
              {
                title: 'Review identity and Sybil context',
                body: ['Keep public identity records, list matches, and behavioral heuristics as separate evidence types.'],
              },
              {
                title: 'Write a bounded finding',
                body: ['State what the returned evidence shows, which data is missing, and which interpretation still needs external verification.'],
              },
            ],
          },
        ],
      },
    ],
    resources: [
      {
        title: 'Methodology and algorithms',
        description: 'Review the implemented data pipeline, scoring rules, and completeness contracts.',
        href: '/docs',
      },
      {
        title: 'EVM wallet analytics',
        description: 'See the product scope for behavioral analysis across supported EVM networks.',
        href: '/evm-wallet-analytics',
      },
      {
        title: 'Multi-chain wallet forensics',
        description: 'Review the chain-aware evidence and capital-flow scope.',
        href: '/multi-chain-wallet-forensics',
      },
    ],
    cta: {
      eyebrow: 'APPLY THE WORKFLOW',
      title: 'Analyze a wallet with the evidence limits visible',
      description:
        'Choose the relevant networks, run a scan, and record the report’s coverage before interpreting the activity.',
      label: 'Analyze a wallet',
    },
  },
  {
    slug: 'understanding-wallet-risk-signals',
    title: 'Understanding Wallet Risk Signals',
    metaDescription:
      'Learn how WalletGenome calculates and presents wallet risk, approval, blacklist, and Sybil signals, including the limits created by missing data.',
    eyebrow: 'FIELD GUIDE 02 · RISK INTERPRETATION',
    heading: 'Understanding Wallet Risk Signals',
    summary:
      'WalletGenome risk outputs prioritize evidence for review. Their meaning depends on the implemented factors, the chain where they appear, and the completeness of the underlying data.',
    primaryIntent:
      'Explain how WalletGenome risk outputs should be interpreted.',
    sections: [
      {
        id: 'risk-model',
        title: 'What contributes to the risk score',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'WalletGenome calculates a 0–100 heuristic score for each selected chain. Four implemented factor groups can add points. The score is capped at 100 and mapped to grades A, B, C, D, or F. A factor appears when its configured threshold is crossed.',
            ],
          },
          {
            type: 'list',
            items: [
              ['Observed unlimited approvals to unverified contracts can add up to 40 points. When none meet that high-risk rule, more than three observed unlimited approvals to known contracts can add up to 20 points.'],
              ['A failed-transaction ratio above 5 percent can add up to 25 points.'],
              ['More than two observed approvals older than 180 days can add up to 15 points.'],
              ['More than five unidentified contract interactions, combined with an unknown-contract ratio above 30 percent, can add up to 10 points.'],
            ],
          },
          {
            type: 'paragraph',
            content: [
              'When no factor crosses a threshold, the report records that no configured factor crossed its scoring threshold in the returned complete dataset. This statement describes the model and dataset. It does not certify the wallet as safe.',
            ],
          },
        ],
      },
      {
        id: 'score-presentation',
        title: 'How the score and factors are presented',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'Each chain has its own score, grade, and ordered factor list. The factor list shows the model contribution and a description of the observed condition. When the required history is complete, the portfolio headline uses the maximum selected-chain score and the corresponding worst grade. It does not average a high-risk chain into quieter networks.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Start with the chain behind the headline. Then review every factor on that chain and compare it with the same factor across the remaining selected networks. A score without its chain, records, and coverage state is too compressed for a defensible finding.',
            ],
          },
        ],
      },
      {
        id: 'chain-evidence',
        title: 'Keep chain-specific evidence attached',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'Contract addresses, spenders, labels, transaction costs, and activity patterns are chain-specific. The same wallet can use different applications and approval practices on Ethereum, Base, Arbitrum, and Optimism. Record the chain beside every factor before deciding whether several observations describe one repeated behavior.',
            ],
          },
          {
            type: 'callout',
            label: 'Aggregate rule',
            content: [
              'The reported aggregate risk score is the highest selected-chain score. The underlying evidence remains on the chain where WalletGenome observed it.',
            ],
          },
        ],
      },
      {
        id: 'approvals-and-activity',
        title: 'Connect factors to approvals, contracts, and activity',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'Approval factors use ERC-20 approval transactions reconstructed from returned history. WalletGenome keeps the newest observed state for each token and spender pair and excludes observed revocations. An old or unlimited approval can raise the score under the configured rules. The report does not query the live allowance, so current on-chain state requires a separate verification step.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Approval exposure answers a related financial question. It estimates the positive token balance covered by the latest observed non-revoked approval, using an available current price and the finite allowance cap when applicable. Unknown balances or prices make exposure unavailable. Approval authority can still affect the score when a monetary exposure estimate is unavailable.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'The failed-transaction factor uses the ratio of failed normal transactions. The unknown-contract factor uses contract interactions that the configured classifier cannot identify. Counterparty tables, protocol labels, gas patterns, and transfer flows provide context for those factors. They do not add score points unless they enter one of the implemented scoring rules.',
            ],
          },
        ],
      },
      {
        id: 'missing-data',
        title: 'Missing data limits confidence',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'WalletGenome withholds the canonical risk score and grade when wallet history is incomplete. This prevents a partial provider response from producing a definitive headline. Individual returned records can still support a bounded observation, provided the report states that the wider history is incomplete.',
            ],
          },
          {
            type: 'list',
            items: [
              ['Missing transactions can hide failures, approvals, revocations, or unknown-contract interactions.'],
              ['Missing token balances or current prices can make approval exposure unavailable.'],
              ['Missing historical prices can remove the monetary dimension from the behavioral Sybil heuristic; the remaining dimensions are reweighted.'],
              ['An unavailable list check supplies no clear or flagged conclusion for that source.'],
            ],
          },
          {
            type: 'callout',
            label: 'Confidence rule',
            content: [
              'Missing or incomplete data remains explicit. It cannot be represented as safe, clean, inactive, or zero.',
            ],
          },
        ],
      },
      {
        id: 'score-limits',
        title: 'What low and high scores mean',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'A low score means the configured factors contributed few or no points within the complete returned history. A low score cannot establish safety. The model does not detect every exploit, compromised key, social-engineering event, off-chain threat, or future action.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'A high score means one or more configured factors crossed their thresholds. A high score cannot establish fraud, malicious intent, compromise, or wrongdoing. Legitimate activity can include repeated failures, old approvals, automation, and interactions with contracts that the label set does not recognize.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'Use the score to order the review. Use transaction and approval evidence to support the finding.',
            ],
          },
        ],
      },
      {
        id: 'sybil-separation',
        title: 'Keep Sybil indicators and list matches separate',
        blocks: [
          {
            type: 'paragraph',
            content: [
              'WalletGenome reports non-behavioral public-list and blacklist matches separately from its local MEDIA-style behavioral heuristic. The blacklist status becomes flagged when a configured non-behavioral source positively matches. The behavioral result uses engagement, protocol and contract diversity, cross-chain breadth, wallet age, and a monetary dimension when pricing is complete.',
            ],
          },
          {
            type: 'paragraph',
            content: [
              'A source match records that the address appears in a configured dataset. The local heuristic estimates how closely returned behavior fits its scoring pattern. A list match does not prove the current controller’s intent. A behavioral indicator does not prove common ownership, coordinated control, or Sybil participation. A clear list result does not prove absence from every relevant dataset.',
            ],
          },
        ],
      },
      {
        id: 'investigation-use',
        title: 'Use the result as an investigation aid',
        blocks: [
          {
            type: 'steps',
            items: [
              {
                title: 'Confirm completeness',
                body: ['Record the history, price, approval, and list-check states that support the output.'],
              },
              {
                title: 'Find the leading chain',
                body: ['Identify which selected network supplies the maximum score and grade.'],
              },
              {
                title: 'Trace each factor',
                body: ['Open the supporting approvals and transactions. Record hashes, timestamps, spenders, labels, ages, and failure ratios.'],
              },
              {
                title: 'Add context without changing evidence type',
                body: ['Use counterparties, protocol labels, transfers, gas, identity records, and Sybil states to form follow-up questions.'],
              },
              {
                title: 'Verify time-sensitive state',
                body: ['Check current allowances or other live chain state with a trusted chain-specific source when the decision depends on present conditions.'],
              },
              {
                title: 'Write a limited conclusion',
                body: ['Describe the observed factor, its chain, its data window, and the uncertainty that remains.'],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              'The ',
              { text: 'methodology documentation', href: '/docs' },
              ' lists the current model and reporting contracts. Recheck it when a decision depends on an exact rule or threshold.',
            ],
          },
        ],
      },
    ],
    resources: [
      {
        title: 'Crypto wallet risk checker',
        description: 'Review the risk product scope and its stated limitations.',
        href: '/crypto-wallet-risk-checker',
      },
      {
        title: 'Token approval checker',
        description: 'Understand reconstructed approvals and estimated exposure.',
        href: '/token-approval-checker',
      },
      {
        title: 'Sybil wallet analysis',
        description: 'See how behavioral and list-based evidence are kept separate.',
        href: '/sybil-wallet-analysis',
      },
      {
        title: 'Methodology and algorithms',
        description: 'Inspect the implemented thresholds and completeness rules.',
        href: '/docs',
      },
    ],
    cta: {
      eyebrow: 'REVIEW THE EVIDENCE',
      title: 'Inspect wallet risk signals chain by chain',
      description:
        'Run a report, identify the chain behind the headline, and trace each factor to its supporting records.',
      label: 'Inspect wallet risk signals',
    },
  },
] as const satisfies readonly GuidePage[];

export type GuideSlug = (typeof GUIDES)[number]['slug'];

export function getGuide(slug: string): GuidePage | undefined {
  return GUIDES.find(guide => guide.slug === slug);
}

export function getGuidesForLandingSlug(slug: string): readonly GuidePage[] {
  if (slug === 'evm-wallet-analytics' || slug === 'multi-chain-wallet-forensics') {
    return [GUIDES[0]];
  }
  if (
    slug === 'crypto-wallet-risk-checker'
    || slug === 'token-approval-checker'
    || slug === 'sybil-wallet-analysis'
  ) {
    return [GUIDES[1]];
  }
  return [];
}

function robotsMetadata(): NonNullable<Metadata['robots']> {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

function socialMetadata(title: string, description: string, path: string) {
  return {
    openGraph: {
      type: 'website' as const,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
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
      card: 'summary_large_image' as const,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [absoluteUrl('/twitter-image')],
    },
  };
}

export function buildGuideIndexMetadata(): Metadata {
  const path = '/guides';
  return {
    title: GUIDE_INDEX.title,
    description: GUIDE_INDEX.metaDescription,
    alternates: { canonical: absoluteUrl(path) },
    robots: robotsMetadata(),
    ...socialMetadata(GUIDE_INDEX.title, GUIDE_INDEX.metaDescription, path),
  };
}

export function buildGuideMetadata(guide: GuidePage): Metadata {
  const path = `/guides/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: absoluteUrl(path) },
    robots: robotsMetadata(),
    ...socialMetadata(guide.title, guide.metaDescription, path),
  };
}

function breadcrumbList(items: readonly { name: string; path: string }[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildGuideIndexStructuredData(): JsonLdObject[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': absoluteUrl('/guides#webpage'),
      name: GUIDE_INDEX.heading,
      description: GUIDE_INDEX.metaDescription,
      url: absoluteUrl('/guides'),
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
    },
    breadcrumbList([
      { name: SITE_NAME, path: '/' },
      { name: 'Guides', path: '/guides' },
    ]),
  ];
}

export function buildGuideStructuredData(guide: GuidePage): JsonLdObject[] {
  const path = `/guides/${guide.slug}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': absoluteUrl(`${path}#webpage`),
      name: guide.heading,
      description: guide.metaDescription,
      url: absoluteUrl(path),
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
    },
    breadcrumbList([
      { name: SITE_NAME, path: '/' },
      { name: 'Guides', path: '/guides' },
      { name: guide.title, path },
    ]),
  ];
}
