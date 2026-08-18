import {
  EtherscanTransaction,
  EtherscanTokenTransfer,
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
  if (isBridgeAddress(to) || isBridgeMethod(methodId, funcName)) return 'bridge';
  if (isDEXAddress(to) || funcName.includes('swap') || funcName.includes('exactinput') ||
      funcName.includes('multicall') || funcName.includes('execute')) return 'swap';
  if (funcName.includes('supply') || funcName.includes('borrow') || funcName.includes('repay') ||
      funcName.includes('withdraw') || funcName.includes('lend')) return 'lending';
  if (funcName.includes('stake') || funcName.includes('unstake') || funcName.includes('delegate')) return 'staking';
  if (funcName.includes('mint') || funcName.includes('safetransferfrom') ||
      funcName.includes('setapprovalforall')) return 'nft';
  if (!tx.input || tx.input === '0x' || tx.input === '') return 'transfer';
  if (tx.input.length > 2) return 'contract_interaction';

  return 'unknown';
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
    const gasUsed = parseInt(tx.gasUsed || '0') || 0;
    const gasPrice = parseInt(tx.gasPrice || '0') || 0;
    const gasCostWei = gasUsed * gasPrice;
    const gasCostETH = gasCostWei / WEI;
    const timestamp = parseInt(tx.timeStamp || '0') || Math.floor(Date.now() / 1000);
    const rawVal = parseFloat(tx.value || '0') || 0;
    const valueFormatted = rawVal / Math.pow(10, chain.nativeToken.decimals);

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
    const rawVal = parseFloat(t.value || '0') || 0;
    const valueFormatted = rawVal / Math.pow(10, decimals);
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
  knownWallets: Record<string, string> = {}
): Promise<ScanResult> {
  const chain = getChainConfig(chainId);
  const lower = (walletAddress || '').toLowerCase();

  const processedTxs = processTransactions(rawTxs, walletAddress, chainId, knownWallets);
  const processedTransfers = processTokenTransfers(rawTokenTransfers, walletAddress, chainId, knownWallets);

  const outboundTxs = processedTxs.filter(
    tx => (tx.from || '').toLowerCase() === lower
  );

  const gasSummary = analyzeGasFees(outboundTxs);
  const transferSummary = analyzeTransfers(processedTxs, processedTransfers, walletAddress);
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
    interactionsSummary: analyzeInteractions(processedTxs, processedTransfers, walletAddress, chainId, knownWallets),
    scannedAt: Date.now(),
    transactionCount: rawTxs.length,
    tokenTransferCount: rawTokenTransfers.length,
  };
}

export function aggregateResults(
  address: string,
  chainResults: ScanResult[]
): MultiChainScanResult {
  return {
    address,
    chains: chainResults,
    aggregated: {
      totalGasETH: chainResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0),
      totalGasUSD: chainResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0),
      totalHighRiskApprovals: chainResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0),
      totalDeadAssets: chainResults.reduce((sum, r) => sum + (r.graveyardSummary?.totalTokensDead || 0), 0),
      totalTransactions: chainResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0),
      riskScore: chainResults.length > 0 ? Math.round(chainResults.reduce((sum, r) => sum + (r.riskAssessment?.score || 0), 0) / chainResults.length) : 0,
      riskGrade: chainResults.length > 0 ? chainResults[0]?.riskAssessment?.grade || "A" : "A",
    },
  };
}
