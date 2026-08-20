import {
  EtherscanTransaction,
  EtherscanTokenTransfer,
  EtherscanInternalTransaction,
  ProcessedTransaction,
  ProcessedTokenTransfer,
  TransactionCategory,
  ScanResult,
  MultiChainScanResult,
} from './types';
import { getChainConfig, STABLECOINS } from './chains';
import { isDEXAddress, isBridgeAddress, getAddressLabel } from './labels';
import { getCachedPrice, resolveCoingeckoId } from './prices';
import { analyzeGasFees } from './analysis/gasFees';
import { analyzeTransfers } from './analysis/transfers';
import { analyzeApprovals } from './analysis/approvals';
import { analyzeDeadAssets } from './analysis/deadAssets';
import { checkRecipientSweptToCEX } from './etherscan';
import { analyzeBehavioralFingerprint } from './analysis/behavioralFingerprint';
import { computeRiskScore } from './analysis/riskScore';
import { analyzeActivityProfile } from './analysis/activityHeatmap';
import { analyzeInteractions } from './analysis/interactions';

const WEI = 1e18;

// Common Bridge Method IDs
const BRIDGE_METHOD_IDS = new Set([
  '0xd2ce7d65', // Arbitrum outboundTransfer
  '0xe9e05c42', // Optimism depositERC20
  '0xb1a1a882', // Optimism / Base depositTransaction
  '0x0f5287e0', // Stargate swap
  '0x9e6e4f3a', // Across deposit
  '0x49228978', // Polygon depositFor
  '0xeb672419', // zkSync requestL2Transaction
  '0x2e567b36', // L1 Gateway outboundTransferCustomRefund
]);

