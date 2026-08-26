# Local production release smoke evidence

Date: 2026-08-26  
Runtime: Node.js 22, Next.js 16.3.1, `next start` on `127.0.0.1:3010`

## Results

- Production build and server started successfully.
- `/` returned HTTP 200 with CSP, frame, content-type, referrer,
  permissions, and cross-origin opener headers. `X-Powered-By` was absent.
- Server validation rejected 11 wallets with HTTP 400 and
  `code: too_many_wallets`.
- Browser UI displayed `10/10 valid addresses` with an enabled cluster action.
- Browser UI displayed `11/10 valid addresses`, marked the field invalid, and
  showed `Please limit each cluster scan to 10 wallets.` without provider work.
- A real two-wallet, Ethereum-only cluster scan completed and rendered both
  wallets in the cluster dashboard.
- A real one-wallet, Ethereum-only streamed scan completed and rendered the
  single-wallet dashboard.
- Browser console after the flows: 0 errors, 0 warnings.
- `POST /api/known-wallets` returned HTTP 405 with `Allow: GET`.
- Structured server events included request ID, duration, target count, chain
  count, result status, availability/failure fields, and no wallet address or
  provider credential.

The screenshot and Playwright accessibility snapshots are in the adjacent
`.playwright-cli` directory. This file is local production evidence only; it is
not Vercel Preview evidence.
