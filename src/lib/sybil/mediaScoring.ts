import { ProcessedTransaction, ProcessedTokenTransfer, MediaScoreBreakdown } from '../types';

interface MediaInput {
  address: string;
  transactions: ProcessedTransaction[];
  tokenTransfers: ProcessedTokenTransfer[];
  uniqueContractCount: number;
  activeChainsCount: number;
  totalVolumeUSD: number;
  totalGasUSD: number;
}

export function computeMediaScore(input: MediaInput): MediaScoreBreakdown {
  const {
    transactions,
    tokenTransfers,
    uniqueContractCount,
    activeChainsCount,
    totalVolumeUSD,
    totalGasUSD,
  } = input;

  const totalTxCount = transactions.length;

  if (totalTxCount === 0) {
    return {
      monetary: 10,
      engagement: 10,
      diversity: 10,
      identity: 10,
      age: 10,
      compositeScore: 10,
      sybilProbability: 90,
      classification: 'High Sybil Risk',
      explanation: 'No transaction history detected. Fresh / unverified wallet.',
    };
  }

  // ── 1. M (Monetary): Capital Depth & Volume (Weight: 25%) ──
  // Evaluates total volume moved + gas burned
  let monetaryScore = 0;
  if (totalVolumeUSD >= 50000) monetaryScore = 95;
  else if (totalVolumeUSD >= 10000) monetaryScore = 85;
  else if (totalVolumeUSD >= 2500) monetaryScore = 70;
  else if (totalVolumeUSD >= 500) monetaryScore = 50;
  else if (totalVolumeUSD >= 100) monetaryScore = 30;
  else monetaryScore = 15;

  if (totalGasUSD > 200) monetaryScore = Math.min(100, monetaryScore + 10);

  // ── 2. E (Engagement): Frequency, Months & Cadence (Weight: 25%) ──
  // Extract distinct active months
  const activeMonths = new Set<string>();
  const timestamps = transactions.map(t => t.timestamp).filter(Boolean).sort((a, b) => a - b);

  for (const t of transactions) {
    if (t.date) {
      activeMonths.add(t.date.slice(0, 7));
    }
  }

  let engagementScore = 0;
  const monthCount = activeMonths.size;
  if (monthCount >= 12) engagementScore = 95;
  else if (monthCount >= 6) engagementScore = 80;
  else if (monthCount >= 3) engagementScore = 65;
  else if (monthCount >= 2) engagementScore = 45;
  else engagementScore = 20;

  // Bot Burstiness Penalty: If 90% of transactions happened in < 48 hours
  if (timestamps.length >= 10) {
    const spanSeconds = timestamps[timestamps.length - 1] - timestamps[0];
    const spanDays = spanSeconds / (24 * 3600);
    if (spanDays < 2 && totalTxCount > 15) {
      engagementScore = Math.max(10, engagementScore - 30); // Scripted farming penalty
    }
  }

  // ── 3. D (Diversity): Protocol & Contract Breadth (Weight: 20%) ──
  let diversityScore = 0;
  if (uniqueContractCount >= 25) diversityScore = 95;
  else if (uniqueContractCount >= 12) diversityScore = 80;
  else if (uniqueContractCount >= 5) diversityScore = 60;
  else if (uniqueContractCount >= 2) diversityScore = 40;
  else diversityScore = 15;

  // Category diversity check
  const categories = new Set(transactions.map(t => t.category).filter(c => c && c !== 'unknown'));
  if (categories.size >= 4) diversityScore = Math.min(100, diversityScore + 10);

  // ── 4. I (Identity & Cross-Chain Breadth) (Weight: 15%) ──
  let identityScore = 30;
  if (activeChainsCount >= 4) identityScore = 95;
  else if (activeChainsCount >= 3) identityScore = 80;
  else if (activeChainsCount >= 2) identityScore = 60;
  else identityScore = 40;

  // Bonus for non-trivial token transfer counterparties
  if (tokenTransfers.length >= 15) identityScore = Math.min(100, identityScore + 10);

  // ── 5. A (Age & Maturity) (Weight: 15%) ──
  let ageScore = 20;
  if (timestamps.length > 0) {
    const earliestTime = timestamps[0];
    const ageDays = (Date.now() / 1000 - earliestTime) / (24 * 3600);

    if (ageDays >= 365) ageScore = 95;
    else if (ageDays >= 180) ageScore = 80;
    else if (ageDays >= 90) ageScore = 60;
    else if (ageDays >= 30) ageScore = 40;
    else ageScore = 20;
  }

  // ── Composite MEDIA Formula ──
  const compositeScore = Math.round(
    0.25 * monetaryScore +
    0.25 * engagementScore +
    0.20 * diversityScore +
    0.15 * identityScore +
    0.15 * ageScore
  );

  const sybilProbability = Math.max(0, Math.min(100, 100 - compositeScore));

  let classification: 'Organic Human' | 'Moderate / Farmer' | 'High Sybil Risk' = 'Organic Human';
  let explanation = '';

  if (compositeScore >= 68) {
    classification = 'Organic Human';
    explanation = 'Behavior matches an organic power user across multi-month engagement, healthy capital depth, and cross-protocol diversity.';
  } else if (compositeScore >= 45) {
    classification = 'Moderate / Farmer';
    explanation = 'Moderate on-chain footprint. Shows consistent activity but may exhibit repetitive farming or low capital retention.';
  } else {
    classification = 'High Sybil Risk';
    explanation = 'High probability of automated script execution, short activity burst, or single-purpose dust interaction pattern.';
  }

  return {
    monetary: monetaryScore,
    engagement: engagementScore,
    diversity: diversityScore,
    identity: identityScore,
    age: ageScore,
    compositeScore,
    sybilProbability,
    classification,
    explanation,
  };
}
