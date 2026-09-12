import type { SupabaseClient, User } from '@supabase/supabase-js';

export const WALLET_AUTH_STATEMENT = 'Sign in to WalletGenome.';
export const WEB3_ETHEREUM_IDENTITY_PREFIX = 'web3:ethereum:';

export type EthereumRequestArguments = {
  method: string;
  params?: unknown;
};

type EthereumEventMap = {
  accountsChanged(accounts: `0x${string}`[]): void;
  chainChanged(chainId: string): void;
  connect(connectInfo: { chainId: string }): void;
  disconnect(error: { code: number; message: string }): void;
  message(message: { type: string; data: unknown }): void;
};

export type EthereumProvider = {
  request: (args: EthereumRequestArguments) => Promise<unknown>;
  on?: <event extends keyof EthereumEventMap>(event: event, listener: EthereumEventMap[event]) => void;
  removeListener?: <event extends keyof EthereumEventMap>(event: event, listener: EthereumEventMap[event]) => void;
};

export type EthereumWalletInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type DiscoveredEthereumWallet = {
  info: EthereumWalletInfo;
  provider: EthereumProvider;
};

export type EthereumWalletDiscoveryResult = {
  wallets: DiscoveredEthereumWallet[];
  usedLegacyFallback: boolean;
};

export type EthereumAuthPhase = 'connection_pending' | 'signature_pending' | 'verifying' | 'success';

export type EthereumAuthFailureCode =
  | 'wallet_unavailable'
  | 'connection_rejected'
  | 'signature_rejected'
  | 'wallet_error'
  | 'verification_failed';

export type EthereumAuthFailure = {
  code: EthereumAuthFailureCode;
  message: string;
};

export type EthereumSignInResult =
  | { ok: true; user: User; address: string }
  | { ok: false; error: EthereumAuthFailure };

type ProviderDetail = {
  info: EthereumWalletInfo;
  provider: EthereumProvider;
};

type BrowserWithEthereum = Window & {
  ethereum?: unknown;
};

const discoveredWallets = new Map<string, DiscoveredEthereumWallet>();
let discoveryListenerAttached = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEthereumProvider(value: unknown): value is EthereumProvider {
  return isRecord(value) && typeof value.request === 'function';
}

function isWalletInfo(value: unknown): value is EthereumWalletInfo {
  if (!isRecord(value)) return false;
  return typeof value.uuid === 'string'
    && typeof value.name === 'string'
    && typeof value.icon === 'string'
    && typeof value.rdns === 'string';
}

function isProviderDetail(value: unknown): value is ProviderDetail {
  if (!isRecord(value)) return false;
  return isWalletInfo(value.info) && isEthereumProvider(value.provider);
}

function attachDiscoveryListener(): void {
  if (discoveryListenerAttached || typeof window === 'undefined') return;
  window.addEventListener('eip6963:announceProvider', event => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!isProviderDetail(detail)) return;
    discoveredWallets.set(detail.info.uuid, {
      info: { ...detail.info },
      provider: detail.provider,
    });
  });
  discoveryListenerAttached = true;
}

function legacyWallet(): DiscoveredEthereumWallet | null {
  if (typeof window === 'undefined') return null;
  const provider = (window as BrowserWithEthereum).ethereum;
  if (!isEthereumProvider(provider)) return null;
  return {
    info: {
      uuid: 'legacy-window-ethereum',
      name: 'Injected Ethereum wallet',
      icon: '',
      rdns: 'legacy.window.ethereum',
    },
    provider,
  };
}

export async function discoverEthereumWallets(waitMs = 250): Promise<EthereumWalletDiscoveryResult> {
  if (typeof window === 'undefined') return { wallets: [], usedLegacyFallback: false };

  attachDiscoveryListener();
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise<void>(resolve => window.setTimeout(resolve, waitMs));

  const wallets = [...discoveredWallets.values()];
  if (wallets.length > 0) return { wallets, usedLegacyFallback: false };

  const fallback = legacyWallet();
  return fallback ? { wallets: [fallback], usedLegacyFallback: true } : { wallets: [], usedLegacyFallback: false };
}

function errorCode(error: unknown): number | null {
  if (!isRecord(error)) return null;
  return typeof error.code === 'number' ? error.code : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return '';
}

function errorCodeName(error: unknown): string {
  if (!isRecord(error) || typeof error.code !== 'string') return '';
  return error.code;
}

