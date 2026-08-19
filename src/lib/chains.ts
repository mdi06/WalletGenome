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
  56: {
    chainId: 56,
    name: 'BSC',
    shortName: 'BSC',
    nativeToken: { symbol: 'BNB', decimals: 18, coingeckoId: 'binancecoin' },
    explorerUrl: 'https://bscscan.com',
    color: '#F0B90B',
    icon: '🟡',
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

export const SUPPORTED_CHAIN_IDS = [1, 8453, 42161, 56, 10] as const;
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

export const STABLECOINS: Record<string, { symbol: string; decimals: number; coingeckoId: string }> = {
  // Ethereum
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai' },
  // Base
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai' },
  // Arbitrum
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai' },
  // BSC
  '0x55d398326f99059ff775485246999027b3197955': { symbol: 'USDT', decimals: 18, coingeckoId: 'tether' },
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18, coingeckoId: 'usd-coin' },
  '0xe9e7cea3dedca5984780bafc599bd69add087d56': { symbol: 'BUSD', decimals: 18, coingeckoId: 'binance-usd' },
  '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': { symbol: 'DAI', decimals: 18, coingeckoId: 'dai' },
  // Optimism
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': { symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607': { symbol: 'USDC.e', decimals: 6, coingeckoId: 'usd-coin' },
};

export const TOKEN_COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum', WETH: 'weth', USDT: 'tether', USDC: 'usd-coin', DAI: 'dai',
  WBTC: 'wrapped-bitcoin', UNI: 'uniswap', LINK: 'chainlink', AAVE: 'aave',
  ARB: 'arbitrum', OP: 'optimism', MATIC: 'matic-network', SHIB: 'shiba-inu',
  PEPE: 'pepe', APE: 'apecoin', LDO: 'lido-dao', MKR: 'maker',
  CRV: 'curve-dao-token', SNX: 'havven', COMP: 'compound-governance-token',
  SUSHI: 'sushi', GRT: 'the-graph', ENS: 'ethereum-name-service',
  RPL: 'rocket-pool', BLUR: 'blur', STG: 'stargate-finance',
  BNB: 'binancecoin', BUSD: 'binance-usd',
  AERO: 'aerodrome-finance', VELO: 'velodrome-finance',
  GMX: 'gmx', PENDLE: 'pendle', BAL: 'balancer',
  '1INCH': '1inch', DYDX: 'dydx', FXS: 'frax-share',
};
