import type { CurrencyCode } from '@/types/crm'

/**
 * Demo-mode FX table (units of each currency per 1 USD). Static and
 * illustrative only — a live-mode backend would replace this with a real
 * rates feed. Kept here rather than per-record so every amount in the demo
 * dataset converts consistently when the dashboard's currency switcher changes.
 */
const USD_PER_UNIT: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 149.5,
  UZS: 12700,
}

export function convertMinorUnits(amountMinorUnits: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amountMinorUnits
  const amountInUsd = amountMinorUnits / USD_PER_UNIT[from]
  return Math.round(amountInUsd * USD_PER_UNIT[to])
}
