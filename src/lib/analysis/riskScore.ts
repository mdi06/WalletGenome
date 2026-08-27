import {
  ApprovalSummary,
  GasSummary,
  RiskAssessment,
  RiskFactor,
  ProcessedTransaction,
} from '../types';
import { RISK_MODEL, scoreToRiskGrade } from './riskModel';
import { formatNativeTokenValue } from '../utils/dashboardUtils';

export function computeRiskScore(
  approvalSummary: ApprovalSummary,
  gasSummary: GasSummary,
  transactions: ProcessedTransaction[]
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let rawScore = 0;

  // ── Factor 1: Unlimited approvals to unverified contracts (weight: 40) ──
  const highRiskApprovals = approvalSummary.highRiskCount;
  const unlimitedApprovals = approvalSummary.unlimitedCount;
  
  if (highRiskApprovals > 0) {
    const approvalImpact = Math.min(
      RISK_MODEL.highRiskApprovals.maxImpact,
      highRiskApprovals * RISK_MODEL.highRiskApprovals.impactPerApproval,
    );
    rawScore += approvalImpact;
    factors.push({
      label: `${highRiskApprovals} High-Risk Approval${highRiskApprovals > 1 ? 's' : ''}`,
      impact: approvalImpact,
      description: `${highRiskApprovals} unlimited token approval${highRiskApprovals > 1 ? 's' : ''} granted to unverified contracts. Allowance authority is scored separately from the balance-and-price exposure estimate.`,
      severity: 'critical',
    });
  } else if (unlimitedApprovals > RISK_MODEL.knownUnlimitedApprovals.minimumCountExclusive) {
    const approvalImpact = Math.min(
      RISK_MODEL.knownUnlimitedApprovals.maxImpact,
      unlimitedApprovals * RISK_MODEL.knownUnlimitedApprovals.impactPerApproval,
    );
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
  
  if (failedRatio > RISK_MODEL.failedTransactions.minimumRatioExclusive) {
    const failedImpact = Math.min(
      RISK_MODEL.failedTransactions.maxImpact,
      Math.round(failedRatio * RISK_MODEL.failedTransactions.ratioMultiplier),
    );
    rawScore += failedImpact;
    factors.push({
      label: `${(failedRatio * 100).toFixed(1)}% Failed Transactions`,
      impact: failedImpact,
      description: `${gasSummary.failedTransactionCount} of ${gasSummary.transactionCount} transactions failed, wasting ${formatNativeTokenValue(gasSummary.failedGasETH)} (~$${gasSummary.failedGasUSD.toFixed(2)}) in gas.`,
      severity: failedRatio > 0.15 ? 'warning' : 'info',
    });
  }

  // ── Factor 3: Stale approvals — approvals older than 6 months (weight: 15) ──
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - (RISK_MODEL.staleApprovals.ageDays * 24 * 3600);
  const staleApprovals = approvalSummary.activeApprovals.filter(a => a.timestamp < sixMonthsAgo);
  if (staleApprovals.length > RISK_MODEL.staleApprovals.minimumCountExclusive) {
    const staleImpact = Math.min(
      RISK_MODEL.staleApprovals.maxImpact,
      staleApprovals.length * RISK_MODEL.staleApprovals.impactPerApproval,
    );
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
  
  if (
    unknownRatio > RISK_MODEL.unknownContracts.minimumRatioExclusive
    && unknownTxs.length > RISK_MODEL.unknownContracts.minimumCountExclusive
  ) {
    const unknownImpact = Math.min(
      RISK_MODEL.unknownContracts.maxImpact,
      Math.round(unknownRatio * RISK_MODEL.unknownContracts.ratioMultiplier),
    );
    rawScore += unknownImpact;
    factors.push({
      label: `${(unknownRatio * 100).toFixed(0)}% Unknown Contract Interactions`,
      impact: unknownImpact,
      description: `${unknownTxs.length} transactions to unidentified contracts. This may include interactions with unverified or risky protocols.`,
      severity: 'info',
    });
  }

  // ── Positive signals (reduce risk) ──
  if (factors.length === 0) {
    factors.push({
      label: 'Clean History',
      impact: 0,
      description: 'No configured risk factor crossed its scoring threshold in the returned complete dataset.',
      severity: 'info',
    });
  }

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const grade = scoreToRiskGrade(score);

  // Sort factors by impact desc
  factors.sort((a, b) => b.impact - a.impact);

  return { score, grade, factors };
}
