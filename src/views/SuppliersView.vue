<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NIcon, NModal, NPopconfirm, NRate, NTag, type DataTableColumns, type FormRules, type SelectOption } from 'naive-ui'
import { Filter, Plus, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useErpStore } from '@/stores/useErpStore'
import type { ISupplier, SupplierFilters, SupplierStatus } from '@/types/erp'

const store = useErpStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function statusLabel(status: SupplierStatus): string {
  return t(`suppliers.statuses.${status}`)
}

const statusOptions = computed<SelectOption[]>(() => [
  { label: statusLabel('active'), value: 'active' },
  { label: statusLabel('inactive'), value: 'inactive' },
])

function statusTagType(status: SupplierStatus): 'success' | 'default' {
  return status === 'active' ? 'success' : 'default'
}

function handleDelete(supplier: ISupplier) {
  store.removeSupplier(supplier.id)
  feedback.message?.success(t('common.removedToast', { name: supplier.name }))
}

const columns = computed<DataTableColumns<ISupplier>>(() => [
  {
    title: t('suppliers.supplier'),
    key: 'name',
    minWidth: 200,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.name),
        h('span', { class: 'block truncate text-xs text-gray-500 dark:text-gray-400' }, row.contactName),
      ]),
  },
  { title: t('common.category'), key: 'category', width: 150 },
  { title: t('suppliers.rating'), key: 'rating', width: 130, render: (row) => h(NRate, { readonly: true, value: row.rating, size: 'small' }) },
  { title: t('common.status'), key: 'status', width: 110, render: (row) => h(NTag, { type: statusTagType(row.status), size: 'small', round: true }, { default: () => statusLabel(row.status) }) },
  { title: t('common.branch'), key: 'branch', width: 160 },
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
            h(NButton, { quaternary: true, circle: true, size: 'small', 'aria-label': `${t('common.delete')} ${row.name}` }, { icon: () => h(NIcon, null, { default: () => h(Trash) }) }),
          default: () => t('common.deleteConfirm', { name: row.name }),
        },
      ),
  },
])

const pagination = computed(() => ({
  page: store.supplierPage,
  pageSize: store.supplierPageSize,
  itemCount: store.suppliersTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => (store.supplierPage = page),
  onUpdatePageSize: (pageSize: number) => {
    store.supplierPageSize = pageSize
    store.supplierPage = 1
  },
}))

const filterDrawerOpen = ref(false)
const draft = reactive<SupplierFilters>({ ...store.supplierFilters })

watch(
  () => store.supplierFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setSupplierFilters({ ...draft })
  filterDrawerOpen.value = false
}
function resetFilters() {
  store.resetSupplierFilters()
  Object.assign(draft, store.supplierFilters)
}
function updateQuickSearch(value: string) {
  store.setSupplierFilters({ search: value })
}

// New supplier modal
const createModalOpen = ref(false)
const createFormRef = ref()
type NewSupplierDraft = Pick<ISupplier, 'name' | 'contactName' | 'email' | 'phone' | 'category' | 'address'>
function emptyDraft(): NewSupplierDraft {
  return { name: '', contactName: '', email: '', phone: '', category: '', address: '' }
}
const newSupplier = ref<NewSupplierDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  name: { required: true, message: t('suppliers.nameRule'), trigger: 'blur' },
  contactName: { required: true, message: t('suppliers.contactNameRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newSupplier.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newSupplier.value
    store.addSupplier({
      id: `sup-${Date.now()}`,
      name: d.name,
      contactName: d.contactName,
      email: d.email,
      phone: d.phone,
      category: d.category || 'General',
      rating: 4,
      status: 'active',
      address: d.address,
      branch: 'Toshkent — Bosh ofis',
      createdAt: new Date().toISOString(),
    })
    feedback.message?.success(t('suppliers.addedToast', { name: d.name }))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('suppliers.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('suppliers.summary', { total: store.suppliersTotalCount, active: store.activeSuppliersCount }) }}</p>
      </div>
      <NButton v-can="'erp.suppliers.create'" type="primary" class="min-h-11" @click="openCreateModal">
        <template #icon><NIcon><Plus /></NIcon></template>
        {{ t('suppliers.newSupplier') }}
      </NButton>
    </div>

    <div class="flex items-center gap-2">
      <NInput :value="store.supplierFilters.search" :placeholder="t('suppliers.searchPlaceholder')" clearable class="min-h-11 flex-1" :aria-label="t('common.search')" @update:value="updateQuickSearch">
        <template #prefix><NIcon><Search /></NIcon></template>
      </NInput>
      <NBadge :value="store.activeSupplierFilterCount" :show="store.activeSupplierFilterCount > 0">
        <NButton class="min-h-11 min-w-11" :aria-label="t('suppliers.advancedFilters')" @click="filterDrawerOpen = true">
          <template #icon><NIcon><Filter /></NIcon></template>
        </NButton>
      </NBadge>
    </div>

    <div v-if="!isCompact" class="min-h-0 flex-1">
      <NDataTable :columns="columns" :data="store.paginatedSuppliers" :pagination="pagination" :row-key="(row: ISupplier) => row.id" remote flex-height class="h-full" :bordered="false" />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="store.paginatedSuppliers.length === 0" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('suppliers.noMatch') }}</div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard v-for="supplier in store.paginatedSuppliers" :key="supplier.id" size="small" :bordered="true" content-style="padding: 14px;">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ supplier.name }}</p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ supplier.contactName }} · {{ supplier.category }}</p>
            </div>
            <NTag :type="statusTagType(supplier.status)" size="small" round class="shrink-0">{{ statusLabel(supplier.status) }}</NTag>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <NRate readonly :value="supplier.rating" size="small" />
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ supplier.branch }}</span>
          </div>
          <div class="mt-3 flex items-center justify-end gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border">
            <NPopconfirm @positive-click="() => handleDelete(supplier)">
              <template #trigger>
                <NButton quaternary circle class="min-h-11 min-w-11" :aria-label="`${t('common.delete')} ${supplier.name}`">
                  <template #icon><NIcon><Trash /></NIcon></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: supplier.name }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination v-if="store.suppliersPageCount > 1" :page="store.supplierPage" :page-count="store.suppliersPageCount" simple class="mt-2 justify-center" @update:page="(p: number) => (store.supplierPage = p)" />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('suppliers.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput v-model:value="draft.search" :placeholder="t('suppliers.searchPlaceholder')" clearable />
          </NFormItem>
          <NFormItem :label="t('suppliers.filter.status')" label-placement="top">
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

    <NModal v-model:show="createModalOpen" preset="card" :title="t('suppliers.modalTitle')" :style="{ width: isCompact ? '92%' : '480px' }">
      <NForm ref="createFormRef" :model="newSupplier" :rules="createRules" label-placement="top">
        <NFormItem :label="t('suppliers.companyName')" path="name"><NInput v-model:value="newSupplier.name" /></NFormItem>
        <NFormItem :label="t('suppliers.contactName')" path="contactName"><NInput v-model:value="newSupplier.contactName" /></NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('common.email')" path="email"><NInput v-model:value="newSupplier.email" /></NFormItem>
          <NFormItem :label="t('common.phone')" path="phone"><NInput v-model:value="newSupplier.phone" /></NFormItem>
        </div>
        <NFormItem :label="t('common.category')" path="category"><NInput v-model:value="newSupplier.category" :placeholder="t('suppliers.categoryPlaceholder')" /></NFormItem>
        <NFormItem :label="t('suppliers.address')" path="address"><NInput v-model:value="newSupplier.address" /></NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{ t('common.cancel') }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{ t('suppliers.addSupplier') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
