import { ProcessedTransaction, TokenApproval, ApprovalSummary, RiskLevel } from '../types';
import { EtherscanTokenTransfer } from '../types';
import { getAddressLabel, isDEXAddress, isBridgeAddress } from '../labels';

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

    tokenBalances.set(cAddr, existing);
  }

  const approvalTxs = transactions.filter(
    tx => (tx.from || '').toLowerCase() === lower &&
      (tx.methodId === APPROVE_METHOD_ID ||
       (tx.functionName || '').toLowerCase().includes('approve'))
  );

  for (const tx of approvalTxs) {
    const tokenAddress = (tx.to || '').toLowerCase();
    if (!tokenAddress) continue;

    // Decode spender from calldata (0x095ea7b3 + 32-byte spender + 32-byte amount)
    let spender = tx.to.toLowerCase();
    let isUnlimited = true;
    let allowanceStr = 'Unlimited';

    const input = (tx as any).input || '';
    if (input && input.length >= 74 && input.toLowerCase().startsWith(APPROVE_METHOD_ID)) {
      const spenderHex = input.slice(34, 74);
      spender = `0x${spenderHex}`.toLowerCase();
      const amountHex = input.slice(74, 138);
      if (amountHex) {
        // If amount starts with ffff or is very large
        if (amountHex.toLowerCase().startsWith('ffff') || amountHex.toLowerCase() === 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') {
          isUnlimited = true;
          allowanceStr = 'Unlimited';
        } else {
          // Check if zero (revocation)
          if (amountHex.replace(/^0+/, '') === '') {
            allowanceStr = '0';
            isUnlimited = false;
          } else {
            allowanceStr = 'Custom';
            isUnlimited = false;
          }
        }
      }
    }

    const tokenInfo = findTokenInfo(tokenAddress, tokenTransfers);
    const key = `${tokenAddress}-${spender}`;
    const spenderLabel = getAddressLabel(spender);
    const riskLevel = assessApprovalRisk(spender, isUnlimited, spenderLabel);

    // Calculate estimated USD value exposed
    const tokenBal = tokenBalances.get(tokenAddress);
    let estimatedExposureUSD: number | null = null;
    if (tokenBal && tokenBal.balance > 0) {
      // Find historical USD valuation if available
      const relatedTransfer = tokenTransfers.find(
        t => (t.contractAddress || '').toLowerCase() === tokenAddress
      );
      if (relatedTransfer) {
        // Estimate token price
        const valUSD = (relatedTransfer as any).valueUSD;
        const valFmt = (relatedTransfer as any).valueFormatted;
        if (valUSD && valFmt && valFmt > 0) {
          estimatedExposureUSD = tokenBal.balance * (valUSD / valFmt);
        }
      }
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
