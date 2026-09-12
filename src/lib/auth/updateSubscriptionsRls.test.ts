import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../../supabase/migrations/20260911000000_add_update_subscription_consent_audit.sql', import.meta.url), 'utf8');
const originalMigration = readFileSync(new URL('../../../supabase/migrations/20260909034057_create_update_subscriptions.sql', import.meta.url), 'utf8');

test('subscription RLS keeps reads and ordinary writes owner-scoped', () => {
  assert.match(migration, /revoke all on public\.update_subscriptions from anon/);
  assert.match(originalMigration, /for select to authenticated[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(originalMigration, /for update to authenticated[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*with check \([\s\S]*\(select auth\.uid\(\)\) = user_id/);
  assert.match(originalMigration, /email = \(select auth\.jwt\(\) ->> 'email'\)/);
});

test('wallet browser RLS permits prompt state only, never consent or pending email capture', () => {
  assert.match(migration, /Wallet users can create prompt state/);
  assert.match(migration, /email is null/);
  assert.match(migration, /subscribed = false/);
  assert.match(migration, /subscription_status in \('prompted', 'dismissed'\)/);
  assert.match(migration, /consented_at is null/);
  assert.match(migration, /confirmation_token_hash is null/);
  assert.match(migration, /Wallet users can update prompt state/);
  assert.match(migration, /using \([\s\S]*\(select auth\.uid\(\)\) = user_id[\s\S]*email is null/);
});
