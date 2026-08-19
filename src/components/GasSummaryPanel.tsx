'use client';

import React from 'react';
import { ScanResult } from '@/lib/types';
import { getChainConfig } from '@/lib/chains';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

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
    name: name.toUpperCase(),
    value: Math.round(value),
    color: categoryColors[name.toLowerCase()] || '#777777',
  }));

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards (Sharp Square Toned Gray Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            TOTAL GAS CONSUMPTION
          </div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">
            {totalGasETH >= 10 ? totalGasETH.toFixed(2) : totalGasETH.toFixed(4)} ETH
          </div>
          <div className="text-xs font-bold text-[#555555] font-mono">
            ≈ ${totalGasUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
          </div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            FAILED TRANSACTIONS BURN
          </div>
          <div className="text-3xl font-black text-[#dc2626] font-mono">
            {failedGasETH.toFixed(4)} ETH
          </div>
          <div className="text-xs font-bold text-[#555555] font-mono">
            {failedTxsCount} failed txs (≈ ${failedGasUSD.toFixed(2)} lost)
          </div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            ACTIVE NETWORKS
          </div>
          <div className="text-3xl font-black text-[#ff5500] font-mono">
            {results.length} Chains
          </div>
          <div className="text-xs font-bold text-[#555555] font-mono">
            Ethereum, L2 Rollups & Sidechains
          </div>
        </div>
      </div>

      {/* ── Network Gas Breakdown Row ── */}
      <div className="space-y-2">
        <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
          GAS SPENT BY NETWORK
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {results.map(r => {
            const nativeSymbol = getChainConfig(r.chainId)?.nativeToken?.symbol || 'ETH';
            return (
              <div key={r.chainId} className="p-3.5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#0a0a0a]">{r.chainName}</span>
                  <span className="text-[#555555] font-mono text-[10px]">{r.transactionCount} txs</span>
                </div>
                <div className="text-base font-black text-[#0a0a0a] font-mono">
                  {(r.gasSummary?.totalGasETH || 0).toFixed(4)} {nativeSymbol}
                </div>
                <div className="text-[11px] font-bold text-[#555555] font-mono">
                  ≈ ${(r.gasSummary?.totalGasUSD || 0).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Charts Grid (Gas Over Time & Gas By Category) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Bar Chart: Gas Spent Over Time */}
        <div className="lg:col-span-7 space-y-3">
          <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
            GAS SPENT OVER TIME (USD)
          </span>
          <div className="h-64 bg-[#dedede] p-4 border border-[#cecece]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: '#cecece' }} tickLine={false} />
                  <YAxis tick={{ fill: '#555555', fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: '#cecece' }} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: 'none', borderRadius: 0, color: '#ffffff', fontSize: 12, fontWeight: 700 }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()} USD`, 'Gas Spent']}
                  />
                  <Bar dataKey="gasUSD" fill="#0a0a0a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-[#777777]">
                NO HISTORICAL GAS DATA
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart: Gas By Category */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
            GAS BY CATEGORY
          </span>
          <div className="h-64 bg-[#dedede] p-4 border border-[#cecece] flex flex-col justify-between">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: 'none', borderRadius: 0, color: '#ffffff', fontSize: 12, fontWeight: 700 }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()} USD`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-[#cecece] overflow-y-auto max-h-20">
              {categoryData.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-[#333333] truncate">{c.name}</span>
                  </div>
                  <span className="font-mono text-[#0a0a0a]">${c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
