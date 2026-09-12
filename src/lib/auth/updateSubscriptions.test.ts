import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { User, UserIdentity } from '@supabase/supabase-js';
import { getWalletIdentity } from './ethereumWallet';
import {
  getVerifiedGoogleEmail,
  isSuccessfulLiveScan,
  maskEmail,
  shouldOfferGoogleUpdatesPrompt,
  shouldOfferWalletUpdatesPrompt,
  GOOGLE_UPDATE_CAPTURE_SOURCE,
  GOOGLE_UPDATE_CONSENT_VERSION,
} from './updateSubscriptions';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
const WALLET_PROVIDER_ID = `web3:ethereum:${WALLET_ADDRESS}`;
const IDENTITY_TIMESTAMP = '2026-09-11T00:00:00.000Z';

type SupabaseIdentityFixture = UserIdentity & { provider_id?: string };

function identity(
  provider: string,
  identityData: Record<string, unknown> = {},
  providerId?: string,
): SupabaseIdentityFixture {
  const result: SupabaseIdentityFixture = {
    identity_id: `${provider}-identity`,
    id: `${provider}-identity`,
    user_id: USER_ID,
    identity_data: identityData,
    provider,
    created_at: IDENTITY_TIMESTAMP,
    last_sign_in_at: IDENTITY_TIMESTAMP,
    updated_at: IDENTITY_TIMESTAMP,
  };
  if (providerId !== undefined) result.provider_id = providerId;
  return result;
}

function userWithIdentities(identities: SupabaseIdentityFixture[], email?: string): User {
  return {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: email ? IDENTITY_TIMESTAMP : undefined,
    phone: '',
    confirmed_at: email ? IDENTITY_TIMESTAMP : undefined,
    last_sign_in_at: IDENTITY_TIMESTAMP,
    app_metadata: { provider: identities[0]?.provider ?? 'web3' },
    user_metadata: { provider: 'ethereum', address: WALLET_ADDRESS },
    identities,
    created_at: IDENTITY_TIMESTAMP,
    updated_at: IDENTITY_TIMESTAMP,
    is_anonymous: false,
  };
}

function ethereumWalletUser(providerId = WALLET_PROVIDER_ID, identityData: Record<string, unknown> = { sub: providerId }): User {
  return userWithIdentities([identity('web3', identityData, providerId)]);
}

test('recognises a real Supabase Web3 Ethereum identity from provider_id', () => {
  const wallet = ethereumWalletUser();

  assert.equal(getWalletIdentity(wallet), WALLET_ADDRESS);
  assert.equal(getWalletIdentity(null), null);
  assert.equal(shouldOfferWalletUpdatesPrompt(wallet, wallet.id, false, false), true);
});

test('uses a validated identity_data.sub fallback only when provider_id is missing', () => {
  const fallbackAddress = '0x2222222222222222222222222222222222222222';
  const fallback = userWithIdentities([identity('web3', { sub: `web3:ethereum:${fallbackAddress}` })]);
  const preferredAddress = '0x3333333333333333333333333333333333333333';
  const preferred = ethereumWalletUser(`web3:ethereum:${preferredAddress}`, { sub: WALLET_PROVIDER_ID });

  assert.equal(getWalletIdentity(fallback), fallbackAddress);
  assert.equal(getWalletIdentity(preferred), preferredAddress);
});

test('rejects malformed Web3 identities, Solana identities, unsupported providers, and missing identities', () => {
  const malformedProviderId = ethereumWalletUser('web3:ethereum:0x123', { sub: WALLET_PROVIDER_ID });
  const malformedFallback = userWithIdentities([identity('web3', { sub: 'web3:ethereum:0x123' })]);
  const solana = userWithIdentities([identity('web3', { sub: 'web3:solana:SolanaPublicKey' }, 'web3:solana:SolanaPublicKey')]);
  const oldFixtureShape = userWithIdentities([identity('ethereum', { address: WALLET_ADDRESS })]);
  const missing = userWithIdentities([]);

  assert.equal(getWalletIdentity(malformedProviderId), null);
  assert.equal(getWalletIdentity(malformedFallback), null);
  assert.equal(getWalletIdentity(solana), null);
  assert.equal(getWalletIdentity(oldFixtureShape), null);
  assert.equal(getWalletIdentity(missing), null);
});

