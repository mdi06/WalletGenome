import type { BulkWrappedWallet, ClusterScanResult } from './types';

const FORMULA_LIKE_VALUE = /^[\t \r\n]*(?:[=+\-@])/;

export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? 'N/A' : String(value);
  const safe = typeof value === 'string' && FORMULA_LIKE_VALUE.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function formatMoney(value: number | null): string | number {
  return value === null ? 'N/A' : value.toFixed(2);
}

function formatPriceCoverage(summary: ClusterScanResult['priceProvenance']): string {
  if (!summary) return 'N/A';
  return [
    summary.status,
    `${summary.historical} historical`,
    `${summary.stablecoinAssumption} stablecoin assumption`,
    `${summary.spotEstimate} spot estimate`,
    `${summary.unpriced} unpriced`,
  ].join('; ');
}

export function buildClusterCsv(
  data: ClusterScanResult,
  wallets: readonly BulkWrappedWallet[] = data.wallets,
): string {
  const scannedAt = Number.isFinite(data.scannedAt)
    ? new Date(data.scannedAt).toISOString()
    : 'N/A';
  const metadata = [
    ['Report', 'WalletGenome Cluster Scan'],
    ['Data source', data.source ?? 'live'],
    ['Report time (UTC)', scannedAt],
    ['Capital-flow price coverage', formatPriceCoverage(data.priceProvenance)],
    ['Gas price coverage', formatPriceCoverage(data.gasPriceProvenance)],
    [],
  ];
  const headers = [
    'Address',
    'Primary Name',
    'Persona',
    'Risk Grade',
    'Behavioral Sybil Risk (%)',
    'Lifetime Gas (USD)',
    'Total Inflow (USD)',
    'Total Outflow (USD)',
    'Transactions',
    'High Risk Approvals',
    'Wallet Price Coverage',
  ];
  const rows = wallets.map(wallet => [
    wallet.address,
    wallet.primaryName,
    wallet.persona,
    wallet.riskGrade,
    wallet.sybilProbability,
    formatMoney(wallet.totalGasUSD),
    formatMoney(wallet.totalInflowUSD),
    formatMoney(wallet.totalOutflowUSD),
    wallet.transactionCount,
    wallet.highRiskApprovalsCount,
    wallet.priceProvenance
      ? formatPriceCoverage(wallet.priceProvenance)
      : 'N/A',
  ]);

  return buildCsv([...metadata, headers, ...rows]);
}
