import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  discoverEthereumWallets,
  formatEthereumSignInError,
  signInWithEthereumWallet,
  type DiscoveredEthereumWallet,
  type EthereumProvider,
  type EthereumRequestArguments,
} from './ethereumWallet';

const walletAuthSource = readFileSync(new URL('./ethereumWallet.ts', import.meta.url), 'utf8');

type MockWeb3Options = {
  wallet?: {
    request: (args: EthereumRequestArguments) => Promise<unknown>;
  };
};

type MockWeb3Response = {
  data: { user: User | null; session: object | null };
  error: { message: string } | null;
};

function mockSupabase(onSignInWithWeb3: (options: MockWeb3Options) => Promise<MockWeb3Response>): Pick<SupabaseClient, 'auth'> {
  return {
    auth: { signInWithWeb3: onSignInWithWeb3 },
  } as unknown as Pick<SupabaseClient, 'auth'>;
}

function mockWallet(provider: EthereumProvider): DiscoveredEthereumWallet {
  return {
    info: {
      uuid: 'test-wallet',
      name: 'Test wallet',
      icon: '',
      rdns: 'test.wallet',
    },
    provider,
  };
}

test('explains when Supabase Web3 Wallet authentication is disabled', () => {
  const message = formatEthereumSignInError({ code: 'provider_disabled', message: 'Web3 provider is disabled' }, 'http://localhost:3000/');
  assert.match(message, /Web3 Wallet sign-in is disabled/);
  assert.match(message, /Sign In \/ Providers/);
});

test('explains that the wallet signing URL must be allowlisted', () => {
  const message = formatEthereumSignInError({ code: 'validation_failed', message: 'redirect URI is not allowed' }, 'http://localhost:3000/');
  assert.match(message, /http:\/\/localhost:3000\//);
  assert.match(message, /URL Configuration/);
  assert.match(message, /trailing slash/);
});

test('preserves a useful Supabase rejection reason when it is not a configuration error', () => {
  const message = formatEthereumSignInError(new Error('Signature is invalid'), 'http://localhost:3000/');
  assert.equal(message, 'Supabase rejected this wallet sign-in: Signature is invalid');
});

test('wallet authentication stays an identity-only flow with no email or subscription mutation', () => {
  assert.match(walletAuthSource, /statement: WALLET_AUTH_STATEMENT/);
  assert.match(walletAuthSource, /export const WALLET_AUTH_STATEMENT = 'Sign in to WalletGenome\.'/);
  assert.doesNotMatch(walletAuthSource, /updateUser\(|linkIdentity\(|update_subscriptions|email:/);
});

test('wallet discovery enumerates an injected wallet without requesting accounts', async () => {
  let providerRequests = 0;
  const provider: EthereumProvider = {
    request: async () => {
      providerRequests += 1;
      return [];
    },
  };
  const previousWindow = (globalThis as typeof globalThis & { window?: Window }).window;
  const fakeWindow = {
    addEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout,
    ethereum: provider,
  } as unknown as Window;

  Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
  try {
    const result = await discoverEthereumWallets(0);
    assert.equal(result.wallets.length, 1);
    assert.equal(result.usedLegacyFallback, true);
    assert.equal(providerRequests, 0);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('wallet selection starts account access and message signing only after a wallet is chosen', async () => {
  const address = '0x1234567890123456789012345678901234567890' as const;
  const providerMethods: string[] = [];
  const phases: string[] = [];
  const provider: EthereumProvider = {
    request: async args => {
      providerMethods.push(args.method);
      if (args.method === 'eth_requestAccounts') return [address];
      if (args.method === 'personal_sign') return '0xsignature';
      return '0x1';
    },
  };
  const user = { id: '00000000-0000-4000-8000-000000000001' } as User;
  const supabase = mockSupabase(async options => {
    await options.wallet?.request({ method: 'eth_requestAccounts' });
    await options.wallet?.request({ method: 'personal_sign', params: ['message', address] });
    return { data: { user, session: {} }, error: null };
  });

  const result = await signInWithEthereumWallet(supabase, mockWallet(provider), 'http://localhost:3000/docs', phase => phases.push(phase));

  assert.equal(result.ok, true);
  assert.deepEqual(providerMethods, ['eth_requestAccounts', 'personal_sign']);
  assert.deepEqual(phases, ['connection_pending', 'signature_pending', 'verifying', 'success']);
});

test('wallet connection cancellation and signing errors remain recoverable provider states', async () => {
  const phases: string[] = [];
  const rejectedProvider: EthereumProvider = {
    request: async () => {
      throw { code: 4001 };
    },
  };
  const connectionResult = await signInWithEthereumWallet(
    mockSupabase(async () => ({ data: { user: null, session: null }, error: null })),
    mockWallet(rejectedProvider),
    'http://localhost:3000/',
    phase => phases.push(phase),
  );
  assert.equal(connectionResult.ok, false);
  if (!connectionResult.ok) assert.equal(connectionResult.error.code, 'connection_rejected');

  const signatureProvider: EthereumProvider = {
    request: async args => {
      if (args.method === 'eth_requestAccounts') return ['0x1234567890123456789012345678901234567890'];
      throw { code: 4001 };
    },
  };
  const signatureResult = await signInWithEthereumWallet(
    mockSupabase(async options => {
      await options.wallet?.request({ method: 'personal_sign', params: [] });
      return { data: { user: null, session: null }, error: null };
    }),
    mockWallet(signatureProvider),
    'http://localhost:3000/',
    phase => phases.push(phase),
  );
  assert.equal(signatureResult.ok, false);
  if (!signatureResult.ok) assert.equal(signatureResult.error.code, 'signature_rejected');
  assert.ok(phases.includes('connection_pending'));
  assert.ok(!phases.includes('success'));
});
