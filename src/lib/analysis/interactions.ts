import {
  ProcessedTransaction,
  ProcessedTokenTransfer,
  ProtocolInteraction,
  ProtocolContractDetail,
  AddressInteraction,
  InteractionsSummary,
} from '../types';
import { getAddressLabel, getProtocolMeta, isPureTokenContract, isCEXAddress, isDEXAddress, isBridgeAddress, isBurnAddress } from '../labels';

const APPROVE_METHOD_ID = '0x095ea7b3';

export function analyzeInteractions(
  transactions: ProcessedTransaction[] = [],
  tokenTransfers: ProcessedTokenTransfer[] = [],
  walletAddress: string,
  chainId: number,
  knownWallets: Record<string, string> = {}
): InteractionsSummary {
  const lower = (walletAddress || '').toLowerCase();

  // 1. Group individual contract interactions
  const contractMap = new Map<string, {
    name: string;
    protocolBrand: string;
    contractAddress: string;
    category: string;
    txCount: number;
    totalGasETH: number;
    totalGasUSD: number;
    totalVolumeUSD: number;
    lastTimestamp: number;
    lastDate: string;
  }>();

  for (const tx of transactions) {
    const isOutbound = (tx.from || '').toLowerCase() === lower;
    if (!isOutbound) continue;

    let targetContract = (tx.to || '').toLowerCase();
    if (!targetContract || isBurnAddress(targetContract)) continue;

    // Check if this is an approval call -> attribute to the SPENDER protocol!
    const input = (tx as any).input || '';
    const isApproval = tx.methodId === APPROVE_METHOD_ID || input.toLowerCase().startsWith(APPROVE_METHOD_ID);
    if (isApproval && input.length >= 74) {
      const spender = `0x${input.slice(34, 74)}`.toLowerCase();
      if (spender && !isBurnAddress(spender)) {
        targetContract = spender;
      }
    }

    // Skip pure ERC-20 token contracts from being displayed as DApp protocols
    if (isPureTokenContract(targetContract)) {
      continue;
    }

    const meta = getProtocolMeta(targetContract);
    const label = getAddressLabel(targetContract, knownWallets);

    let name = meta?.name || label || '';
    const protocolBrand = meta?.protocol || (label ? label.split(' ')[0] : 'Other');
    let category = meta?.category || tx.category || 'other';

    if (!name) {
      if (tx.functionName && tx.functionName.length > 2) {
        const cleanFn = tx.functionName.split('(')[0];
        name = `${cleanFn}() on ${targetContract.slice(0, 8)}...`;
      } else {
        name = `Contract ${targetContract.slice(0, 8)}...${targetContract.slice(-4)}`;
      }
    }

    // Skip if it is an EOA or CEX deposit address
    if (isCEXAddress(targetContract, knownWallets)) {
      continue;
    }

    const existing = contractMap.get(targetContract) || {
      name,
      protocolBrand,
      contractAddress: targetContract,
      category,
      txCount: 0,
      totalGasETH: 0,
      totalGasUSD: 0,
      totalVolumeUSD: 0,
      lastTimestamp: 0,
      lastDate: tx.date,
    };

    existing.txCount++;
    existing.totalGasETH += tx.gasCostETH || 0;
    existing.totalGasUSD += tx.gasCostUSD || 0;
    existing.totalVolumeUSD += tx.valueUSD || 0;

    if (tx.timestamp > existing.lastTimestamp) {
      existing.lastTimestamp = tx.timestamp;
      existing.lastDate = tx.date;
    }

    if (meta) {
      existing.name = meta.name;
      existing.protocolBrand = meta.protocol;
      existing.category = meta.category;
    }

    contractMap.set(targetContract, existing);
  }

  // 2. Roll up individual contracts by Protocol Brand / Family
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
    contracts: Map<string, ProtocolContractDetail>;
  }>();

  for (const c of contractMap.values()) {
    const brand = c.protocolBrand || c.name;
    const groupKey = brand.toLowerCase();

    const group = protocolGroupMap.get(groupKey) || {
      name: brand,
      protocol: brand,
      category: c.category,
      txCount: 0,
      totalGasETH: 0,
      totalGasUSD: 0,
      totalVolumeUSD: 0,
      lastTimestamp: 0,
      lastDate: c.lastDate,
      contracts: new Map<string, ProtocolContractDetail>(),
    };

    group.txCount += c.txCount;
    group.totalGasETH += c.totalGasETH;
    group.totalGasUSD += c.totalGasUSD;
    group.totalVolumeUSD += c.totalVolumeUSD;

    if (c.lastTimestamp > group.lastTimestamp) {
      group.lastTimestamp = c.lastTimestamp;
      group.lastDate = c.lastDate;
    }

    group.contracts.set(c.contractAddress, {
      name: c.name,
      contractAddress: c.contractAddress,
      txCount: c.txCount,
      totalGasETH: c.totalGasETH,
      totalGasUSD: c.totalGasUSD,
      totalVolumeUSD: c.totalVolumeUSD,
      lastInteractionDate: c.lastDate,
      chainId,
    });

    protocolGroupMap.set(groupKey, group);
  }

  const topProtocols: ProtocolInteraction[] = Array.from(protocolGroupMap.values())
    .map(g => ({
      name: g.name,
      protocol: g.protocol,
      category: g.category,
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

  // 3. Top Counterparty Addresses
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

  for (const tx of transactions) {
    const fromAddr = (tx.from || '').toLowerCase();
    const toAddr = (tx.to || '').toLowerCase();

    if (fromAddr === lower && toAddr && toAddr !== lower && !isBurnAddress(toAddr)) {
      const existing = getOrCreateCounterparty(counterpartyMap, toAddr, knownWallets, tx.date, tx.timestamp);
      existing.outboundCount++;
      existing.outboundUSD += tx.valueUSD || 0;
      if (tx.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = tx.timestamp;
        existing.lastDate = tx.date;
      }
    } else if (toAddr === lower && fromAddr && fromAddr !== lower) {
      const existing = getOrCreateCounterparty(counterpartyMap, fromAddr, knownWallets, tx.date, tx.timestamp);
      existing.inboundCount++;
      existing.inboundUSD += tx.valueUSD || 0;
      if (tx.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = tx.timestamp;
        existing.lastDate = tx.date;
      }
    }
  }

  for (const t of tokenTransfers) {
    const fromAddr = (t.from || '').toLowerCase();
    const toAddr = (t.to || '').toLowerCase();

    if (fromAddr === lower && toAddr && toAddr !== lower && !isBurnAddress(toAddr)) {
      const existing = getOrCreateCounterparty(counterpartyMap, toAddr, knownWallets, t.date, t.timestamp);
      existing.outboundCount++;
      existing.outboundUSD += t.valueUSD || 0;
      if (t.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = t.timestamp;
        existing.lastDate = t.date;
      }
    } else if (toAddr === lower && fromAddr && fromAddr !== lower) {
      const existing = getOrCreateCounterparty(counterpartyMap, fromAddr, knownWallets, t.date, t.timestamp);
      existing.inboundCount++;
      existing.inboundUSD += t.valueUSD || 0;
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
  timestamp: number
) {
  const addr = address.toLowerCase();
  if (map.has(addr)) return map.get(addr)!;

  const label = getAddressLabel(addr, knownWallets);
  let type: 'cex' | 'dex' | 'bridge' | 'contract' | 'eoa' = 'eoa';

  if (isCEXAddress(addr, knownWallets)) type = 'cex';
  else if (isDEXAddress(addr, knownWallets)) type = 'dex';
  else if (isBridgeAddress(addr, knownWallets)) type = 'bridge';
  else if (label) type = 'contract';

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
