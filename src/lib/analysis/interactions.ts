import {
  ProcessedTransaction,
  ProcessedTokenTransfer,
  ProtocolInteraction,
  AddressInteraction,
  InteractionsSummary,
  TransactionCategory,
} from '../types';
import {
  getAddressLabel,
  getProtocolMeta,
  isCEXAddress,
  isDEXAddress,
  isBridgeAddress,
  isPureTokenContract,
  isBurnAddress,
} from '../labels';
import { getChainConfig } from '../chains';

type CounterpartyAccumulator = Omit<
  AddressInteraction,
  'inboundCount' | 'outboundCount' | 'totalTxCount' | 'netFlowUSD' | 'chainId' | 'lastInteractionDate'
> & {
  inboundTransactionHashes: Set<string>;
  outboundTransactionHashes: Set<string>;
  transactionHashes: Set<string>;
  lastTimestamp: number;
  lastDate: string;
};

export function analyzeInteractions(
  transactions: ProcessedTransaction[],
  tokenTransfers: ProcessedTokenTransfer[],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {}
): InteractionsSummary {
  const lower = walletAddress.toLowerCase();
  const chain = getChainConfig(chainId);

  // 1. Map contracts from direct calls & transactions
  const contractMap = new Map<string, {
    address: string;
    label: string | null;
    txCount: number;
    totalGasETH: number;
    totalGasUSD: number;
    totalVolumeUSD: number;
    lastTimestamp: number;
    lastDate: string;
    protocol: string;
    name: string;
    category: TransactionCategory | string;
  }>();

  for (const tx of transactions) {
    const toAddr = (tx.to || '').toLowerCase();
    if (!toAddr || toAddr === lower || isBurnAddress(toAddr)) continue;

    const isContract =
      tx.category === 'contract_interaction' ||
      (tx.methodId && tx.methodId !== '0x' && tx.methodId !== '') ||
      Boolean(tx.functionName) ||
      tx.category === 'swap' ||
      tx.category === 'approval' ||
      tx.category === 'bridge' ||
      tx.category === 'lending' ||
      tx.category === 'staking';

    if (isContract) {
      const meta = getProtocolMeta(toAddr);
      const label = getAddressLabel(toAddr, knownWallets);
      const protocolName = meta?.protocol || (label ? label.split(':')[0].trim() : 'Other');
      const contractName = meta?.name || label || `Contract (${toAddr.slice(0, 6)}...${toAddr.slice(-4)})`;
      const category = meta?.category || tx.category || 'other';

      const existing = contractMap.get(toAddr) || {
        address: toAddr,
        label,
        txCount: 0,
        totalGasETH: 0,
        totalGasUSD: 0,
        totalVolumeUSD: 0,
        lastTimestamp: tx.timestamp,
        lastDate: tx.date,
        protocol: protocolName,
        name: contractName,
        category,
      };

      existing.txCount++;
      existing.totalGasETH += tx.gasCostETH || 0;
      existing.totalGasUSD += tx.gasCostUSD || 0;
      existing.totalVolumeUSD += tx.valueUSD || 0;
      if (tx.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = tx.timestamp;
        existing.lastDate = tx.date;
      }

      contractMap.set(toAddr, existing);
    }
  }

  // Attribute every priced wallet-facing token leg to the directly called
  // protocol contract in the same transaction. This captures ERC-20-only
  // swaps and bridges without guessing from unrelated transfers.
  const contractByTransactionHash = new Map<string, string>();
  for (const tx of transactions) {
    const contractAddress = (tx.to || '').toLowerCase();
    if (tx.hash && contractMap.has(contractAddress)) {
      contractByTransactionHash.set(tx.hash.toLowerCase(), contractAddress);
    }
  }
  for (const transfer of tokenTransfers) {
    const contractAddress = contractByTransactionHash.get(transfer.hash.toLowerCase());
    if (!contractAddress || transfer.valueUSD === null) continue;
    const walletFacing = transfer.from.toLowerCase() === lower || transfer.to.toLowerCase() === lower;
    if (!walletFacing) continue;
    const contract = contractMap.get(contractAddress);
    if (contract) contract.totalVolumeUSD += transfer.valueUSD;
  }

  // 2. Rollup Protocol Families
  const protocolGroupMap = new Map<string, {
    name: string;
    protocol: string;
    category: TransactionCategory | string;
    txCount: number;
    totalGasETH: number;
    totalGasUSD: number;
    totalVolumeUSD: number;
    lastTimestamp: number;
    lastDate: string;
    contracts: Map<string, ProtocolInteraction['contracts'][number]>;
  }>();

  for (const [cAddr, cData] of contractMap.entries()) {
    const groupKey = cData.protocol.toLowerCase();
    const group = protocolGroupMap.get(groupKey) || {
      name: cData.protocol,
      protocol: cData.protocol,
      category: cData.category,
      txCount: 0,
      totalGasETH: 0,
      totalGasUSD: 0,
      totalVolumeUSD: 0,
      lastTimestamp: cData.lastTimestamp,
      lastDate: cData.lastDate,
      contracts: new Map(),
    };

    group.txCount += cData.txCount;
    group.totalGasETH += cData.totalGasETH;
    group.totalGasUSD += cData.totalGasUSD;
    group.totalVolumeUSD += cData.totalVolumeUSD;
    if (cData.lastTimestamp > group.lastTimestamp) {
      group.lastTimestamp = cData.lastTimestamp;
      group.lastDate = cData.lastDate;
    }

    group.contracts.set(cAddr, {
      name: cData.name,
      contractAddress: cAddr,
      txCount: cData.txCount,
      totalGasNative: cData.totalGasETH,
      totalGasUSD: cData.totalGasUSD,
      totalVolumeUSD: cData.totalVolumeUSD,
      lastInteractionDate: cData.lastDate,
      chainId,
      chainName: chain.name,
      nativeTokenSymbol: chain.nativeToken.symbol,
    });

    protocolGroupMap.set(groupKey, group);
  }

  const topProtocols: ProtocolInteraction[] = Array.from(protocolGroupMap.values())
    .map(g => ({
      name: g.name,
      protocol: g.protocol,
      category: g.category,
      txCount: g.txCount,
      totalGasNative: g.totalGasETH,
      totalGasUSD: g.totalGasUSD,
      totalVolumeUSD: g.totalVolumeUSD,
      lastInteractionDate: g.lastDate,
      chainId,
      chainName: chain.name,
      nativeTokenSymbol: chain.nativeToken.symbol,
      contracts: Array.from(g.contracts.values()).sort((a, b) => b.txCount - a.txCount),
    }))
    .sort((a, b) => b.txCount - a.txCount || b.totalGasNative - a.totalGasNative)
    .slice(0, 40);

  const protocolVolumeUSD = Array.from(protocolGroupMap.values())
    .reduce((sum, protocol) => sum + protocol.totalVolumeUSD, 0);

  // 3. Top Counterparty Addresses (Strictly distinguishing EOAs vs Contracts)
  const counterpartyMap = new Map<string, CounterpartyAccumulator>();

  // Process Native Transactions
  for (const tx of transactions) {
    const fromAddr = (tx.from || '').toLowerCase();
    const toAddr = (tx.to || '').toLowerCase();

    const isContractCall =
      tx.category === 'contract_interaction' ||
      (tx.methodId && tx.methodId !== '0x' && tx.methodId !== '') ||
      Boolean(tx.functionName);

    if (fromAddr === lower && toAddr && toAddr !== lower && !isBurnAddress(toAddr)) {
      const existing = getOrCreateCounterparty(counterpartyMap, toAddr, knownWallets, tx.date, tx.timestamp, isContractCall);
      recordCounterpartyTransaction(existing, 'outbound', getTransactionKey(tx.hash, tx.timestamp, fromAddr, toAddr));
      existing.outboundUSD += tx.valueUSD || 0;
      if (isContractCall) existing.type = 'contract';
      if (tx.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = tx.timestamp;
        existing.lastDate = tx.date;
      }
    } else if (toAddr === lower && fromAddr && fromAddr !== lower) {
      const existing = getOrCreateCounterparty(counterpartyMap, fromAddr, knownWallets, tx.date, tx.timestamp, false);
      recordCounterpartyTransaction(existing, 'inbound', getTransactionKey(tx.hash, tx.timestamp, fromAddr, toAddr));
      existing.inboundUSD += tx.valueUSD || 0;
      if (tx.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = tx.timestamp;
        existing.lastDate = tx.date;
      }
    }
  }

  // Process Token Transfers
  for (const t of tokenTransfers) {
    const fromAddr = (t.from || '').toLowerCase();
    const toAddr = (t.to || '').toLowerCase();

    if (fromAddr === lower && toAddr && toAddr !== lower && !isBurnAddress(toAddr)) {
      const isContract = contractMap.has(toAddr) || isPureTokenContract(toAddr);
      const existing = getOrCreateCounterparty(counterpartyMap, toAddr, knownWallets, t.date, t.timestamp, isContract);
      recordCounterpartyTransaction(existing, 'outbound', getTransactionKey(t.hash, t.timestamp, fromAddr, toAddr));
      existing.outboundUSD += t.valueUSD || 0;
      if (isContract) existing.type = 'contract';
      if (t.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = t.timestamp;
        existing.lastDate = t.date;
      }
    } else if (toAddr === lower && fromAddr && fromAddr !== lower) {
      const isContract = contractMap.has(fromAddr) || isPureTokenContract(fromAddr);
      const existing = getOrCreateCounterparty(counterpartyMap, fromAddr, knownWallets, t.date, t.timestamp, isContract);
      recordCounterpartyTransaction(existing, 'inbound', getTransactionKey(t.hash, t.timestamp, fromAddr, toAddr));
      existing.inboundUSD += t.valueUSD || 0;
      if (isContract) existing.type = 'contract';
      if (t.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = t.timestamp;
        existing.lastDate = t.date;
      }
    }
  }

  const topCounterparties: AddressInteraction[] = Array.from(counterpartyMap.values())
    .map(c => {
      const inboundCount = c.inboundTransactionHashes.size;
      const outboundCount = c.outboundTransactionHashes.size;
      const totalTxCount = c.transactionHashes.size;
      const netFlowUSD = c.inboundUSD - c.outboundUSD;
      return {
        address: c.address,
        label: c.label,
        type: c.type,
        inboundCount,
        outboundCount,
        inboundUSD: c.inboundUSD,
        outboundUSD: c.outboundUSD,
        totalTxCount,
        netFlowUSD,
        lastInteractionDate: c.lastDate,
        chainId,
      };
    })
    .sort((a, b) => b.totalTxCount - a.totalTxCount || (b.inboundUSD + b.outboundUSD) - (a.inboundUSD + a.outboundUSD))
    .slice(0, 40);

  return {
    topProtocols,
    protocolVolumeUSD,
    topCounterparties,
    uniqueContractCount: contractMap.size,
    uniqueCounterpartyCount: counterpartyMap.size,
  };
}

