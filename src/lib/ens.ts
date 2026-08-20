import { loadKnownWallets } from './knownWalletsServer';

// Preset fast map for common/demo ENS domains
export const KNOWN_ENS_MAP: Record<string, string> = {
  'vitalik.eth': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  'justinsun.eth': '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296',
  'hayden.eth': '0x50EC05AD9D29a73367175E26E962D714E96896C3',
  'stani.eth': '0x2e21f5d34208a3d5483f9829f2709e9005bf15f2',
  'machibigbrother.eth': '0x020cA66C30beC2c4Fe3861a94E4DB4A498A35872',
  'sassal.eth': '0x648aA14e4424e0825A5cE739C8C68610e143FB79',
  'danno.eth': '0x163473950fbcfcfc31ac7ad0eec26f5fe549046c',
  'barmstrong.eth': '0x5b3f30f7b44b82d4090b8f411b9a9b2b51203eb6',
  'ricburton.eth': '0x99e52ddb9e2c65febe07ddbe47432720d297a780',
  'nick.eth': '0xb8c2c29ee19d8307cb7255e1cd9cbde883a267d5',
};

/**
 * Resolves an ENS domain (e.g. 'vitalik.eth') or validates a 0x hex address.
 * Returns lowercase 0x... EVM address or null if unresolvable.
 */
export async function resolveEnsOrAddress(input: string): Promise<string | null> {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // 1. Direct valid EVM 0x address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Check if input looks like an ENS or domain name
  const isDomain = trimmed.includes('.') || trimmed.toLowerCase().endsWith('.eth');
  if (!isDomain) {
    return null;
  }

  const domain = trimmed.toLowerCase();

  // 2. Check local preset map
  if (KNOWN_ENS_MAP[domain]) {
    return KNOWN_ENS_MAP[domain].toLowerCase();
  }

  // 3. Check known_wallets.txt
  try {
    const known = loadKnownWallets();
    for (const [addr, label] of Object.entries(known)) {
      if (label.toLowerCase().includes(domain) || label.toLowerCase().includes(domain.replace('.eth', ''))) {
        return addr.toLowerCase();
      }
    }
  } catch {
    // Ignore server-side file load errors
  }

  // 4. Query Web3.bio Profile API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.web3.bio/profile/${domain}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Wallet-Analytics-ENS/1.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.address && /^0x[a-fA-F0-9]{40}$/i.test(item.address)) {
            return item.address.toLowerCase();
          }
        }
      }
    }
  } catch {
    // Ignore network error and fall through
  }

  // 5. Query public ENS resolver endpoint (ensideas)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`https://api.ensideas.com/ens/resolve/${domain}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.address && /^0x[a-fA-F0-9]{40}$/i.test(data.address)) {
        return data.address.toLowerCase();
      }
    }
  } catch {
    // Fallback
  }

  return null;
}
