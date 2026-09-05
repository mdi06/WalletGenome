import { classifyWalletAccount, type AccountClassifier } from '../accountClassifier';
import { mapWithConcurrency } from '../api/requestPolicy';
import { linkAbortSignal, throwIfAborted } from '../cancellation';
import type { ScanResult } from '../types';

/** Bound optional recipient enrichment independently of history retrieval. */
export async function classifyCounterparties(
  results: ScanResult[],
  options: { signal?: AbortSignal; classifier?: AccountClassifier; budgetMs?: number } = {},
): Promise<void> {
  const linked = linkAbortSignal(options.signal);
  const timer = setTimeout(() => linked.controller.abort(), options.budgetMs ?? 6000);
  const classifier = options.classifier ?? classifyWalletAccount;
  const candidates = results.flatMap(result => result.interactionsSummary.topCounterparties)
    .filter(counterparty => counterparty.type === 'eoa' || counterparty.type === 'unknown')
    .sort((a, b) => b.outboundCount - a.outboundCount || b.outboundUSD - a.outboundUSD);
  // Historical snapshots used eoa as the default. It is not verified evidence.
  for (const candidate of candidates) candidate.type = 'unknown';
  try {
    await mapWithConcurrency(candidates, 2, async candidate => {
      throwIfAborted(options.signal);
      if (linked.signal.aborted) return;
      try {
        const account = await classifier(candidate.chainId, candidate.address, {
          signal: linked.signal,
          timeoutMs: 1500,
        });
        candidate.accountClassification = account;
        if (account.type === 'eoa' || account.type === 'eip_7702') candidate.type = 'eoa';
        else if (account.type !== 'unknown') candidate.type = 'contract';
      } catch {
        throwIfAborted(options.signal);
        // An unavailable account check must never become an EOA assertion.
      }
    }, { signal: options.signal });
  } finally {
    clearTimeout(timer);
    linked.dispose();
  }
}
