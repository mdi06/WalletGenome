import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { NextRequest } from 'next/server';
import { GET as confirmUpdates } from '../confirm/route';
import { POST as requestConfirmation } from '../request-confirmation/route';
import { POST as resendConfirmation } from '../resend-confirmation/route';
import { GET as unsubscribeUpdates, POST as unsubscribeUpdatesOneClick } from '../unsubscribe/route';
import { hashOpaqueToken } from '@/lib/auth/walletUpdateSubscriptions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { authentication } from '@/lib/supabase/requireUser';

const authenticatedUser = { id: '00000000-0000-4000-8000-000000000001', email: null };

type FakeRow = Record<string, unknown>;
type FakeIdentity = {
  provider: string;
  provider_id?: string;
  identity_data?: Record<string, unknown>;
};
type FakeFilter = { column: string; expected: unknown; isNullCheck: boolean };
type FakeQueryResult = { data: unknown; error: null };
type QueryExecutor = (filters: FakeFilter[], includeData: boolean) => Promise<FakeQueryResult>;

const web3EthereumIdentity: FakeIdentity = {
  provider: 'web3',
  provider_id: 'web3:ethereum:0x1111111111111111111111111111111111111111',
};

function matches(row: FakeRow | null, filters: FakeFilter[]): boolean {
  return Boolean(row && filters.every(filter => filter.isNullCheck
    ? (filter.expected === null ? row[filter.column] === null || row[filter.column] === undefined : row[filter.column] !== null && row[filter.column] !== undefined)
    : row[filter.column] === filter.expected));
}

function buildFakeQuery(executor: QueryExecutor) {
  const filters: FakeFilter[] = [];
  let includeData = false;
  const query = {
    eq(column: string, expected: unknown) {
      filters.push({ column, expected, isNullCheck: false });
      return query;
    },
    is(column: string, expected: unknown) {
      filters.push({ column, expected, isNullCheck: true });
      return query;
    },
    select() {
      includeData = true;
      return query;
    },
    maybeSingle() {
      return executor(filters, true);
    },
    then<TResult1 = FakeQueryResult, TResult2 = never>(
      onfulfilled?: ((value: FakeQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return executor(filters, includeData).then(onfulfilled, onrejected);
    },
  };
  return query;
}

function createFakeAdmin(initialRow: FakeRow | null, identities: FakeIdentity[] = [web3EthereumIdentity]) {
  let row = initialRow;
  const admin = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { identities } },
          error: null,
        }),
      },
    },
    from: (table: string) => {
      assert.equal(table, 'update_subscriptions');
      return {
        select: () => buildFakeQuery(async filters => ({
          data: matches(row, filters) ? { ...row } : null,
          error: null,
        })),
        update: (payload: FakeRow) => buildFakeQuery(async (filters, includeData) => {
          if (!matches(row, filters)) return { data: null, error: null };
          row = { ...row, ...payload };
          return { data: includeData ? { user_id: row.user_id } : null, error: null };
        }),
        upsert: async (payload: FakeRow) => {
          row = { ...(row ?? {}), ...payload };
          return { data: null, error: null };
        },
      };
    },
  };
  return {
    admin: admin as unknown as ReturnType<typeof supabaseAdmin.createClient>,
    getRow: () => row,
  };
}

function configureEmailProviderForTest(): () => void {
  const keys = ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL', 'SUPABASE_SECRET_KEY'] as const;
  const previous = new Map<string, string | undefined>(keys.map(key => [key, process.env[key]]));
  process.env.EMAIL_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'WalletGenome <updates@example.com>';
  process.env.SITE_URL = 'http://localhost:3000';
  process.env.SUPABASE_SECRET_KEY = 'test-server-secret';
  return () => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function location(response: Response): string {
  return response.headers.get('location') ?? '';
}

test('wallet confirmation endpoints do not work for signed-out visitors', async () => {
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => null);
  try {
    const response = await requestConfirmation(new NextRequest('http://localhost/api/updates/request-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com' }),
    }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'authentication_required');
  } finally {
    authMock.mock.restore();
  }
});

