import { ProcessedTokenTransfer, DeadAsset, GraveyardSummary } from '../types';

export function analyzeDeadAssets(
  tokenTransfers: ProcessedTokenTransfer[] = [],
  chainId: number
): GraveyardSummary {
  const holdings = new Map<string, {
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    balance: number;
    peakValuePerUnit: number;
    lastActivityTimestamp: number;
    totalInValue: number;
    totalInAmount: number;
  }>();

  for (const transfer of tokenTransfers) {
    if (!transfer.contractAddress) continue;
    const key = transfer.contractAddress.toLowerCase();
    const existing = holdings.get(key) || {
      contractAddress: transfer.contractAddress,
      tokenName: transfer.tokenName || 'Unknown Token',
      tokenSymbol: transfer.tokenSymbol || '???',
      balance: 0,
      peakValuePerUnit: 0,
      lastActivityTimestamp: 0,
      totalInValue: 0,
      totalInAmount: 0,
    };

    if (transfer.direction === 'in') {
      existing.balance += transfer.valueFormatted || 0;
      existing.totalInAmount += transfer.valueFormatted || 0;
      existing.totalInValue += transfer.valueUSD || 0;
    } else {
      existing.balance -= transfer.valueFormatted || 0;
    }

    if ((transfer.valueFormatted || 0) > 0 && transfer.valueUSD) {
      const pricePerUnit = transfer.valueUSD / transfer.valueFormatted;
      if (pricePerUnit > existing.peakValuePerUnit) {
        existing.peakValuePerUnit = pricePerUnit;
      }
    }

    if ((transfer.timestamp || 0) > existing.lastActivityTimestamp) {
      existing.lastActivityTimestamp = transfer.timestamp;
    }

    holdings.set(key, existing);
  }

  const deadAssets: DeadAsset[] = [];
  const commonTokens = new Set(['USDT', 'USDC', 'DAI', 'WETH', 'WBTC', 'ETH', 'BUSD', 'FRAX']);

  for (const [, data] of holdings) {
    if (data.balance <= 0.001) continue;

    const sym = (data.tokenSymbol || '').toUpperCase();
    if (commonTokens.has(sym)) continue;

    const sixMonthsAgo = Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60);
    const isOld = data.lastActivityTimestamp < sixMonthsAgo;
    const hasNoValue = data.totalInValue === 0;
    const isLikelyDead = isOld || hasNoValue;

    if (isLikelyDead) {
      const peakValue = data.peakValuePerUnit * data.balance;
      deadAssets.push({
        contractAddress: data.contractAddress,
        tokenName: data.tokenName,
        tokenSymbol: data.tokenSymbol,
        balance: data.balance,
        peakValueUSD: peakValue > 0 ? peakValue : null,
        currentValueUSD: 0,
        chainId,
        lastActivityDate: data.lastActivityTimestamp > 0
          ? new Date(data.lastActivityTimestamp * 1000).toISOString().split('T')[0]
          : 'Unknown',
      });
    }
  }

  deadAssets.sort((a, b) => (b.peakValueUSD ?? 0) - (a.peakValueUSD ?? 0));

  const totalPeakValueLost = deadAssets.reduce((sum, a) => sum + (a.peakValueUSD ?? 0), 0);

  return {
    deadAssets,
    totalPeakValueLost,
    totalTokensDead: deadAssets.length,
  };
}
