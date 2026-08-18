// Comprehensive on-chain directory of DeFi Protocols, DEXs, Bridges, Lending, CEXs, and Contracts

export interface ProtocolMeta {
  name: string;
  protocol: string; // Brand (e.g. "Uniswap", "Aave", "Hyperliquid", "ENS")
  category: 'swap' | 'lending' | 'bridge' | 'perps' | 'staking' | 'nft' | 'cex' | 'other';
  icon?: string;
}

export const PROTOCOL_REGISTRY: Record<string, ProtocolMeta> = {
  // ── ENS (Ethereum Name Service) ──
  '0x231b0ee14048e9dccd1d247744d114a4eb5e8e63': { name: 'ENS: Public Resolver', protocol: 'ENS', category: 'other' },
  '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41': { name: 'ENS: Public Resolver 2', protocol: 'ENS', category: 'other' },
  '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e': { name: 'ENS: Registry', protocol: 'ENS', category: 'other' },
  '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85': { name: 'ENS: Base Registrar', protocol: 'ENS', category: 'other' },
  '0x283af0b28c62c092c9727f1ee09c02ca627eb7f5': { name: 'ENS: Registrar Controller', protocol: 'ENS', category: 'other' },
  '0x2535b318cae438ba0388b06ee17ff37564e9f757': { name: 'ENS: ETH Registrar Controller', protocol: 'ENS', category: 'other' },
  '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401': { name: 'ENS: Name Wrapper', protocol: 'ENS', category: 'other' },

  // ── Hyperliquid ──
  '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7': { name: 'Hyperliquid: Bridge 2', protocol: 'Hyperliquid', category: 'bridge' },
  '0x07ced903e6ad0278cc32bc83a3fc97112f763722': { name: 'Hyperliquid: L1 Vault', protocol: 'Hyperliquid', category: 'bridge' },

  // ── Uniswap ──
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap: SwapRouter02', protocol: 'Uniswap', category: 'swap' },
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap: Universal Router', protocol: 'Uniswap', category: 'swap' },
  '0x66a9893cc07d91d95644aedd05d03f95e1dba8af': { name: 'Uniswap: Universal Router 2', protocol: 'Uniswap', category: 'swap' },
  '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap: V3 SwapRouter', protocol: 'Uniswap', category: 'swap' },
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { name: 'Uniswap: V2 Router', protocol: 'Uniswap', category: 'swap' },
  '0x000000000022d473030f116ddee9f6b43ac78ba3': { name: 'Uniswap: Permit2', protocol: 'Uniswap', category: 'swap' },
  '0x000000000004444c5dc75cb358380d2e3de08a90': { name: 'Uniswap: Permit2 (Alt)', protocol: 'Uniswap', category: 'swap' },
  '0xc36442b4a4522e871399cd717abdd847ab11fe88': { name: 'Uniswap V3: Positions NFT', protocol: 'Uniswap', category: 'swap' },
  '0x5957582f020301a2f732ad17a69ab2d8b2741241': { name: 'Uniswap V3: Position Manager', protocol: 'Uniswap', category: 'swap' },

  // ── SushiSwap ──
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { name: 'SushiSwap: Router', protocol: 'SushiSwap', category: 'swap' },
  '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506': { name: 'SushiSwap: Router V2', protocol: 'SushiSwap', category: 'swap' },

  // ── Aave ──
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': { name: 'Aave: V2 Lending Pool', protocol: 'Aave', category: 'lending' },
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': { name: 'Aave: V3 Pool Ethereum', protocol: 'Aave', category: 'lending' },
  '0x794a61358d6845594f94dc1db02a252b5b4814ad': { name: 'Aave: V3 Pool Arbitrum/Optimism', protocol: 'Aave', category: 'lending' },
  '0xa238dd80c259a72e81d7e4664a9801593f98d1c5': { name: 'Aave: V3 Pool Base', protocol: 'Aave', category: 'lending' },

  // ── Balancer & Curve ──
  '0xba12222222228d8ba445958a75a0704d566bf2c8': { name: 'Balancer: Vault', protocol: 'Balancer', category: 'swap' },
  '0x99a58482bd75cbab83b27ec03ca68ff489b5788f': { name: 'Curve: Router', protocol: 'Curve', category: 'swap' },

  // ── Velodrome & Aerodrome ──
  '0x9c12939390052919af3155f41bf4160fd3666a6f': { name: 'Velodrome: Router', protocol: 'Velodrome', category: 'swap' },
  '0xa062ae8a9c5e11aa0733837d04294f189397976d': { name: 'Velodrome: Universal Router', protocol: 'Velodrome', category: 'swap' },
  '0xcf77a3ba9a5ca399b7c97c74856154283db28b7b': { name: 'Aerodrome: Router', protocol: 'Aerodrome', category: 'swap' },

  // ── Across Protocol ──
  '0x5c7bcab6cf3e2697a152337088e73d78297a5e1f': { name: 'Across: HubPool Ethereum', protocol: 'Across', category: 'bridge' },
  '0x2e42f214467f647fe687fd9a2bf3baddfa737465': { name: 'Across: SpokePool Optimism', protocol: 'Across', category: 'bridge' },
  '0xe35e9842fcea2471b8cc8b0da34a02944820d203': { name: 'Across: SpokePool Arbitrum', protocol: 'Across', category: 'bridge' },
  '0x09aea4b2242abcf61e13338db561dd5ba1144137': { name: 'Across: SpokePool Base', protocol: 'Across', category: 'bridge' },
  '0x6f26bfa47373f229d211da0f28071c297293dbbd': { name: 'Across: SpokePool V3', protocol: 'Across', category: 'bridge' },

  // ── Stargate / LayerZero ──
  '0x8731d54e9d02c286767d56ac03e8037c07e01e98': { name: 'Stargate: Router Ethereum', protocol: 'Stargate', category: 'bridge' },
  '0x53b08dbd70327b7ba3b7886fc9987bc985d27262': { name: 'Stargate: Router Arbitrum', protocol: 'Stargate', category: 'bridge' },
  '0x45a01e4e04f14f7a4a6702c74187c5f6222033cd': { name: 'Stargate: Router Base', protocol: 'Stargate', category: 'bridge' },
  '0xb6cfcf89a7b22988bfc96632ac2a9d6dab60d641': { name: 'Stargate: Pool USDT Arbitrum', protocol: 'Stargate', category: 'bridge' },
  '0x66a71dcef29a0ffbdbe3c6a460a3b5bc225cd675': { name: 'LayerZero: Endpoint', protocol: 'LayerZero', category: 'bridge' },

  // ── GMX & Perps ──
  '0xa906f338cb21815cbe4973797d4b123ffb107fc2': { name: 'GMX: Router', protocol: 'GMX', category: 'perps' },
  '0x3965877f3e1c32477a1446005f829d111b64740d': { name: 'GMX: Position Router', protocol: 'GMX', category: 'perps' },
  '0xb87a436b93fefe9790e1f4fc61c3666d78396ce3': { name: 'GMX: Vault', protocol: 'GMX', category: 'perps' },
  '0x8700daec35af8ff88c16bdf0418774cb3d7599b4': { name: 'Synthetix: Synthetix Network', protocol: 'Synthetix', category: 'perps' },

  // ── 1inch, 0x, Odos, KyberSwap, Li.Fi ──
  '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch: Aggregation Router V5', protocol: '1inch', category: 'swap' },
  '0x1111111254fb6c44bac0bed2854e76f90643097d': { name: '1inch: Aggregation Router V4', protocol: '1inch', category: 'swap' },
  '0x111111125421ca6dc452d289314280a0f8842a65': { name: '1inch: Aggregation Router V6', protocol: '1inch', category: 'swap' },
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x: Exchange Proxy', protocol: '0x', category: 'swap' },
  '0x881d40237659c251811cec9c364ef91dc08d300c': { name: 'MetaMask: Swap Router', protocol: 'MetaMask Swap', category: 'swap' },
  '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': { name: 'Li.Fi: Diamond Router', protocol: 'Li.Fi', category: 'bridge' },
  '0x4a3a6dd60a34bb2aba60d73b4c88315e9ceb6a3d': { name: 'Odos: Router', protocol: 'Odos', category: 'swap' },
  '0x6131b5fae19ea4f9d964eac0408e4408b66337b5': { name: 'KyberSwap: Aggregator', protocol: 'KyberSwap', category: 'swap' },
};

