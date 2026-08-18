import {
  ApprovalSummary,
  GasSummary,
  GraveyardSummary,
  RiskAssessment,
  RiskFactor,
  ProcessedTransaction,
} from '../types';

export function computeRiskScore(
  approvalSummary: ApprovalSummary,
  gasSummary: GasSummary,
  graveyardSummary: GraveyardSummary,
  transactions: ProcessedTransaction[]
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let rawScore = 0;

  // ── Factor 1: Unlimited approvals to unverified contracts (weight: 40) ──
  const highRiskApprovals = approvalSummary.highRiskCount;
  const unlimitedApprovals = approvalSummary.unlimitedCount;
  
  if (highRiskApprovals > 0) {
    const approvalImpact = Math.min(40, highRiskApprovals * 15);
    rawScore += approvalImpact;
    factors.push({
      label: `${highRiskApprovals} High-Risk Approval${highRiskApprovals > 1 ? 's' : ''}`,
      impact: approvalImpact,
      description: `${highRiskApprovals} unlimited token approval${highRiskApprovals > 1 ? 's' : ''} granted to unverified contracts. These could drain your tokens at any time.`,
      severity: 'critical',
    });
  } else if (unlimitedApprovals > 3) {
    const approvalImpact = Math.min(20, unlimitedApprovals * 3);
    rawScore += approvalImpact;
    factors.push({
      label: `${unlimitedApprovals} Unlimited Approvals`,
      impact: approvalImpact,
      description: `${unlimitedApprovals} active unlimited approvals. While approved to known contracts, consider revoking stale ones.`,
      severity: 'warning',
    });
  }

  // ── Factor 2: Failed transaction ratio (weight: 25) ──
  const failedRatio = gasSummary.transactionCount > 0
    ? gasSummary.failedTransactionCount / gasSummary.transactionCount
    : 0;
  
  if (failedRatio > 0.05) {
    const failedImpact = Math.min(25, Math.round(failedRatio * 120));
    rawScore += failedImpact;
    factors.push({
      label: `${(failedRatio * 100).toFixed(1)}% Failed Transactions`,
      impact: failedImpact,
      description: `${gasSummary.failedTransactionCount} of ${gasSummary.transactionCount} transactions failed, wasting ${gasSummary.failedGasETH.toFixed(4)} ETH (~$${gasSummary.failedGasUSD.toFixed(2)}) in gas.`,
      severity: failedRatio > 0.15 ? 'warning' : 'info',
    });
  }

  // ── Factor 3: Stale approvals — approvals older than 6 months (weight: 15) ──
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - (180 * 24 * 3600);
  const staleApprovals = approvalSummary.activeApprovals.filter(a => a.timestamp < sixMonthsAgo);
  if (staleApprovals.length > 2) {
    const staleImpact = Math.min(15, staleApprovals.length * 3);
    rawScore += staleImpact;
    factors.push({
      label: `${staleApprovals.length} Stale Approval${staleApprovals.length > 1 ? 's' : ''}`,
      impact: staleImpact,
      description: `${staleApprovals.length} token approvals older than 6 months still active. Old approvals to abandoned contracts pose a security risk.`,
      severity: 'warning',
    });
  }

  // ── Factor 4: Interaction with unknown contracts (weight: 10) ──
  const unknownTxs = transactions.filter(
    tx => tx.category === 'contract_interaction' || tx.category === 'unknown'
  );
  const unknownRatio = transactions.length > 0 ? unknownTxs.length / transactions.length : 0;
  
  if (unknownRatio > 0.3 && unknownTxs.length > 5) {
    const unknownImpact = Math.min(10, Math.round(unknownRatio * 20));
    rawScore += unknownImpact;
    factors.push({
      label: `${(unknownRatio * 100).toFixed(0)}% Unknown Contract Interactions`,
      impact: unknownImpact,
      description: `${unknownTxs.length} transactions to unidentified contracts. This may include interactions with unverified or risky protocols.`,
      severity: 'info',
    });
  }

  // ── Factor 5: Dead assets (weight: 10) ──
  const deadCount = graveyardSummary.totalTokensDead;
  if (deadCount > 5) {
    const deadImpact = Math.min(10, deadCount);
    rawScore += deadImpact;
    factors.push({
      label: `${deadCount} Dead Token${deadCount > 1 ? 's' : ''}`,
      impact: deadImpact,
      description: `Holding ${deadCount} tokens with no recent activity or value. Peak value lost: $${graveyardSummary.totalPeakValueLost.toFixed(0)}.`,
      severity: 'info',
    });
  }

  // ── Positive signals (reduce risk) ──
  if (factors.length === 0) {
    factors.push({
      label: 'Clean History',
      impact: 0,
      description: 'No significant risk factors detected. This wallet has a clean on-chain record.',
      severity: 'info',
    });
  }

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const grade = scoreToGrade(score);

  // Sort factors by impact desc
  factors.sort((a, b) => b.impact - a.impact);

  return { score, grade, factors };
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score <= 15) return 'A';
  if (score <= 30) return 'B';
  if (score <= 50) return 'C';
  if (score <= 70) return 'D';
  return 'F';
}
