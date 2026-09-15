<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NIcon,
  NModal,
  NPopconfirm,
  NSelect,
  NTag,
  type DataTableColumns,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { Filter, Minus, Plus, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useCrmStore } from '@/stores/useCrmStore'
import {
  PRODUCT_CATEGORIES,
  deriveStockStatus,
  type IProduct,
  type ProductCategory,
  type StockStatus,
} from '@/types/crm'
import type { ProductFilters } from '@/types/erp'

const store = useCrmStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function categoryLabel(category: ProductCategory): string {
  return t(`inventory.categories.${category}`)
}

function stockTagType(status: StockStatus): 'success' | 'warning' | 'error' {
  if (status === 'in_stock') return 'success'
  if (status === 'low_stock') return 'warning'
  return 'error'
}

const categoryOptions = computed<SelectOption[]>(() =>
  PRODUCT_CATEGORIES.map((c) => ({ label: categoryLabel(c), value: c })),
)

function formatPrice(product: IProduct): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: 2,
  }).format(product.unitPriceMinorUnits / 100)
}

function handleDelete(product: IProduct) {
  store.removeProduct(product.id)
  feedback.message?.success(t('common.removedToast', { name: product.name }))
}

function handleAdjust(product: IProduct, delta: number) {
  store.adjustStock(product.id, delta)
  feedback.message?.success(
    t('inventory.stockChangedToast', {
      name: product.name,
      direction: delta > 0 ? t('inventory.increased') : t('inventory.decreased'),
    }),
  )
}

const columns = computed<DataTableColumns<IProduct>>(() => [
  {
    title: t('inventory.product'),
    key: 'name',
    minWidth: 180,
    width: 180,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.name),
        h(
          'span',
          { class: 'block truncate text-xs text-gray-500 dark:text-gray-400' },
          `${row.sku} · ${row.warehouse}`,
        ),
      ]),
  },
  {
    title: t('common.category'),
    key: 'category',
    width: 140,
    render: (row) => categoryLabel(row.category),
  },
  {
    title: t('inventory.stock'),
    key: 'stockOnHand',
    width: 170,
    render: (row) => {
      const status = deriveStockStatus(row)
      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          NTag,
          { type: stockTagType(status), size: 'small', round: true },
          { default: () => t('inventory.onHand', { count: row.stockOnHand }) },
        ),
      ])
    },
  },
  {
    title: t('inventory.unitPrice'),
    key: 'unitPriceMinorUnits',
    width: 120,
    align: 'right',
    render: (row) => h('span', { class: 'font-medium tabular-nums' }, formatPrice(row)),
  },
  {
    title: t('inventory.adjust'),
    key: 'adjust',
    width: 110,
    render: (row) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            'aria-label': t('inventory.decreaseStock', { name: row.name }),
            onClick: () => handleAdjust(row, -10),
          },
          { icon: () => h(NIcon, null, { default: () => h(Minus) }) },
        ),
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            'aria-label': t('inventory.increaseStock', { name: row.name }),
            onClick: () => handleAdjust(row, 10),
          },
          { icon: () => h(NIcon, null, { default: () => h(Plus) }) },
        ),
      ]),
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
                'aria-label': `${t('common.delete')} ${row.name}`,
              },
              { icon: () => h(NIcon, null, { default: () => h(Trash) }) },
            ),
          default: () => t('common.deleteConfirm', { name: row.name }),
        },
      ),
  },
])

const pagination = computed(() => ({
  page: store.productPage,
  pageSize: store.productPageSize,
  itemCount: store.productsTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => store.setProductPage(page),
  onUpdatePageSize: (pageSize: number) => store.setProductPageSize(pageSize),
}))

const filterDrawerOpen = ref(false)
const draft = reactive<ProductFilters>({ ...store.productFilters })

watch(
  () => store.productFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setProductFilters({ ...draft })
  filterDrawerOpen.value = false
}

function resetFilters() {
  store.resetProductFilters()
  Object.assign(draft, store.productFilters)
}

function updateQuickSearch(value: string) {
  store.setProductFilters({ search: value })
}

