<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Filter, Search } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { useDealsStore } from '../stores/deals.store'
import DealFilterBar from '../components/DealFilterBar.vue'
import DealFilterDrawer from '../components/DealFilterDrawer.vue'
import DealsTable from '../components/DealsTable.vue'
import DealCard from '../components/DealCard.vue'

const { isCompact } = useBreakpoint()
const store = useDealsStore()
const mobileFilterOpen = ref(false)

onMounted(() => {
  void store.load()
})

function updateMobileSearch(value: string) {
  store.setFilters({ search: value })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Pipeline</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ store.total }} deals</p>
      </div>
      <NButton v-can="'crm.deals.create'" type="primary" class="min-h-11">New Deal</NButton>
    </div>

    <!-- Desktop: persistent top filter bar -->
    <DealFilterBar v-if="!isCompact" />

    <!-- Mobile: compact search + a drawer trigger for everything else -->
    <div v-else class="flex items-center gap-2">
      <NInput
        :value="store.filters.search"
        placeholder="Search deals…"
        clearable
        class="min-h-11 flex-1"
        aria-label="Search deals"
        @update:value="updateMobileSearch"
      >
        <template #prefix><NIcon><Search /></NIcon></template>
      </NInput>
      <NBadge :value="store.activeFilterCount" :show="store.activeFilterCount > 0">
        <NButton class="min-h-11 min-w-11" aria-label="Open filters" @click="mobileFilterOpen = true">
          <template #icon><NIcon><Filter /></NIcon></template>
        </NButton>
      </NBadge>
    </div>

    <DealFilterDrawer v-if="isCompact" v-model:show="mobileFilterOpen" />

    <!-- Desktop: virtualized data table -->
    <div v-if="!isCompact" class="min-h-0 flex-1">
      <DealsTable />
    </div>

    <!-- Mobile: card list, same data/store, no horizontal scroll -->
    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <NSpin :show="store.isLoading">
        <div v-if="store.deals.length === 0 && !store.isLoading" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No deals match these filters.
        </div>
        <div v-else class="flex flex-col gap-3 pb-4">
          <DealCard v-for="deal in store.deals" :key="deal.id" :deal="deal" />
        </div>
      </NSpin>

      <NPagination
        v-if="store.pageCount > 1"
        :page="store.page"
        :page-count="store.pageCount"
        simple
        class="mt-2 justify-center"
        @update:page="store.setPage"
      />
    </div>
  </div>
</template>
