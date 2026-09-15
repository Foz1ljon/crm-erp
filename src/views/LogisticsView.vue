<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NDropdown,
  NIcon,
  NModal,
  NPopconfirm,
  NTag,
  type DataTableColumns,
  type DropdownOption,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { Filter, Plus, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useErpStore } from '@/stores/useErpStore'
import {
  SHIPMENT_STATUSES,
  type IShipment,
  type ShipmentFilters,
  type ShipmentStatus,
} from '@/types/erp'

const store = useErpStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function statusLabel(status: ShipmentStatus): string {
  return t(`logistics.statuses.${status}`)
}

function statusTagType(status: ShipmentStatus): 'default' | 'info' | 'success' | 'error' {
  switch (status) {
    case 'preparing':
      return 'default'
    case 'in_transit':
      return 'info'
    case 'delivered':
      return 'success'
    case 'delayed':
      return 'error'
  }
}

const statusOptions = computed<SelectOption[]>(() =>
  SHIPMENT_STATUSES.map((s) => ({ label: statusLabel(s), value: s })),
)
const statusDropdownOptions = computed<DropdownOption[]>(() =>
  SHIPMENT_STATUSES.map((s) => ({ label: statusLabel(s), key: s })),
)

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function handleDelete(shipment: IShipment) {
  store.removeShipment(shipment.id)
  feedback.message?.success(t('common.removedToast', { name: shipment.shipmentNumber }))
}

function handleStatusChange(shipment: IShipment, status: ShipmentStatus) {
  store.setShipmentStatus(shipment.id, status)
  feedback.message?.success(
    t('logistics.statusUpdatedToast', {
      shipment: shipment.shipmentNumber,
      status: statusLabel(status),
    }),
  )
}

const columns = computed<DataTableColumns<IShipment>>(() => [
  {
    title: t('logistics.shipment'),
    key: 'shipmentNumber',
    minWidth: 180,
    width: 180,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.shipmentNumber),
        h(
          'span',
          { class: 'block truncate text-xs text-gray-500 dark:text-gray-400' },
          row.carrier,
        ),
      ]),
  },
  {
    title: t('logistics.route'),
    key: 'route',
    width: 200,
    render: (row) => `${row.origin} → ${row.destination}`,
  },
  {
    title: t('common.status'),
    key: 'status',
    width: 150,
    render: (row) =>
      h(
        NDropdown,
        {
          options: statusDropdownOptions.value,
          trigger: 'click',
          onSelect: (key: string) => handleStatusChange(row, key as ShipmentStatus),
        },
        {
          default: () =>
            h(
              NTag,
              {
                type: statusTagType(row.status),
                size: 'small',
                round: true,
                style: { cursor: 'pointer' },
              },
              { default: () => statusLabel(row.status) },
            ),
        },
      ),
  },
  {
    title: t('logistics.eta'),
    key: 'estimatedArrival',
    width: 130,
    render: (row) => dateFormatter.format(new Date(row.estimatedArrival)),
  },
  { title: t('logistics.trackingNumber'), key: 'trackingNumber', width: 150 },
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
                'aria-label': `${t('common.delete')} ${row.shipmentNumber}`,
              },
              { icon: () => h(NIcon, null, { default: () => h(Trash) }) },
            ),
          default: () => t('common.deleteConfirm', { name: row.shipmentNumber }),
        },
      ),
  },
])

const pagination = computed(() => ({
  page: store.shipmentPage,
  pageSize: store.shipmentPageSize,
  itemCount: store.shipmentsTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => (store.shipmentPage = page),
  onUpdatePageSize: (pageSize: number) => {
    store.shipmentPageSize = pageSize
    store.shipmentPage = 1
  },
}))

const filterDrawerOpen = ref(false)
const draft = reactive<ShipmentFilters>({ ...store.shipmentFilters })

watch(
  () => store.shipmentFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setShipmentFilters({ ...draft })
  filterDrawerOpen.value = false
}
function resetFilters() {
  store.resetShipmentFilters()
  Object.assign(draft, store.shipmentFilters)
}
function updateQuickSearch(value: string) {
  store.setShipmentFilters({ search: value })
}

