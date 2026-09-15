<script setup lang="ts">
import { Search } from '@vicons/tabler'
import { useDealsFilters } from '../composables/useDealsFilters'
import type { DealStage } from '../types/deal.types'

const { store, stageOptions, ownerOptions } = useDealsFilters()

function updateSearch(value: string) {
  store.setFilters({ search: value })
}
function updateStages(value: DealStage[]) {
  store.setFilters({ stages: value })
}
function updateOwners(value: string[]) {
  store.setFilters({ ownerIds: value })
}
function updateValueMin(value: number | null) {
  store.setFilters({ valueMin: value })
}
function updateValueMax(value: number | null) {
  store.setFilters({ valueMax: value })
}
</script>

<template>
  <div class="hidden flex-wrap items-center gap-3 rounded-lg border border-surface-border bg-white p-3 dark:border-surface-dark-border dark:bg-surface-dark-100 md:flex">
    <NInput
      :value="store.filters.search"
      placeholder="Search deals, companies, owners…"
      clearable
      class="w-64"
      aria-label="Search deals"
      @update:value="updateSearch"
    >
      <template #prefix><NIcon><Search /></NIcon></template>
    </NInput>

    <NSelect
      :value="store.filters.stages"
      :options="stageOptions"
      multiple
      placeholder="Stage"
      class="w-48"
      :max-tag-count="1"
      aria-label="Filter by stage"
      @update:value="updateStages"
    />

    <NSelect
      :value="store.filters.ownerIds"
      :options="ownerOptions"
      multiple
      placeholder="Owner"
      class="w-48"
      :max-tag-count="1"
      aria-label="Filter by owner"
      @update:value="updateOwners"
    />

    <div class="flex items-center gap-1.5">
      <NInputNumber
        :value="store.filters.valueMin"
        placeholder="Min value"
        class="w-32"
        :min="0"
        aria-label="Minimum deal value"
        @update:value="updateValueMin"
      />
      <span class="text-sm text-gray-400" aria-hidden="true">–</span>
      <NInputNumber
        :value="store.filters.valueMax"
        placeholder="Max value"
        class="w-32"
        :min="0"
        aria-label="Maximum deal value"
        @update:value="updateValueMax"
      />
    </div>

    <NButton quaternary :disabled="store.activeFilterCount === 0" @click="store.resetFilters()">
      Reset
      <template v-if="store.activeFilterCount > 0">&nbsp;({{ store.activeFilterCount }})</template>
    </NButton>
  </div>
</template>
