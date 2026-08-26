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

export type DataAvailabilityStatus = 'complete' | 'partial' | 'unavailable';

export type DataSourceName =
  | 'scan'
  | 'transactions'
  | 'tokenTransfers'
  | 'internalTransactions'
  | 'prices';

export type ProviderErrorCode =
  | 'timeout'
  | 'rate_limited'
  | 'http_error'
  | 'invalid_response'
  | 'provider_error'
  | 'missing_api_key'
  | 'unsupported_chain'
  | 'result_truncated'
  | 'quota_exhausted'
  | 'spot_estimate'
  | 'unpriced';

export interface DataAvailabilityError {
  source: DataSourceName;
  code: ProviderErrorCode;
  message: string;
}

export interface DataSourceResult<T> {
  data: T[];
  status: DataAvailabilityStatus;
  errors: Omit<DataAvailabilityError, 'source'>[];
}

export interface ChainDataAvailability {
  chainId: number;
  chainName: string;
  transactions: DataAvailabilityStatus;
  tokenTransfers: DataAvailabilityStatus;
  internalTransactions: DataAvailabilityStatus;
  prices: DataAvailabilityStatus;
  errors: DataAvailabilityError[];
}

export type PriceProvenance =
  | 'historical'
  | 'spot_estimate'
  | 'stablecoin_assumption'
  | 'unpriced';

export interface PriceQuote {
  priceUSD: number | null;
  provenance: PriceProvenance;
}

export interface PriceProvenanceSummary {
  historical: number;
  spotEstimate: number;
  stablecoinAssumption: number;
  unpriced: number;
  status: DataAvailabilityStatus;
}

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type BlacklistStatus = 'flagged' | 'clear' | 'unavailable';

export interface ReportingMetrics {
  inflowUSD: number | null;
  outflowUSD: number | null;
  netFlowUSD: number | null;
  grossVolumeUSD: number | null;
  protocolVolumeUSD: number | null;
  approvalExposureUSD: number | null;
  riskScore: number | null;
  riskGrade: RiskGrade | null;
  sybilProbability: number | null;
  blacklistStatus: BlacklistStatus;
  activeDays: number | null;
  longestStreakDays: number | null;
  totalUnlimitedApprovals: number | null;
  capitalFlowCoverage: CapitalFlowCoverage;
  priceProvenance: PriceProvenanceSummary;
}

export interface CapitalFlowCoverage {
  verifiedLegs: number;
  totalLegs: number;
  excludedSpotEstimateLegs: number;
  unpricedLegs: number;
  coveragePercent: number | null;
  status: DataAvailabilityStatus;
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
  logIndex?: string;
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
  valueUSDProvenance: PriceProvenance;
  gasUsed: number;
  gasPrice: number;
  gasCostETH: number;
  gasCostUSD: number | null;
  gasCostUSDProvenance: PriceProvenance;
  isError: boolean;
  methodId: string;
  functionName: string;
  input?: string;
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
  logIndex?: string;
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
  valueUSDProvenance: PriceProvenance;
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
  capitalFlowCoverage: CapitalFlowCoverage;
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
export type ApprovalExposureStatus = 'estimated' | 'zero_balance' | 'unavailable';

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
  allowanceAmount: number | null;
  isUnlimited: boolean;
  riskLevel: RiskLevel;
  chainId: number;
  estimatedTokenBalance: number | null;
  estimatedExposureUSD: number | null;
  estimatedExposureUSDProvenance: PriceProvenance;
  exposureStatus: ApprovalExposureStatus;
}

export interface ApprovalSummary {
  activeApprovals: TokenApproval[];
  highRiskCount: number;
  unlimitedCount: number;
  totalApprovals: number;
  totalExposureUSD: number | null;
  totalExposureUSDProvenance: PriceProvenanceSummary;
  exposureStatus: DataAvailabilityStatus;
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
  fingerprint: WalletFingerprint;
  riskAssessment: RiskAssessment;
  activityProfile: ActivityProfile;
  interactionsSummary: InteractionsSummary;
  priceProvenance: PriceProvenanceSummary;
  scannedAt: number;
  transactionCount: number;
  tokenTransferCount: number;
  warning?: string | null;
}

