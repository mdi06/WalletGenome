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

export function analyzeInteractions(
  transactions: ProcessedTransaction[],
  tokenTransfers: ProcessedTokenTransfer[],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {}
): InteractionsSummary {
  const lower = walletAddress.toLowerCase();

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
    category: string;
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

  // 2. Rollup Protocol Families
  const protocolGroupMap = new Map<string, {
    name: string;
    protocol: string;
    category: string;
    txCount: number;
    totalGasETH: number;
    totalGasUSD: number;
    totalVolumeUSD: number;
    lastTimestamp: number;
    lastDate: string;
    contracts: Map<string, any>;
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
      totalGasETH: cData.totalGasETH,
      totalGasUSD: cData.totalGasUSD,
      totalVolumeUSD: cData.totalVolumeUSD,
      lastInteractionDate: cData.lastDate,
      chainId,
    });

    protocolGroupMap.set(groupKey, group);
  }

  const topProtocols: ProtocolInteraction[] = Array.from(protocolGroupMap.values())
    .map(g => ({
      name: g.name,
      protocol: g.protocol,
      category: g.category as any,
      txCount: g.txCount,
      totalGasETH: g.totalGasETH,
      totalGasUSD: g.totalGasUSD,
      totalVolumeUSD: g.totalVolumeUSD,
      lastInteractionDate: g.lastDate,
      chainId,
      contracts: Array.from(g.contracts.values()).sort((a, b) => b.txCount - a.txCount),
    }))
    .sort((a, b) => b.txCount - a.txCount || b.totalGasETH - a.totalGasETH)
    .slice(0, 40);

  // 3. Top Counterparty Addresses (Strictly distinguishing EOAs vs Contracts)
  const counterpartyMap = new Map<string, {
    address: string;
    label: string | null;
    type: 'cex' | 'dex' | 'bridge' | 'contract' | 'eoa';
    inboundCount: number;
    outboundCount: number;
    inboundUSD: number;
    outboundUSD: number;
    lastTimestamp: number;
    lastDate: string;
  }>();

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
      existing.outboundCount++;
      existing.outboundUSD += tx.valueUSD || 0;
      if (isContractCall) existing.type = 'contract';
      if (tx.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = tx.timestamp;
        existing.lastDate = tx.date;
      }
    } else if (toAddr === lower && fromAddr && fromAddr !== lower) {
      const existing = getOrCreateCounterparty(counterpartyMap, fromAddr, knownWallets, tx.date, tx.timestamp, false);
      existing.inboundCount++;
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
      existing.outboundCount++;
      existing.outboundUSD += t.valueUSD || 0;
      if (isContract) existing.type = 'contract';
      if (t.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = t.timestamp;
        existing.lastDate = t.date;
      }
    } else if (toAddr === lower && fromAddr && fromAddr !== lower) {
      const isContract = contractMap.has(fromAddr) || isPureTokenContract(fromAddr);
      const existing = getOrCreateCounterparty(counterpartyMap, fromAddr, knownWallets, t.date, t.timestamp, isContract);
      existing.inboundCount++;
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
      const totalTxCount = c.inboundCount + c.outboundCount;
      const netFlowUSD = c.inboundUSD - c.outboundUSD;
      return {
        address: c.address,
        label: c.label,
        type: c.type,
        inboundCount: c.inboundCount,
        outboundCount: c.outboundCount,
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
    topCounterparties,
    uniqueContractCount: contractMap.size,
    uniqueCounterpartyCount: counterpartyMap.size,
  };
}

function getOrCreateCounterparty(
  map: Map<string, any>,
  address: string,
  knownWallets: Record<string, string>,
  date: string,
  timestamp: number,
  isContractCall: boolean = false
) {
  const addr = address.toLowerCase();
  if (map.has(addr)) {
    const existing = map.get(addr)!;
    if (isContractCall && existing.type === 'eoa') {
      existing.type = 'contract';
    }
    return existing;
  }

  const label = getAddressLabel(addr, knownWallets);
  let type: 'cex' | 'dex' | 'bridge' | 'contract' | 'eoa' = 'eoa';

  if (isCEXAddress(addr, knownWallets)) type = 'cex';
  else if (isDEXAddress(addr, knownWallets)) type = 'dex';
  else if (isBridgeAddress(addr, knownWallets)) type = 'bridge';
  else if (label || isContractCall) type = 'contract';

  const entry = {
    address: addr,
    label,
    type,
    inboundCount: 0,
    outboundCount: 0,
    inboundUSD: 0,
    outboundUSD: 0,
    lastTimestamp: timestamp,
    lastDate: date,
  };

  map.set(addr, entry);
  return entry;
}
