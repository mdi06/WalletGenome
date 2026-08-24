import { KNOWN_WALLETS } from '@/config/knownWallets';

/**
 * Returns a defensive copy of the version-controlled, read-only wallet labels.
 */
export function loadKnownWallets(): Record<string, string> {
  return { ...KNOWN_WALLETS };
}
