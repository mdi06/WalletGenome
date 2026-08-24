import {
  ClusterLinkage,
  ProcessedTokenTransfer,
  ProcessedTransaction,
  WalletClusterEvidence,
  WalletTransferEvidence,
  SharedCounterparty,
} from './types';

function isPositiveTransfer(valueFormatted: number): boolean {
  return Number.isFinite(valueFormatted) && valueFormatted > 0;
}

export function collectWalletClusterEvidence(
  walletAddress: string,
  nativeTransactions: ProcessedTransaction[],
  internalTransactions: ProcessedTransaction[],
  tokenTransfers: ProcessedTokenTransfer[],
): WalletClusterEvidence {
  const wallet = walletAddress.toLowerCase();
  const transfers: WalletTransferEvidence[] = [];
  const counterparties = new Set<string>();

  const addEvidence = (
    item: ProcessedTransaction | ProcessedTokenTransfer,
    assetType: WalletTransferEvidence['assetType'],
    assetIdentifier: string,
  ) => {
    const source = item.from.toLowerCase();
    const target = item.to.toLowerCase();
    if (!source || !target || (source !== wallet && target !== wallet)) return;
    if (!isPositiveTransfer(item.valueFormatted)) return;
    const counterparty = source === wallet ? target : source;
    if (counterparty && counterparty !== wallet) counterparties.add(counterparty);
    transfers.push({
      hash: item.hash,
      chainId: item.chainId,
      source,
      target,
      assetType,
      assetIdentifier,
      valueUSD: item.valueUSD,
      timestamp: item.timestamp,
      date: item.date,
    });
  };

  nativeTransactions.forEach(transaction => addEvidence(transaction, 'native', 'native'));
  internalTransactions.forEach(transaction => addEvidence(transaction, 'internal', 'native'));
  tokenTransfers.forEach(transfer => addEvidence(
    transfer,
    'erc20',
    transfer.contractAddress.toLowerCase(),
  ));

  return {
    walletAddress: wallet,
    transfers,
    counterparties: [...counterparties],
  };
}

export function detectDirectWalletLinkages(
  evidenceSets: WalletClusterEvidence[],
): ClusterLinkage[] {
  const submittedWallets = new Set(evidenceSets.map(evidence => evidence.walletAddress.toLowerCase()));
  const uniqueEvidence = new Map<string, WalletTransferEvidence>();

  for (const evidence of evidenceSets) {
    for (const transfer of evidence.transfers) {
      if (!submittedWallets.has(transfer.source) || !submittedWallets.has(transfer.target)) continue;
      const key = [
        transfer.chainId,
        transfer.hash.toLowerCase(),
        transfer.source,
        transfer.target,
        transfer.assetType,
        transfer.assetIdentifier,
      ].join(':');
      uniqueEvidence.set(key, transfer);
    }
  }

  const groups = new Map<string, {
    source: string;
    target: string;
    chainId: number;
    hashes: Set<string>;
    pricedVolumeUSD: number;
    pricedLegs: number;
    unpricedLegs: number;
    lastTimestamp: number;
    lastDate: string;
  }>();

  for (const transfer of uniqueEvidence.values()) {
    const key = `${transfer.chainId}:${transfer.source}:${transfer.target}`;
    const group = groups.get(key) ?? {
      source: transfer.source,
      target: transfer.target,
      chainId: transfer.chainId,
      hashes: new Set<string>(),
      pricedVolumeUSD: 0,
      pricedLegs: 0,
      unpricedLegs: 0,
      lastTimestamp: transfer.timestamp,
      lastDate: transfer.date,
    };
    group.hashes.add(transfer.hash);
    if (transfer.valueUSD === null) group.unpricedLegs++;
    else {
      group.pricedLegs++;
      group.pricedVolumeUSD += transfer.valueUSD;
    }
    if (transfer.timestamp > group.lastTimestamp) {
      group.lastTimestamp = transfer.timestamp;
      group.lastDate = transfer.date;
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(group => {
      const valueStatus = group.unpricedLegs === 0
        ? 'complete' as const
        : group.pricedLegs > 0
          ? 'partial' as const
          : 'unavailable' as const;
      const evidenceTxHashes = [...group.hashes].sort();
      return {
        source: group.source,
        target: group.target,
        type: 'direct_transfer' as const,
        txCount: evidenceTxHashes.length,
        volumeUSD: valueStatus === 'complete' ? group.pricedVolumeUSD : null,
        valueStatus,
        evidenceTxHashes,
        chainId: group.chainId,
        lastDate: group.lastDate,
        detail: `${evidenceTxHashes.length} direct transaction${evidenceTxHashes.length === 1 ? '' : 's'} on chain ${group.chainId}`,
      };
    })
    .sort((a, b) => b.txCount - a.txCount || b.lastDate.localeCompare(a.lastDate));
}

export function findSharedCounterparties(
  evidenceSets: WalletClusterEvidence[],
): SharedCounterparty[] {
  const submittedWallets = new Set(evidenceSets.map(evidence => evidence.walletAddress.toLowerCase()));
  const sharedBy = new Map<string, Set<string>>();

  for (const evidence of evidenceSets) {
    for (const address of evidence.counterparties) {
      const normalized = address.toLowerCase();
      if (submittedWallets.has(normalized)) continue;
      const wallets = sharedBy.get(normalized) ?? new Set<string>();
      wallets.add(evidence.walletAddress.toLowerCase());
      sharedBy.set(normalized, wallets);
    }
  }

  return [...sharedBy.entries()]
    .filter(([, wallets]) => wallets.size > 1)
    .map(([address, wallets]) => ({
      address,
      label: null,
      sharedCount: wallets.size,
      walletAddresses: [...wallets].sort(),
    }))
    .sort((a, b) => b.sharedCount - a.sharedCount || a.address.localeCompare(b.address));
}
