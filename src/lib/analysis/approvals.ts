import { ProcessedTransaction, TokenApproval, ApprovalSummary, RiskLevel, EtherscanTokenTransfer, PriceProvenance, PriceProvenanceSummary } from '../types';
import { getAddressLabel, isDEXAddress, isBridgeAddress } from '../labels';
import { isStablecoinContract } from '../chains';
import { getCachedCurrentPriceQuote } from '../prices';
import { formatTokenUnits, parseTokenDecimals } from '../tokenUnits';

const APPROVE_METHOD_ID = '0x095ea7b3';

export function analyzeApprovals(
  transactions: ProcessedTransaction[] = [],
  tokenTransfers: EtherscanTokenTransfer[] = [],
  walletAddress: string,
  chainId: number
): ApprovalSummary {
  const lower = (walletAddress || '').toLowerCase();
  const approvalMap = new Map<string, TokenApproval>();

  // Calculate approximate token balances from transfer history to estimate exposure
  const tokenBalances = new Map<string, { balance: number; currentPriceUSD: number | null; provenance: PriceProvenance; symbol: string; name: string; decimals: number }>();
  const seenTransferIds = new Set<string>();
  for (const t of tokenTransfers) {
    if (!t.contractAddress) continue;
    const transferId = rawTokenTransferIdentity(t, chainId);
    if (seenTransferIds.has(transferId)) continue;
    seenTransferIds.add(transferId);
    const cAddr = t.contractAddress.toLowerCase();
    const decimals = parseTokenDecimals(t.tokenDecimal);
    const amt = formatTokenUnits(t.value || '0', decimals);
    const existing = tokenBalances.get(cAddr) || {
      balance: 0,
      currentPriceUSD: null,
      provenance: 'unpriced',
      symbol: t.tokenSymbol || '???',
      name: t.tokenName || 'Unknown Token',
      decimals,
    };

    const isFromWallet = (t.from || '').toLowerCase() === lower;
    const isToWallet = (t.to || '').toLowerCase() === lower;
    if (isFromWallet && !isToWallet) {
      existing.balance -= amt;
    } else if (isToWallet && !isFromWallet) {
      existing.balance += amt;
    }

    if (existing.currentPriceUSD === null) {
      if (isStablecoinContract(chainId, cAddr)) {
        existing.currentPriceUSD = 1.0;
        existing.provenance = 'stablecoin_assumption';
      } else {
        const quote = getCachedCurrentPriceQuote({ chainId, contractAddress: cAddr });
        existing.currentPriceUSD = quote.priceUSD;
        existing.provenance = quote.provenance;
      }
    }

    tokenBalances.set(cAddr, existing);
  }

  const approvalTxs = transactions
    .filter(
      tx => (tx.from || '').toLowerCase() === lower &&
        !tx.isError &&
        (tx.methodId?.toLowerCase() === APPROVE_METHOD_ID ||
         (tx.input || '').toLowerCase().startsWith(APPROVE_METHOD_ID) ||
         (tx.functionName || '').toLowerCase().includes('approve'))
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  for (const tx of approvalTxs) {
    const tokenAddress = (tx.to || '').toLowerCase();
    if (!tokenAddress) continue;

    // Decode spender and allowance from ERC-20 approve(address,uint256) calldata
    let spender = tokenAddress;
    let isUnlimited = false;
    let allowanceStr = 'Unknown';
    let allowanceAmount: number | null = null;

    const input = tx.input || '';
    if (input.length >= 74 && input.toLowerCase().startsWith(APPROVE_METHOD_ID)) {
      const spenderHex = input.slice(34, 74);
      spender = `0x${spenderHex}`.toLowerCase();
      const amountHex = input.slice(74, 138).toLowerCase();
      
      if (!amountHex || /^0+$/.test(amountHex)) {
        // Zero allowance = Revocation
        isUnlimited = false;
        allowanceStr = '0';
      } else if (
        amountHex.startsWith('ffff') ||
        amountHex === 'f'.repeat(64) ||
        (amountHex.length === 64 && amountHex[0] >= '8')
      ) {
        isUnlimited = true;
        allowanceStr = 'Unlimited';
      } else {
        isUnlimited = false;
        allowanceStr = 'Custom';
        const decimals = tokenBalances.get(tokenAddress)?.decimals ?? 18;
        allowanceAmount = toDecimalAmount(BigInt(`0x${amountHex}`), decimals);
      }
    }

    const key = `${tokenAddress}-${spender}`;
    // Because approvalTxs is sorted descending (newest first), skip older states for the same token-spender pair
    if (approvalMap.has(key)) {
      continue;
    }

    const tokenInfo = findTokenInfo(tokenAddress, tokenTransfers);
    const spenderLabel = getAddressLabel(spender);
    const riskLevel = assessApprovalRisk(spender, isUnlimited, spenderLabel);

    // Calculate estimated USD value exposed
    const tokenBal = tokenBalances.get(tokenAddress);
    const estimatedTokenBalance = tokenBal ? Math.max(0, tokenBal.balance) : null;
    let estimatedExposureUSD: number | null = null;
    let exposureStatus: TokenApproval['exposureStatus'] = 'unavailable';
    if (estimatedTokenBalance !== null && estimatedTokenBalance <= 0) {
      estimatedExposureUSD = 0;
      exposureStatus = 'zero_balance';
    } else if (
      estimatedTokenBalance !== null
      && tokenBal?.currentPriceUSD !== null
      && tokenBal?.currentPriceUSD !== undefined
      && (isUnlimited || allowanceAmount !== null)
    ) {
      const exposedTokenAmount = isUnlimited
        ? estimatedTokenBalance
        : Math.min(estimatedTokenBalance, allowanceAmount ?? 0);
      estimatedExposureUSD = exposedTokenAmount * tokenBal.currentPriceUSD;
      exposureStatus = 'estimated';
    }

    approvalMap.set(key, {
      hash: tx.hash,
      timestamp: tx.timestamp,
      date: tx.date,
      tokenAddress,
      tokenName: tokenInfo?.name || tokenBal?.name || 'Unknown Token',
      tokenSymbol: tokenInfo?.symbol || tokenBal?.symbol || '???',
      spender,
      spenderLabel,
      allowance: allowanceStr,
      allowanceAmount,
      isUnlimited,
      riskLevel,
      chainId,
      estimatedTokenBalance,
      estimatedExposureUSD,
      estimatedExposureUSDProvenance: tokenBal?.provenance ?? 'unpriced',
      exposureStatus,
    });
  }

  // This is the latest non-revoked state observed in returned approval history,
  // not a live on-chain allowance query.
  const observedApprovals = Array.from(approvalMap.values())
    .filter(a => a.allowance !== '0')
    .sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });

  const highRiskCount = observedApprovals.filter(a => a.riskLevel === 'high').length;
  const unlimitedCount = observedApprovals.filter(a => a.isUnlimited).length;
  const hasUnavailableExposure = observedApprovals.some(approval => approval.exposureStatus === 'unavailable');
  const totalExposureUSD = hasUnavailableExposure
    ? null
    : observedApprovals.reduce((sum, approval) => sum + (approval.estimatedExposureUSD ?? 0), 0);
  const totalExposureUSDProvenance = observedApprovals.reduce<PriceProvenanceSummary>((summary, approval) => {
    if (approval.exposureStatus !== 'estimated') return summary;
    const provenance = approval.estimatedExposureUSDProvenance;
    if (provenance === 'historical') summary.historical++;
    if (provenance === 'spot_estimate') summary.spotEstimate++;
    if (provenance === 'stablecoin_assumption') summary.stablecoinAssumption++;
    if (provenance === 'unpriced') summary.unpriced++;
    return summary;
  }, { historical: 0, spotEstimate: 0, stablecoinAssumption: 0, unpriced: 0, status: 'complete' });
  // A current spot quote is the correct price basis for exposure at scan time;
  // it does not verify the allowance on-chain.
  if (hasUnavailableExposure || totalExposureUSDProvenance.unpriced > 0) {
    totalExposureUSDProvenance.status = 'partial';
  }

  return {
    // Preserve the existing field name for the API shape; its values are the
    // latest non-revoked states observed in returned approval history.
    activeApprovals: observedApprovals,
    highRiskCount,
    unlimitedCount,
    totalApprovals: observedApprovals.length,
    totalExposureUSD,
    totalExposureUSDProvenance,
    exposureStatus: hasUnavailableExposure ? 'partial' : 'complete',
  };
}