export interface MultiChainScanResult {
  address: string;
  status: DataAvailabilityStatus;
  availability: ChainDataAvailability[];
  chains: ScanResult[];
  sybilReport?: SybilReport;
  identityReport?: WalletIdentityReport;
  metrics: ReportingMetrics;
  notice?: string;
  chainWarnings?: Array<{ chainId: number; chainName: string; message: string }>;
  aggregated: {
    totalGasETH: number;
    totalGasUSD: number;
    totalHighRiskApprovals: number;
    totalUnlimitedApprovals: number;
    totalTransactions: number;
    worstChainRiskScore: number | null;
    worstChainRiskGrade: RiskGrade | null;
    priceProvenance: PriceProvenanceSummary;
  };
}

export interface WalletScanResponse extends MultiChainScanResult {
  allInboundUSD: number;
  allOutboundUSD: number;
  cached?: boolean;
  clusterEvidence?: WalletClusterEvidence;
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
  grade: RiskGrade;
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
  activeDates: string[]; // unique UTC YYYY-MM-DD dates
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
  totalGasNative: number;
  totalGasUSD: number;
  totalVolumeUSD: number;
  lastInteractionDate: string;
  chainId: number;
  chainName: string;
  nativeTokenSymbol: string;
}

export interface ProtocolInteraction {
  name: string;
  protocol: string;
  category: TransactionCategory | string;
  txCount: number;
  totalGasNative: number;
  totalGasUSD: number;
  totalVolumeUSD: number;
  lastInteractionDate: string;
  chainId: number;
  chainName: string;
  nativeTokenSymbol: string;
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
  protocolVolumeUSD: number;
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
  monetaryIncluded: boolean;
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

// ── Bulk / Cluster Scan Types ──
export interface BulkWrappedWallet {
  address: string;
  primaryName?: string;
  avatar?: string | null;
  persona: string;
  riskGrade: string;
  riskScore: number;
  sybilProbability: number;
  isFlagged: boolean;
  flaggedDatabases: string[];
  totalGasETH: number;
  totalGasUSD: number;
  totalInflowUSD: number;
  totalOutflowUSD: number;
  transactionCount: number;
  highRiskApprovalsCount: number;
  unlimitedApprovalsCount: number;
  socialsCount: number;
  counterparties: { address: string; inboundCount: number; outboundCount: number; inboundUSD: number; outboundUSD: number; txHash?: string; lastDate?: string; chainId?: number }[];
}

export interface ClusterLinkage {
  source: string;
  target: string;
  type: 'direct_transfer';
  txCount: number;
  volumeUSD: number | null;
  valueStatus: DataAvailabilityStatus;
  evidenceTxHashes: string[];
  chainId: number;
  lastDate: string;
  detail: string;
}

export interface WalletTransferEvidence {
  hash: string;
  chainId: number;
  source: string;
  target: string;
  assetType: 'native' | 'internal' | 'erc20';
  assetIdentifier: string;
  valueUSD: number | null;
  timestamp: number;
  date: string;
}

export interface WalletClusterEvidence {
  walletAddress: string;
  transfers: WalletTransferEvidence[];
  counterparties: string[];
}

export interface SharedCounterparty {
  address: string;
  label: string | null;
  sharedCount: number;
  walletAddresses: string[];
}

export interface ClusterScanResult {
  status: DataAvailabilityStatus;
  totalWallets: number;
  requestedWallets: number;
  totalTransactions: number;
  totalGasUSD: number;
  totalInflowUSD: number;
  avgSybilProbability: number;
  flaggedCount: number;
  totalHighRiskApprovals: number;
  wallets: BulkWrappedWallet[];
  failedWallets: Array<{
    target: string;
    status: Exclude<DataAvailabilityStatus, 'complete'>;
    reasons: DataAvailabilityError[];
  }>;
  linkages: ClusterLinkage[];
  sharedCounterparties: SharedCounterparty[];
  scannedAt: number;
}
