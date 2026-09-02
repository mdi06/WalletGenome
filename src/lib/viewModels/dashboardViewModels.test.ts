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
  assert.equal(viewModel.chainActivity.length, 2);
  assert.equal(viewModel.chainActivity.reduce((sum, chain) => sum + (chain.transactionCount ?? 0), 0), data.aggregated.totalTransactions);
  assert.equal(viewModel.chainActivity.reduce((sum, chain) => sum + (chain.sharePercent ?? 0), 0), 100);
  assert.equal(viewModel.chainActivityStatus, 'complete');
});

test('keeps partial and unavailable chain activity explicit', () => {
  const data = getMockScanResult();
  data.availability[1].transactions = 'partial';
  data.availability.push({
    chainId: 10,
    chainName: 'Optimism',
    transactions: 'unavailable',
    tokenTransfers: 'unavailable',
    internalTransactions: 'unavailable',
    prices: 'unavailable',
    errors: [],
  });

  const viewModel = buildDashboardViewModel(data);
  const base = viewModel.chainActivity.find(chain => chain.chainId === 8453);
  const optimism = viewModel.chainActivity.find(chain => chain.chainId === 10);

  assert.equal(viewModel.chainActivityStatus, 'partial');
  assert.equal(base?.status, 'partial');
  assert.equal(base?.sharePercent, null);
  assert.equal(optimism?.status, 'unavailable');
  assert.equal(optimism?.transactionCount, null);
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

test('does not turn a saved no-link example into an independence claim', () => {
  const data: ClusterScanResult = {
    source: 'saved',
    status: 'complete', totalWallets: 1, requestedWallets: 1, totalTransactions: 0,
    totalGasUSD: 0, totalInflowUSD: 0, avgSybilProbability: 0, flaggedCount: 0,
    totalHighRiskApprovals: 0, wallets: [wallet('0x1', 0, 0)], failedWallets: [], scannedAt: 1,
    linkages: [], sharedCounterparties: [],
  };
  const summary = buildClusterSummary(data);
  assert.match(summary.narrative, /saved cluster example/i);
  assert.match(summary.narrative, /non-live fixture/i);
  assert.doesNotMatch(summary.narrative, /complete returned transfer datasets/i);
});
