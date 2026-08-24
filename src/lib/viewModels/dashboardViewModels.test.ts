import assert from 'node:assert/strict';
import test from 'node:test';
import { getMockScanResult } from '../mockData';
import type { BulkWrappedWallet, ClusterScanResult } from '../types';
import { buildClusterSummary, buildDashboardViewModel, sortClusterWallets } from './dashboardViewModels';

function wallet(address: string, riskScore: number, gas: number): BulkWrappedWallet {
  return {
    address,
    primaryName: undefined,
    persona: 'Active Trader',
    riskScore,
    riskGrade: 'C',
    sybilProbability: 20,
    isFlagged: false,
    flaggedDatabases: [],
    totalGasETH: 0.1,
    totalGasUSD: gas,
    totalInflowUSD: 100,
    totalOutflowUSD: 50,
    transactionCount: 10,
    highRiskApprovalsCount: 0,
    unlimitedApprovalsCount: 0,
    socialsCount: 0,
    counterparties: [],
  };
}

test('builds stable single-wallet presentation values outside the renderer', () => {
  const data = getMockScanResult();
  data.metrics = { ...data.metrics, sybilProbability: 10 };
  const viewModel = buildDashboardViewModel(data);
  assert.equal(viewModel.riskScore, data.metrics.riskScore);
  assert.equal(viewModel.formattedGasUSD.startsWith('$'), true);
  assert.equal(viewModel.approvalCount, data.chains.reduce((sum, chain) => sum + chain.approvalSummary.totalApprovals, 0));
  assert.equal(viewModel.radarData.length, 6);
});

test('builds evidence-based cluster summary and deterministic sorting', () => {
  const wallets = [wallet('0x2', 80, 20), wallet('0x1', 10, 100)];
  const data: ClusterScanResult = {
    status: 'complete', totalWallets: 2, requestedWallets: 2, totalTransactions: 20,
    totalGasUSD: 120, totalInflowUSD: 200, avgSybilProbability: 20, flaggedCount: 0,
    totalHighRiskApprovals: 0, wallets, failedWallets: [], scannedAt: 1,
    linkages: [], sharedCounterparties: [],
  };
  assert.equal(buildClusterSummary(data).coordinationLevel, 'INDEPENDENT PORTFOLIO');
  assert.deepEqual(sortClusterWallets(wallets, 'risk', false).map(item => item.address), ['0x2', '0x1']);
  assert.deepEqual(sortClusterWallets(wallets, 'gas', true).map(item => item.address), ['0x2', '0x1']);
});
