import {
  ProcessedTransaction,
  ProcessedTokenTransfer,
  WalletFingerprint,
  WalletPersona,
  FingerprintDimension,
  TransactionCategory,
} from '../types';

const DEFI_CATEGORIES: TransactionCategory[] = ['swap', 'lending', 'staking', 'bridge', 'nft'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

export function analyzeBehavioralFingerprint(
  transactions: ProcessedTransaction[],
  tokenTransfers: ProcessedTokenTransfer[],
  walletAddress: string
): WalletFingerprint {
  const lower = walletAddress.toLowerCase();
  const allTxs = transactions.filter(tx => (tx.from || '').toLowerCase() === lower);

  // ── Timestamps & basics ──
  const allTimestamps = [
    ...transactions.map(t => t.timestamp),
    ...tokenTransfers.map(t => t.timestamp),
  ].filter(t => t > 0);
  
  const firstTs = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Math.floor(Date.now() / 1000);
  const lastTs = allTimestamps.length > 0 ? Math.max(...allTimestamps) : firstTs;
  const walletAgeMonths = Math.max(1, Math.floor((lastTs - firstTs) / (30 * 24 * 3600)));
  const firstDate = new Date(firstTs * 1000).toISOString().split('T')[0];
  const lastDate = new Date(lastTs * 1000).toISOString().split('T')[0];

  // Active months
  const monthSet = new Set<string>();
  for (const ts of allTimestamps) {
    const d = new Date(ts * 1000);
    monthSet.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
  }
  const activeMonths = monthSet.size;

  // Unique contracts
  const contractSet = new Set<string>();
  for (const tx of transactions) {
    if (tx.to && tx.to !== lower) contractSet.add(tx.to.toLowerCase());
  }
  const uniqueContracts = contractSet.size;

  // ── 1. DeFi Diversity (Shannon entropy across categories) ──
  const catCounts = new Map<TransactionCategory, number>();
  for (const tx of allTxs) {
    catCounts.set(tx.category, (catCounts.get(tx.category) || 0) + 1);
  }
  const defiCats = DEFI_CATEGORIES.map(c => catCounts.get(c) || 0);
  const maxEntropy = Math.log2(DEFI_CATEGORIES.length); // ~2.32
  const entropy = shannonEntropy(defiCats);
  const defiDiversity = clamp(maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0);
  const totalDefiTxs = defiCats.reduce((a, b) => a + b, 0);

  // ── 2. Activity Intensity (txs per active month) ──
  const txsPerMonth = activeMonths > 0 ? transactions.length / activeMonths : 0;
  // 50 txs/month = 100 score
  const activityIntensity = clamp((txsPerMonth / 50) * 100);

  // ── 3. Capital Efficiency (value transferred / gas spent) ──
  const totalGasUSD = allTxs.reduce((sum, tx) => sum + (tx.gasCostUSD || 0), 0);
  const totalValueUSD = [
    ...transactions.filter(tx => tx.valueUSD && tx.valueUSD > 0).map(tx => tx.valueUSD!),
    ...tokenTransfers.filter(t => t.valueUSD && t.valueUSD > 0).map(t => t.valueUSD!),
  ].reduce((a, b) => a + b, 0);
  
  const efficiencyRatio = totalGasUSD > 0 ? totalValueUSD / totalGasUSD : 0;
  // ratio of 100:1 (value:gas) = 100 score
  const capitalEfficiency = clamp(Math.min(efficiencyRatio / 100, 1) * 100);

  // ── 4. Risk Appetite ──
  const failedTxs = allTxs.filter(tx => tx.isError).length;
  const failedRatio = allTxs.length > 0 ? failedTxs / allTxs.length : 0;
  const unknownInteractions = allTxs.filter(tx => tx.category === 'contract_interaction' || tx.category === 'unknown').length;
  const unknownRatio = allTxs.length > 0 ? unknownInteractions / allTxs.length : 0;
  const riskAppetite = clamp((failedRatio * 200 + unknownRatio * 150));

  // ── 5. Wallet Maturity ──
  // Max maturity at 36 months + high active ratio
  const ageScore = clamp((walletAgeMonths / 36) * 60);
  const activeRatio = walletAgeMonths > 0 ? activeMonths / walletAgeMonths : 0;
  const maturityScore = clamp(ageScore + activeRatio * 40);

  // ── 6. Network Breadth ──
  const uniqueCounterparties = new Set<string>();
  for (const tx of transactions) {
    if (tx.from.toLowerCase() !== lower && tx.from) uniqueCounterparties.add(tx.from.toLowerCase());
    if (tx.to && tx.to.toLowerCase() !== lower) uniqueCounterparties.add(tx.to.toLowerCase());
  }
  for (const t of tokenTransfers) {
    if (t.from.toLowerCase() !== lower && t.from) uniqueCounterparties.add(t.from.toLowerCase());
    if (t.to && t.to.toLowerCase() !== lower) uniqueCounterparties.add(t.to.toLowerCase());
  }
  // 100 unique counterparties = 100 score
  const networkBreadth = clamp((uniqueCounterparties.size / 100) * 100);

  // ── Determine persona ──
  const dimensions: FingerprintDimension[] = [
    { axis: 'DeFi Diversity', score: Math.round(defiDiversity), detail: `${totalDefiTxs} DeFi txs across ${defiCats.filter(c => c > 0).length} categories` },
    { axis: 'Activity', score: Math.round(activityIntensity), detail: `${txsPerMonth.toFixed(1)} txs/month avg` },
    { axis: 'Capital Efficiency', score: Math.round(capitalEfficiency), detail: `$${totalValueUSD.toFixed(0)} moved / $${totalGasUSD.toFixed(0)} gas` },
    { axis: 'Risk Appetite', score: Math.round(riskAppetite), detail: `${(failedRatio * 100).toFixed(1)}% failed, ${(unknownRatio * 100).toFixed(1)}% unknown contracts` },
    { axis: 'Maturity', score: Math.round(maturityScore), detail: `${walletAgeMonths}mo old, ${activeMonths} active months` },
    { axis: 'Network Breadth', score: Math.round(networkBreadth), detail: `${uniqueCounterparties.size} unique counterparties` },
  ];

  const persona = derivePersona(dimensions, catCounts, transactions.length, walletAgeMonths);

  return {
    dimensions,
    persona: persona.name,
    personaDescription: persona.description,
    walletAgeMonths,
    firstActivityDate: firstDate,
    lastActivityDate: lastDate,
    activeMonths,
    uniqueContracts,
  };
}

function derivePersona(
  dims: FingerprintDimension[],
  catCounts: Map<TransactionCategory, number>,
  totalTxs: number,
  ageMonths: number
): { name: WalletPersona; description: string } {
  const scores = Object.fromEntries(dims.map(d => [d.axis, d.score]));
  
  if (totalTxs < 5 || ageMonths < 1) {
    return { name: 'New Wallet', description: 'Limited on-chain history. This wallet is relatively new or inactive.' };
  }

  const swapCount = catCounts.get('swap') || 0;
  const nftCount = catCounts.get('nft') || 0;
  const bridgeCount = catCounts.get('bridge') || 0;
  const lendCount = catCounts.get('lending') || 0;
  const stakeCount = catCounts.get('staking') || 0;

  if (scores['DeFi Diversity'] > 60 && (lendCount + stakeCount + swapCount) > totalTxs * 0.3) {
    return { name: 'DeFi Power User', description: 'Highly active across multiple DeFi protocols — swaps, lending, staking, and bridging. Sophisticated on-chain operator.' };
  }

  if (swapCount > totalTxs * 0.4 && scores['Activity'] > 50) {
    return { name: 'Active Trader', description: 'Frequent token swaps and high activity. This wallet pattern suggests active trading or portfolio rotation.' };
  }

  if (nftCount > totalTxs * 0.3) {
    return { name: 'NFT Collector', description: 'Heavy NFT minting, buying, and transferring activity. Focused on the digital collectibles ecosystem.' };
  }

  if (bridgeCount > totalTxs * 0.2) {
    return { name: 'Bridge Heavy', description: 'Significant cross-chain bridging activity. Moving assets between L1s and L2s frequently.' };
  }

  if (scores['Risk Appetite'] > 60) {
    return { name: 'Gas Burner', description: 'High rate of failed transactions and interactions with unverified contracts. Risk-tolerant behavior.' };
  }

  if (scores['Activity'] < 20 && scores['Maturity'] > 50) {
    return { name: 'Passive Whale', description: 'Low transaction frequency relative to wallet age. Likely a long-term holder or cold storage wallet.' };
  }

  if (scores['Activity'] > 40 && scores['DeFi Diversity'] < 30) {
    return { name: 'Airdrop Farmer', description: 'High activity but low DeFi diversity — repetitive simple interactions. Pattern consistent with protocol farming.' };
  }

  if (scores['Activity'] < 30 && scores['Capital Efficiency'] > 50) {
    return { name: 'Cautious Holder', description: 'Infrequent but deliberate transactions with good capital efficiency. Conservative on-chain behavior.' };
  }

  return { name: 'Active Trader', description: 'Moderate on-chain activity across various transaction types.' };
}
