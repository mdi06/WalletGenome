import assert from 'node:assert';
import { describe, it } from 'node:test';
import { RISK_GRADE_BANDS, RISK_MODEL, scoreToRiskGrade } from './riskModel';

describe('Canonical risk model', () => {
  it('locks the implemented factor caps and thresholds', () => {
    assert.deepStrictEqual(RISK_MODEL, {
      highRiskApprovals: { maxImpact: 40, impactPerApproval: 15 },
      knownUnlimitedApprovals: { maxImpact: 20, impactPerApproval: 3, minimumCountExclusive: 3 },
      failedTransactions: { maxImpact: 25, ratioMultiplier: 120, minimumRatioExclusive: 0.05 },
      staleApprovals: { maxImpact: 15, impactPerApproval: 3, minimumCountExclusive: 2, ageDays: 180 },
      unknownContracts: { maxImpact: 10, ratioMultiplier: 20, minimumRatioExclusive: 0.30, minimumCountExclusive: 5 },
    });
  });

  it('uses the documented grade boundaries', () => {
    assert.deepStrictEqual(RISK_GRADE_BANDS.map(({ grade, min, max }) => [grade, min, max]), [
      ['A', 0, 15],
      ['B', 16, 30],
      ['C', 31, 50],
      ['D', 51, 70],
      ['F', 71, 100],
    ]);
    assert.strictEqual(scoreToRiskGrade(15), 'A');
    assert.strictEqual(scoreToRiskGrade(16), 'B');
    assert.strictEqual(scoreToRiskGrade(31), 'C');
    assert.strictEqual(scoreToRiskGrade(51), 'D');
    assert.strictEqual(scoreToRiskGrade(71), 'F');
  });
});