function getOrCreateCounterparty(
  map: Map<string, CounterpartyAccumulator>,
  address: string,
  knownWallets: Record<string, string>,
  date: string,
  timestamp: number,
  isContractCall: boolean = false
): CounterpartyAccumulator {
  const addr = address.toLowerCase();
  if (map.has(addr)) {
    const existing = map.get(addr)!;
    if (isContractCall && (existing.type === 'eoa' || existing.type === 'unknown')) {
      existing.type = 'contract';
    }
    return existing;
  }

  const label = getAddressLabel(addr, knownWallets);
  let type: AddressInteraction['type'] = 'unknown';

  if (isCEXAddress(addr, knownWallets)) type = 'cex';
  else if (isDEXAddress(addr, knownWallets)) type = 'dex';
  else if (isBridgeAddress(addr, knownWallets)) type = 'bridge';
  else if (label || isContractCall) type = 'contract';

  const entry = {
    address: addr,
    label,
    type,
    inboundUSD: 0,
    outboundUSD: 0,
    inboundTransactionHashes: new Set<string>(),
    outboundTransactionHashes: new Set<string>(),
    transactionHashes: new Set<string>(),
    lastTimestamp: timestamp,
    lastDate: date,
  };

  map.set(addr, entry);
  return entry;
}

function getTransactionKey(hash: string, timestamp: number, from: string, to: string): string {
  const normalizedHash = (hash || '').trim().toLowerCase();
  return normalizedHash || `missing:${timestamp}:${from}:${to}`;
}

function recordCounterpartyTransaction(
  counterparty: CounterpartyAccumulator,
  direction: 'inbound' | 'outbound',
  transactionHash: string,
): void {
  counterparty.transactionHashes.add(transactionHash);
  if (direction === 'inbound') {
    counterparty.inboundTransactionHashes.add(transactionHash);
  } else {
    counterparty.outboundTransactionHashes.add(transactionHash);
  }
}