test('wallet confirmation keeps malformed email validation in the field and sends nothing', async () => {
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  try {
    const response = await requestConfirmation(new NextRequest('http://localhost/api/updates/request-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    }));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, 'invalid_email');
    assert.equal(body.field, 'email');
  } finally {
    authMock.mock.restore();
  }
});

test('missing email provider configuration is an explicit pending-free state', async () => {
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  const previous = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const response = await requestConfirmation(new NextRequest('http://localhost/api/updates/request-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com' }),
    }));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.code, 'email_delivery_not_configured');
    assert.equal(body.state, 'configuration_required');
    assert.match(body.message, /not subscribed/);
  } finally {
    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
    authMock.mock.restore();
  }
});

test('missing server Supabase secret names the required server-only setting', async () => {
  const restoreEnv = configureEmailProviderForTest();
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => false);
  try {
    const response = await requestConfirmation(new NextRequest('http://localhost:3000/api/updates/request-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com' }),
    }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /SUPABASE_SECRET_KEY/);
  } finally {
    configMock.mock.restore();
    authMock.mock.restore();
    restoreEnv();
  }
});

test('resend is also safe when the email provider is not configured', async () => {
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  const previous = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const response = await resendConfirmation();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'email_delivery_not_configured');
  } finally {
    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
    authMock.mock.restore();
  }
});

test('request-confirmation authorizes a Web3 Ethereum identity via provider_id and stores a pending row', async () => {
  const restoreEnv = configureEmailProviderForTest();
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  const fake = createFakeAdmin(null);
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ id: 'test-email' }), { status: 200 }));
  try {
    const response = await requestConfirmation(new NextRequest('http://localhost:3000/api/updates/request-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email: '  Alice@EXAMPLE.COM ' }),
    }));
    assert.equal(response.status, 202);
    assert.equal(fetchMock.mock.callCount(), 1);
    const row = fake.getRow();
    assert.equal(row?.email, 'Alice@example.com');
    assert.equal(row?.subscribed, false);
    assert.equal(row?.subscription_status, 'pending_confirmation');
    assert.match(String(row?.confirmation_token_hash), /^[a-f0-9]{64}$/);
    assert.match(String(row?.unsubscribe_token_hash), /^[a-f0-9]{64}$/);
  } finally {
    fetchMock.mock.restore();
    clientMock.mock.restore();
    configMock.mock.restore();
    authMock.mock.restore();
    restoreEnv();
  }
});

test('request-confirmation rejects a Web3 Solana identity', async () => {
  const restoreEnv = configureEmailProviderForTest();
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  const fake = createFakeAdmin(null, [{ provider: 'web3', provider_id: 'web3:solana:SolanaPublicKey' }]);
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  try {
    const response = await requestConfirmation(new NextRequest('http://localhost:3000/api/updates/request-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com' }),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'wallet_auth_required');
  } finally {
    clientMock.mock.restore();
    configMock.mock.restore();
    authMock.mock.restore();
    restoreEnv();
  }
});

test('confirmation accepts a valid token once, then rejects its reuse', async () => {
  const token = 'valid-confirmation-token';
  const fake = createFakeAdmin({
    user_id: authenticatedUser.id,
    email: 'Alice@example.com',
    pending_email: null,
    subscribed: false,
    subscription_status: 'pending_confirmation',
    consented_at: '2026-09-11T00:00:00.000Z',
    confirmed_at: null,
    confirmation_token_hash: hashOpaqueToken(token),
    confirmation_expires_at: new Date(Date.now() + 60_000).toISOString(),
    confirmation_sent_at: new Date().toISOString(),
    unsubscribe_token_hash: hashOpaqueToken('unsubscribe-token'),
  });
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  try {
    const request = new NextRequest(`http://localhost:3000/api/updates/confirm?token=${token}`);
    const response = await confirmUpdates(request);
    assert.equal(response.status, 307);
    assert.match(location(response), /status=confirmed/);
    assert.equal(fake.getRow()?.subscribed, true);
    assert.equal(fake.getRow()?.subscription_status, 'confirmed');
    assert.equal(fake.getRow()?.confirmation_token_hash, null);

    const reused = await confirmUpdates(request);
    assert.equal(reused.status, 307);
    assert.match(location(reused), /status=invalid/);
  } finally {
    clientMock.mock.restore();
    configMock.mock.restore();
  }
});