// New product modal
const createModalOpen = ref(false)
const createFormRef = ref()
type NewProductDraft = Pick<IProduct, 'name' | 'sku' | 'category' | 'warehouse'> & {
  unitPrice: number
  stockOnHand: number
  reorderThreshold: number
}
function emptyDraft(): NewProductDraft {
  return {
    name: '',
    sku: '',
    category: 'finished_good',
    warehouse: 'A ombori',
    unitPrice: 150_000,
    stockOnHand: 100,
    reorderThreshold: 20,
  }
}
const newProduct = ref<NewProductDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  name: { required: true, message: t('inventory.nameRule'), trigger: 'blur' },
  sku: { required: true, message: t('inventory.skuRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newProduct.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newProduct.value
    store.addProduct({
      id: `prod-${Date.now()}`,
      sku: d.sku,
      name: d.name,
      category: d.category,
      unitPriceMinorUnits: Math.round(d.unitPrice * 100),
      currency: 'UZS',
      stockOnHand: d.stockOnHand,
      reorderThreshold: d.reorderThreshold,
      reorderQuantity: d.reorderThreshold * 3,
      warehouse: d.warehouse,
      branch: 'Toshkent — Bosh ofis',
      updatedAt: new Date().toISOString(),
    })
    feedback.message?.success(t('common.createdToast', { name: d.name }))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('inventory.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{
            t('common.matching', {
              count: store.productsTotalCount,
              item: t('inventory.title').toLowerCase(),
            })
          }}
        </p>
      </div>
      <NButton
        v-can="'erp.inventory.create'"
        type="primary"
        class="min-h-11"
        @click="openCreateModal"
      >
        <template #icon
          ><NIcon><Plus /></NIcon
        ></template>
        {{ t('inventory.newProduct') }}
      </NButton>
    </div>

    <div class="flex items-center gap-2">
      <NInput
        :value="store.productFilters.search"
        :placeholder="t('inventory.searchPlaceholder')"
        clearable
        class="min-h-11 flex-1"
        :aria-label="t('common.search')"
        @update:value="updateQuickSearch"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NBadge :value="store.activeProductFilterCount" :show="store.activeProductFilterCount > 0">
        <NButton
          class="min-h-11 min-w-11"
          :aria-label="t('inventory.advancedFilters')"
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
        :data="store.paginatedProducts"
        :pagination="pagination"
        :row-key="(row: IProduct) => row.id"
        remote
        flex-height
        class="h-full"
        :bordered="false"
      />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="store.paginatedProducts.length === 0"
        class="py-12 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        {{ t('inventory.noMatch') }}
      </div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard
          v-for="product in store.paginatedProducts"
          :key="product.id"
          size="small"
          :bordered="true"
          content-style="padding: 14px;"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ product.name }}</p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ product.sku }} · {{ product.warehouse }}
              </p>
            </div>
            <NTag
              :type="stockTagType(deriveStockStatus(product))"
              size="small"
              round
              class="shrink-0"
              >{{ t('inventory.onHand', { count: product.stockOnHand }) }}</NTag
            >
          </div>

          <div class="mt-3 flex items-center justify-between">
            <span class="text-base font-semibold">{{ formatPrice(product) }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{
              categoryLabel(product.category)
            }}</span>
          </div>

          <div
            class="mt-3 flex items-center justify-between gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border"
          >
            <div class="flex items-center gap-1">
              <NButton
                quaternary
                circle
                class="min-h-11 min-w-11"
                :aria-label="t('inventory.decreaseStock', { name: product.name })"
                @click="handleAdjust(product, -10)"
              >
                <template #icon
                  ><NIcon><Minus /></NIcon
                ></template>
              </NButton>
              <NButton
                quaternary
                circle
                class="min-h-11 min-w-11"
                :aria-label="t('inventory.increaseStock', { name: product.name })"
                @click="handleAdjust(product, 10)"
              >
                <template #icon
                  ><NIcon><Plus /></NIcon
                ></template>
              </NButton>
            </div>
            <NPopconfirm @positive-click="() => handleDelete(product)">
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  class="min-h-11 min-w-11"
                  :aria-label="`${t('common.delete')} ${product.name}`"
                >
                  <template #icon
                    ><NIcon><Trash /></NIcon
                  ></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: product.name }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination
        v-if="store.productsPageCount > 1"
        :page="store.productPage"
        :page-count="store.productsPageCount"
        simple
        class="mt-2 justify-center"
        @update:page="store.setProductPage"
      />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('inventory.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput
              v-model:value="draft.search"
              :placeholder="t('inventory.searchPlaceholder')"
              clearable
            />
          </NFormItem>
          <NFormItem :label="t('inventory.filter.category')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.categories">
              <div class="flex flex-col gap-3">
                <NCheckbox
                  v-for="option in categoryOptions"
                  :key="option.value as string"
                  :value="option.value"
                  :label="option.label as string"
                  class="min-h-11"
                />
              </div>
            </NCheckboxGroup>
          </NFormItem>
          <NFormItem label-placement="left" :label="t('inventory.filter.lowStockOnly')">
            <NSwitch v-model:value="draft.lowStockOnly" />
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
      :title="t('inventory.modalTitle')"
      :style="{ width: isCompact ? '92%' : '480px' }"
    >
      <NForm ref="createFormRef" :model="newProduct" :rules="createRules" label-placement="top">
        <NFormItem :label="t('common.name')" path="name"
          ><NInput v-model:value="newProduct.name"
        /></NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('inventory.sku')" path="sku"
            ><NInput v-model:value="newProduct.sku" placeholder="SKU-1000"
          /></NFormItem>
          <NFormItem :label="t('common.category')" path="category"
            ><NSelect v-model:value="newProduct.category" :options="categoryOptions"
          /></NFormItem>
        </div>
        <NFormItem :label="t('inventory.warehouse')" path="warehouse"
          ><NInput v-model:value="newProduct.warehouse"
        /></NFormItem>
        <div class="grid grid-cols-3 gap-3">
          <NFormItem :label="t('inventory.unitPrice')" path="unitPrice"
            ><NInputNumber v-model:value="newProduct.unitPrice" :min="0"
          /></NFormItem>
          <NFormItem :label="t('inventory.stock')" path="stockOnHand"
            ><NInputNumber v-model:value="newProduct.stockOnHand" :min="0"
          /></NFormItem>
          <NFormItem :label="t('inventory.reorderThreshold')" path="reorderThreshold"
            ><NInputNumber v-model:value="newProduct.reorderThreshold" :min="0"
          /></NFormItem>
        </div>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{
            t('common.cancel')
          }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{
            t('inventory.createProduct')
          }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
