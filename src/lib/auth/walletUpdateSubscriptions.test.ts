import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildScopedLink,
  createOpaqueToken,
  emailProviderConfigurationMessage,
  getEmailProviderConfig,
  hashOpaqueToken,
  sendConfirmationEmail,
  validateAndNormalizeEmail,
  WALLET_UPDATE_CAPTURE_SOURCE,
  WALLET_UPDATE_CONSENT_VERSION,
} from './walletUpdateSubscriptions';

test('wallet email normalization trims input and only lower-cases the domain', () => {
  assert.deepEqual(validateAndNormalizeEmail('  Alice@EXAMPLE.COM  '), { ok: true, email: 'Alice@example.com' });
  const malformed = validateAndNormalizeEmail('not-an-email');
  const blank = validateAndNormalizeEmail('  ');
  assert.equal(malformed.ok, false);
  assert.equal(blank.ok, false);
  if (!malformed.ok) assert.match(malformed.message, /Check the email address format/);
  if (!blank.ok) assert.match(blank.message, /Enter an email address/);
});

test('confirmation tokens are opaque and hashed before persistence', () => {
  const token = createOpaqueToken();
  const hash = hashOpaqueToken(token);
  assert.ok(token.length >= 40);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashOpaqueToken(token), hash);
  assert.match(buildScopedLink(new URL('https://wallet.example/'), '/api/updates/confirm', token), /token=/);
});

test('provider configuration is explicit and safe to test without sending mail', () => {
  const missing = getEmailProviderConfig({ NODE_ENV: 'production' });
  assert.equal(missing.configured, false);
  assert.match(emailProviderConfigurationMessage(missing), /RESEND_API_KEY/);
  assert.match(emailProviderConfigurationMessage(missing), /SUPABASE_SECRET_KEY/);

  const configured = getEmailProviderConfig({
    NODE_ENV: 'development',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'WalletGenome <updates@example.com>',
    SITE_URL: 'http://localhost:3000',
  });
  assert.equal(configured.configured, true);
});

test('production email configuration requires HTTPS confirmation links', () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'WalletGenome <updates@example.com>',
  };
  const insecure = getEmailProviderConfig({ ...env, SITE_URL: 'http://localhost:3000' });
  assert.equal(insecure.configured, false);
  if (!insecure.configured) {
    assert.deepEqual(insecure.missing, ['SITE_URL using the canonical HTTPS application URL']);
  }
  const secure = getEmailProviderConfig({ ...env, SITE_URL: 'https://wallet.example' });
  assert.equal(secure.configured, true);
});

test('confirmation email uses the server provider and includes scoped unsubscribe headers', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ id: 'test-email-id' }), { status: 200 });
  };

  const delivered = await sendConfirmationEmail(
    {
      provider: 'resend',
      apiKey: 're_test_key',
      from: 'WalletGenome <updates@example.com>',
      siteUrl: new URL('http://localhost:3000/'),
    },
    'Alice@example.com',
    'http://localhost:3000/api/updates/confirm?token=confirm-token',
    'http://localhost:3000/api/updates/unsubscribe?token=unsubscribe-token',
    fakeFetch,
  );

  assert.equal(delivered, true);
  assert.equal(requestUrl, 'https://api.resend.com/emails');
  assert.equal(requestInit?.method, 'POST');
  const body = JSON.parse(String(requestInit?.body)) as { to: string[]; headers: Record<string, string>; html: string };
  assert.deepEqual(body.to, ['Alice@example.com']);
  assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.match(body.headers['List-Unsubscribe'], /unsubscribe-token/);
  assert.doesNotMatch(body.html, /<script/);
});

test('the shared consent constants identify the wallet source and copy version', () => {
  assert.equal(WALLET_UPDATE_CAPTURE_SOURCE, 'wallet_post_first_scan');
  assert.equal(WALLET_UPDATE_CONSENT_VERSION, '2026-09-11-v1');
});
