import { SybilReport, SybilMatch, MediaScoreBreakdown } from '../types';

interface SybilCache {
  layerZero: Set<string>;
  hop: Set<string>;
  umbra: Set<string>;
  ofac: Set<string>;
  lastSyncedAt: number;
  isSyncing: boolean;
}

// ── Curated Baseline Snapshot Seeds (Cold-Start & Offline Fallback) ──
const BASELINE_OFAC = new Set([
  // Tornado Cash Core Contracts & Exploiters (OFAC SDN)
  '0x8589427373d6d84e98730d7795d8f6f8731fda16',
  '0x722122df12d4e14e13ac3b6895a86e84145b6967',
  '0xdd4c48c0b24039969fc16d1cdf626eab821d3384',
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
  '0xd96f2b1c14db84592442121178730be86d1245ee',
  '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
  '0x23773e65ed146a459791799d01336db287f2544c',
  '0x22aaA7720da53286950fA1591C6407B1dD644837',
  '0x090e53c44e8a9b6fb55b80025027565eb6375ff9',
  '0x12d66f87a04a32e52077191e8340023a267a57a7',
]);

const BASELINE_HOP = new Set([
  '0x599026ad1607a685e131d9b3bc857fc7e1262d1a',
  '0x814cae8fe9b9dae3d2345d820875c747970d4e92',
  '0x47e85c27633c5eefc43a0558b90159fa62241bb4',
]);

const BASELINE_LZ = new Set([
  '0x7c731e8c07e06821213f56f140685e28a5cf5713',
  '0x17c09c9ddf0a53ea57cb6d738f6b7ec252ec30bb',
  '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
]);

const BASELINE_UMBRA = new Set([
  '0x9c3f9154f85e3c8868a8ab9668adfa266858e7ec',
  '0x5a183424d5462cf1b439366df0472cbcfd4dfeb1',
]);

// ── In-Memory Global Cache (Singleton Across Requests initialized with baselines) ──
const cache: SybilCache = {
  layerZero: new Set(BASELINE_LZ),
  hop: new Set(BASELINE_HOP),
  umbra: new Set(BASELINE_UMBRA),
  ofac: new Set(BASELINE_OFAC),
  lastSyncedAt: 0,
  isSyncing: false,
};

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Hours Cache TTL

const SOURCES = {
  ofac: {
    name: 'US Treasury OFAC Sanctions',
    url: 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt',
    repoUrl: 'https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses',
    criteria: 'Specially Designated Nationals (SDN) list including Tornado Cash contracts, bridge exploiters, and state-sponsored hacker addresses.',
  },
  hop: {
    name: 'Hop Protocol Sybil Defense',
    url: 'https://raw.githubusercontent.com/rchen8/hop-airdrop/master/blacklist_ethereum.txt',
    repoUrl: 'https://github.com/rchen8/hop-airdrop',
    criteria: 'Union-find graph analysis flagging addresses with identical multi-sig funding parents and automated simultaneous bridge calls.',
  },
  layerZero: {
    name: 'LayerZero Sybil Database',
    url: 'https://raw.githubusercontent.com/cryptoamy/layerzero_sybil_scan_report/main/layer_zero_sybil_address.csv',
    repoUrl: 'https://github.com/cryptoamy/layerzero_sybil_scan_report',
    criteria: 'Community bounty hunter submissions and algorithmic cluster detection for automated script loops and CEX pooling.',
  },
  umbra: {
    name: 'Umbra Privacy Mixer Cluster',
    url: 'https://raw.githubusercontent.com/cryptoamy/layerzero_sybil_scan_report/main/umbra_sybil_address.csv',
    repoUrl: 'https://github.com/cryptoamy/layerzero_sybil_scan_report',
    criteria: 'Identified clusters routing funds through privacy pools to disguise common funding sources across airdrop campaigns.',
  },
  trusta: {
    name: 'Trusta AI / MEDIA Heuristic Model',
    repoUrl: 'https://www.trustalabs.ai',
    criteria: 'Algorithmic assessment of Monetary volume, Engagement velocity, Protocol Diversity, Identity breadth, and Wallet Age.',
  },
};

/**
 * Fetch raw text/csv from URL with a fast timeout
 */
