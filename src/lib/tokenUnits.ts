/**
 * ERC-20 metadata is provider supplied, so keep the decimal parser strict and
 * preserve the valid zero-decimal case.
 */
export function parseTokenDecimals(value: string | number | undefined, fallback = 18): number {
  const parsed = typeof value === 'number'
    ? value
    : Number.parseInt(String(value ?? ''), 10);

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255 ? parsed : fallback;
}

/**
 * Convert a non-negative integer token amount to a display number without
 * treating zero decimals as the default 18 decimals.
 */
export function formatTokenUnits(valueRaw: string | number | bigint, decimals = 18): number {
  const raw = String(valueRaw ?? '0').trim();
  const normalizedDecimals = parseTokenDecimals(decimals);

  if (!raw || raw === '0') return 0;
  if (!/^\d+$/.test(raw)) {
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (normalizedDecimals === 0) return Number(raw);

  const digits = raw.padStart(normalizedDecimals + 1, '0');
  const whole = digits.slice(0, -normalizedDecimals);
  const fraction = digits.slice(-normalizedDecimals);
  const parsed = Number(`${whole}.${fraction}`);
  return Number.isFinite(parsed) ? parsed : 0;
}
