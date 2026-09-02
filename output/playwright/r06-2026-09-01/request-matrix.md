# R06 request matrix

The two matrices were executed sequentially against fresh `next start`
processes on port 3013. Timestamps are UTC and come from the request client.

| Path | Before fix (13:13:47Z) | After fix (13:16:10Z) |
| --- | --- | --- |
| `/` | 200 at `.762` | 200 at `.484` |
| `/docs` | 200 at `.776` | 200 at `.497` |
| `/evm-wallet-analytics` | 200 at `.787` | 200 at `.507` |
| `/crypto-wallet-risk-checker` | 200 at `.800` | 200 at `.513` |
| `/token-approval-checker` | 200 at `.807` | 200 at `.520` |
| `/sybil-wallet-analysis` | 200 at `.812` | 200 at `.526` |
| `/multi-chain-wallet-forensics` | 200 at `.818` | 200 at `.531` |
| `/opengraph-image` | 200 at `.830` | 200 at `.545` |
| `/twitter-image` | 200 at `.839` | 200 at `.554` |
| `/favicon.ico` | 200 at `.844` | 200 at `.557` |
| `/robots.txt` | 200 at `.850` | 200 at `.562` |
| `/sitemap.xml` | 200 at `.854` | 200 at `.566` |
| `/does-not-exist` | 404 at `.870`; log emitted `NoFallbackError` | 404 at `.634`; no internal-error text |
| `/demo-wallets/hayden-2026-08-25.json` | 200 at `.877` | 200 at `.642` |
| `/demo-wallets/richerd-2026-08-25.json` | 200 at `.885` | 200 at `.652` |
| `/demo-wallets/sassal-2026-08-25.json` | 200 at `.896` | 200 at `.665` |
| `/demo-wallets/vitalik-2026-08-26.json` | 200 at `.951` | 200 at `.718` |

The pre-fix server log also contains a second `NoFallbackError` because the
unknown route was requested once more for response-body inspection. The
post-fix server log contains no error lines.
