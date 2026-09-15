<script setup lang="ts">
import { useCurrency } from '@/core/composables/useCurrency'
import type { Deal } from '../types/deal.types'
import { stageLabel, stageTagType } from '../composables/useDealsFilters'

const props = defineProps<{ deal: Deal }>()

const { format } = useCurrency()

const closeDateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
  new Date(props.deal.closeDate),
)
</script>

<template>
  <NCard :bordered="true" size="small" class="w-full" content-style="padding: 14px;">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">{{ deal.name }}</p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ deal.company.name }}</p>
      </div>
      <NTag :type="stageTagType(deal.stage)" size="small" round class="shrink-0">
        {{ stageLabel(deal.stage) }}
      </NTag>
    </div>

    <div class="mt-3 flex items-center justify-between">
      <span class="text-base font-semibold">{{ format(deal.value.amountMinorUnits, deal.value.currency) }}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">Closes {{ closeDateLabel }}</span>
    </div>

    <div class="mt-3 flex items-center gap-2">
      <NAvatar round size="small" class="shrink-0">{{ deal.owner.name.charAt(0) }}</NAvatar>
      <span class="truncate text-xs text-gray-600 dark:text-gray-300">{{ deal.owner.name }}</span>
      <NProgress
        type="line"
        :percentage="deal.probability"
        :height="6"
        :show-indicator="false"
        class="ml-auto w-20"
        :aria-label="`Win probability ${deal.probability}%`"
      />
      <span class="w-9 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ deal.probability }}%</span>
    </div>
  </NCard>
</template>