function timestampToDate(ts: number): string {
  if (!ts || isNaN(ts)) return new Date().toISOString().split('T')[0];
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function isBridgeMethod(methodId: string, funcName: string): boolean {
  if (BRIDGE_METHOD_IDS.has(methodId.toLowerCase())) return true;
  const fn = (funcName || '').toLowerCase();
  return (
    fn.includes('bridge') ||
    fn.includes('outboundtransfer') ||
    fn.includes('depositerc20') ||
    fn.includes('depositeth') ||
    fn.includes('deposittransaction') ||
    fn.includes('sendtol2') ||
    fn.includes('l1standardbridge') ||
    fn.includes('gateway') ||
    fn.includes('relay')
  );
}

function categorizeTransaction(tx: EtherscanTransaction, walletAddress: string): TransactionCategory {
  if (tx.isError === '1') return 'failed';

  const to = (tx.to || '').toLowerCase();
  const methodId = (tx.methodId || '').toLowerCase();
  const funcName = (tx.functionName || '').toLowerCase();

  if (!tx.to || tx.to === '') return 'contract_deploy';
  if (methodId === '0x095ea7b3' || funcName.includes('approve')) return 'approval';
  if (methodId === '0xa9059cbb' || methodId === '0x23b872dd' || (!tx.input || tx.input === '0x' || tx.input === '')) return 'transfer';
  if (isBridgeAddress(to) || isBridgeMethod(methodId, funcName)) return 'bridge';
  if (isDEXAddress(to) || funcName.includes('swap') || funcName.includes('exactinput')) return 'swap';
  if (funcName.includes('supply') || funcName.includes('borrow') || funcName.includes('repay') ||
      funcName.includes('withdraw') || funcName.includes('lend')) return 'lending';
  if (funcName.includes('stake') || funcName.includes('unstake') || funcName.includes('delegate')) return 'staking';
  if (funcName.includes('mint') || funcName.includes('safetransferfrom') ||
      funcName.includes('setapprovalforall')) return 'nft';
  if (tx.input.length > 2) return 'contract_interaction';

  return 'unknown';
}

export function formatSafeUnits(valueRaw: string | number, decimals = 18): number {
  try {
    const str = String(valueRaw || '0').trim();
    if (!str || str === '0') return 0;
    if (!/^\d+$/.test(str)) {
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }
    if (decimals === 0) return Number(str);
    if (str.length <= decimals) {
      const padded = str.padStart(decimals, '0');
      return parseFloat(`0.${padded}`) || 0;
    }
    const whole = str.slice(0, str.length - decimals);
    const frac = str.slice(str.length - decimals);
    return parseFloat(`${whole}.${frac}`) || 0;
  } catch {
    return (parseFloat(String(valueRaw)) || 0) / Math.pow(10, decimals) || 0;
  }
}

export function processTransactions(
  rawTxs: EtherscanTransaction[] = [],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {}
): ProcessedTransaction[] {
  const chain = getChainConfig(chainId);
  const lower = (walletAddress || '').toLowerCase();

  return rawTxs.map(tx => {
    const gasUsed = Number(tx.gasUsed || tx.gas || '0') || 0;
    const gasPrice = Number(tx.gasPrice || '0') || 0;
    const gasCostWei = gasUsed * gasPrice;
    const gasCostETH = gasCostWei / WEI;
    const timestamp = parseInt(tx.timeStamp || '0') || Math.floor(Date.now() / 1000);
    const valueFormatted = formatSafeUnits(tx.value || '0', chain.nativeToken.decimals);

    const ethPrice = getCachedPrice(chain.nativeToken.coingeckoId, timestamp);

    return {
      hash: tx.hash || '',
      timestamp,
      date: timestampToDate(timestamp),
      from: tx.from || '',
      to: tx.to || '',
      fromLabel: getAddressLabel(tx.from, knownWallets),
      toLabel: getAddressLabel(tx.to, knownWallets),
      value: tx.value || '0',
      valueFormatted,
      valueUSD: ethPrice ? valueFormatted * ethPrice : null,
      gasUsed,
      gasPrice,
      gasCostETH,
      gasCostUSD: ethPrice ? gasCostETH * ethPrice : null,
      isError: tx.isError === '1' || tx.txreceipt_status === '0',
      methodId: tx.methodId || '',
      functionName: tx.functionName || '',
      input: tx.input || '',
      category: categorizeTransaction(tx, walletAddress),
      chainId,
    };
  });
}

export function processTokenTransfers(
  rawTransfers: EtherscanTokenTransfer[] = [],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {}
): ProcessedTokenTransfer[] {
  const lower = (walletAddress || '').toLowerCase();

  return rawTransfers.map(t => {
    const decimals = parseInt(t.tokenDecimal || '18') || 18;
    const valueFormatted = formatSafeUnits(t.value || '0', decimals);
    const timestamp = parseInt(t.timeStamp || '0') || Math.floor(Date.now() / 1000);
    const fromAddr = (t.from || '').toLowerCase();
    const direction = fromAddr === lower ? 'out' : 'in';

    const tokenContract = (t.contractAddress || '').toLowerCase();
    const tokenSym = t.tokenSymbol || '???';
    const tokenNm = t.tokenName || 'Unknown Token';

    const coingeckoId = resolveCoingeckoId(tokenContract, tokenSym);
    let valueUSD: number | null = null;

    if (coingeckoId) {
      const price = getCachedPrice(coingeckoId, timestamp);
      if (price) valueUSD = valueFormatted * price;
    }

    if (STABLECOINS[tokenContract]) {
      valueUSD = valueFormatted;
    }

    return {
      hash: t.hash || '',
      timestamp,
      date: timestampToDate(timestamp),
      from: t.from || '',
      to: t.to || '',
      fromLabel: getAddressLabel(t.from, knownWallets),
      toLabel: getAddressLabel(t.to, knownWallets),
      contractAddress: t.contractAddress || '',
      tokenName: tokenNm,
      tokenSymbol: tokenSym,
      tokenDecimal: decimals,
      value: t.value || '0',
      valueFormatted,
      valueUSD,
      direction,
      chainId,
    };
  });
}

export function processInternalTransactions(
  rawInternals: EtherscanInternalTransaction[] = [],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {}
): ProcessedTransaction[] {
  const chain = getChainConfig(chainId);

  return rawInternals.map(itx => {
    const timestamp = parseInt(itx.timeStamp || '0') || Math.floor(Date.now() / 1000);
    const valueFormatted = formatSafeUnits(itx.value || '0', chain.nativeToken.decimals);
    const ethPrice = getCachedPrice(chain.nativeToken.coingeckoId, timestamp);

    return {
      hash: itx.hash || '',
      timestamp,
      date: timestampToDate(timestamp),
      from: itx.from || '',
      to: itx.to || '',
      fromLabel: getAddressLabel(itx.from, knownWallets),
      toLabel: getAddressLabel(itx.to, knownWallets),
      value: itx.value || '0',
      valueFormatted,
      valueUSD: ethPrice ? valueFormatted * ethPrice : null,
      gasUsed: Number(itx.gasUsed || itx.gas || '0') || 0,
      gasPrice: 0,
      gasCostETH: 0,
      gasCostUSD: null,
      isError: itx.isError === '1',
      methodId: '',
      functionName: itx.type || 'internal_transfer',
      input: itx.input || '',
      category: 'transfer',
      chainId,
    };
  });
}

export function collectPriceRequests(
  rawTxs: EtherscanTransaction[] = [],
  rawTokenTransfers: EtherscanTokenTransfer[] = [],
  chainId: number
): Array<{ coingeckoId: string; timestamp: number }> {
  const chain = getChainConfig(chainId);
  const requests: Array<{ coingeckoId: string; timestamp: number }> = [];
  const seen = new Set<string>();

  for (const tx of rawTxs) {
    const ts = parseInt(tx.timeStamp || '0') || Math.floor(Date.now() / 1000);
    const dateKey = timestampToDate(ts);
    const key = `${chain.nativeToken.coingeckoId}-${dateKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      requests.push({ coingeckoId: chain.nativeToken.coingeckoId, timestamp: ts });
    }
  }

  for (const t of rawTokenTransfers) {
    const coingeckoId = resolveCoingeckoId(t.contractAddress, t.tokenSymbol);
    if (!coingeckoId) continue;
    if (['tether', 'usd-coin', 'dai', 'true-usd', 'frax'].includes(coingeckoId.toLowerCase())) continue;

    const ts = parseInt(t.timeStamp || '0') || Math.floor(Date.now() / 1000);
    const dateKey = timestampToDate(ts);
    const key = `${coingeckoId}-${dateKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      requests.push({ coingeckoId, timestamp: ts });
    }
  }

  return requests;
}

export async function runAnalysis(
  rawTxs: EtherscanTransaction[] = [],
  rawTokenTransfers: EtherscanTokenTransfer[] = [],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {},
  rawInternalTxs: EtherscanInternalTransaction[] = []
): Promise<ScanResult> {
  const chain = getChainConfig(chainId);
  const lower = (walletAddress || '').toLowerCase();

  const processedTxs = processTransactions(rawTxs, walletAddress, chainId, knownWallets);
  const processedTransfers = processTokenTransfers(rawTokenTransfers, walletAddress, chainId, knownWallets);
  const processedInternals = processInternalTransactions(rawInternalTxs, walletAddress, chainId, knownWallets);

  // Combine external normal transactions and smart contract internal transfers for cashflow & counterparties
  const allTxs = [...processedTxs, ...processedInternals];

  const outboundTxs = processedTxs.filter(
    tx => (tx.from || '').toLowerCase() === lower
  );

  const gasSummary = analyzeGasFees(outboundTxs);
  const transferSummary = analyzeTransfers(allTxs, processedTransfers, walletAddress);
  const approvalSummary = analyzeApprovals(processedTxs, rawTokenTransfers, walletAddress, chainId);
  const graveyardSummary = analyzeDeadAssets(processedTransfers, chainId);

  return {
    address: walletAddress,
    chainId,
    chainName: chain.name,
    gasSummary,
    transferSummary,
    approvalSummary,
    graveyardSummary,
    fingerprint: analyzeBehavioralFingerprint(processedTxs, processedTransfers, walletAddress),
    riskAssessment: computeRiskScore(approvalSummary, gasSummary, graveyardSummary, processedTxs),
    activityProfile: analyzeActivityProfile(processedTxs),
    interactionsSummary: analyzeInteractions(allTxs, processedTransfers, walletAddress, chainId, knownWallets),
    scannedAt: Date.now(),
    transactionCount: rawTxs.length,
    tokenTransferCount: rawTokenTransfers.length,
  };
}

const GRADE_ORDER: Record<string, number> = { F: 5, D: 4, C: 3, B: 2, A: 1 };

export function aggregateResults(
  address: string,
  chainResults: ScanResult[]
): MultiChainScanResult {
  const worstRiskGrade = chainResults.reduce((worst, r) => {
    const g = r.riskAssessment?.grade || 'A';
    return (GRADE_ORDER[g] || 1) > (GRADE_ORDER[worst] || 1) ? g : worst;
  }, 'A');

  const ethChains = chainResults.filter(r => {
    try {
      return getChainConfig(r.chainId).nativeToken.symbol === 'ETH';
    } catch {
      return true;
    }
  });

  return {
    address,
    chains: chainResults,
    aggregated: {
      totalGasETH: ethChains.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0),
      totalGasUSD: chainResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0),
      totalHighRiskApprovals: chainResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0),
      totalDeadAssets: chainResults.reduce((sum, r) => sum + (r.graveyardSummary?.totalTokensDead || 0), 0),
      totalTransactions: chainResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0),
      riskScore: chainResults.length > 0 ? Math.max(...chainResults.map(r => r.riskAssessment?.score || 0)) : 0,
      riskGrade: worstRiskGrade,
    },
  };
}
