import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useTenantStore } from '@/stores/root/tenant.store'

/**
 * Multi-currency, multi-locale money formatting. Currency and locale come
 * from the active tenant, not the browser, so a US-based support rep
 * viewing a EUR tenant's deal still sees "€" and European grouping.
 */
export function useCurrency() {
  const tenant = useTenantStore()

  function format(amountMinorUnits: number, currency?: string): string {
    const formatter = new Intl.NumberFormat(tenant.locale, {
      style: 'currency',
      currency: currency ?? tenant.baseCurrency,
      currencyDisplay: 'symbol',
    })
    return formatter.format(amountMinorUnits / 100)
  }

  function formatReactive(amountMinorUnits: MaybeRefOrGetter<number>, currency?: MaybeRefOrGetter<string>) {
    return computed(() => format(toValue(amountMinorUnits), toValue(currency)))
  }

  return { format, formatReactive }
}
