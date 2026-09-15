<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NIcon, NModal, NPopconfirm, NSelect, NTag, type DataTableColumns, type FormRules, type SelectOption } from 'naive-ui'
import { ArrowDownRight, ArrowUpRight, Filter, Plus, Scale, Search, Trash } from '@vicons/tabler'
import { Bar } from 'vue-chartjs'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { useChartTheme } from '@/core/composables/useChartTheme'
import { feedback } from '@/core/api/feedback'
import { useErpStore } from '@/stores/useErpStore'
import { useCrmStore } from '@/stores/useCrmStore'
import { TRANSACTION_CATEGORIES, type ITransaction, type TransactionCategory, type TransactionFilters, type TransactionStatus, type TransactionType } from '@/types/erp'

const store = useErpStore()
const crm = useCrmStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()
const { good, critical, cartesianOptions } = useChartTheme()

function categoryLabel(category: TransactionCategory): string {
  return t(`finance.categories.${category}`)
}
function typeLabel(type: TransactionType): string {
  return t(`finance.types.${type}`)
}
function statusLabel(status: TransactionStatus): string {
  return t(`finance.statuses.${status}`)
}

function formatCurrency(minorUnits: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: crm.universalFilters.currency, maximumFractionDigits: 0 }).format(
    minorUnits / 100,
  )
}

const typeOptions = computed<SelectOption[]>(() => [
  { label: typeLabel('income'), value: 'income' },
  { label: typeLabel('expense'), value: 'expense' },
])
const categoryOptions = computed<SelectOption[]>(() => TRANSACTION_CATEGORIES.map((c) => ({ label: categoryLabel(c), value: c })))

function statusTagType(status: TransactionStatus): 'success' | 'warning' | 'error' {
  if (status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  return 'error'
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const incomeVsExpenseChartData = computed(() => ({
  labels: [typeLabel('income'), typeLabel('expense')],
  datasets: [
    {
      data: [store.totalIncomeMinorUnits / 100, store.totalExpenseMinorUnits / 100],
      backgroundColor: [good.value, critical.value],
      borderRadius: 4,
      maxBarThickness: 56,
    },
  ],
}))

const expenseByCategoryChartData = computed(() => {
  const totals = new Map<TransactionCategory, number>()
  for (const txn of store.transactions) {
    if (txn.type !== 'expense') continue
    totals.set(txn.category, (totals.get(txn.category) ?? 0) + store.toDisplayCurrency(txn.amountMinorUnits, txn.currency))
  }
  const sorted = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  return {
    labels: sorted.map(([category]) => categoryLabel(category)),
    datasets: [
      {
        data: sorted.map(([, amount]) => amount / 100),
        backgroundColor: critical.value,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  }
})

const financeChartOptions = computed(() => {
  const base = cartesianOptions()
  return {
    ...base,
    indexAxis: 'y' as const,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins?.tooltip,
        callbacks: { label: (ctx: { raw: unknown }) => formatCurrency(Number(ctx.raw) * 100) },
      },
    },
  }
})

function handleDelete(transaction: ITransaction) {
  store.removeTransaction(transaction.id)
  feedback.message?.success(t('finance.removedToast'))
}

const columns = computed<DataTableColumns<ITransaction>>(() => [
  {
    title: t('finance.description'),
    key: 'description',
    minWidth: 220,
    render: (row) =>
      h('div', { class: 'flex items-center gap-2 min-w-0' }, [
        h(NIcon, { class: row.type === 'income' ? 'text-success' : 'text-error', size: 18 }, { default: () => h(row.type === 'income' ? ArrowUpRight : ArrowDownRight) }),
        h('div', { class: 'min-w-0' }, [
          h('span', { class: 'block truncate text-sm font-medium' }, row.description),
          h('span', { class: 'block truncate text-xs text-gray-500 dark:text-gray-400' }, row.createdBy),
        ]),
      ]),
  },
  { title: t('common.category'), key: 'category', width: 150, render: (row) => categoryLabel(row.category) },
  { title: t('common.status'), key: 'status', width: 110, render: (row) => h(NTag, { type: statusTagType(row.status), size: 'small', round: true }, { default: () => statusLabel(row.status) }) },
  { title: t('finance.date'), key: 'date', width: 120, render: (row) => dateFormatter.format(new Date(row.date)) },
  {
    title: t('finance.amount'),
    key: 'amountMinorUnits',
    width: 130,
    align: 'right',
    render: (row) =>
      h('span', { class: `font-medium tabular-nums ${row.type === 'income' ? 'text-success' : 'text-error'}` }, `${row.type === 'income' ? '+' : '-'}${formatCurrency(row.amountMinorUnits)}`),
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
          trigger: () => h(NButton, { quaternary: true, circle: true, size: 'small', 'aria-label': t('common.delete') }, { icon: () => h(NIcon, null, { default: () => h(Trash) }) }),
          default: () => t('finance.deleteConfirmGeneric'),
        },
      ),
  },
])