test('only a verified Google identity can enter the Google update flow', () => {
  const verified = userWithIdentities([identity('google', { email: 'max@example.com', email_verified: true }, 'google-user')], 'max@example.com');
  const unverified = userWithIdentities([identity('google', { email: 'max@example.com', email_verified: false }, 'google-user')], 'max@example.com');
  const wallet = ethereumWalletUser();
  const mismatched = userWithIdentities([identity('google', { email: 'other@example.com', email_verified: true }, 'google-user')], 'max@example.com');

  assert.equal(getVerifiedGoogleEmail(verified), 'max@example.com');
  assert.equal(getVerifiedGoogleEmail(unverified), null);
  assert.equal(getVerifiedGoogleEmail(wallet), null);
  assert.equal(getVerifiedGoogleEmail(mismatched), null);
});

test('masks the local part while keeping the email domain understandable', () => {
  assert.equal(maskEmail('max@example.com'), 'm••••@example.com');
  assert.equal(maskEmail('m@gmail.com'), 'm••••@gmail.com');
});

test('only complete or partial live results count as a successful scan', () => {
  assert.equal(isSuccessfulLiveScan('complete'), true);
  assert.equal(isSuccessfulLiveScan('partial'), true);
  assert.equal(isSuccessfulLiveScan('unavailable'), false);
});

test('the prompt eligibility gate waits for a completed live scan and verified Google identity', () => {
  const verified = userWithIdentities([identity('google', { email: 'max@example.com', email_verified: true }, 'google-user')], 'max@example.com');
  assert.equal(shouldOfferGoogleUpdatesPrompt(verified, verified.id, false, false), true);
  assert.equal(shouldOfferGoogleUpdatesPrompt(verified, verified.id, false, true), false);
  assert.equal(shouldOfferGoogleUpdatesPrompt(verified, null, false, false), false);
  assert.equal(shouldOfferGoogleUpdatesPrompt(null, verified.id, false, false), false);
  assert.equal(shouldOfferGoogleUpdatesPrompt(userWithIdentities([]), verified.id, false, false), false);
});

test('wallet prompt eligibility follows a successful fresh live scan and excludes saved demos and Google users', () => {
  const wallet = ethereumWalletUser();
  const googleAndWallet = userWithIdentities([
    identity('google', { email: 'max@example.com', email_verified: true }, 'google-user'),
    identity('web3', { sub: WALLET_PROVIDER_ID }, WALLET_PROVIDER_ID),
  ], 'max@example.com');

  assert.equal(shouldOfferWalletUpdatesPrompt(wallet, wallet.id, false, false), true);
  assert.equal(shouldOfferWalletUpdatesPrompt(googleAndWallet, googleAndWallet.id, false, false), false);
  assert.equal(shouldOfferWalletUpdatesPrompt(wallet, null, false, false), false);
  assert.equal(shouldOfferWalletUpdatesPrompt(wallet, wallet.id, false, true), false);
});

test('consent constants identify the explicit wording version and Google post-scan source', () => {
  assert.equal(GOOGLE_UPDATE_CONSENT_VERSION, '2026-09-11-v1');
  assert.equal(GOOGLE_UPDATE_CAPTURE_SOURCE, 'google_post_first_scan');
});

test('the consent-audit migration preserves owner-scoped RLS and prior consent evidence', () => {
  const migration = readFileSync(new URL('../../../supabase/migrations/20260911000000_add_update_subscription_consent_audit.sql', import.meta.url), 'utf8');
  const originalMigration = readFileSync(new URL('../../../supabase/migrations/20260909034057_create_update_subscriptions.sql', import.meta.url), 'utf8');

  assert.match(migration, /add column if not exists consent_version/);
  assert.match(migration, /add column if not exists prompt_shown_at/);
  assert.match(migration, /add column if not exists prompt_dismissed_at/);
  assert.match(migration, /add column if not exists withdrawn_at/);
  assert.match(migration, /\(subscribed and consented_at is not null\) or \(not subscribed\)/);
  assert.match(migration, /subscription_status in \('prompted', 'dismissed', 'pending_confirmation', 'confirmed', 'unsubscribed'\)/);
  assert.match(originalMigration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(originalMigration, /with check \([\s\S]*\(select auth\.uid\(\)\) = user_id/);
  assert.match(originalMigration, /email = \(select auth\.jwt\(\) ->> 'email'\)/);
});
