<script setup lang="ts">
import { computed, reactive, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'
import 'dayjs/locale/uz'
import 'dayjs/locale/uz-latn'
import {
  ArrowDownRight,
  ArrowUpRight,
  IdBadge,
  Mail,
  MinusVertical,
  Notes,
  Package,
  Phone,
  Plus,
  ReceiptRefund,
  RefreshAlert,
  Scale,
  Truck,
  UserPlus,
  Users as UsersIcon,
} from '@vicons/tabler'
import type { FormInst, FormRules, SelectOption } from 'naive-ui'
import { NIcon } from 'naive-ui'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { useChartTheme } from '@/core/composables/useChartTheme'
import { feedback } from '@/core/api/feedback'
import { useCrmStore, type DataMode } from '@/stores/useCrmStore'
import { useErpStore } from '@/stores/useErpStore'
import {
  BRANCHES,
  CURRENCIES,
  DEAL_STAGES,
  type ActivityType,
  type Branch,
  type CurrencyCode,
  type DealStage,
  type IKpiMetric,
} from '@/types/crm'

dayjs.extend(relativeTime)

const store = useCrmStore()
const erp = useErpStore()
const { isCompact } = useBreakpoint()
const { t, locale } = useI18n()
const { categorical, sequential, cartesianOptions, donutOptions } = useChartTheme()

const DAYJS_LOCALE_MAP: Record<string, string> = { en: 'en', uz: 'uz-latn', 'uz-Cyrl': 'uz', ru: 'ru' }

function stageLabel(stage: DealStage): string {
  return t(`deals.stages.${stage}`)
}

function leadStatusLabel(status: string): string {
  return t(`leads.statuses.${status}`)
}

const opsSnapshot = computed(() => [
  { label: t('dashboard.activeEmployees'), value: String(erp.activeEmployeesCount), icon: IdBadge },
  { label: t('dashboard.openPurchaseOrders'), value: String(erp.purchaseOrders.filter((po) => po.status !== 'received' && po.status !== 'cancelled').length), icon: UsersIcon },
  { label: t('dashboard.shipmentsInTransit'), value: String(erp.shipmentStatusCounts.get('in_transit') ?? 0), icon: Truck },
  { label: t('dashboard.netProfitFinance'), value: formatMinorUnits(erp.netProfitMinorUnits), icon: Scale },
])

const leadFunnelMax = computed(() => Math.max(1, ...store.leadFunnel.map((f) => f.count)))

// ---------------------------------------------------------------------------
// Universal filter bar
// ---------------------------------------------------------------------------

const branchOptions = computed<SelectOption[]>(() => [
  { label: t('dashboard.allBranches'), value: '__all__' },
  ...BRANCHES.map((branch) => ({ label: branch, value: branch })),
])
const currencyOptions: SelectOption[] = CURRENCIES.map((c) => ({ label: `${c.code} — ${c.label}`, value: c.code }))

const branchModel = computed({
  get: () => store.universalFilters.branch ?? '__all__',
  set: (value: string) => store.setUniversalFilters({ branch: value === '__all__' ? null : (value as Branch) }),
})

const currencyModel = computed({
  get: () => store.universalFilters.currency,
  set: (value: CurrencyCode) => store.setUniversalFilters({ currency: value }),
})

const dateRangeModel = computed<[number, number] | null>({
  get: () => {
    const range = store.universalFilters.dateRange
    if (!range) return null
    return [new Date(range.from).getTime(), new Date(range.to).getTime()] as [number, number]
  },
  set: (value: [number, number] | null) => {
    store.setUniversalFilters({
      dateRange: value ? { from: new Date(value[0]).toISOString(), to: new Date(value[1]).toISOString() } : null,
    })
  },
})

const isLiveMode = computed({
  get: () => store.mode === 'live',
  set: (value: boolean) => store.setMode((value ? 'live' : 'demo') as DataMode),
})

// ---------------------------------------------------------------------------
// KPI card formatting
// ---------------------------------------------------------------------------

function kpiLabel(kpi: IKpiMetric): string {
  return t(`dashboard.kpis.${kpi.id}`)
}

function formatKpiValue(kpi: IKpiMetric): string {
  switch (kpi.unit) {
    case 'currency':
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: kpi.currency ?? 'USD',
        maximumFractionDigits: 0,
      }).format(kpi.value)
    case 'percent':
      return `${kpi.value}%`
    case 'ratio':
      return `${kpi.value}x`
    case 'count':
    default:
      return String(kpi.value)
  }
}

