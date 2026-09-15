<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NDropdown, NIcon, NModal, NPopconfirm, NTag, type DataTableColumns, type DropdownOption, type FormRules, type SelectOption } from 'naive-ui'
import { Filter, Plus, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useErpStore } from '@/stores/useErpStore'
import { PURCHASE_ORDER_STATUSES, type IPurchaseOrder, type PurchaseOrderFilters, type PurchaseOrderStatus } from '@/types/erp'

const store = useErpStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function statusLabel(status: PurchaseOrderStatus): string {
  return t(`purchaseOrders.statuses.${status}`)
}

function statusTagType(status: PurchaseOrderStatus): 'default' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'draft':
      return 'default'
    case 'submitted':
      return 'info'
    case 'approved':
      return 'warning'
    case 'received':
      return 'success'
    case 'cancelled':
      return 'error'
  }
}

const statusOptions = computed<SelectOption[]>(() => PURCHASE_ORDER_STATUSES.map((s) => ({ label: statusLabel(s), value: s })))
const statusDropdownOptions = computed<DropdownOption[]>(() => PURCHASE_ORDER_STATUSES.map((s) => ({ label: statusLabel(s), key: s })))

function formatTotal(po: IPurchaseOrder): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: po.currency, maximumFractionDigits: 0 }).format(po.totalMinorUnits / 100)
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function handleDelete(po: IPurchaseOrder) {
  store.removePurchaseOrder(po.id)
  feedback.message?.success(t('common.removedToast', { name: po.poNumber }))
}

function handleStatusChange(po: IPurchaseOrder, status: PurchaseOrderStatus) {
  store.setPurchaseOrderStatus(po.id, status)
  feedback.message?.success(t('purchaseOrders.statusUpdatedToast', { po: po.poNumber, status: statusLabel(status) }))
}

const columns = computed<DataTableColumns<IPurchaseOrder>>(() => [
  {
    title: t('purchaseOrders.poNumber'),
    key: 'poNumber',
    minWidth: 180,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.poNumber),
        h('span', { class: 'block truncate text-xs text-gray-500 dark:text-gray-400' }, row.supplierName),
      ]),
  },
  { title: t('purchaseOrders.items'), key: 'lineItems', width: 80, render: (row) => `${row.lineItems.length}` },
  {
    title: t('common.status'),
    key: 'status',
    width: 160,
    render: (row) =>
      h(
        NDropdown,
        { options: statusDropdownOptions.value, trigger: 'click', onSelect: (key: string) => handleStatusChange(row, key as PurchaseOrderStatus) },
        { default: () => h(NTag, { type: statusTagType(row.status), size: 'small', round: true, style: { cursor: 'pointer' } }, { default: () => statusLabel(row.status) }) },
      ),
  },
  { title: t('purchaseOrders.expected'), key: 'expectedDeliveryDate', width: 130, render: (row) => dateFormatter.format(new Date(row.expectedDeliveryDate)) },
  { title: t('purchaseOrders.total'), key: 'totalMinorUnits', width: 130, align: 'right', render: (row) => h('span', { class: 'font-medium tabular-nums' }, formatTotal(row)) },
  {
    title: '',
    key: 'actions',
    width: 56,
    render: (row) =>
      h(
        NPopconfirm,
        { onPositiveClick: () => handleDelete(row) },
        {
          trigger: () => h(NButton, { quaternary: true, circle: true, size: 'small', 'aria-label': `${t('common.delete')} ${row.poNumber}` }, { icon: () => h(NIcon, null, { default: () => h(Trash) }) }),
          default: () => t('common.deleteConfirm', { name: row.poNumber }),
        },
      ),
  },
])

const pagination = computed(() => ({
  page: store.purchaseOrderPage,
  pageSize: store.purchaseOrderPageSize,
  itemCount: store.purchaseOrdersTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => (store.purchaseOrderPage = page),
  onUpdatePageSize: (pageSize: number) => {
    store.purchaseOrderPageSize = pageSize
    store.purchaseOrderPage = 1
  },
}))

const filterDrawerOpen = ref(false)
const draft = reactive<PurchaseOrderFilters>({ ...store.purchaseOrderFilters })

watch(
  () => store.purchaseOrderFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setPurchaseOrderFilters({ ...draft })
  filterDrawerOpen.value = false
}
function resetFilters() {
  store.resetPurchaseOrderFilters()
  Object.assign(draft, store.purchaseOrderFilters)
}
function updateQuickSearch(value: string) {
  store.setPurchaseOrderFilters({ search: value })
}