export const PURE_TOKEN_CONTRACTS = new Set([
  // Ethereum
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  // Base
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI
  '0x4200000000000000000000000000000000000006', // WETH
  // Arbitrum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Native USDC
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // Bridged USDC.e
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', // WBTC
  '0x912ce59144191c1204e64559fe8253a0e49e6548', // ARB Token
  // Optimism
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC.e
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // Native USDC
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // USDT
  '0x4200000000000000000000000000000000000042', // OP Token
  // BSC
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
]);

export const CEX_LABELS: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance 14',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance 15',
  '0xdfd5293d8e347dff59e90ef0fc78aa81398fbe01': 'Binance 16',
  '0x503828976d22510aad0201ac7ec88293211d23dc': 'Coinbase 1',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase 2',
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': 'OKX Hot Wallet',
  '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': 'Bitfinex',
};

export function getAddressLabel(address?: string | null, customWallets?: Record<string, string>): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();

  if (customWallets && customWallets[lower]) {
    return customWallets[lower];
  }

  if (PROTOCOL_REGISTRY[lower]) {
    return PROTOCOL_REGISTRY[lower].name;
  }

  return CEX_LABELS[lower] || null;
}

export function getProtocolMeta(address?: string | null): ProtocolMeta | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  return PROTOCOL_REGISTRY[lower] || null;
}

