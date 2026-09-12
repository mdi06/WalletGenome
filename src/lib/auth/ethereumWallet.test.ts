import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { formatEthereumSignInError } from './ethereumWallet';

const walletAuthSource = readFileSync(new URL('./ethereumWallet.ts', import.meta.url), 'utf8');

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