// New shipment modal
const createModalOpen = ref(false)
const createFormRef = ref()
type NewShipmentDraft = Pick<IShipment, 'carrier' | 'origin' | 'destination'>
function emptyDraft(): NewShipmentDraft {
  return { carrier: '', origin: '', destination: '' }
}
const newShipment = ref<NewShipmentDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  carrier: { required: true, message: t('logistics.carrierRule'), trigger: 'blur' },
  origin: { required: true, message: t('logistics.originRule'), trigger: 'blur' },
  destination: { required: true, message: t('logistics.destinationRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newShipment.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newShipment.value
    store.addShipment({
      id: `ship-${Date.now()}`,
      shipmentNumber: `SHP-${Math.floor(6000 + Math.random() * 3000)}`,
      purchaseOrderId: null,
      carrier: d.carrier,
      origin: d.origin,
      destination: d.destination,
      status: 'preparing',
      trackingNumber: `TRK${Math.floor(100000000 + Math.random() * 899999999)}`,
      branch: 'Toshkent — Bosh ofis',
      dispatchedAt: new Date().toISOString(),
      estimatedArrival: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      deliveredAt: null,
    })
    feedback.message?.success(t('logistics.createdToast'))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('logistics.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('logistics.count', { count: store.shipmentsTotalCount }) }}
        </p>
      </div>
      <NButton
        v-can="'erp.logistics.create'"
        type="primary"
        class="min-h-11"
        @click="openCreateModal"
      >
        <template #icon
          ><NIcon><Plus /></NIcon
        ></template>
        {{ t('logistics.newShipment') }}
      </NButton>
    </div>

    <div class="flex items-center gap-2">
      <NInput
        :value="store.shipmentFilters.search"
        :placeholder="t('logistics.searchPlaceholder')"
        clearable
        class="min-h-11 flex-1"
        :aria-label="t('common.search')"
        @update:value="updateQuickSearch"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NBadge :value="store.activeShipmentFilterCount" :show="store.activeShipmentFilterCount > 0">
        <NButton
          class="min-h-11 min-w-11"
          :aria-label="t('logistics.advancedFilters')"
          @click="filterDrawerOpen = true"
        >
          <template #icon
            ><NIcon><Filter /></NIcon
          ></template>
        </NButton>
      </NBadge>
    </div>

    <div v-if="!isCompact" class="min-h-0 flex-1">
      <NDataTable
        :columns="columns"
        :data="store.paginatedShipments"
        :pagination="pagination"
        :row-key="(row: IShipment) => row.id"
        remote
        flex-height
        class="h-full"
        :bordered="false"
      />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="store.paginatedShipments.length === 0"
        class="py-12 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        {{ t('logistics.noMatch') }}
      </div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard
          v-for="shipment in store.paginatedShipments"
          :key="shipment.id"
          size="small"
          :bordered="true"
          content-style="padding: 14px;"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ shipment.shipmentNumber }}</p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ shipment.carrier }}
              </p>
            </div>
            <NTag :type="statusTagType(shipment.status)" size="small" round class="shrink-0">{{
              statusLabel(shipment.status)
            }}</NTag>
          </div>
          <div class="mt-3 flex items-center justify-between text-sm">
            <span>{{ shipment.origin }} → {{ shipment.destination }}</span>
          </div>
          <div
            class="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
          >
            <span>{{ shipment.trackingNumber }}</span>
            <span
              >{{ t('logistics.eta') }}
              {{ dateFormatter.format(new Date(shipment.estimatedArrival)) }}</span
            >
          </div>
          <div
            class="mt-3 flex items-center justify-between gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border"
          >
            <NSelect
              :value="shipment.status"
              :options="statusOptions"
              size="small"
              class="flex-1"
              :aria-label="t('common.status')"
              @update:value="(value: ShipmentStatus) => handleStatusChange(shipment, value)"
            />
            <NPopconfirm @positive-click="() => handleDelete(shipment)">
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  class="min-h-11 min-w-11"
                  :aria-label="`${t('common.delete')} ${shipment.shipmentNumber}`"
                >
                  <template #icon
                    ><NIcon><Trash /></NIcon
                  ></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: shipment.shipmentNumber }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination
        v-if="store.shipmentsPageCount > 1"
        :page="store.shipmentPage"
        :page-count="store.shipmentsPageCount"
        simple
        class="mt-2 justify-center"
        @update:page="(p: number) => (store.shipmentPage = p)"
      />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('logistics.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput
              v-model:value="draft.search"
              :placeholder="t('logistics.searchPlaceholder')"
              clearable
            />
          </NFormItem>
          <NFormItem :label="t('logistics.filter.status')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.statuses">
              <div class="flex flex-col gap-3">
                <NCheckbox
                  v-for="option in statusOptions"
                  :key="option.value as string"
                  :value="option.value"
                  :label="option.label as string"
                  class="min-h-11"
                />
              </div>
            </NCheckboxGroup>
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

    <NModal
      v-model:show="createModalOpen"
      preset="card"
      :title="t('logistics.modalTitle')"
      :style="{ width: isCompact ? '92%' : '480px' }"
    >
      <NForm ref="createFormRef" :model="newShipment" :rules="createRules" label-placement="top">
        <NFormItem :label="t('logistics.carrier')" path="carrier"
          ><NInput
            v-model:value="newShipment.carrier"
            :placeholder="t('logistics.carrierPlaceholder')"
        /></NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('logistics.origin')" path="origin"
            ><NInput v-model:value="newShipment.origin"
          /></NFormItem>
          <NFormItem :label="t('logistics.destination')" path="destination"
            ><NInput v-model:value="newShipment.destination"
          /></NFormItem>
        </div>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{
            t('common.cancel')
          }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{
            t('logistics.createShipment')
          }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