test('confirmation rejects an expired token and clears only its confirmation fields', async () => {
  const token = 'expired-confirmation-token';
  const unsubscribeHash = hashOpaqueToken('still-scoped-unsubscribe-token');
  const fake = createFakeAdmin({
    user_id: authenticatedUser.id,
    email: 'Alice@example.com',
    pending_email: null,
    subscribed: false,
    subscription_status: 'pending_confirmation',
    consented_at: '2026-09-11T00:00:00.000Z',
    confirmed_at: null,
    confirmation_token_hash: hashOpaqueToken(token),
    confirmation_expires_at: '2026-09-10T00:00:00.000Z',
    confirmation_sent_at: new Date().toISOString(),
    unsubscribe_token_hash: unsubscribeHash,
  });
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  try {
    const response = await confirmUpdates(new NextRequest(`http://localhost:3000/api/updates/confirm?token=${token}`));
    assert.equal(response.status, 307);
    assert.match(location(response), /status=expired/);
    assert.equal(fake.getRow()?.subscribed, false);
    assert.equal(fake.getRow()?.confirmation_token_hash, null);
    assert.equal(fake.getRow()?.unsubscribe_token_hash, unsubscribeHash);
  } finally {
    clientMock.mock.restore();
    configMock.mock.restore();
  }
});

test('invalid confirmation tokens never change a subscription row', async () => {
  const fake = createFakeAdmin({
    user_id: authenticatedUser.id,
    email: 'Alice@example.com',
    subscribed: false,
    subscription_status: 'pending_confirmation',
    confirmation_token_hash: hashOpaqueToken('different-token'),
    confirmation_expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  try {
    const response = await confirmUpdates(new NextRequest('http://localhost:3000/api/updates/confirm?token=invalid-token'));
    assert.equal(response.status, 307);
    assert.match(location(response), /status=invalid/);
    assert.equal(fake.getRow()?.subscribed, false);
    assert.equal(fake.getRow()?.subscription_status, 'pending_confirmation');
  } finally {
    clientMock.mock.restore();
    configMock.mock.restore();
  }
});

test('unsubscribe is scoped, leaves suppression evidence, and is single-use', async () => {
  const token = 'unsubscribe-token';
  const fake = createFakeAdmin({
    user_id: authenticatedUser.id,
    email: 'Alice@example.com',
    subscribed: true,
    subscription_status: 'confirmed',
    consented_at: '2026-09-11T00:00:00.000Z',
    confirmed_at: '2026-09-11T00:01:00.000Z',
    confirmation_token_hash: null,
    unsubscribe_token_hash: hashOpaqueToken(token),
  });
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  try {
    const response = await unsubscribeUpdates(new NextRequest(`http://localhost:3000/api/updates/unsubscribe?token=${token}`));
    assert.equal(response.status, 307);
    assert.match(location(response), /status=unsubscribed/);
    assert.equal(fake.getRow()?.subscribed, false);
    assert.equal(fake.getRow()?.subscription_status, 'unsubscribed');
    assert.equal(fake.getRow()?.consented_at, '2026-09-11T00:00:00.000Z');
    assert.equal(fake.getRow()?.unsubscribe_token_hash, null);

    const reused = await unsubscribeUpdates(new NextRequest(`http://localhost:3000/api/updates/unsubscribe?token=${token}`));
    assert.match(location(reused), /status=invalid/);
    const oneClick = await unsubscribeUpdatesOneClick(new NextRequest('http://localhost:3000/api/updates/unsubscribe?token=not-present', { method: 'POST' }));
    assert.equal(oneClick.status, 204);
    assert.equal(await oneClick.text(), '');
  } finally {
    clientMock.mock.restore();
    configMock.mock.restore();
  }
});

test('resend confirmation is rate limited from the stored send timestamp', async () => {
  const fake = createFakeAdmin({
    user_id: authenticatedUser.id,
    email: 'Alice@example.com',
    subscribed: false,
    subscription_status: 'pending_confirmation',
    confirmation_sent_at: new Date().toISOString(),
  });
  const restoreEnv = configureEmailProviderForTest();
  const authMock = mock.method(authentication, 'getAuthenticatedUser', async () => authenticatedUser);
  const configMock = mock.method(supabaseAdmin, 'hasConfiguration', () => true);
  const clientMock = mock.method(supabaseAdmin, 'createClient', () => fake.admin);
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ id: 'must-not-send' }), { status: 200 }));
  try {
    const response = await resendConfirmation();
    assert.equal(response.status, 429);
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal((await response.json()).code, 'confirmation_resend_rate_limited');
  } finally {
    fetchMock.mock.restore();
    clientMock.mock.restore();
    configMock.mock.restore();
    authMock.mock.restore();
    restoreEnv();
  }
});
