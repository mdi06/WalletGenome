# P4 item 15 browser verification

Date: 2026-08-25

Target: local production build at `http://127.0.0.1:3010`.

## Single-wallet smoke

Loaded the versioned Vitalik demo snapshot without calling the scan API. The URL changed to `?demo=vitalik`, the `Demo snapshot status` region identified the saved public data and update date, and the single-wallet dashboard rendered its risk and availability sections.

## Cluster smoke and error transition

- ArrowRight moved focus and selection from `Single wallet` to `Cluster scan New` and activated `scan-mode-cluster-panel`.
- `Load Sample Cluster (4 Wallets)` populated four valid addresses and enabled `SCAN CLUSTER (4)`.
- A browser-local route mock forced `/api/batch-scan` to return `503` with `Forced P4 cluster failure.` The page rendered that message in `role="alert"`, cleared the progress region, and re-enabled the scan action.

## Responsive overflow

```json
[
  {"width":320,"documentWidth":320,"bodyWidth":320},
  {"width":375,"documentWidth":375,"bodyWidth":375},
  {"width":390,"documentWidth":390,"bodyWidth":390},
  {"width":768,"documentWidth":768,"bodyWidth":768},
  {"width":1440,"documentWidth":1440,"bodyWidth":1440}
]
```

No production or preview deployment was created.
