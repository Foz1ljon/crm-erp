<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NDropdown,
  NIcon,
  NPopconfirm,
  NProgress,
  NSelect,
  NTag,
  type DataTableColumns,
  type DataTableSortState,
  type DropdownOption,
  type SelectOption,
} from 'naive-ui'
import { Filter, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useCrmStore } from '@/stores/useCrmStore'
import { DEAL_STAGES, type DealFilters, type DealStage, type IDeal } from '@/types/crm'

const store = useCrmStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function stageLabel(stage: DealStage): string {
  return t(`deals.stages.${stage}`)
}

function stageTagType(stage: DealStage): 'default' | 'info' | 'warning' | 'success' | 'error' {
  switch (stage) {
    case 'prospecting':
      return 'default'
    case 'qualification':
      return 'info'
    case 'proposal':
    case 'negotiation':
      return 'warning'
    case 'closed_won':
      return 'success'
    case 'closed_lost':
      return 'error'
  }
}

const stageOptions = computed<SelectOption[]>(() =>
  DEAL_STAGES.map((stage) => ({ label: stageLabel(stage), value: stage })),
)
const stageDropdownOptions = computed<DropdownOption[]>(() =>
  DEAL_STAGES.map((stage) => ({ label: stageLabel(stage), key: stage })),
)

function formatAmount(deal: IDeal): string {
  const amount = store.toDisplayCurrency(deal.amountMinorUnits, deal.currency)
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: store.universalFilters.currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function handleDelete(deal: IDeal) {
  store.removeDeal(deal.id)
  feedback.message?.success(t('common.removedToast', { name: deal.title }))
}

function handleStageChange(deal: IDeal, stage: DealStage) {
  store.changeDealStage(deal.id, stage)
  feedback.message?.success(t('deals.stageUpdatedToast', { stage: stageLabel(stage) }))
}

// ---------------------------------------------------------------------------
// Desktop data table
// ---------------------------------------------------------------------------

const columns = computed<DataTableColumns<IDeal>>(() => [
  {
    title: t('deals.deal'),
    key: 'title',
    sorter: true,
    minWidth: 200,
    width: 200,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.title),
        h(
          'span',
          { class: 'block truncate text-xs text-gray-600 dark:text-gray-400' },
          row.customerName,
        ),
      ]),
  },
  { title: t('common.owner'), key: 'owner', width: 160 },
  {
    title: t('deals.filter.stage'),
    key: 'stage',
    sorter: true,
    width: 170,
    render: (row) =>
      h(
        NDropdown,
        {
          options: stageDropdownOptions.value,
          trigger: 'click',
          onSelect: (key: string) => handleStageChange(row, key as DealStage),
        },
        {
          default: () =>
            h(
              NTag,
              {
                type: stageTagType(row.stage),
                size: 'small',
                round: true,
                style: { cursor: 'pointer' },
              },
              { default: () => stageLabel(row.stage) },
            ),
        },
      ),
  },
  {
    title: t('deals.amount'),
    key: 'amountMinorUnits',
    sorter: true,
    width: 140,
    align: 'right',
    render: (row) => h('span', { class: 'font-medium tabular-nums' }, formatAmount(row)),
  },
  {
    title: t('deals.probability'),
    key: 'probability',
    width: 150,
    render: (row) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(NProgress, {
          type: 'line',
          percentage: row.probability,
          height: 6,
          showIndicator: false,
          style: { width: '64px' },
        }),
        h(
          'span',
          { class: 'w-9 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400' },
          `${row.probability}%`,
        ),
      ]),
  },
  {
    title: t('deals.closeDate'),
    key: 'expectedCloseDate',
    sorter: true,
    width: 130,
    render: (row) => dateFormatter.format(new Date(row.expectedCloseDate)),
  },
  {
    title: '',
    key: 'actions',
    width: 56,
    render: (row) =>
      h(
        NPopconfirm,
        { onPositiveClick: () => handleDelete(row) },
        {
          trigger: () =>
            h(
              NButton,
              {
                quaternary: true,
                circle: true,
                size: 'small',
                'aria-label': `${t('common.delete')} ${row.title}`,
              },
              { icon: () => h(NIcon, null, { default: () => h(Trash) }) },
            ),
          default: () => t('common.deleteConfirm', { name: row.title }),
        },
      ),
  },
])

function handleSorterChange(sorter: DataTableSortState | DataTableSortState[] | null) {
  if (!sorter || Array.isArray(sorter) || sorter.order === false) return
  store.setDealSort(
    sorter.columnKey as typeof store.dealSort.sortBy,
    sorter.order === 'ascend' ? 'asc' : 'desc',
  )
}

const pagination = computed(() => ({
  page: store.dealPage,
  pageSize: store.dealPageSize,
  itemCount: store.dealsTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => store.setDealPage(page),
  onUpdatePageSize: (pageSize: number) => store.setDealPageSize(pageSize),
}))

// ---------------------------------------------------------------------------
// Advanced filter drawer (slide-over)
// ---------------------------------------------------------------------------

const filterDrawerOpen = ref(false)
const draft = reactive<DealFilters>({ ...store.dealFilters })

