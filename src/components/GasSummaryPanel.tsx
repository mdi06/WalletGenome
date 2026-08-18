'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ScanResult } from '@/lib/types';
import { Flame, TrendingDown, Calendar, Layers } from 'lucide-react';
import { getChainConfig } from '@/lib/chains';

interface GasSummaryPanelProps {
  results: ScanResult[];
}

function formatUSD(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  transfer: '#60a5fa',
  swap: '#818cf8',
  approval: '#fbbf24',
  nft: '#a78bfa',
  bridge: '#22d3ee',
  lending: '#34d399',
  staking: '#f472b6',
  contract_deploy: '#fb923c',
  contract_interaction: '#94a3b8',
  failed: '#f87171',
  unknown: '#64748b',
};

const CATEGORY_LABELS: Record<string, string> = {
  transfer: 'Transfers',
  swap: 'Swaps',
  approval: 'Approvals',
  nft: 'NFT',
  bridge: 'Bridge',
  lending: 'Lending',
  staking: 'Staking',
  contract_deploy: 'Deploy',
  contract_interaction: 'Contracts',
  failed: 'Failed',
  unknown: 'Other',
};

export default function GasSummaryPanel({ results }: GasSummaryPanelProps) {
  const monthlyMap = new Map<string, number>();
  let totalGasETH = 0;
  let totalGasUSD = 0;
  let totalFailed = 0;
  let failedGasETH = 0;
  let failedGasUSD = 0;
  let totalTxCount = 0;

  const categoryMap = new Map<string, number>();

  for (const result of results) {
    const gas = result.gasSummary;
    if (!gas) continue;
    totalGasETH += gas.totalGasETH || 0;
    totalGasUSD += gas.totalGasUSD || 0;
    totalFailed += gas.failedTransactionCount || 0;
    failedGasETH += gas.failedGasETH || 0;
    failedGasUSD += gas.failedGasUSD || 0;
    totalTxCount += gas.transactionCount || 0;

    if (Array.isArray(gas.monthlyBreakdown)) {
      for (const m of gas.monthlyBreakdown) {
        monthlyMap.set(m.month, (monthlyMap.get(m.month) || 0) + (m.gasUSD || 0));
      }
    }

    if (Array.isArray(gas.categoryBreakdown)) {
      for (const c of gas.categoryBreakdown) {
        categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + (c.gasUSD || 0));
      }
    }
  }

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([month, gasUSD]) => ({ month: month.slice(2), gasUSD }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const categoryData = Array.from(categoryMap.entries())
    .map(([category, gasUSD]) => ({
      name: CATEGORY_LABELS[category] || category,
      value: gasUSD,
      color: CATEGORY_COLORS[category] || '#64748b',
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  let worstDay = results[0]?.gasSummary?.worstDay;
  for (const r of results) {
    if (r.gasSummary?.worstDay && (!worstDay || (r.gasSummary.worstDay.gasUSD || 0) > (worstDay.gasUSD || 0))) {
      worstDay = r.gasSummary.worstDay;
    }
  }

  return (
    <div style={styles.container} className="animate-fade-in-up">
      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard} className="glass-card">
          <Flame size={20} color="var(--accent-amber)" />
          <div>
            <div style={styles.statValue}>{totalGasETH.toFixed(4)} ETH</div>
            <div style={styles.statLabel}>Total gas ({formatUSD(totalGasUSD)})</div>
          </div>
        </div>
        <div style={styles.statCard} className="glass-card">
          <TrendingDown size={20} color="var(--accent-red)" />
          <div>
            <div style={styles.statValue}>{failedGasETH.toFixed(4)} ETH</div>
            <div style={styles.statLabel}>{totalFailed} failed txs ({formatUSD(failedGasUSD)} lost)</div>
          </div>
        </div>
        {worstDay && (
          <div style={styles.statCard} className="glass-card">
            <Calendar size={20} color="var(--accent-purple)" />
            <div>
              <div style={styles.statValue}>{worstDay.gasETH.toFixed(4)} ETH</div>
              <div style={styles.statLabel}>Peak day ({worstDay.date}) · {formatUSD(worstDay.gasUSD)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Chain-by-Chain Native Gas Breakdown */}
      {results.length > 0 && (
        <div className="glass-card" style={styles.chainBreakdownCard}>
          <div style={styles.chainCardHeader}>
            <Layers size={16} color="var(--accent-indigo)" />
            <span style={styles.chainCardTitle}>Gas Spent by Network (Native Tokens)</span>
          </div>
          <div style={styles.chainGrid}>
            {results.map((r) => {
              const chain = getChainConfig(r.chainId);
              const gasETH = r.gasSummary?.totalGasETH || 0;
              const gasUSD = r.gasSummary?.totalGasUSD || 0;
              const txCount = r.gasSummary?.transactionCount || 0;
              return (
                <div key={r.chainId} style={styles.chainItem}>
                  <div style={styles.chainItemTop}>
                    <span style={{ ...styles.chainDot, background: chain.color }} />
                    <span style={styles.chainItemName}>{chain.name}</span>
                    <span style={styles.chainTxCount}>{txCount} txs</span>
                  </div>
                  <div style={styles.chainGasAmount}>
                    {gasETH.toFixed(4)} {chain.nativeToken.symbol}
                  </div>
                  <div style={styles.chainGasUSD}>
                    ≈ {formatUSD(gasUSD)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={styles.chartsGrid}>
        <div className="glass-card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Gas Spent Over Time (USD)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(monthlyData.length / 12))}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'K' : v.toFixed(0)}`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => [formatUSD(Number(value)), 'Gas']}
                />
                <Bar dataKey="gasUSD" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill="var(--accent-indigo)" opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.noData}>No gas activity recorded</p>
          )}
        </div>

        <div className="glass-card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Gas by Category</h3>
          {categoryData.length > 0 ? (
            <div style={styles.categoryContent}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                    formatter={(value) => [formatUSD(Number(value)), 'Gas']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={styles.legend}>
                {categoryData.slice(0, 6).map((cat, i) => (
                  <div key={i} style={styles.legendItem}>
                    <div style={{ ...styles.legendDot, background: cat.color }} />
                    <span style={styles.legendLabel}>{cat.name}</span>
                    <span style={styles.legendValue}>{formatUSD(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={styles.noData}>No category data</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-md)',
  },
  statCard: {
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  statValue: { fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  statLabel: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
  chainBreakdownCard: {
    padding: 'var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  chainCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  chainCardTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  chainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-md)',
  },
  chainItem: {
    background: 'var(--bg-glass)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  chainItemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  chainDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  chainItemName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
  },
  chainTxCount: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  chainGasAmount: {
    fontSize: '1.15rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    marginTop: 4,
  },
  chainGasUSD: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: 'var(--space-md)',
  },
  chartCard: { padding: 'var(--space-lg)' },
  chartTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-md)',
  },
  noData: { color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-xl)' },
  categoryContent: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
  legend: { display: 'flex', flexDirection: 'column', gap: 6 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, color: 'var(--text-secondary)' },
  legendValue: { color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' },
};
