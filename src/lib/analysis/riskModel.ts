import { RiskGrade } from '../types';

export const RISK_MODEL = {
  highRiskApprovals: { maxImpact: 40, impactPerApproval: 15 },
  knownUnlimitedApprovals: { maxImpact: 20, impactPerApproval: 3, minimumCountExclusive: 3 },
  failedTransactions: { maxImpact: 25, ratioMultiplier: 120, minimumRatioExclusive: 0.05 },
  staleApprovals: { maxImpact: 15, impactPerApproval: 3, minimumCountExclusive: 2, ageDays: 180 },
  unknownContracts: { maxImpact: 10, ratioMultiplier: 20, minimumRatioExclusive: 0.30, minimumCountExclusive: 5 },
} as const;

export const RISK_GRADE_BANDS: ReadonlyArray<{
  grade: RiskGrade;
  min: number;
  max: number;
}> = [
  { grade: 'A', min: 0, max: 15 },
  { grade: 'B', min: 16, max: 30 },
  { grade: 'C', min: 31, max: 50 },
  { grade: 'D', min: 51, max: 70 },
  { grade: 'F', min: 71, max: 100 },
] as const;

export function scoreToRiskGrade(score: number): RiskGrade {
  return RISK_GRADE_BANDS.find(band => score >= band.min && score <= band.max)?.grade ?? 'F';
}