watch(
  () => store.dealFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

const ownerOptions = computed<SelectOption[]>(() =>
  store.dealOwners.map((owner) => ({ label: owner, value: owner })),
)

function applyFilters() {
  store.setDealFilters({ ...draft })
  filterDrawerOpen.value = false
}

function resetFilters() {
  store.resetDealFilters()
  Object.assign(draft, store.dealFilters)
}

function updateQuickSearch(value: string) {
  store.setDealFilters({ search: value })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('deals.title') }}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            t('common.matching', {
              count: store.dealsTotalCount,
              item: t('deals.title').toLowerCase(),
            })
          }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <NInput
        :value="store.dealFilters.search"
        :placeholder="t('deals.searchPlaceholder')"
        clearable
        class="min-h-11 flex-1"
        :aria-label="t('common.search')"
        @update:value="updateQuickSearch"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NBadge :value="store.activeDealFilterCount" :show="store.activeDealFilterCount > 0">
        <NButton
          class="min-h-11 min-w-11"
          :aria-label="t('deals.advancedFilters')"
          @click="filterDrawerOpen = true"
        >
          <template #icon
            ><NIcon><Filter /></NIcon
          ></template>
        </NButton>
      </NBadge>
    </div>

    <!-- Desktop: data table -->
    <div v-if="!isCompact" class="min-h-0 flex-1">
      <NDataTable
        :columns="columns"
        :data="store.paginatedDeals"
        :pagination="pagination"
        :row-key="(row: IDeal) => row.id"
        remote
        flex-height
        class="h-full"
        :bordered="false"
        @update:sorter="handleSorterChange"
      />
    </div>

    <!-- Mobile: card list -->
    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="store.paginatedDeals.length === 0"
        class="py-12 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        {{ t('deals.noMatch') }}
      </div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard
          v-for="deal in store.paginatedDeals"
          :key="deal.id"
          size="small"
          :bordered="true"
          content-style="padding: 14px;"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ deal.title }}</p>
              <p class="truncate text-xs text-gray-600 dark:text-gray-400">
                {{ deal.customerName }}
              </p>
            </div>
            <NTag :type="stageTagType(deal.stage)" size="small" round class="shrink-0">{{
              stageLabel(deal.stage)
            }}</NTag>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <span class="text-base font-semibold">{{ formatAmount(deal) }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-400">{{
              dateFormatter.format(new Date(deal.expectedCloseDate))
            }}</span>
          </div>

          <div class="mt-3 flex items-center gap-2">
            <span class="truncate text-xs text-gray-600 dark:text-gray-300">{{ deal.owner }}</span>
            <NProgress
              type="line"
              :percentage="deal.probability"
              :height="6"
              :show-indicator="false"
              class="ml-auto w-20"
            />
            <span
              class="w-9 shrink-0 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400"
              >{{ deal.probability }}%</span
            >
          </div>

          <div
            class="mt-3 flex items-center justify-between gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border"
          >
            <NSelect
              :value="deal.stage"
              :options="stageOptions"
              size="small"
              class="flex-1"
              :aria-label="t('deals.changeStage')"
              @update:value="(value: DealStage) => handleStageChange(deal, value)"
            />
            <NPopconfirm @positive-click="() => handleDelete(deal)">
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  class="min-h-11 min-w-11"
                  :aria-label="`${t('common.delete')} ${deal.title}`"
                >
                  <template #icon
                    ><NIcon><Trash /></NIcon
                  ></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: deal.title }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination
        v-if="store.dealsPageCount > 1"
        :page="store.dealPage"
        :page-count="store.dealsPageCount"
        simple
        class="mt-2 justify-center"
        @update:page="store.setDealPage"
      />
    </div>

    <!-- Slide-over drawer: advanced search & multi-parameter filtering -->
    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('deals.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput
              v-model:value="draft.search"
              :placeholder="t('deals.searchPlaceholder')"
              clearable
            />
          </NFormItem>

          <NFormItem :label="t('deals.filter.stage')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.stages">
              <div class="flex flex-col gap-3">
                <NCheckbox
                  v-for="option in stageOptions"
                  :key="option.value as string"
                  :value="option.value"
                  :label="option.label as string"
                  class="min-h-11"
                />
              </div>
            </NCheckboxGroup>
          </NFormItem>

          <NFormItem :label="t('deals.filter.owner')" label-placement="top">
            <NSelect
              v-model:value="draft.owners"
              :options="ownerOptions"
              multiple
              :placeholder="t('common.any')"
            />
          </NFormItem>

          <NFormItem :label="t('deals.filter.valueRange')" label-placement="top">
            <div class="flex items-center gap-2">
              <NInputNumber
                v-model:value="draft.amountMin"
                placeholder="Min"
                :min="0"
                class="flex-1"
              />
              <span class="text-gray-500" aria-hidden="true">–</span>
              <NInputNumber
                v-model:value="draft.amountMax"
                placeholder="Max"
                :min="0"
                class="flex-1"
              />
            </div>
          </NFormItem>
        </div>

        <template #footer>
          <div class="flex w-full gap-3">
            <NButton class="min-h-11 flex-1" @click="resetFilters">{{ t('common.reset') }}</NButton>
            <NButton class="min-h-11 flex-1" type="primary" @click="applyFilters">{{
              t('common.apply')
            }}</NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
