import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { fetchDealOwners, fetchDeals } from '../api/deals.api'
import { createEmptyDealFilters, type Deal, type DealFilters, type DealListQuery, type DealStage } from '../types/deal.types'

export const useDealsStore = defineStore(
  'crm-deals',
  () => {
    const filters = ref<DealFilters>(createEmptyDealFilters())
    const page = ref(1)
    const pageSize = ref(25)
    const sortBy = ref<DealListQuery['sortBy']>('closeDate')
    const sortOrder = ref<DealListQuery['sortOrder']>('asc')

    const deals = ref<Deal[]>([])
    const total = ref(0)
    const isLoading = ref(false)
    const loadError = ref<string | null>(null)
    const owners = ref<{ id: string; name: string }[]>([])

    const activeFilterCount = computed(() => {
      const f = filters.value
      return (
        (f.search ? 1 : 0) +
        f.stages.length +
        f.ownerIds.length +
        (f.valueMin !== null ? 1 : 0) +
        (f.valueMax !== null ? 1 : 0)
      )
    })

    const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

    /**
     * Sums-by-stage over the *currently loaded page*. Kept as a plain
     * getter (not a Web Worker) because it's O(pageSize) — for a full
     * pipeline-wide rollup over the entire dataset, that aggregation would
     * be pushed to the API/DB layer or a worker, not recomputed client-side.
     */
    const pageValueByStage = computed(() => {
      const totals = new Map<DealStage, number>()
      for (const deal of deals.value) {
        totals.set(deal.stage, (totals.get(deal.stage) ?? 0) + deal.value.amountMinorUnits)
      }
      return totals
    })

    async function load() {
      isLoading.value = true
      loadError.value = null
      try {
        const query: DealListQuery = {
          ...filters.value,
          page: page.value,
          pageSize: pageSize.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
        }
        const result = await fetchDeals(query)
        deals.value = result.items
        total.value = result.total
      } catch (error) {
        loadError.value = error instanceof Error ? error.message : 'Failed to load deals'
      } finally {
        isLoading.value = false
      }
    }

    const loadDebounced = useDebounceFn(load, 250)

    async function loadOwners() {
      owners.value = await fetchDealOwners()
    }

    function setFilters(next: Partial<DealFilters>) {
      filters.value = { ...filters.value, ...next }
      page.value = 1
      void loadDebounced()
    }

    function resetFilters() {
      filters.value = createEmptyDealFilters()
      page.value = 1
      void load()
    }

    function setPage(next: number) {
      page.value = next
      void load()
    }

    function setPageSize(next: number) {
      pageSize.value = next
      page.value = 1
      void load()
    }

    function setSort(by: DealListQuery['sortBy'], order: DealListQuery['sortOrder']) {
      sortBy.value = by
      sortOrder.value = order
      void load()
    }

    return {
      filters,
      page,
      pageSize,
      sortBy,
      sortOrder,
      deals,
      total,
      isLoading,
      loadError,
      owners,
      activeFilterCount,
      pageCount,
      pageValueByStage,
      load,
      loadOwners,
      setFilters,
      resetFilters,
      setPage,
      setPageSize,
      setSort,
    }
  },
  {
    // Only view preferences persist across sessions — the fetched rows and
    // loading/error state are transient and must always come from a fresh load.
    persist: {
      pick: ['filters', 'pageSize', 'sortBy', 'sortOrder'],
    },
  },
)
