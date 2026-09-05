# Vercel Preview, Promotion, and Rollback Runbook

This runbook is the release procedure for Wallet Analytics. A local build or a
green CI run is not production proof: every release must pass through Vercel
Preview and the checks below before production promotion.

## 1. Record the release and rollback targets

Before changing production, record both immutable deployment URLs:

| Record | Deployment URL | Commit | Verified at (UTC) | Operator |
| --- | --- | --- | --- | --- |
| Candidate Preview | Record after Preview deploy | Record SHA | Pending | Pending |
| Last known good Production | Record before promotion | Record SHA | Pending | Pending |

Do not promote until the **Last known good Production** row points to a deployment
that has passed its current production smoke test.

## 2. Configure provider variables

Store provider credentials in Vercel Project Settings → Environment Variables.
Vercel encrypts environment variables at rest. Give each secret only the
Preview and Production scopes it needs; never prefix a provider key with
`NEXT_PUBLIC_`, place a secret in `vercel.json`, or paste a value into a release
log. Environment-variable changes apply only to new deployments, so redeploy
after any change.

Required or optional server-side variables are catalogued in `.env.example`:

- `ETHERSCAN_API_KEY`
- `ETHERSCAN_ENABLE_PAID_CHAINS`
- `BLOCKSCOUT_API_KEY`
- `MORALIS_FALLBACK_ENABLED` (optional; `false` by default)
- `MORALIS_API_KEY` (optional; only required when the fallback is intentionally enabled)
- `MORALIS_MAX_FALLBACK_CU_PER_SCAN`
- `MORALIS_MAX_PAGES_PER_DATASET`
- `COINGECKO_API_KEY`
- `EXPLORER_FALLBACK_URLS_<chainId>` and `RPC_FALLBACK_URLS_<chainId>` when used
- `SITE_URL` for the intended canonical public origin

The CLI alternative is `vercel env add <NAME> preview --sensitive` and the same
command with `production`. Enter the value only at the hidden prompt. Audit
names and scopes with `vercel env ls`; do not print decrypted values.

Reference: [Vercel environment variables](https://vercel.com/docs/environment-variables)
and [environment-specific variables](https://vercel.com/docs/environment-variables/manage-across-environments).

## 3. Configure deployment-wide abuse controls

The application has instance-local limits, but these cannot enforce a global
budget across separate Vercel functions. In the Vercel Firewall, create fixed
window, per-IP rules and start them in **Log** mode:

| Request path | Limit | Window | Action |
| --- | ---: | ---: | --- |
| `/api/batch-scan` | 4 requests | 60 seconds | Rate Limit / HTTP 429 |
| `/api/scan` | 12 requests | 60 seconds | Rate Limit / HTTP 429 |

Review logs for legitimate shared-IP traffic, then publish the rules in Rate
Limit mode. If the Vercel plan permits only one rule, protect
`/api/batch-scan` first because each request can fan out to ten wallets; retain
the application limiter on both routes.

Reference: [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

## 4. Configure monitoring and log review

Use Vercel Observability to inspect Functions, External APIs, status codes, and
latency for the Preview and Production environments. Scan routes emit one JSON
event named `wallet_scan_request` with request ID, route, duration, target and
chain counts, result status, and provider failure codes. They do not log wallet
addresses or provider credentials.

The client sends a 10% sample of Web Vitals to the same-origin
`POST /api/web-vitals` endpoint. The route validates an allowlisted payload and
emits one JSON event named `wallet_web_vital` for Vercel Observability with only
`routeTemplate`, `deviceCategory`, `metricName`, `value`, `rating`, `appVersion`,
and an opaque `eventId`. Query strings, wallet addresses, ENS names, full URLs,
provider credentials, performance entries, and raw scan results are rejected
or omitted. The application does not persist telemetry. Configure a maximum
30-day retention, restrict access to release/observability operators, and
record the retention and deletion/expiry check with the Preview evidence.

Create alerts where the plan supports them for:

- sustained `/api/scan` or `/api/batch-scan` 5xx responses;
- elevated p95 function duration;
- repeated `partial` or `unavailable` result status;
- repeated `provider_error`, `rate_limited`, or timeout failure codes;
- function resource exhaustion.
- p75 LCP, INP, and CLS split by mobile and desktop once enough field traffic
  exists; do not treat one Lighthouse load as an INP result.

References: [Vercel Observability](https://vercel.com/docs/observability) and
[Vercel alerts](https://vercel.com/docs/alerts).

## 5. Deploy and test Preview

Create a Preview from a non-production Git branch or with `vercel deploy`. Save
the immutable Preview URL, then verify:

1. `npm run verify` is green for the exact candidate.
2. `/` and `/docs` load without console errors.
3. Response headers include `Content-Security-Policy`,
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
   `Referrer-Policy`, `Permissions-Policy`, and no `X-Powered-By` header.
4. A single-wallet browser scan reaches a truthful complete, partial, or
   unavailable report without fabricated metrics.
5. A 2–4 wallet cluster browser scan completes and renders every failed wallet
   explicitly when provider history is incomplete.
6. A 10-wallet request passes validation. An 11-wallet request returns HTTP 400
   with code `too_many_wallets` before provider work.
7. A write attempt to `/api/known-wallets` returns HTTP 405 and no durable data
   or version-controlled configuration changes.
8. Logs contain the request ID and aggregate availability fields but no wallet
   address or secret.
9. The WAF rules appear in logs and a deliberate bounded excess request receives
   HTTP 429 without disrupting unrelated page loads.

Reference: [Vercel deployment environments](https://vercel.com/docs/deployments/environments).

## 6. Promote or restore

After every Preview check passes, promote the immutable candidate URL with
`vercel promote <candidate-deployment-url>` or from the Vercel dashboard. Run
the single-wallet and 2–4 wallet cluster smoke tests again on the production
domain.

If production is unhealthy:

1. Run `vercel rollback` and select the recorded **Last known good Production**
   deployment, or select that deployment in the dashboard and choose rollback.
2. Check progress with `vercel rollback status`.
3. Re-run the production page, header, single-wallet, and cluster smoke tests.
4. Preserve the failed deployment URL and request IDs for diagnosis.
5. After the defect is fixed and a new Preview passes, exit rollback by running
   `vercel promote <new-verified-deployment-url>`.

References: [rolling back a production deployment](https://vercel.com/docs/deployments/rollback-production-deployment)
and [promoting a deployment](https://vercel.com/docs/deployments/promoting-a-deployment).
