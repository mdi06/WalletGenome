import { ChainConfig } from './types';

export const CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeToken: { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
    explorerUrl: 'https://etherscan.io',
    color: '#627EEA',
    icon: '⟠',
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeToken: { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
    explorerUrl: 'https://basescan.org',
    color: '#0052FF',
    icon: '🔵',
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    nativeToken: { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
    explorerUrl: 'https://arbiscan.io',
    color: '#28A0F0',
    icon: '🔷',
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeToken: { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
    explorerUrl: 'https://optimistic.etherscan.io',
    color: '#FF0420',
    icon: '🔴',
  },
};

export const SUPPORTED_CHAIN_IDS = [1, 8453, 42161, 10] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export function getChainConfig(chainId: number): ChainConfig {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);
  return chain;
}

export function getExplorerTxUrl(chainId: number, hash: string): string {
  return `${getChainConfig(chainId).explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  return `${getChainConfig(chainId).explorerUrl}/address/${address}`;
}

export interface KnownTokenAsset {
  symbol: string;
  decimals: number;
  coingeckoId: string;
  stablecoin?: boolean;
}

/**
 * Contract identity is intentionally nested by chain. The same address can
 * represent different assets on different networks, so callers must never
 * flatten this table or resolve from a ticker alone.
 */
export const TOKEN_ASSETS_BY_CHAIN: Record<number, Record<string, KnownTokenAsset>> = {
  1: {
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether', stablecoin: true },
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin', stablecoin: true },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai', stablecoin: true },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', decimals: 18, coingeckoId: 'uniswap' },
    '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', decimals: 18, coingeckoId: 'chainlink' },
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': { symbol: 'AAVE', decimals: 18, coingeckoId: 'aave' },
  },
  8453: {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin', stablecoin: true },
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai', stablecoin: true },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': { symbol: 'AERO', decimals: 18, coingeckoId: 'aerodrome-finance' },
  },
  42161: {
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether', stablecoin: true },
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin', stablecoin: true },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai', stablecoin: true },
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': { symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
    '0x912ce59144191c1204e64559fe8253a0e49e6548': { symbol: 'ARB', decimals: 18, coingeckoId: 'arbitrum' },
  },
  10: {
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether', stablecoin: true },
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin', stablecoin: true },
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': { symbol: 'USDC.e', decimals: 6, coingeckoId: 'usd-coin', stablecoin: true },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    '0x4200000000000000000000000000000000000042': { symbol: 'OP', decimals: 18, coingeckoId: 'optimism' },
  },
};

export function getKnownTokenAsset(chainId: number, contractAddress?: string | null): KnownTokenAsset | null {
  if (!contractAddress || typeof contractAddress !== 'string') return null;
  return TOKEN_ASSETS_BY_CHAIN[chainId]?.[contractAddress.trim().toLowerCase()] ?? null;
}

export function isStablecoinContract(chainId: number, contractAddress?: string | null): boolean {
  return getKnownTokenAsset(chainId, contractAddress)?.stablecoin === true;
}