export function formatEthereumSignInError(error: unknown, url: string): string {
  const message = errorMessage(error).trim();
  const details = `${errorCodeName(error)} ${message}`.toLowerCase();

  if (details.includes('provider_disabled') || (details.includes('web3') && details.includes('disabled'))) {
    return 'Supabase Web3 Wallet sign-in is disabled. Enable Web3 Wallet under Authentication → Sign In / Providers, then try again.';
  }

  if (details.includes('redirect') || details.includes('uri') || details.includes('domain') || details.includes('url')) {
    return `Supabase rejected this wallet sign-in because this URL is not allowed: ${url} Add this exact URL, including the trailing slash, under Authentication → URL Configuration → Redirect URLs.`;
  }

  if (message) return `Supabase rejected this wallet sign-in: ${message}`;
  return 'Supabase could not verify this wallet sign-in. Check that Web3 Wallet is enabled and this application URL is allowed.';
}

function isRejectedRequest(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return errorCode(error) === 4001 || message.includes('reject') || message.includes('denied');
}

function validEthereumAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function extractWeb3EthereumAddress(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string' || !value.startsWith(WEB3_ETHEREUM_IDENTITY_PREFIX)) return null;
  const address = value.slice(WEB3_ETHEREUM_IDENTITY_PREFIX.length);
  return validEthereumAddress(address) ? address : null;
}

function createSupabaseWallet(
  provider: EthereumProvider,
  address: `0x${string}`,
  connectedAccounts: string[],
  onPhase: (phase: EthereumAuthPhase) => void,
) {
  return {
    address,
    request: async (args: EthereumRequestArguments): Promise<unknown> => {
      if (args.method === 'eth_requestAccounts') return connectedAccounts;
      if (args.method === 'personal_sign') onPhase('signature_pending');
      const result = await provider.request(args);
      if (args.method === 'personal_sign') onPhase('verifying');
      return result;
    },
    on: <event extends keyof EthereumEventMap>(event: event, listener: EthereumEventMap[event]): void => {
      provider.on?.(event, listener);
    },
    removeListener: <event extends keyof EthereumEventMap>(event: event, listener: EthereumEventMap[event]): void => {
      provider.removeListener?.(event, listener);
    },
  };
}

export async function signInWithEthereumWallet(
  supabase: Pick<SupabaseClient, 'auth'>,
  wallet: DiscoveredEthereumWallet,
  url: string,
  onPhase: (phase: EthereumAuthPhase) => void,
): Promise<EthereumSignInResult> {
  onPhase('connection_pending');

  let accounts: string[];
  try {
    const response = await wallet.provider.request({ method: 'eth_requestAccounts' });
    if (!Array.isArray(response) || !response.every(account => typeof account === 'string')) {
      return {
        ok: false,
        error: { code: 'wallet_error', message: 'The wallet did not return a usable Ethereum account.' },
      };
    }
    accounts = response;
  } catch (error: unknown) {
    return {
      ok: false,
      error: isRejectedRequest(error)
        ? { code: 'connection_rejected', message: 'Connection rejected. No signature was requested.' }
        : { code: 'wallet_error', message: 'The wallet connection request failed. Please try again.' },
    };
  }

  const address = accounts[0];
  if (!validEthereumAddress(address)) {
    return {
      ok: false,
      error: { code: 'wallet_error', message: 'The wallet did not return a valid Ethereum address.' },
    };
  }

  let response: Awaited<ReturnType<SupabaseClient['auth']['signInWithWeb3']>>;
  try {
    const supabaseWallet = createSupabaseWallet(wallet.provider, address, accounts, onPhase);
    response = await supabase.auth.signInWithWeb3({
      chain: 'ethereum',
      wallet: supabaseWallet,
      statement: WALLET_AUTH_STATEMENT,
      options: { url },
    });
  } catch (error: unknown) {
    return {
      ok: false,
      error: isRejectedRequest(error)
        ? { code: 'signature_rejected', message: 'Signature rejected. No transaction or chain change was requested.' }
        : { code: 'wallet_error', message: 'The wallet could not complete the sign-in message. Please try again.' },
    };
  }

  if (response.error || !response.data.user || !response.data.session) {
    return {
      ok: false,
      error: {
        code: 'verification_failed',
        message: formatEthereumSignInError(response.error, url),
      },
    };
  }

  onPhase('success');
  return { ok: true, user: response.data.user, address };
}

export function shortWalletAddress(address: string): string {
  return validEthereumAddress(address) ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Wallet account';
}

export function getWalletIdentity(user: User | null): string | null {
  const identities = user?.identities ?? [];
  for (const identity of identities) {
    if (identity.provider !== 'web3') continue;

    const identityRecord = isRecord(identity) ? identity : null;
    const providerId = identityRecord?.provider_id;
    if (providerId !== undefined && providerId !== null) {
      const address = extractWeb3EthereumAddress(providerId);
      if (address) return address;
      continue;
    }

    const identityData: unknown = identity.identity_data;
    const identityDataRecord = isRecord(identityData) ? identityData : null;
    const address = extractWeb3EthereumAddress(identityDataRecord?.sub);
    if (address) return address;
  }
  return null;
}
