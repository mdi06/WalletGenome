import { ProcessedTransaction, TokenApproval, ApprovalSummary, RiskLevel, EtherscanTokenTransfer } from '../types';
import { getAddressLabel, isDEXAddress, isBridgeAddress } from '../labels';
import { STABLECOINS } from '../chains';
import { resolveCoingeckoId, getCachedPrice } from '../prices';

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
  const tokenBalances = new Map<string, { balance: number; lastPriceUSD: number | null; symbol: string; name: string }>();
  for (const t of tokenTransfers) {
    if (!t.contractAddress) continue;
    const cAddr = t.contractAddress.toLowerCase();
    const decimals = parseInt(t.tokenDecimal || '18') || 18;
    const amt = parseFloat(t.value || '0') / Math.pow(10, decimals);
    const existing = tokenBalances.get(cAddr) || {
      balance: 0,
      lastPriceUSD: null,
      symbol: t.tokenSymbol || '???',
      name: t.tokenName || 'Unknown Token',
    };

    if ((t.from || '').toLowerCase() === lower) {
      existing.balance -= amt;
    } else if ((t.to || '').toLowerCase() === lower) {
      existing.balance += amt;
    }

    if (!existing.lastPriceUSD) {
      if (STABLECOINS[cAddr]) {
        existing.lastPriceUSD = 1.0;
      } else {
        const coingeckoId = resolveCoingeckoId(cAddr, t.tokenSymbol);
        if (coingeckoId) {
          const ts = parseInt(t.timeStamp || '0') || Math.floor(Date.now() / 1000);
          existing.lastPriceUSD = getCachedPrice(coingeckoId, ts);
        }
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
    let isUnlimited = true;
    let allowanceStr = 'Unlimited';

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
    let estimatedExposureUSD: number | null = null;
    if (tokenBal && tokenBal.balance > 0 && tokenBal.lastPriceUSD) {
      estimatedExposureUSD = tokenBal.balance * tokenBal.lastPriceUSD;
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
      isUnlimited,
      riskLevel,
      chainId,
      estimatedExposureUSD: estimatedExposureUSD ? Math.max(0, estimatedExposureUSD) : null,
    });
  }

  const activeApprovals = Array.from(approvalMap.values())
    .filter(a => a.allowance !== '0')
    .sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });

  const highRiskCount = activeApprovals.filter(a => a.riskLevel === 'high').length;
  const unlimitedCount = activeApprovals.filter(a => a.isUnlimited).length;
  const totalExposureUSD = activeApprovals.reduce(
    (sum, a) => sum + (a.estimatedExposureUSD || 0),
    0
  );

  return {
    activeApprovals,
    highRiskCount,
    unlimitedCount,
    totalApprovals: activeApprovals.length,
    totalExposureUSD,
  };
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
