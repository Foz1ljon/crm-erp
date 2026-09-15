import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Active tenant context for the session. Drives currency formatting
 * (useCurrency), locale-sensitive date formatting, and future per-tenant
 * feature flags. Persisted so a refresh doesn't drop the operator back to
 * a default tenant mid-task.
 */
export const useTenantStore = defineStore(
  'tenant',
  () => {
    const tenantId = ref<string>('default')
    const tenantName = ref<string>("Zarafshon Holding")
    const baseCurrency = ref<string>('UZS')
    const locale = ref<string>('uz-UZ')
    const availableCurrencies = ref<string[]>(['UZS', 'USD', 'EUR', 'GBP', 'JPY'])

    function switchTenant(next: { tenantId: string; tenantName: string; baseCurrency: string; locale: string }) {
      tenantId.value = next.tenantId
      tenantName.value = next.tenantName
      baseCurrency.value = next.baseCurrency
      locale.value = next.locale
    }

    return { tenantId, tenantName, baseCurrency, locale, availableCurrencies, switchTenant }
  },
  { persist: true },
)