export function isPureTokenContract(address?: string | null): boolean {
  if (!address) return false;
  return PURE_TOKEN_CONTRACTS.has(address.toLowerCase());
}

export function isCEXAddress(address: string, customWallets?: Record<string, string>): boolean {
  const label = getAddressLabel(address, customWallets);
  if (!label) return false;
  return ['Binance', 'OKX', 'Bybit', 'Coinbase', 'Kraken', 'Gate.io', 'Bitget', 'KuCoin', 'Huobi', 'HTX', 'MEXC', 'Bitfinex', 'Gemini']
    .some(name => label.toLowerCase().includes(name.toLowerCase()));
}

export function isDEXAddress(address: string, customWallets?: Record<string, string>): boolean {
  const label = getAddressLabel(address, customWallets);
  if (!label) return false;
  return ['Uniswap', 'SushiSwap', '1inch', '0x Exchange', 'MetaMask Swap', 'Curve', 'Li.Fi', 'KyberSwap', 'Odos', 'Velodrome', 'Aerodrome', 'Camelot', 'Balancer']
    .some(kw => label.toLowerCase().includes(kw.toLowerCase()));
}

export function isBridgeAddress(address: string, customWallets?: Record<string, string>): boolean {
  const label = getAddressLabel(address, customWallets);
  if (!label) return false;
  return (
    label.includes('Bridge') ||
    label.includes('Gateway') ||
    label.includes('Across') ||
    label.includes('Inbox') ||
    label.includes('Socket') ||
    label.includes('Bungee') ||
    label.includes('Stargate') ||
    label.includes('LayerZero') ||
    label.includes('Hyperliquid') ||
    label.includes('Hop') ||
    label.includes('Synapse') ||
    label.includes('Portal')
  );
}

export function isBurnAddress(address: string): boolean {
  const lower = address.toLowerCase();
  return lower === '0x0000000000000000000000000000000000000000' ||
    lower === '0x000000000000000000000000000000000000dead';
}
