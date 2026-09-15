<script setup lang="ts">
import { computed, h } from 'vue'
import { NAvatar, NEllipsis, NProgress, NTag, type DataTableColumns, type DataTableSortState } from 'naive-ui'
import { useCurrency } from '@/core/composables/useCurrency'
import { useDealsStore } from '../stores/deals.store'
import type { Deal, DealListQuery } from '../types/deal.types'
import { stageLabel, stageTagType } from '../composables/useDealsFilters'

const store = useDealsStore()
const { format } = useCurrency()

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const columns: DataTableColumns<Deal> = [
  {
    title: 'Deal',
    key: 'name',
    sorter: true,
    minWidth: 220,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h(NEllipsis, { class: 'block text-sm font-medium' }, { default: () => row.name }),
        h('span', { class: 'block truncate text-xs text-gray-500 dark:text-gray-400' }, row.company.name),
      ]),
  },
  {
    title: 'Owner',
    key: 'owner',
    width: 180,
    render: (row) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(NAvatar, { round: true, size: 'small' }, { default: () => row.owner.name.charAt(0) }),
        h('span', { class: 'truncate text-sm' }, row.owner.name),
      ]),
  },
  {
    title: 'Stage',
    key: 'stage',
    width: 140,
    render: (row) => h(NTag, { type: stageTagType(row.stage), size: 'small', round: true }, { default: () => stageLabel(row.stage) }),
  },
  {
    title: 'Value',
    key: 'value',
    sorter: true,
    width: 140,
    align: 'right',
    render: (row) => h('span', { class: 'font-medium tabular-nums' }, format(row.value.amountMinorUnits, row.value.currency)),
  },
  {
    title: 'Probability',
    key: 'probability',
    width: 160,
    render: (row) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(NProgress, {
          type: 'line',
          percentage: row.probability,
          height: 6,
          showIndicator: false,
          style: { width: '64px' },
          'aria-label': `Win probability ${row.probability}%`,
        }),
        h('span', { class: 'w-9 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400' }, `${row.probability}%`),
      ]),
  },
  {
    title: 'Close Date',
    key: 'closeDate',
    sorter: true,
    width: 140,
    render: (row) => dateFormatter.format(new Date(row.closeDate)),
  },
]

function handleSorterChange(sorter: DataTableSortState | DataTableSortState[] | null) {
  if (!sorter || Array.isArray(sorter) || sorter.order === false) return
  store.setSort(sorter.columnKey as DealListQuery['sortBy'], sorter.order === 'ascend' ? 'asc' : 'desc')
}

const pagination = computed(() => ({
  page: store.page,
  pageSize: store.pageSize,
  itemCount: store.total,
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onUpdatePage: (page: number) => store.setPage(page),
  onUpdatePageSize: (pageSize: number) => store.setPageSize(pageSize),
}))
</script>

<template>
  <NDataTable
    :columns="columns"
    :data="store.deals"
    :loading="store.isLoading"
    :pagination="pagination"
    :row-key="(row: Deal) => row.id"
    remote
    virtual-scroll
    flex-height
    class="h-full"
    :bordered="false"
    @update:sorter="handleSorterChange"
  />
</template>