async function fetchAddressList(url: string, timeoutMs: number = 3000): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Wallet-Analytics-Sybil-Radar/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const matches = text.match(/0x[a-fA-F0-9]{40}/g) || [];
    return matches.map(a => a.toLowerCase());
  } catch (err) {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Asynchronously synchronizes all upstream GitHub databases in the background
 */
export async function syncSybilDatabases(): Promise<void> {
  const now = Date.now();
  if (cache.isSyncing || (cache.lastSyncedAt > 0 && now - cache.lastSyncedAt < SYNC_INTERVAL_MS)) {
    return;
  }

  cache.isSyncing = true;

  try {
    const [ofacAddrs, hopAddrs, lzAddrs, umbraAddrs] = await Promise.allSettled([
      fetchAddressList(SOURCES.ofac.url),
      fetchAddressList(SOURCES.hop.url),
      fetchAddressList(SOURCES.layerZero.url),
      fetchAddressList(SOURCES.umbra.url),
    ]);

    if (ofacAddrs.status === 'fulfilled' && ofacAddrs.value.length > 0) {
      cache.ofac = new Set(ofacAddrs.value);
    }
    if (hopAddrs.status === 'fulfilled' && hopAddrs.value.length > 0) {
      cache.hop = new Set(hopAddrs.value);
    }
    if (lzAddrs.status === 'fulfilled' && lzAddrs.value.length > 0) {
      cache.layerZero = new Set(lzAddrs.value);
    }
    if (umbraAddrs.status === 'fulfilled' && umbraAddrs.value.length > 0) {
      cache.umbra = new Set(umbraAddrs.value);
    }

    cache.lastSyncedAt = Date.now();
  } catch (err) {
    console.error('Sybil database sync error:', err);
  } finally {
    cache.isSyncing = false;
  }
}

/**
 * Checks an address against all in-memory Sybil databases and evaluates the Trusta MEDIA Model
 */
export async function checkSybilStatus(
  address: string,
  mediaScore?: MediaScoreBreakdown
): Promise<SybilReport> {
  const lower = (address || '').toLowerCase();

  if (cache.lastSyncedAt === 0) {
    // Cold start: await the first sync to guarantee baseline security coverage
    await syncSybilDatabases();
  } else if (Date.now() - cache.lastSyncedAt > SYNC_INTERVAL_MS) {
    // TTL expired: trigger background sync without blocking the current pipeline
    syncSybilDatabases().catch(() => {});
  }

  const isOfac = cache.ofac.has(lower);
  const isHop = cache.hop.has(lower);
  const isLz = cache.layerZero.has(lower);
  const isUmbra = cache.umbra.has(lower);

  const isTrustaFlagged = (mediaScore?.sybilProbability ?? 0) > 55;

  const matches: SybilMatch[] = [
    {
      databaseId: 'layerzero',
      databaseName: SOURCES.layerZero.name,
      flagged: isLz,
      severity: isLz ? 'critical' : 'clean',
      details: isLz
        ? 'Flagged in LayerZero bounty / community Sybil reports as an automated or pooled farming cluster.'
        : SOURCES.layerZero.criteria,
      sourceUrl: SOURCES.layerZero.repoUrl,
      matchedReason: isLz ? 'Automated Execution / CEX Pool' : undefined,
    },
    {
      databaseId: 'hop',
      databaseName: SOURCES.hop.name,
      flagged: isHop,
      severity: isHop ? 'critical' : 'clean',
      details: isHop
        ? 'Flagged in Hop Protocol union-find cluster detection for coordinated multi-wallet bridging.'
        : SOURCES.hop.criteria,
      sourceUrl: SOURCES.hop.repoUrl,
      matchedReason: isHop ? 'Coordinated Multi-Wallet Cluster' : undefined,
    },
    {
      databaseId: 'umbra',
      databaseName: SOURCES.umbra.name,
      flagged: isUmbra,
      severity: isUmbra ? 'warning' : 'clean',
      details: isUmbra
        ? 'Associated with privacy mixer routing clusters used to obfuscate airdrop funding trees.'
        : SOURCES.umbra.criteria,
      sourceUrl: SOURCES.umbra.repoUrl,
      matchedReason: isUmbra ? 'Privacy Mixer Funding Tree' : undefined,
    },
    {
      databaseId: 'ofac',
      databaseName: SOURCES.ofac.name,
      flagged: isOfac,
      severity: isOfac ? 'critical' : 'clean',
      details: isOfac
        ? 'SANCTIONED: Listed on US Treasury OFAC Specially Designated Nationals (SDN) registry.'
        : SOURCES.ofac.criteria,
      sourceUrl: SOURCES.ofac.repoUrl,
      matchedReason: isOfac ? 'OFAC Sanctioned Entity / Exploit' : undefined,
    },
    {
      databaseId: 'trusta',
      databaseName: SOURCES.trusta.name,
      flagged: isTrustaFlagged,
      severity: isTrustaFlagged ? 'warning' : 'clean',
      details: mediaScore
        ? `${mediaScore.classification} (MEDIA Score: ${mediaScore.compositeScore}/100, Sybil Probability: ${mediaScore.sybilProbability}%). ${mediaScore.explanation}`
        : SOURCES.trusta.criteria,
      sourceUrl: SOURCES.trusta.repoUrl,
      matchedReason: isTrustaFlagged ? `High Automation Risk (${mediaScore?.sybilProbability}% probability)` : undefined,
    },
  ];

  const flaggedCount = matches.filter(m => m.flagged).length;
  const isFlagged = flaggedCount > 0;

  let overallStatus: 'clean' | 'flagged' | 'suspicious' = 'clean';
  if (isOfac || (flaggedCount >= 2 && !isTrustaFlagged)) {
    overallStatus = 'flagged';
  } else if (flaggedCount >= 1) {
    overallStatus = (isUmbra || isTrustaFlagged) ? 'suspicious' : 'flagged';
  }

  const lastSyncDate = cache.lastSyncedAt > 0
    ? new Date(cache.lastSyncedAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    isFlagged,
    totalFlagged: flaggedCount,
    overallStatus,
    matches,
    lastSyncDate,
    totalDatabasesChecked: matches.length,
    mediaScore,
  };
}
