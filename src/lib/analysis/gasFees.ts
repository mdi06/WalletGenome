import { ProcessedTransaction, GasSummary, MonthlyGas, CategoryGas, TransactionCategory } from '../types';

export function analyzeGasFees(transactions: ProcessedTransaction[]): GasSummary {
  if (transactions.length === 0) {
    return {
      totalGasETH: 0, totalGasUSD: 0, transactionCount: 0,
      failedTransactionCount: 0, failedGasETH: 0, failedGasUSD: 0,
      monthlyBreakdown: [], categoryBreakdown: [], worstDay: null, averageGasPerTx: 0,
    };
  }

  let totalGasETH = 0;
  let totalGasUSD = 0;
  let failedGasETH = 0;
  let failedGasUSD = 0;
  let failedCount = 0;

  const monthlyMap = new Map<string, MonthlyGas>();
  const categoryMap = new Map<TransactionCategory, { gasETH: number; gasUSD: number; txCount: number }>();
  const dailyMap = new Map<string, { gasETH: number; gasUSD: number; txCount: number }>();

  for (const tx of transactions) {
    totalGasETH += tx.gasCostETH;
    totalGasUSD += tx.gasCostUSD ?? 0;

    if (tx.isError) {
      failedCount++;
      failedGasETH += tx.gasCostETH;
      failedGasUSD += tx.gasCostUSD ?? 0;
    }

    // Monthly
    const month = tx.date.substring(0, 7); // YYYY-MM
    const existing = monthlyMap.get(month) || { month, gasETH: 0, gasUSD: 0, txCount: 0 };
    existing.gasETH += tx.gasCostETH;
    existing.gasUSD += tx.gasCostUSD ?? 0;
    existing.txCount++;
    monthlyMap.set(month, existing);

    // Category
    const cat = categoryMap.get(tx.category) || { gasETH: 0, gasUSD: 0, txCount: 0 };
    cat.gasETH += tx.gasCostETH;
    cat.gasUSD += tx.gasCostUSD ?? 0;
    cat.txCount++;
    categoryMap.set(tx.category, cat);

    // Daily (for worst day)
    const day = tx.date;
    const dayData = dailyMap.get(day) || { gasETH: 0, gasUSD: 0, txCount: 0 };
    dayData.gasETH += tx.gasCostETH;
    dayData.gasUSD += tx.gasCostUSD ?? 0;
    dayData.txCount++;
    dailyMap.set(day, dayData);
  }

  // Find worst day
  let worstDay: GasSummary['worstDay'] = null;
  let worstDayGas = 0;
  for (const [date, data] of dailyMap) {
    if (data.gasUSD > worstDayGas) {
      worstDayGas = data.gasUSD;
      worstDay = { date, gasETH: data.gasETH, gasUSD: data.gasUSD, txCount: data.txCount };
    }
  }

  // Build category breakdown with percentages
  const categoryBreakdown: CategoryGas[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      gasETH: data.gasETH,
      gasUSD: data.gasUSD,
      txCount: data.txCount,
      percentage: totalGasUSD > 0 ? (data.gasUSD / totalGasUSD) * 100 : 0,
    }))
    .sort((a, b) => b.gasUSD - a.gasUSD);

  const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalGasETH,
    totalGasUSD,
    transactionCount: transactions.length,
    failedTransactionCount: failedCount,
    failedGasETH,
    failedGasUSD,
    monthlyBreakdown,
    categoryBreakdown,
    worstDay,
    averageGasPerTx: totalGasETH / transactions.length,
  };
}
