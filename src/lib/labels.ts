// Comprehensive on-chain directory of DeFi Protocols, DEXs, Bridges, Lending, CEXs, and Contracts

export interface ProtocolMeta {
  name: string;
  protocol: string; // Brand (e.g. "Uniswap", "Aave", "Hyperliquid")
  category: 'swap' | 'lending' | 'bridge' | 'perps' | 'staking' | 'nft' | 'cex' | 'other';
  icon?: string;
}

export const PROTOCOL_REGISTRY: Record<string, ProtocolMeta> = {
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

  // ── Camelot & Radiant (Arbitrum) ──
  '0xc873f27fb7635f215086e330632491d37b583f79': { name: 'Camelot: Router', protocol: 'Camelot', category: 'swap' },
  '0xfbd849e6007f9bc3cc2d6eb159c045b8dc660268': { name: 'Camelot: VotingEscrow', protocol: 'Camelot', category: 'swap' },
  '0xea8dfee1898a7e0a59f7527f076106d7e44c2176': { name: 'Radiant Capital: Lending Pool', protocol: 'Radiant', category: 'lending' },

  // ── 1inch, 0x, Odos, KyberSwap, Li.Fi ──
  '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch: Aggregation Router V5', protocol: '1inch', category: 'swap' },
  '0x1111111254fb6c44bac0bed2854e76f90643097d': { name: '1inch: Aggregation Router V4', protocol: '1inch', category: 'swap' },
  '0x111111125421ca6dc452d289314280a0f8842a65': { name: '1inch: Aggregation Router V6', protocol: '1inch', category: 'swap' },
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x: Exchange Proxy', protocol: '0x', category: 'swap' },
  '0x881d40237659c251811cec9c364ef91dc08d300c': { name: 'MetaMask: Swap Router', protocol: 'MetaMask Swap', category: 'swap' },
  '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': { name: 'Li.Fi: Diamond Router', protocol: 'Li.Fi', category: 'bridge' },
  '0x4a3a6dd60a34bb2aba60d73b4c88315e9ceb6a3d': { name: 'Odos: Router', protocol: 'Odos', category: 'swap' },
  '0x6131b5fae19ea4f9d964eac0408e4408b66337b5': { name: 'KyberSwap: Aggregator', protocol: 'KyberSwap', category: 'swap' },

  // ── Socket / Bungee ──
  '0x3a23f943181408eac424116af7b7790c94cb97a5': { name: 'Bungee / Socket: Gateway Router', protocol: 'Socket/Bungee', category: 'bridge' },
  '0x352d8275aae3e0c2404d9f68f6cee084b5beb3dd': { name: 'Bungee / Socket: Gateway', protocol: 'Socket/Bungee', category: 'bridge' },
  '0x74c764d41b77dbbb4fe771dab1939b00b146894a': { name: 'Bungee / Socket: Registry', protocol: 'Socket/Bungee', category: 'bridge' },

  // ── Liquid Staking ──
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': { name: 'Lido: stETH Contract', protocol: 'Lido', category: 'staking' },
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': { name: 'Lido: wstETH Contract', protocol: 'Lido', category: 'staking' },
  '0xae78736cd615f374d3085123a210448e74fc6393': { name: 'Rocket Pool: rETH', protocol: 'Rocket Pool', category: 'staking' },
  '0xbf5495efe5db9ce00f80384ec35751d92e933b7f': { name: 'EigenLayer: Strategy Manager', protocol: 'EigenLayer', category: 'staking' },

  // ── Native Bridges ──
  '0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef': { name: 'Arbitrum: L1 Gateway Router', protocol: 'Arbitrum Bridge', category: 'bridge' },
  '0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a': { name: 'Arbitrum: Bridge', protocol: 'Arbitrum Bridge', category: 'bridge' },
  '0x4c36388be6f416a29c8d8eee81c771ce6be14b18': { name: 'Arbitrum: Sequencer Inbox', protocol: 'Arbitrum Bridge', category: 'bridge' },
  '0x3154cf16ccdb4c6d922629664174b904d80f2c35': { name: 'Base: L1 Standard Bridge', protocol: 'Base Bridge', category: 'bridge' },
  '0x49048044d57e1c92a77f79988d21fa8faf74e97e': { name: 'Base: Optimism Portal', protocol: 'Base Bridge', category: 'bridge' },
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1': { name: 'Optimism: L1 Standard Bridge', protocol: 'Optimism Bridge', category: 'bridge' },
  '0x25ace71c97b33cc4729cf772ae268934f7ab5fa1': { name: 'Optimism: Portal', protocol: 'Optimism Bridge', category: 'bridge' },

  // ── NFT Marketplaces ──
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': { name: 'OpenSea: Seaport 1.5', protocol: 'OpenSea', category: 'nft' },
  '0x00000000000001ad428e4906ae43d8f9852d0dd6': { name: 'OpenSea: Seaport 1.6', protocol: 'OpenSea', category: 'nft' },
  '0x000000000000ad05ccc4f10045630fb830b95127': { name: 'Blur: Marketplace', protocol: 'Blur', category: 'nft' },
};

// Pure ERC-20 token addresses (should be excluded from DApp protocol lists)
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
  '0x55d398326f99059ff775485246999027b3197955', // USDT
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
]);

export const CEX_LABELS: Record<string, string> = {
  // Binance
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance 14',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance 15',
  '0xdfd5293d8e347dfee59e53b2109e50f29e6fce80': 'Binance 16',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance 8',
  '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503': 'Binance Hot Wallet',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance 7',
  '0x00521965e7bd230323571c066394145e03e29dc4': 'Binance Arbitrum Hot Wallet',

  // OKX
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': 'OKX Hot Wallet',
  '0xa7efae728d2936e78bda97dc267687568dd593f3': 'OKX 2',
  '0x62383739d68dd0f844103db8dfb05a7eded5bbe6': 'OKX Arbitrum Hot Wallet',

  // Bybit
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': 'Bybit Hot Wallet',
  '0x9e86c0c4a631165243171887e59c1c4b79bca63a': 'Bybit Arbitrum Hot Wallet',

  // Coinbase
  '0xa090e606e30bd747d4e6245a1517ebe430f0057e': 'Coinbase Hot Wallet',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase 1',
  '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740': 'Coinbase 2',
  '0x3cd751e6b0078be393132286c442345e68ff0aaa': 'Coinbase 3',
  '0x22c481977759d57a26f0302b1ebfead6da2a13f7': 'Coinbase Arbitrum Hot Wallet',

  // Kraken
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken Hot Wallet',
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken 2',
  '0xfa52274dd61e1643d2205169732f29114bc240b3': 'Kraken Arbitrum Hot Wallet',

  // Gate.io, KuCoin, MEXC, Bitget
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': 'Gate.io 1',
  '0xd6216fc19db775df9774a6e33526131da7d19a2c': 'KuCoin 1',
  '0x97b9d2102a9a65a26e1ee82d59e42d1b73b68689': 'Bitget 1',
  '0x75e89d5979e4f6fba97973a8301550c609c15ee4': 'MEXC 1',
  '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': 'Bitfinex',

  // Null & Burn
  '0x0000000000000000000000000000000000000000': 'Null Address (Burn)',
  '0x000000000000000000000000000000000000dead': 'Dead Address (Burn)',
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
