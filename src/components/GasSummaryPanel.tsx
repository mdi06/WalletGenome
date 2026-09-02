'use client';

import React from 'react';
import { ScanResult } from '@/lib/types';
import { getChainConfig } from '@/lib/chains';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { formatCategoryLabel, formatFiatUSD, formatNativeTokenValue } from '@/lib/utils/dashboardUtils';

interface Props {
  results: ScanResult[];
}

export default function GasSummaryPanel({ results }: Props) {
  const ethChains = results.filter(r => {
    try {
      return getChainConfig(r.chainId).nativeToken.symbol === 'ETH';
    } catch {
      return true;
    }
  });

  const totalGasETH = ethChains.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0);
  const totalGasUSD = results.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0);
  const failedTxsCount = results.reduce((sum, r) => sum + (r.gasSummary?.failedTransactionCount || 0), 0);
  const failedGasETH = ethChains.reduce((sum, r) => sum + (r.gasSummary?.failedGasETH || 0), 0);
  const failedGasUSD = results.reduce((sum, r) => sum + (r.gasSummary?.failedGasUSD || 0), 0);
  const historicalPriceCount = results.reduce((sum, r) => sum + r.priceProvenance.historical, 0);
  const stablecoinAssumptionCount = results.reduce((sum, r) => sum + r.priceProvenance.stablecoinAssumption, 0);

  // Merge monthly gas trends
  const monthlyMap = new Map<string, number>();
  results.forEach(r => {
    r.gasSummary?.monthlyBreakdown?.forEach(item => {
      monthlyMap.set(item.month, (monthlyMap.get(item.month) || 0) + item.gasUSD);
    });
  });

  const chartData = Array.from(monthlyMap.entries())
    .map(([month, gasUSD]) => ({ month, gasUSD: Math.round(gasUSD) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Gas by Category
  const categoryMap = new Map<string, number>();
  results.forEach(r => {
    r.gasSummary?.categoryBreakdown?.forEach(item => {
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.gasUSD);
    });
  });

  const categoryColors: Record<string, string> = {
    swap: '#ff5500',
    contract_interaction: '#0a0a0a',
    transfer: '#3b82f6',
    approval: '#f59e0b',
    bridge: '#8b5cf6',
    lending: '#059669',
    staking: '#ec4899',
    nft: '#06b6d4',
  };

  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name: formatCategoryLabel(name),
    value,
    color: categoryColors[name.toLowerCase()] || '#777777',
  }));

  return (
    <div className="space-y-6 md:space-y-5">
      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card-3d space-y-1 p-4 text-[#0a0a0a] sm:p-5 lg:p-4">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center justify-between">
            <span>TOTAL GAS CONSUMPTION</span>
            <span className="text-xs font-sans font-bold text-[#4b5563] normal-case">Observed history</span>
          </div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">
            {formatNativeTokenValue(totalGasETH, 'ETH')}
          </div>
          <div className="text-xs font-bold text-[#4b5563] font-mono">
            ≈ ${totalGasUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
          </div>
          <div className="text-[10px] font-bold text-[#6b7280]">
            {historicalPriceCount} historical quotes · {stablecoinAssumptionCount} stablecoin assumptions
          </div>
        </div>

        <div className="card-3d space-y-1 p-4 text-[#0a0a0a] sm:p-5 lg:p-4">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            FAILED TRANSACTIONS BURN
          </div>
          <div className="text-3xl font-black text-[#dc2626] font-mono">
            {formatNativeTokenValue(failedGasETH, 'ETH')}
          </div>
          <div className="text-xs font-bold text-[#4b5563] font-mono">
            {failedTxsCount} failed txs (≈ ${failedGasUSD.toFixed(2)} lost)
          </div>
        </div>

        <div className="card-3d space-y-1 p-4 text-[#0a0a0a] sm:p-5 lg:p-4">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            ACTIVE NETWORKS
          </div>
          <div className="text-3xl font-black text-orange-ink font-mono">
            {results.length} Chains
          </div>
          <div className="text-xs font-bold text-[#4b5563] font-mono">
            Ethereum and L2 rollups
          </div>
        </div>
      </div>

      {/* ── Network Gas Breakdown Row ── */}
      <div className="space-y-2">
        <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
          GAS SPENT BY NETWORK
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {results.map(r => {
            const nativeSymbol = getChainConfig(r.chainId)?.nativeToken?.symbol || 'ETH';
            return (
              <div key={r.chainId} className="card-3d space-y-1 p-4 text-[#0a0a0a]">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#0a0a0a]">{r.chainName}</span>
                  <span className="btn-3d-neutral font-mono text-[9px] px-1.5 py-0.2">{r.transactionCount} txs</span>
                </div>
                <div className="text-base font-black text-[#0a0a0a] font-mono">
                  {formatNativeTokenValue(r.gasSummary?.totalGasETH, nativeSymbol)}
                </div>
                <div className="text-[11px] font-bold text-[#4b5563] font-mono">
                  ≈ ${(r.gasSummary?.totalGasUSD || 0).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Charts Grid (Gas Over Time & Gas By Category) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-5 pt-2">
        
        {/* Bar Chart: Gas Spent Over Time */}
        <div className="lg:col-span-7 space-y-3">
          <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
            GAS SPENT OVER TIME (USD)
          </span>
          <div className="h-64 card-3d p-4">
            <div className="sr-only">
              <h3>Gas spent over time data</h3>
              {chartData.length > 0 ? (
                <ul>
                  {chartData.map(entry => <li key={entry.month}>{entry.month}: {formatFiatUSD(entry.gasUSD)}</li>)}
                </ul>
              ) : <p>No historical gas data.</p>}
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: '#c8c8c8' }} tickLine={false} />
                  <YAxis tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: '#c8c8c8' }} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: 0, color: '#ffffff', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                    itemStyle={{ color: '#ffffff' }}
                    formatter={(v: unknown) => [`$${Number(v).toLocaleString()} USD`, 'Gas Spent']}
                  />
                  <Bar dataKey="gasUSD" fill="#ff5500" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-[#6b7280]">
                NO HISTORICAL GAS DATA
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart: Gas By Category */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
            GAS BY CATEGORY
          </span>
          <div className="h-64 card-3d p-4 flex flex-col justify-between">
            <div className="sr-only">
              <h3>Gas by category data</h3>
              {categoryData.length > 0 ? (
                <ul>
                  {categoryData.map(entry => <li key={entry.name}>{entry.name}: {formatFiatUSD(entry.value)}</li>)}
                </ul>
              ) : <p>No gas category data.</p>}
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: 0, color: '#ffffff', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                    itemStyle={{ color: '#ffffff' }}
                    formatter={(v: unknown) => [`$${Number(v).toLocaleString()} USD`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-[#c8c8c8] overflow-y-auto max-h-20">
              {categoryData.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 flex-shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-[#374151] truncate">{c.name}</span>
                  </div>
                  <span className="font-mono text-[#0a0a0a]">{formatFiatUSD(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
