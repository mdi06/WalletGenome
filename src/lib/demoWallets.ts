export interface DemoWallet {
  slug: string;
  name: string;
  role: string;
  ens: string;
  address: string;
  snapshotPath: string;
  generatedAt: string;
}

export const DEMO_WALLETS = [
  {
    slug: 'vitalik',
    name: 'Vitalik Buterin',
    role: 'Co-founder of Ethereum',
    ens: 'vitalik.eth',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    snapshotPath: '/demo-wallets/vitalik-2026-08-26.json',
    generatedAt: '2026-08-26T08:47:15.264Z',
  },
  {
    slug: 'hayden',
    name: 'Hayden Adams',
    role: 'Founder of Uniswap',
    ens: 'hayden.eth',
    address: '0x50EC05ADe8280758E2077fcBC08D878D4aef79C3',
    snapshotPath: '/demo-wallets/hayden-2026-08-25.json',
    generatedAt: '2026-08-25T02:33:20.118Z',
  },
  {
    slug: 'sassal',
    name: 'Anthony Sassano',
    role: 'Founder of The Daily Gwei',
    ens: 'sassal.eth',
    address: '0x648aA14e4424e0825A5cE739C8C68610e143FB79',
    snapshotPath: '/demo-wallets/sassal-2026-08-25.json',
    generatedAt: '2026-08-25T02:33:40.030Z',
  },
  {
    slug: 'richerd',
    name: 'Richerd Chan',
    role: 'Co-founder of Manifold',
    ens: 'richerd.eth',
    address: '0xeB1c22baACAFac7836f20f684C946228401FF01C',
    snapshotPath: '/demo-wallets/richerd-2026-08-25.json',
    generatedAt: '2026-08-25T02:34:04.202Z',
  },
] as const satisfies readonly DemoWallet[];

export type DemoWalletSlug = (typeof DEMO_WALLETS)[number]['slug'];

export function getDemoWalletBySlug(slug: string): DemoWallet | null {
  return DEMO_WALLETS.find(wallet => wallet.slug === slug) ?? null;
}

export function getDemoWalletFromSearch(search: string): DemoWallet | null {
  const slug = new URLSearchParams(search).get('demo');
  return slug ? getDemoWalletBySlug(slug) : null;
}

export function formatDemoSnapshotDate(generatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(generatedAt));
}
