import { ProcessedTokenTransfer, DeadAsset, GraveyardSummary } from '../types';
import { resolveCoingeckoId, getCachedPrice } from '../prices';
import { STABLECOINS, TOKEN_COINGECKO_IDS } from '../chains';

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
  const now = Math.floor(Date.now() / 1000);

  for (const [, data] of holdings) {
    // Only evaluate assets where the user holds a positive balance
    if (data.balance <= 0.001) continue;

    const sym = (data.tokenSymbol || '').toUpperCase().trim();
    const cAddr = (data.contractAddress || '').toLowerCase();

    // Skip stablecoins and major market/ecosystem tokens (these are not dead assets)
    if (STABLECOINS[cAddr] || TOKEN_COINGECKO_IDS[sym]) continue;

    const coingeckoId = resolveCoingeckoId(data.contractAddress, data.tokenSymbol);
    const currentPrice = coingeckoId ? getCachedPrice(coingeckoId, now) : null;

    // If the token currently has an active market price
    if (currentPrice !== null && currentPrice > 0) {
      // If we recorded a peak price per unit, check if it crashed > 95%
      if (data.peakValuePerUnit > 0) {
        const drawdownRatio = currentPrice / data.peakValuePerUnit;
        if (drawdownRatio < 0.05) {
          // Collapsed by > 95% from peak (rugged or defunct token)
          const peakValue = data.peakValuePerUnit * data.balance;
          const currentValue = currentPrice * data.balance;
          deadAssets.push({
            contractAddress: data.contractAddress,
            tokenName: data.tokenName,
            tokenSymbol: data.tokenSymbol,
            balance: data.balance,
            peakValueUSD: peakValue > 0 ? peakValue : null,
            currentValueUSD: currentValue,
            chainId,
            lastActivityDate: data.lastActivityTimestamp > 0
              ? new Date(data.lastActivityTimestamp * 1000).toISOString().split('T')[0]
              : 'Unknown',
          });
        }
      }
      // If current price is healthy (not >95% collapsed), it is an active asset, not dead.
      continue;
    }

    // If current price is unresolvable:
    // Only classify as a dead asset if it had confirmed historical peak value (> $1.00 total)
    // and trading value has vanished
    const peakValue = data.peakValuePerUnit * data.balance;
    if (peakValue >= 1.0 && data.totalInValue > 0) {
      deadAssets.push({
        contractAddress: data.contractAddress,
        tokenName: data.tokenName,
        tokenSymbol: data.tokenSymbol,
        balance: data.balance,
        peakValueUSD: peakValue,
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
