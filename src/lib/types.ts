// Shared TypeScript types for the wallet analytics app

export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  nativeToken: {
    symbol: string;
    decimals: number;
    coingeckoId: string;
  };
  explorerUrl: string;
  color: string;
  icon: string;
}

export interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export interface EtherscanTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export interface EtherscanInternalTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
}

export interface ProcessedTransaction {
  hash: string;
  timestamp: number;
  date: string;
  from: string;
  to: string;
  fromLabel?: string | null;
  toLabel?: string | null;
  value: string;
  valueFormatted: number;
  valueUSD: number | null;
  gasUsed: number;
  gasPrice: number;
  gasCostETH: number;
  gasCostUSD: number | null;
  isError: boolean;
  methodId: string;
  functionName: string;
  category: TransactionCategory;
  chainId: number;
}

export type TransactionCategory =
  | 'transfer'
  | 'swap'
  | 'approval'
  | 'nft'
  | 'bridge'
  | 'lending'
  | 'staking'
  | 'contract_deploy'
  | 'contract_interaction'
  | 'failed'
  | 'unknown';

export interface ProcessedTokenTransfer {
  hash: string;
  timestamp: number;
  date: string;
  from: string;
  to: string;
  fromLabel?: string | null;
  toLabel?: string | null;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  value: string;
  valueFormatted: number;
  valueUSD: number | null;
  direction: 'in' | 'out';
  chainId: number;
}

export interface GasSummary {
  totalGasETH: number;
  totalGasUSD: number;
  transactionCount: number;
  failedTransactionCount: number;
  failedGasETH: number;
  failedGasUSD: number;
  monthlyBreakdown: MonthlyGas[];
  categoryBreakdown: CategoryGas[];
  worstDay: {
    date: string;
    gasETH: number;
    gasUSD: number;
    txCount: number;
  } | null;
  averageGasPerTx: number;
}

export interface MonthlyGas {
  month: string;
  gasETH: number;
  gasUSD: number;
  txCount: number;
}

export interface CategoryGas {
  category: TransactionCategory;
  gasETH: number;
  gasUSD: number;
  txCount: number;
  percentage: number;
}

export interface TransferSummary {
  topInbound: ProcessedTokenTransfer[];
  topOutbound: ProcessedTokenTransfer[];
  topNativeInbound: ProcessedTransaction[];
  topNativeOutbound: ProcessedTransaction[];
  totalInboundUSD: number;
  totalOutboundUSD: number;
}

export type LossType =
  | 'wrong_address'
  | 'failed_transaction'
  | 'approval_drain'
  | 'dust_attack'
  | 'token_to_contract';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DetectedLoss {
  id: string;
  type: LossType;
  confidence: ConfidenceLevel;
  title: string;
  description: string;
  estimatedLossUSD: number | null;
  estimatedLossETH: number | null;
  hash: string;
  timestamp: number;
  date: string;
  from: string;
  to: string;
  tokenSymbol: string;
  amount: number;
  chainId: number;
}