// New PO modal
const createModalOpen = ref(false)
const createFormRef = ref()
const supplierOptions = computed<SelectOption[]>(() => store.suppliers.map((s) => ({ label: s.name, value: s.id })))
type NewPoDraft = { supplierId: string; productName: string; quantity: number; unitPrice: number }
function emptyDraft(): NewPoDraft {
  return { supplierId: store.suppliers[0]?.id ?? '', productName: '', quantity: 50, unitPrice: 150_000 }
}
const newPo = ref<NewPoDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  supplierId: { required: true, message: t('purchaseOrders.supplierRule'), trigger: 'change' },
  productName: { required: true, message: t('purchaseOrders.productRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newPo.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newPo.value
    const supplier = store.suppliers.find((s) => s.id === d.supplierId)
    if (!supplier) return
    const unitPriceMinorUnits = Math.round(d.unitPrice * 100)
    store.addPurchaseOrder({
      id: `po-${Date.now()}`,
      poNumber: `PO-${Math.floor(2_030_000 + Math.random() * 9000)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: 'draft',
      lineItems: [{ productName: d.productName, quantity: d.quantity, unitPriceMinorUnits }],
      totalMinorUnits: d.quantity * unitPriceMinorUnits,
      currency: 'UZS',
      branch: supplier.branch,
      orderedAt: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    })
    feedback.message?.success(t('purchaseOrders.createdToast'))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('purchaseOrders.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('purchaseOrders.count', { count: store.purchaseOrdersTotalCount }) }}</p>
      </div>
      <NButton v-can="'erp.purchase_orders.create'" type="primary" class="min-h-11" @click="openCreateModal">
        <template #icon><NIcon><Plus /></NIcon></template>
        {{ t('purchaseOrders.newPo') }}
      </NButton>
    </div>

    <div class="flex items-center gap-2">
      <NInput :value="store.purchaseOrderFilters.search" :placeholder="t('purchaseOrders.searchPlaceholder')" clearable class="min-h-11 flex-1" :aria-label="t('common.search')" @update:value="updateQuickSearch">
        <template #prefix><NIcon><Search /></NIcon></template>
      </NInput>
      <NBadge :value="store.activePurchaseOrderFilterCount" :show="store.activePurchaseOrderFilterCount > 0">
        <NButton class="min-h-11 min-w-11" :aria-label="t('purchaseOrders.advancedFilters')" @click="filterDrawerOpen = true">
          <template #icon><NIcon><Filter /></NIcon></template>
        </NButton>
      </NBadge>
    </div>

    <div v-if="!isCompact" class="min-h-0 flex-1">
      <NDataTable :columns="columns" :data="store.paginatedPurchaseOrders" :pagination="pagination" :row-key="(row: IPurchaseOrder) => row.id" remote flex-height class="h-full" :bordered="false" />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="store.paginatedPurchaseOrders.length === 0" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('purchaseOrders.noMatch') }}</div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard v-for="po in store.paginatedPurchaseOrders" :key="po.id" size="small" :bordered="true" content-style="padding: 14px;">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ po.poNumber }}</p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ po.supplierName }} · {{ po.lineItems.length }} {{ t('purchaseOrders.items').toLowerCase() }}</p>
            </div>
            <NTag :type="statusTagType(po.status)" size="small" round class="shrink-0">{{ statusLabel(po.status) }}</NTag>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-base font-semibold">{{ formatTotal(po) }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ dateFormatter.format(new Date(po.expectedDeliveryDate)) }}</span>
          </div>
          <div class="mt-3 flex items-center justify-between gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border">
            <NSelect
              :value="po.status"
              :options="statusOptions"
              size="small"
              class="flex-1"
              :aria-label="t('common.status')"
              @update:value="(value: PurchaseOrderStatus) => handleStatusChange(po, value)"
            />
            <NPopconfirm @positive-click="() => handleDelete(po)">
              <template #trigger>
                <NButton quaternary circle class="min-h-11 min-w-11" :aria-label="`${t('common.delete')} ${po.poNumber}`">
                  <template #icon><NIcon><Trash /></NIcon></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: po.poNumber }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination v-if="store.purchaseOrdersPageCount > 1" :page="store.purchaseOrderPage" :page-count="store.purchaseOrdersPageCount" simple class="mt-2 justify-center" @update:page="(p: number) => (store.purchaseOrderPage = p)" />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('purchaseOrders.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput v-model:value="draft.search" :placeholder="t('purchaseOrders.searchPlaceholder')" clearable />
          </NFormItem>
          <NFormItem :label="t('purchaseOrders.filter.status')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.statuses">
              <div class="flex flex-col gap-3">
                <NCheckbox v-for="option in statusOptions" :key="option.value as string" :value="option.value" :label="option.label as string" class="min-h-11" />
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

    <NModal v-model:show="createModalOpen" preset="card" :title="t('purchaseOrders.modalTitle')" :style="{ width: isCompact ? '92%' : '480px' }">
      <NForm ref="createFormRef" :model="newPo" :rules="createRules" label-placement="top">
        <NFormItem :label="t('purchaseOrders.supplier')" path="supplierId"><NSelect v-model:value="newPo.supplierId" :options="supplierOptions" /></NFormItem>
        <NFormItem :label="t('purchaseOrders.product')" path="productName"><NInput v-model:value="newPo.productName" :placeholder="t('purchaseOrders.productPlaceholder')" /></NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('purchaseOrders.quantity')" path="quantity"><NInputNumber v-model:value="newPo.quantity" :min="1" class="w-full" /></NFormItem>
          <NFormItem :label="t('purchaseOrders.unitPrice')" path="unitPrice"><NInputNumber v-model:value="newPo.unitPrice" :min="0" class="w-full" /></NFormItem>
        </div>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{ t('common.cancel') }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{ t('purchaseOrders.createPo') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