const pagination = computed(() => ({
  page: store.transactionPage,
  pageSize: store.transactionPageSize,
  itemCount: store.transactionsTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => (store.transactionPage = page),
  onUpdatePageSize: (pageSize: number) => {
    store.transactionPageSize = pageSize
    store.transactionPage = 1
  },
}))

const filterDrawerOpen = ref(false)
const draft = reactive<TransactionFilters>({ ...store.transactionFilters })

watch(
  () => store.transactionFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setTransactionFilters({ ...draft })
  filterDrawerOpen.value = false
}
function resetFilters() {
  store.resetTransactionFilters()
  Object.assign(draft, store.transactionFilters)
}
function updateQuickSearch(value: string) {
  store.setTransactionFilters({ search: value })
}

// New transaction modal
const createModalOpen = ref(false)
const createFormRef = ref()
type NewTxnDraft = { type: TransactionType; category: TransactionCategory; description: string; amount: number }
function emptyDraft(): NewTxnDraft {
  return { type: 'income', category: 'sales_revenue', description: '', amount: 5_000_000 }
}
const newTxn = ref<NewTxnDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  description: { required: true, message: t('finance.descriptionRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newTxn.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newTxn.value
    store.addTransaction({
      id: `txn-${Date.now()}`,
      type: d.type,
      category: d.category,
      description: d.description,
      amountMinorUnits: Math.round(d.amount * 100),
      currency: 'UZS',
      status: 'completed',
      relatedDealId: null,
      relatedPurchaseOrderId: null,
      branch: 'Toshkent — Bosh ofis',
      date: new Date().toISOString(),
      createdBy: 'You',
    })
    feedback.message?.success(t('finance.recordedToast'))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('finance.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('finance.transactionsCount', { count: store.transactionsTotalCount }) }}</p>
      </div>
      <NButton v-can="'erp.finance.create'" type="primary" class="min-h-11" @click="openCreateModal">
        <template #icon><NIcon><Plus /></NIcon></template>
        {{ t('finance.newTransaction') }}
      </NButton>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-surface-border bg-surface-0 p-4 dark:border-surface-dark-border dark:bg-surface-dark-100">
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><NIcon class="text-success"><ArrowUpRight /></NIcon>{{ t('finance.totalIncome') }}</div>
        <p class="mt-1 text-xl font-semibold tabular-nums">{{ formatCurrency(store.totalIncomeMinorUnits) }}</p>
      </div>
      <div class="rounded-xl border border-surface-border bg-surface-0 p-4 dark:border-surface-dark-border dark:bg-surface-dark-100">
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><NIcon class="text-error"><ArrowDownRight /></NIcon>{{ t('finance.totalExpense') }}</div>
        <p class="mt-1 text-xl font-semibold tabular-nums">{{ formatCurrency(store.totalExpenseMinorUnits) }}</p>
      </div>
      <div class="rounded-xl border border-surface-border bg-surface-0 p-4 dark:border-surface-dark-border dark:bg-surface-dark-100">
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><NIcon><Scale /></NIcon>{{ t('finance.netProfit') }}</div>
        <p class="mt-1 text-xl font-semibold tabular-nums" :class="store.netProfitMinorUnits >= 0 ? 'text-success' : 'text-error'">
          {{ formatCurrency(store.netProfitMinorUnits) }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4" :class="!isCompact ? 'lg:grid-cols-2' : ''">
      <NCard :title="`${t('finance.totalIncome')} / ${t('finance.totalExpense')}`" size="small" :bordered="true">
        <div class="h-48">
          <Bar :data="incomeVsExpenseChartData" :options="financeChartOptions" />
        </div>
      </NCard>
      <NCard :title="t('finance.expenseByCategory')" size="small" :bordered="true">
        <div class="h-48">
          <Bar :data="expenseByCategoryChartData" :options="financeChartOptions" />
        </div>
      </NCard>
    </div>

    <div class="flex items-center gap-2">
      <NInput :value="store.transactionFilters.search" :placeholder="t('finance.searchPlaceholder')" clearable class="min-h-11 flex-1" :aria-label="t('common.search')" @update:value="updateQuickSearch">
        <template #prefix><NIcon><Search /></NIcon></template>
      </NInput>
      <NBadge :value="store.activeTransactionFilterCount" :show="store.activeTransactionFilterCount > 0">
        <NButton class="min-h-11 min-w-11" :aria-label="t('finance.advancedFilters')" @click="filterDrawerOpen = true">
          <template #icon><NIcon><Filter /></NIcon></template>
        </NButton>
      </NBadge>
    </div>

    <div v-if="!isCompact" class="min-h-0 flex-1">
      <NDataTable :columns="columns" :data="store.paginatedTransactions" :pagination="pagination" :row-key="(row: ITransaction) => row.id" remote flex-height class="h-full" :bordered="false" />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="store.paginatedTransactions.length === 0" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('finance.noMatch') }}</div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard v-for="txn in store.paginatedTransactions" :key="txn.id" size="small" :bordered="true" content-style="padding: 14px;">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <NIcon :class="txn.type === 'income' ? 'text-success' : 'text-error'"><component :is="txn.type === 'income' ? ArrowUpRight : ArrowDownRight" /></NIcon>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ txn.description }}</p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ categoryLabel(txn.category) }}</p>
              </div>
            </div>
            <NTag :type="statusTagType(txn.status)" size="small" round class="shrink-0">{{ statusLabel(txn.status) }}</NTag>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-base font-semibold tabular-nums" :class="txn.type === 'income' ? 'text-success' : 'text-error'">
              {{ txn.type === 'income' ? '+' : '-' }}{{ formatCurrency(txn.amountMinorUnits) }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ dateFormatter.format(new Date(txn.date)) }}</span>
          </div>
          <div class="mt-3 flex items-center justify-end gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border">
            <NPopconfirm @positive-click="() => handleDelete(txn)">
              <template #trigger>
                <NButton quaternary circle class="min-h-11 min-w-11" :aria-label="t('common.delete')">
                  <template #icon><NIcon><Trash /></NIcon></template>
                </NButton>
              </template>
              {{ t('finance.deleteConfirmGeneric') }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination v-if="store.transactionsPageCount > 1" :page="store.transactionPage" :page-count="store.transactionsPageCount" simple class="mt-2 justify-center" @update:page="(p: number) => (store.transactionPage = p)" />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('finance.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput v-model:value="draft.search" :placeholder="t('finance.searchPlaceholder')" clearable />
          </NFormItem>
          <NFormItem :label="t('finance.filter.type')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.types">
              <div class="flex flex-col gap-3">
                <NCheckbox v-for="option in typeOptions" :key="option.value as string" :value="option.value" :label="option.label as string" class="min-h-11" />
              </div>
            </NCheckboxGroup>
          </NFormItem>
          <NFormItem :label="t('finance.filter.category')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.categories">
              <div class="flex flex-col gap-3">
                <NCheckbox v-for="option in categoryOptions" :key="option.value as string" :value="option.value" :label="option.label as string" class="min-h-11" />
              </div>
            </NCheckboxGroup>
          </NFormItem>
        </div>
        <template #footer>
          <div class="flex w-full gap-3">
            <NButton class="min-h-11 flex-1" @click="resetFilters">{{ t('common.reset') }}</NButton>
            <NButton class="min-h-11 flex-1" type="primary" @click="applyFilters">{{ t('common.apply') }}</NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>

    <NModal v-model:show="createModalOpen" preset="card" :title="t('finance.modalTitle')" :style="{ width: isCompact ? '92%' : '480px' }">
      <NForm ref="createFormRef" :model="newTxn" :rules="createRules" label-placement="top">
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('finance.type')" path="type"><NSelect v-model:value="newTxn.type" :options="typeOptions" /></NFormItem>
          <NFormItem :label="t('common.category')" path="category"><NSelect v-model:value="newTxn.category" :options="categoryOptions" /></NFormItem>
        </div>
        <NFormItem :label="t('finance.description')" path="description"><NInput v-model:value="newTxn.description" :placeholder="t('finance.descriptionPlaceholder')" /></NFormItem>
        <NFormItem :label="t('finance.amount')" path="amount"><NInputNumber v-model:value="newTxn.amount" :min="0" class="w-full" /></NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{ t('common.cancel') }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{ t('finance.recordTransaction') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