export interface LossSummary {
  totalEstimatedLossUSD: number;
  losses: DetectedLoss[];
  byType: Record<string, DetectedLoss[]>;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export interface TokenApproval {
  hash: string;
  timestamp: number;
  date: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  spender: string;
  spenderLabel: string | null;
  allowance: string;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
  chainId: number;
  estimatedExposureUSD?: number | null;
}

export interface ApprovalSummary {
  activeApprovals: TokenApproval[];
  highRiskCount: number;
  unlimitedCount: number;
  totalApprovals: number;
  totalExposureUSD?: number;
}

export interface DeadAsset {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: number;
  peakValueUSD: number | null;
  currentValueUSD: number;
  chainId: number;
  lastActivityDate: string;
}

export interface GraveyardSummary {
  deadAssets: DeadAsset[];
  totalPeakValueLost: number;
  totalTokensDead: number;
}

export type ScanPhase =
  | 'idle'
  | 'fetching_transactions'
  | 'fetching_token_transfers'
  | 'fetching_internal_transactions'
  | 'fetching_prices'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface ScanProgress {
  phase: ScanPhase;
  message: string;
  transactionCount: number;
  tokenTransferCount: number;
  priceProgress: { current: number; total: number };
  chainId: number;
  chainName: string;
}

export interface ScanResult {
  address: string;
  chainId: number;
  chainName: string;
  gasSummary: GasSummary;
  transferSummary: TransferSummary;
  approvalSummary: ApprovalSummary;
  graveyardSummary: GraveyardSummary;
  fingerprint: WalletFingerprint;
  riskAssessment: RiskAssessment;
  activityProfile: ActivityProfile;
  interactionsSummary: InteractionsSummary;
  scannedAt: number;
  transactionCount: number;
  tokenTransferCount: number;
}

export interface MultiChainScanResult {
  address: string;
  chains: ScanResult[];
  sybilReport?: SybilReport;
  identityReport?: WalletIdentityReport;
  aggregated: {
    totalGasETH: number;
    totalGasUSD: number;
    totalHighRiskApprovals: number;
    totalDeadAssets: number;
    totalTransactions: number;
    riskScore: number;
    riskGrade: string;
  };
}

// ── Behavioral Fingerprint ──

export type WalletPersona =
  | 'DeFi Power User'
  | 'Active Trader'
  | 'Cautious Holder'
  | 'NFT Collector'
  | 'Airdrop Farmer'
  | 'Bridge Heavy'
  | 'Gas Burner'
  | 'Passive Whale'
  | 'New Wallet';

export interface FingerprintDimension {
  axis: string;
  score: number; // 0–100
  detail: string;
}

export interface WalletFingerprint {
  dimensions: FingerprintDimension[];
  persona: WalletPersona;
  personaDescription: string;
  walletAgeMonths: number;
  firstActivityDate: string;
  lastActivityDate: string;
  activeMonths: number;
  uniqueContracts: number;
}

// ── Risk Score ──

export interface RiskFactor {
  label: string;
  impact: number; // 0–100 contribution to risk
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface RiskAssessment {
  score: number; // 0–100 (0 = safest)
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: RiskFactor[];
}



// ── Activity Heatmap ──

export interface ActivityCell {
  day: number;  // 0=Sun, 6=Sat
  hour: number; // 0–23
  count: number;
  intensity: number; // 0–1 normalized
}

export interface ActivityProfile {
  heatmap: ActivityCell[];
  totalActiveDays: number;
  mostActiveDay: string; // e.g., "Wednesday"
  mostActiveHour: number;
  longestStreakDays: number;
  currentStreakDays: number;
  avgTxsPerActiveDay: number;
}

// ── Protocol & Address Interactions ──

export interface ProtocolContractDetail {
  name: string;
  contractAddress: string;
  txCount: number;
  totalGasETH: number;
  totalGasUSD: number;
  totalVolumeUSD: number;
  lastInteractionDate: string;
  chainId: number;
}

export interface ProtocolInteraction {
  name: string;
  protocol: string;
  category: TransactionCategory | string;
  txCount: number;
  totalGasETH: number;
  totalGasUSD: number;
  totalVolumeUSD: number;
  lastInteractionDate: string;
  chainId: number;
  activeChains?: number[];
  contracts: ProtocolContractDetail[];
}

export interface AddressInteraction {
  address: string;
  label: string | null;
  type: 'cex' | 'dex' | 'bridge' | 'contract' | 'eoa';
  inboundCount: number;
  outboundCount: number;
  inboundUSD: number;
  outboundUSD: number;
  totalTxCount: number;
  netFlowUSD: number;
  lastInteractionDate: string;
  chainId: number;
}

export interface InteractionsSummary {
  topProtocols: ProtocolInteraction[];
  topCounterparties: AddressInteraction[];
  uniqueContractCount: number;
  uniqueCounterpartyCount: number;
}

export interface SybilMatch {
  databaseId: 'layerzero' | 'hop' | 'umbra' | 'ofac' | 'trusta';
  databaseName: string;
  flagged: boolean;
  severity: 'critical' | 'warning' | 'clean';
  details: string;
  sourceUrl: string;
  matchedReason?: string;
}

export interface SybilReport {
  isFlagged: boolean;
  totalFlagged: number;
  overallStatus: 'clean' | 'flagged' | 'suspicious';
  matches: SybilMatch[];
  lastSyncDate: string;
  totalDatabasesChecked: number;
  mediaScore?: MediaScoreBreakdown;
}

export interface MediaScoreBreakdown {
  monetary: number;
  engagement: number;
  diversity: number;
  identity: number;
  age: number;
  compositeScore: number;
  sybilProbability: number;
  classification: 'Organic Human' | 'Moderate / Farmer' | 'High Sybil Risk';
  explanation: string;
}
export interface SocialLinkItem {
  platform: 'twitter' | 'discord' | 'github' | 'telegram' | 'farcaster' | 'lens' | 'website' | 'email' | 'ens' | 'basenames' | 'other';
  handle: string;
  link: string;
}

export interface DomainIdentityItem {
  platform: string;
  identity: string;
  displayName?: string;
}

export interface WalletIdentityReport {
  primaryName: string | null;
  primaryAvatar: string | null;
  description: string | null;
  socials: SocialLinkItem[];
  domains: DomainIdentityItem[];
  hasIdentity: boolean;
}
