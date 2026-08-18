import { NextRequest, NextResponse } from 'next/server';
import { fetchTokenTransfers, fetchNormalTransactions } from '@/lib/etherscan';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { getAddressLabel, isCEXAddress, isDEXAddress, isBridgeAddress } from '@/lib/labels';
import { STABLECOINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { isBridgeMethod } from '@/lib/scanner';

export const maxDuration = 300; // 5 minutes max

interface BatchLossHit {
  wallet: string;
  walletLabel: string | null;
  chain: string;
  chainId: number;
  hash: string;
  to: string;
  tokenSymbol: string;
  amount: number;
  valueUSD: number;
  date: string;
  explorerUrl: string;
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
  56: 'BSC',
  10: 'Optimism',
};

const CHAIN_EXPLORER: Record<number, string> = {
  1: 'https://etherscan.io',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  56: 'https://bscscan.com',
  10: 'https://optimistic.etherscan.io',
};

// Stablecoin symbols to target
const TARGET_SYMBOLS = new Set(['USDT', 'USDC', 'USDC.e', 'BUSD', 'DAI', 'USDT0']);

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scanWalletOnChain(
  wallet: string,
  chainId: number,
  knownWallets: Record<string, string>,
  apiKey?: string
): Promise<BatchLossHit[]> {
  const lower = wallet.toLowerCase();
  const hits: BatchLossHit[] = [];

  try {
    // Fetch token transfers and normal txs in parallel
    const [tokenTransfers, normalTxs] = await Promise.all([
      fetchTokenTransfers(wallet, chainId, apiKey, 500).catch(() => []),
      fetchNormalTransactions(wallet, chainId, apiKey, 500).catch(() => []),
    ]);

    if (tokenTransfers.length === 0) return [];

    // Build interaction map from ALL txs + transfers for this wallet on this chain
    const interactionCount = new Map<string, number>();

    for (const tx of normalTxs) {
      const from = (tx.from || '').toLowerCase();
      const to = (tx.to || '').toLowerCase();
      const counterparty = from === lower ? to : from;
      if (counterparty) {
        interactionCount.set(counterparty, (interactionCount.get(counterparty) || 0) + 1);
      }
    }

    for (const t of tokenTransfers) {
      const from = (t.from || '').toLowerCase();
      const to = (t.to || '').toLowerCase();
      const counterparty = from === lower ? to : from;
      if (counterparty) {
        interactionCount.set(counterparty, (interactionCount.get(counterparty) || 0) + 1);
      }
    }

    // Build tx method map for bridge/swap detection
    const txMethodMap = new Map<string, { methodId: string; functionName: string; toAddr: string; category: string }>();
    for (const tx of normalTxs) {
      if (tx.hash) {
        const to = (tx.to || '').toLowerCase();
        const methodId = (tx.methodId || '').toLowerCase();
        const functionName = (tx.functionName || '').toLowerCase();

        let category = 'unknown';
        if (isBridgeAddress(to) || isBridgeMethod(methodId, functionName)) category = 'bridge';
        else if (isDEXAddress(to) || functionName.includes('swap') || functionName.includes('multicall') || functionName.includes('execute')) category = 'swap';

        txMethodMap.set(tx.hash.toLowerCase(), { methodId, functionName, toAddr: to, category });
      }
    }

    // Find outbound stablecoin transfers to unknown addresses
    for (const transfer of tokenTransfers) {
      const from = (transfer.from || '').toLowerCase();
      if (from !== lower) continue; // Only outbound

      const symbol = (transfer.tokenSymbol || '').toUpperCase();
      if (!TARGET_SYMBOLS.has(symbol)) continue;

      const decimals = parseInt(transfer.tokenDecimal || '18') || 18;
      const rawVal = parseFloat(transfer.value || '0') || 0;
      const amount = rawVal / Math.pow(10, decimals);

      // For stablecoins, valueUSD ≈ amount
      const valueUSD = amount;
      if (valueUSD < 500) continue; // Skip small amounts

      const to = (transfer.to || '').toLowerCase();
      if (!to) continue;

      // Skip if destination is known
      const label = getAddressLabel(to, knownWallets);
      if (knownWallets[to] || label || isCEXAddress(to) || isDEXAddress(to) || isBridgeAddress(to)) continue;

      // Skip if parent tx is a swap/bridge
      const parentTx = txMethodMap.get((transfer.hash || '').toLowerCase());
      if (parentTx) {
        if (parentTx.category === 'bridge' || parentTx.category === 'swap') continue;
        if (isBridgeAddress(parentTx.toAddr) || isDEXAddress(parentTx.toAddr)) continue;
        if (isBridgeMethod(parentTx.methodId, parentTx.functionName)) continue;
      }

      // Check interaction count — flag if only seen once (the send itself)
      const count = interactionCount.get(to) || 0;
      if (count <= 1) {
        const ts = parseInt(transfer.timeStamp || '0') || 0;
        const date = ts ? new Date(ts * 1000).toISOString().split('T')[0] : 'Unknown';

        hits.push({
          wallet,
          walletLabel: knownWallets[lower] || null,
          chain: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
          chainId,
          hash: transfer.hash || '',
          to,
          tokenSymbol: transfer.tokenSymbol || symbol,
          amount,
          valueUSD,
          date,
          explorerUrl: `${CHAIN_EXPLORER[chainId] || ''}/tx/${transfer.hash}`,
        });
      }
    }
  } catch (err) {
    // Silently skip failed wallets
  }

  return hits;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainIds, customApiKey, minValueUSD } = body;

    const apiKey = customApiKey || process.env.ETHERSCAN_API_KEY || '';
    const knownWallets = loadKnownWallets();
    const walletAddresses = Object.keys(knownWallets);

    if (walletAddresses.length === 0) {
      return NextResponse.json({ error: 'No wallets found in known_wallets.txt' }, { status: 400 });
    }

    const chains: number[] = (chainIds && chainIds.length > 0) ? chainIds : [1, 8453, 42161, 56, 10];

    const allHits: BatchLossHit[] = [];
    let scannedCount = 0;
    const totalPairs = walletAddresses.length * chains.length;

    // Process wallets in parallel batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
      const batch = walletAddresses.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.flatMap(wallet =>
        chains.map(chainId => scanWalletOnChain(wallet, chainId, knownWallets, apiKey))
      );

      const results = await Promise.allSettled(batchPromises);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allHits.push(...result.value);
        }
      }

      scannedCount += batch.length * chains.length;

      // Rate limit: 200ms between batches
      if (i + BATCH_SIZE < walletAddresses.length) {
        await delay(200);
      }
    }

    // Sort by valueUSD descending
    allHits.sort((a, b) => b.valueUSD - a.valueUSD);

    // Apply minimum value filter
    const threshold = minValueUSD || 500;
    const filtered = allHits.filter(h => h.valueUSD >= threshold);

    return NextResponse.json({
      totalWalletsScanned: walletAddresses.length,
      totalChainsPerWallet: chains.length,
      totalPairsScanned: totalPairs,
      hitsFound: filtered.length,
      hits: filtered,
    });
  } catch (error) {
    console.error('Batch scan error:', error);
    return NextResponse.json(
      { error: 'Batch scan failed. Check server logs.' },
      { status: 500 }
    );
  }
}