function trendIcon(direction: IKpiMetric['trendDirection']): Component {
  if (direction === 'up') return ArrowUpRight
  if (direction === 'down') return ArrowDownRight
  return MinusVertical
}

function trendColorClass(direction: IKpiMetric['trendDirection']) {
  if (direction === 'up') return 'text-emerald-600 dark:text-emerald-400'
  if (direction === 'down') return 'text-red-600 dark:text-red-400'
  return 'text-gray-500 dark:text-gray-400'
}

// ---------------------------------------------------------------------------
// Pipeline progression widget
// ---------------------------------------------------------------------------

const pipelineRows = computed(() => {
  const stageEntries = DEAL_STAGES.map((stage) => ({
    stage,
    ...(store.pipelineByStage.get(stage) ?? { count: 0, amountMinorUnits: 0 }),
  }))
  const max = Math.max(1, ...stageEntries.map((e) => e.amountMinorUnits))
  return stageEntries.map((entry) => ({ ...entry, widthPercent: Math.round((entry.amountMinorUnits / max) * 100) }))
})

const pipelineChartData = computed(() => ({
  labels: pipelineRows.value.map((row) => stageLabel(row.stage)),
  datasets: [
    {
      label: t('dashboard.salesPipeline'),
      data: pipelineRows.value.map((row) => row.amountMinorUnits / 100),
      backgroundColor: sequential.value,
      borderRadius: 4,
      maxBarThickness: 36,
    },
  ],
}))

