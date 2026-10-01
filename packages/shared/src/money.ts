/** All monetary amounts are integer minor units (cents) to avoid float drift. */

export function formatMoney(cents: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Tax is stored in basis points (1500 = 15.00%). Rounds half away from zero. */
export function computeTaxCents(subtotalCents: number, taxRateBps: number): number {
  return Math.round((subtotalCents * taxRateBps) / 10_000);
}

export interface OrderTotals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function computeOrderTotals(
  lines: { quantity: number; unitPriceCents: number }[],
  taxRateBps: number,
): OrderTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
  const taxCents = computeTaxCents(subtotalCents, taxRateBps);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function formatPercent(ratio: number, fractionDigits = 1): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