function toDecimalAmount(rawAmount: bigint, decimals: number): number {
  return formatTokenUnits(rawAmount, decimals);
}

function rawTokenTransferIdentity(transfer: EtherscanTokenTransfer, chainId: number): string {
  const hash = transfer.hash.trim().toLowerCase();
  const logIndex = transfer.logIndex?.trim();
  if (hash && logIndex) return `${chainId}:${hash}:log:${logIndex}`;

  return [
    chainId,
    hash,
    transfer.transactionIndex.trim(),
    transfer.contractAddress.trim().toLowerCase(),
    transfer.from.trim().toLowerCase(),
    transfer.to.trim().toLowerCase(),
    transfer.value.trim(),
  ].join(':');
}

function findTokenInfo(
  contractAddress: string,
  tokenTransfers: EtherscanTokenTransfer[]
): { name: string; symbol: string } | null {
  const lower = (contractAddress || '').toLowerCase();
  const transfer = tokenTransfers.find(t => (t.contractAddress || '').toLowerCase() === lower);
  if (transfer) {
    return { name: transfer.tokenName || 'Unknown Token', symbol: transfer.tokenSymbol || '???' };
  }
  return null;
}

function assessApprovalRisk(
  spender: string,
  isUnlimited: boolean,
  label: string | null
): RiskLevel {
  if (isDEXAddress(spender) || isBridgeAddress(spender)) {
    return isUnlimited ? 'medium' : 'low';
  }
  if (label) {
    return isUnlimited ? 'medium' : 'low';
  }
  if (isUnlimited) {
    return 'high';
  }
  return 'medium';
}