const pipelineChartOptions = computed(() => {
  const base = cartesianOptions()
  return {
    ...base,
    indexAxis: 'y' as const,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins?.tooltip,
        callbacks: { label: (ctx: { raw: unknown }) => formatMinorUnits(Number(ctx.raw) * 100) },
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Revenue breakdown widget
// ---------------------------------------------------------------------------

const revenueBreakdownRows = computed(() => {
  const rows = BRANCHES.map((branch) => ({ branch, amountMinorUnits: store.revenueByBranch.get(branch) ?? 0 }))
  const total = rows.reduce((sum, r) => sum + r.amountMinorUnits, 0)
  return rows
    .map((row) => ({ ...row, sharePercent: total === 0 ? 0 : Math.round((row.amountMinorUnits / total) * 100) }))
    .sort((a, b) => b.amountMinorUnits - a.amountMinorUnits)
})

function formatMinorUnits(amountMinorUnits: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: store.universalFilters.currency,
    maximumFractionDigits: 0,
  }).format(amountMinorUnits / 100)
}

const revenueByBranchChartData = computed(() => ({
  labels: revenueBreakdownRows.value.map((row) => row.branch),
  datasets: [
    {
      data: revenueBreakdownRows.value.map((row) => row.amountMinorUnits / 100),
      backgroundColor: categorical.value,
      borderColor: 'transparent',
      hoverOffset: 6,
    },
  ],
}))

const revenueByBranchChartOptions = computed(() => {
  const base = donutOptions()
  return {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins?.tooltip,
        callbacks: { label: (ctx: { label?: string; raw: unknown }) => `${ctx.label}: ${formatMinorUnits(Number(ctx.raw) * 100)}` },
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Revenue trend widget (won deals, last 6 months by creation date)
// ---------------------------------------------------------------------------

const revenueTrendChartData = computed(() => {
  const monthFormatter = new Intl.DateTimeFormat(locale.value, { month: 'short' })
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: monthFormatter.format(d), total: 0 }
  })

  for (const deal of store.deals) {
    if (deal.stage !== 'closed_won') continue
    const created = new Date(deal.createdAt)
    const bucket = months.find((m) => m.year === created.getFullYear() && m.month === created.getMonth())
    if (bucket) bucket.total += store.toDisplayCurrency(deal.amountMinorUnits, deal.currency)
  }

  return {
    labels: months.map((m) => m.label),
    datasets: [
      {
        label: t('dashboard.revenueTrend'),
        data: months.map((m) => m.total / 100),
        borderColor: sequential.value,
        backgroundColor: `${sequential.value}33`,
        pointBackgroundColor: sequential.value,
        pointRadius: 3,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
      },
    ],
  }
})

const revenueTrendChartOptions = computed(() => {
  const base = cartesianOptions()
  return {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins?.tooltip,
        callbacks: { label: (ctx: { raw: unknown }) => formatMinorUnits(Number(ctx.raw) * 100) },
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Recent activity feed
// ---------------------------------------------------------------------------

const activityIconMap: Record<ActivityType, Component> = {
  deal_created: Plus,
  deal_stage_changed: RefreshAlert,
  customer_created: UserPlus,
  note_added: Notes,
  invoice_paid: ReceiptRefund,
  stock_reorder: Package,
  lead_created: UserPlus,
  lead_converted: RefreshAlert,
  call_logged: Phone,
  email_sent: Mail,
  meeting_scheduled: UsersIcon,
}

function activityIcon(type: ActivityType): Component {
  return activityIconMap[type]
}

function relativeTimeLabel(iso: string): string {
  return dayjs(iso).locale(DAYJS_LOCALE_MAP[locale.value] ?? 'en').fromNow()
}

// ---------------------------------------------------------------------------
// Quick actions: New Deal
// ---------------------------------------------------------------------------

const newDealModalOpen = ref(false)
const dealFormRef = ref<FormInst | null>(null)
const dealForm = reactive({
  title: '',
  customerId: null as string | null,
  amount: null as number | null,
  currency: 'UZS' as CurrencyCode,
  stage: 'prospecting' as (typeof DEAL_STAGES)[number],
  owner: '',
  expectedCloseDate: null as number | null,
})

const dealFormRules = computed<FormRules>(() => ({
  title: { required: true, message: t('dashboard.dealNameRule'), trigger: 'blur' },
  customerId: { required: true, message: t('dashboard.selectCustomerRule'), trigger: 'change' },
  amount: { required: true, type: 'number', message: t('dashboard.amountRule'), trigger: 'blur' },
  owner: { required: true, message: t('dashboard.ownerRule'), trigger: 'blur' },
  expectedCloseDate: { required: true, type: 'number', message: t('dashboard.closeDateRule'), trigger: 'change' },
}))

const customerOptions = computed<SelectOption[]>(() => store.customers.map((c) => ({ label: c.name, value: c.id })))
const ownerOptions = computed<SelectOption[]>(() =>
  Array.from(new Set(store.customers.map((c) => c.owner))).map((owner) => ({ label: owner, value: owner })),
)
const stageOptions = computed<SelectOption[]>(() => DEAL_STAGES.map((stage) => ({ label: stageLabel(stage), value: stage })))

function resetDealForm() {
  dealForm.title = ''
  dealForm.customerId = null
  dealForm.amount = null
  dealForm.currency = 'USD'
  dealForm.stage = 'prospecting'
  dealForm.owner = ''
  dealForm.expectedCloseDate = null
}

function submitNewDeal() {
  dealFormRef.value?.validate((errors) => {
    if (errors) return
    const customer = store.customers.find((c) => c.id === dealForm.customerId)
    if (!customer || dealForm.amount === null || dealForm.expectedCloseDate === null) return

    store.addDeal({
      id: `deal-${crypto.randomUUID()}`,
      title: dealForm.title,
      customerId: customer.id,
      customerName: customer.name,
      stage: dealForm.stage,
      amountMinorUnits: Math.round(dealForm.amount * 100),
      currency: dealForm.currency,
      probability: dealForm.stage === 'closed_won' ? 100 : dealForm.stage === 'closed_lost' ? 0 : 40,
      owner: dealForm.owner,
      branch: customer.branch,
      expectedCloseDate: new Date(dealForm.expectedCloseDate).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    feedback.message?.success(t('dashboard.dealAddedToast', { title: dealForm.title }))
    resetDealForm()
    newDealModalOpen.value = false
  })
}

// ---------------------------------------------------------------------------
// Quick actions: New Customer
// ---------------------------------------------------------------------------

const newCustomerModalOpen = ref(false)
const customerFormRef = ref<FormInst | null>(null)
const customerForm = reactive({
  name: '',
  industry: '',
  branch: BRANCHES[0] as Branch,
  owner: '',
})

const customerFormRules = computed<FormRules>(() => ({
  name: { required: true, message: t('dashboard.accountNameRule'), trigger: 'blur' },
  industry: { required: true, message: t('dashboard.industryRule'), trigger: 'blur' },
  owner: { required: true, message: t('dashboard.ownerRule'), trigger: 'blur' },
}))

function submitNewCustomer() {
  customerFormRef.value?.validate((errors) => {
    if (errors) return
    store.addCustomer({
      id: `cust-${crypto.randomUUID()}`,
      name: customerForm.name,
      industry: customerForm.industry,
      lifecycleStage: 'lead',
      status: 'active',
      owner: customerForm.owner,
      branch: customerForm.branch,
      contacts: [],
      lifetimeValueMinorUnits: 0,
      currency: store.universalFilters.currency,
      tags: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    })
    feedback.message?.success(t('dashboard.customerAddedToast', { name: customerForm.name }))
    customerForm.name = ''
    customerForm.industry = ''
    customerForm.owner = ''
    newCustomerModalOpen.value = false
  })
}

// ---------------------------------------------------------------------------
// Quick actions: Reorder low-stock inventory
// ---------------------------------------------------------------------------

const reorderModalOpen = ref(false)

function reorderProduct(productId: string, quantity: number) {
  store.adjustStock(productId, quantity)
  feedback.message?.success(t('dashboard.reorderRecordedToast'))
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('dashboard.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('dashboard.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ isLiveMode ? t('dashboard.liveMode') : t('dashboard.demoMode') }}</span>
        <NSwitch v-model:value="isLiveMode" :aria-label="t('dashboard.demoMode')" />
      </div>
    </div>

    <NAlert v-if="isLiveMode" type="warning" :title="t('dashboard.liveWarningTitle')" class="text-sm">
      {{ t('dashboard.liveWarningBody') }}
    </NAlert>

    <!-- Universal filter bar -->
    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border bg-white p-3 dark:border-surface-dark-border dark:bg-surface-dark-100">
      <NDatePicker v-model:value="dateRangeModel" type="daterange" clearable class="w-full sm:w-64" :placeholder="t('dashboard.allTime')" />
      <NSelect v-model:value="branchModel" :options="branchOptions" class="w-full sm:w-48" :aria-label="t('common.branch')" />
      <NSelect v-model:value="currencyModel" :options="currencyOptions" class="w-full sm:w-40" :aria-label="t('dashboard.currency')" />
    </div>

    <!-- Quick actions -->
    <div class="flex flex-wrap gap-2">
      <NButton type="primary" class="min-h-11" @click="newDealModalOpen = true">
        <template #icon><NIcon><Plus /></NIcon></template>
        {{ t('dashboard.newDeal') }}
      </NButton>
      <NButton class="min-h-11" @click="newCustomerModalOpen = true">
        <template #icon><NIcon><UserPlus /></NIcon></template>
        {{ t('dashboard.newCustomer') }}
      </NButton>
      <NButton class="min-h-11" @click="reorderModalOpen = true">
        <template #icon><NIcon><Package /></NIcon></template>
        {{ t('dashboard.inventoryReorder') }}
        <NBadge v-if="store.lowStockProducts.length > 0" :value="store.lowStockProducts.length" class="ml-2" />
      </NButton>
    </div>

    <!-- KPI metric cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <NCard v-for="kpi in store.kpis" :key="kpi.id" size="small" :bordered="true">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ kpiLabel(kpi) }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatKpiValue(kpi) }}</p>
        <div class="mt-1 flex items-center gap-1 text-xs" :class="trendColorClass(kpi.trendDirection)">
          <NIcon :component="trendIcon(kpi.trendDirection)" />
          <span>{{ kpi.trendPercent > 0 ? '+' : '' }}{{ kpi.trendPercent }}%</span>
          <span class="text-gray-400 dark:text-gray-500">{{ t('dashboard.vsLastMonth') }}</span>
        </div>
      </NCard>
    </div>

    <!-- Ops snapshot: cross-module ERP summary -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NCard v-for="stat in opsSnapshot" :key="stat.label" size="small" :bordered="true">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <NIcon :component="stat.icon" :size="18" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
            <p class="truncate text-lg font-semibold tabular-nums">{{ stat.value }}</p>
          </div>
        </div>
      </NCard>
    </div>

    <!-- Revenue trend: full-width line chart -->
    <NCard :title="t('dashboard.revenueTrend')" size="small" :bordered="true">
      <div class="h-56">
        <Line :data="revenueTrendChartData" :options="revenueTrendChartOptions" />
      </div>
    </NCard>

    <!-- Widgets: desktop 2-column, mobile stacked -->
    <div class="grid grid-cols-1 gap-4" :class="!isCompact ? 'lg:grid-cols-2' : ''">
      <NCard :title="t('dashboard.salesPipeline')" size="small" :bordered="true">
        <div class="h-64">
          <Bar :data="pipelineChartData" :options="pipelineChartOptions" />
        </div>
      </NCard>

      <NCard :title="t('dashboard.revenueByBranch')" size="small" :bordered="true">
        <div class="h-64">
          <Doughnut :data="revenueByBranchChartData" :options="revenueByBranchChartOptions" />
        </div>
      </NCard>

      <NCard :title="t('dashboard.leadFunnel')" size="small" :bordered="true">
        <div class="flex flex-col gap-3">
          <div v-for="stage in store.leadFunnel" :key="stage.status">
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="font-medium">{{ leadStatusLabel(stage.status) }}</span>
              <span class="tabular-nums text-gray-500 dark:text-gray-400">{{ stage.count }}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-dark-200">
              <div class="h-full rounded-full bg-brand-600" :style="{ width: `${(stage.count / leadFunnelMax) * 100}%` }" />
            </div>
          </div>
        </div>
      </NCard>

      <NCard :title="t('dashboard.recentActivity')" size="small" :bordered="true">
        <div v-if="store.recentActivities.length === 0" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('dashboard.noRecentActivity') }}
        </div>
        <ul v-else class="flex flex-col divide-y divide-surface-border dark:divide-surface-dark-border">
          <li v-for="activity in store.recentActivities" :key="activity.id" class="flex items-start gap-3 py-2.5">
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
              <NIcon :component="activityIcon(activity.type)" :size="16" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">{{ activity.message }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ activity.actor }} · {{ relativeTimeLabel(activity.createdAt) }}</p>
            </div>
          </li>
        </ul>
      </NCard>
    </div>

    <!-- Modal: New Deal -->
    <NModal v-model:show="newDealModalOpen" preset="card" :title="t('dashboard.newDealModalTitle')" class="w-full max-w-md">
      <NForm ref="dealFormRef" :model="dealForm" :rules="dealFormRules" label-placement="top">
        <NFormItem :label="t('dashboard.dealName')" path="title">
          <NInput v-model:value="dealForm.title" :placeholder="t('dashboard.dealNamePlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('dashboard.customer')" path="customerId">
          <NSelect v-model:value="dealForm.customerId" :options="customerOptions" filterable :placeholder="t('dashboard.selectCustomer')" />
        </NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('dashboard.value')" path="amount">
            <NInputNumber v-model:value="dealForm.amount" :min="0" class="w-full" />
          </NFormItem>
          <NFormItem :label="t('dashboard.currency')" path="currency">
            <NSelect v-model:value="dealForm.currency" :options="currencyOptions" />
          </NFormItem>
        </div>
        <NFormItem :label="t('dashboard.stage')" path="stage">
          <NSelect v-model:value="dealForm.stage" :options="stageOptions" />
        </NFormItem>
        <NFormItem :label="t('common.owner')" path="owner">
          <NSelect v-model:value="dealForm.owner" :options="ownerOptions" filterable :placeholder="t('common.owner')" />
        </NFormItem>
        <NFormItem :label="t('dashboard.expectedCloseDate')" path="expectedCloseDate">
          <NDatePicker v-model:value="dealForm.expectedCloseDate" type="date" class="w-full" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="newDealModalOpen = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="submitNewDeal">{{ t('dashboard.createDeal') }}</NButton>
        </div>
      </template>
    </NModal>

    <!-- Modal: New Customer -->
    <NModal v-model:show="newCustomerModalOpen" preset="card" :title="t('dashboard.newCustomerModalTitle')" class="w-full max-w-md">
      <NForm ref="customerFormRef" :model="customerForm" :rules="customerFormRules" label-placement="top">
        <NFormItem :label="t('dashboard.accountName')" path="name">
          <NInput v-model:value="customerForm.name" :placeholder="t('dashboard.accountNamePlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('dashboard.industry')" path="industry">
          <NInput v-model:value="customerForm.industry" :placeholder="t('dashboard.industryPlaceholder')" />
        </NFormItem>
        <NFormItem :label="t('common.branch')" path="branch">
          <NSelect v-model:value="customerForm.branch" :options="BRANCHES.map((b) => ({ label: b, value: b }))" />
        </NFormItem>
        <NFormItem :label="t('common.owner')" path="owner">
          <NSelect v-model:value="customerForm.owner" :options="ownerOptions" filterable :placeholder="t('common.owner')" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="newCustomerModalOpen = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="submitNewCustomer">{{ t('dashboard.createCustomer') }}</NButton>
        </div>
      </template>
    </NModal>

    <!-- Modal: Inventory Reorder -->
    <NModal v-model:show="reorderModalOpen" preset="card" :title="t('dashboard.reorderModalTitle')" class="w-full max-w-lg">
      <div v-if="store.lowStockProducts.length === 0" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {{ t('dashboard.nothingToReorder') }}
      </div>
      <ul v-else class="flex flex-col divide-y divide-surface-border dark:divide-surface-dark-border">
        <li v-for="product in store.lowStockProducts" :key="product.id" class="flex items-center justify-between gap-3 py-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ product.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ product.sku }} · {{ t('inventory.onHand', { count: product.stockOnHand }) }} · {{ t('dashboard.reorderAt', { threshold: product.reorderThreshold }) }}
            </p>
          </div>
          <NButton size="small" type="primary" class="min-h-9 shrink-0" @click="reorderProduct(product.id, product.reorderQuantity)">
            {{ t('dashboard.reorderQty', { qty: product.reorderQuantity }) }}
          </NButton>
        </li>
      </ul>
    </NModal>
  </div>
</template>
