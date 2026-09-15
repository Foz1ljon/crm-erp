<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NDropdown,
  NIcon,
  NModal,
  NPopconfirm,
  NSelect,
  NTag,
  type DataTableColumns,
  type DropdownOption,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { ArrowRight, Filter, Plus, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useCrmStore } from '@/stores/useCrmStore'
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type ILead,
  type LeadFilters,
  type LeadSource,
  type LeadStatus,
} from '@/types/crm'

const store = useCrmStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function statusLabel(status: LeadStatus): string {
  return t(`leads.statuses.${status}`)
}
function sourceLabel(source: LeadSource): string {
  return t(`leads.sources.${source}`)
}

function statusTagType(status: LeadStatus): 'default' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'new':
      return 'default'
    case 'contacted':
      return 'info'
    case 'qualified':
      return 'warning'
    case 'converted':
      return 'success'
    case 'unqualified':
      return 'error'
  }
}

const statusOptions = computed<SelectOption[]>(() =>
  LEAD_STATUSES.map((s) => ({ label: statusLabel(s), value: s })),
)
const statusDropdownOptions = computed<DropdownOption[]>(() =>
  LEAD_STATUSES.map((s) => ({ label: statusLabel(s), key: s })),
)
const sourceOptions = computed<SelectOption[]>(() =>
  LEAD_SOURCES.map((s) => ({ label: sourceLabel(s), value: s })),
)

function formatAmount(lead: ILead): string {
  const amount = store.toDisplayCurrency(lead.estimatedValueMinorUnits, lead.currency)
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

function handleDelete(lead: ILead) {
  store.removeLead(lead.id)
  feedback.message?.success(t('common.removedToast', { name: lead.name }))
}

function handleStatusChange(lead: ILead, status: LeadStatus) {
  store.setLeadStatus(lead.id, status)
  feedback.message?.success(t('leads.statusUpdatedToast', { status: statusLabel(status) }))
}

function handleConvert(lead: ILead) {
  const customer = store.convertLead(lead.id)
  if (customer) feedback.message?.success(t('leads.convertToast', { company: lead.company }))
}

// ---------------------------------------------------------------------------
// Funnel widget
// ---------------------------------------------------------------------------
const funnelMax = computed(() => Math.max(1, ...store.leadFunnel.map((f) => f.count)))

// ---------------------------------------------------------------------------
// Desktop data table
// ---------------------------------------------------------------------------
const columns = computed<DataTableColumns<ILead>>(() => [
  {
    title: t('leads.title'),
    key: 'name',
    minWidth: 180,
    width: 200,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.name),
        h(
          'span',
          { class: 'block truncate text-xs text-gray-600 dark:text-gray-400' },
          row.company,
        ),
      ]),
  },
  { title: t('common.owner'), key: 'owner', width: 150 },
  { title: t('leads.source'), key: 'source', width: 130, render: (row) => sourceLabel(row.source) },
  {
    title: t('common.status'),
    key: 'status',
    width: 160,
    render: (row) =>
      h(
        NDropdown,
        {
          options: statusDropdownOptions.value,
          trigger: 'click',
          onSelect: (key: string) => handleStatusChange(row, key as LeadStatus),
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
    title: t('leads.estValue'),
    key: 'estimatedValueMinorUnits',
    width: 130,
    align: 'right',
    render: (row) => h('span', { class: 'font-medium tabular-nums' }, formatAmount(row)),
  },
  {
    title: t('leads.created'),
    key: 'createdAt',
    width: 130,
    render: (row) => dateFormatter.format(new Date(row.createdAt)),
  },
  {
    title: '',
    key: 'actions',
    width: 96,
    render: (row) =>
      h('div', { class: 'flex items-center justify-end gap-1' }, [
        row.status !== 'converted'
          ? h(
              NButton,
              {
                quaternary: true,
                circle: true,
                size: 'small',
                'aria-label': `${t('leads.convert')} ${row.name}`,
                onClick: () => handleConvert(row),
              },
              { icon: () => h(NIcon, null, { default: () => h(ArrowRight) }) },
            )
          : null,
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
      ]),
  },
])

const pagination = computed(() => ({
  page: store.leadPage,
  pageSize: store.leadPageSize,
  itemCount: store.leadsTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => store.setLeadPage(page),
  onUpdatePageSize: (pageSize: number) => store.setLeadPageSize(pageSize),
}))

// ---------------------------------------------------------------------------
// Advanced filter drawer
// ---------------------------------------------------------------------------
const filterDrawerOpen = ref(false)
const draft = reactive<LeadFilters>({ ...store.leadFilters })

watch(
  () => store.leadFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

const ownerOptions = computed<SelectOption[]>(() =>
  store.leadOwners.map((owner) => ({ label: owner, value: owner })),
)

function applyFilters() {
  store.setLeadFilters({ ...draft })
  filterDrawerOpen.value = false
}

function resetFilters() {
  store.resetLeadFilters()
  Object.assign(draft, store.leadFilters)
}

function updateQuickSearch(value: string) {
  store.setLeadFilters({ search: value })
}

// ---------------------------------------------------------------------------
// New lead modal
// ---------------------------------------------------------------------------
const createModalOpen = ref(false)
const createFormRef = ref()
type NewLeadDraft = Pick<ILead, 'name' | 'company' | 'email' | 'phone' | 'owner'> & {
  source: LeadSource
  estimatedValue: number
}
function emptyDraft(): NewLeadDraft {
  return {
    name: '',
    company: '',
    email: '',
    phone: '',
    owner: store.leadOwners[0] ?? 'Aziz Karimov',
    source: 'website',
    estimatedValue: 15_000_000,
  }
}
const newLead = ref<NewLeadDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  name: { required: true, message: t('leads.nameRule'), trigger: 'blur' },
  company: { required: true, message: t('leads.companyRule'), trigger: 'blur' },
  email: { required: true, type: 'email', message: t('leads.emailRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newLead.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const draftValue = newLead.value
    store.addLead({
      id: `lead-${Date.now()}`,
      name: draftValue.name,
      company: draftValue.company,
      email: draftValue.email,
      phone: draftValue.phone,
      source: draftValue.source,
      status: 'new',
      owner: draftValue.owner,
      branch: 'Toshkent — Bosh ofis',
      estimatedValueMinorUnits: Math.round(draftValue.estimatedValue * 100),
      currency: store.universalFilters.currency,
      convertedCustomerId: null,
      createdAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    })
    feedback.message?.success(t('common.createdToast', { name: draftValue.name }))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('leads.title') }}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            t('common.matching', {
              count: store.leadsTotalCount,
              item: t('leads.title').toLowerCase(),
            })
          }}
        </p>
      </div>
      <NButton v-can="'crm.leads.create'" type="primary" class="min-h-11" @click="openCreateModal">
        <template #icon
          ><NIcon><Plus /></NIcon
        ></template>
        {{ t('leads.newLead') }}
      </NButton>
    </div>

    <!-- Conversion funnel -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div
        v-for="stage in store.leadFunnel"
        :key="stage.status"
        class="rounded-xl border border-surface-border bg-surface-0 p-3 dark:border-surface-dark-border dark:bg-surface-dark-100"
      >
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ statusLabel(stage.status) }}</p>
        <p class="mt-1 text-xl font-semibold tabular-nums">{{ stage.count }}</p>
        <div class="mt-2 h-1.5 rounded-full bg-surface-100 dark:bg-surface-dark-200">
          <div
            class="h-1.5 rounded-full bg-brand-500"
            :style="{ width: `${(stage.count / funnelMax) * 100}%` }"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <NInput
        :value="store.leadFilters.search"
        :placeholder="t('leads.searchPlaceholder')"
        clearable
        class="min-h-11 flex-1"
        :aria-label="t('common.search')"
        @update:value="updateQuickSearch"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NBadge :value="store.activeLeadFilterCount" :show="store.activeLeadFilterCount > 0">
        <NButton
          class="min-h-11 min-w-11"
          :aria-label="t('leads.advancedFilters')"
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
        :data="store.paginatedLeads"
        :pagination="pagination"
        :row-key="(row: ILead) => row.id"
        remote
        flex-height
        class="h-full"
        :bordered="false"
      />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="store.paginatedLeads.length === 0"
        class="py-12 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        {{ t('leads.noMatch') }}
      </div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard
          v-for="lead in store.paginatedLeads"
          :key="lead.id"
          size="small"
          :bordered="true"
          content-style="padding: 14px;"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ lead.name }}</p>
              <p class="truncate text-xs text-gray-600 dark:text-gray-400">{{ lead.company }}</p>
            </div>
            <NTag :type="statusTagType(lead.status)" size="small" round class="shrink-0">{{
              statusLabel(lead.status)
            }}</NTag>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <span class="text-base font-semibold">{{ formatAmount(lead) }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-400">{{
              sourceLabel(lead.source)
            }}</span>
          </div>

          <div
            class="mt-3 flex items-center justify-between gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border"
          >
            <NSelect
              :value="lead.status"
              :options="statusOptions"
              size="small"
              class="flex-1"
              :aria-label="t('leads.changeStatus')"
              @update:value="(value: LeadStatus) => handleStatusChange(lead, value)"
            />
            <NButton
              v-if="lead.status !== 'converted'"
              quaternary
              circle
              class="min-h-11 min-w-11"
              :aria-label="`${t('leads.convert')} ${lead.name}`"
              @click="handleConvert(lead)"
            >
              <template #icon
                ><NIcon><ArrowRight /></NIcon
              ></template>
            </NButton>
            <NPopconfirm @positive-click="() => handleDelete(lead)">
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  class="min-h-11 min-w-11"
                  :aria-label="`${t('common.delete')} ${lead.name}`"
                >
                  <template #icon
                    ><NIcon><Trash /></NIcon
                  ></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: lead.name }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination
        v-if="store.leadsPageCount > 1"
        :page="store.leadPage"
        :page-count="store.leadsPageCount"
        simple
        class="mt-2 justify-center"
        @update:page="store.setLeadPage"
      />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('leads.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput
              v-model:value="draft.search"
              :placeholder="t('leads.searchPlaceholder')"
              clearable
            />
          </NFormItem>

          <NFormItem :label="t('leads.filter.status')" label-placement="top">
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

          <NFormItem :label="t('leads.filter.source')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.sources">
              <div class="flex flex-col gap-3">
                <NCheckbox
                  v-for="option in sourceOptions"
                  :key="option.value as string"
                  :value="option.value"
                  :label="option.label as string"
                  class="min-h-11"
                />
              </div>
            </NCheckboxGroup>
          </NFormItem>

          <NFormItem :label="t('leads.filter.owner')" label-placement="top">
            <NSelect
              v-model:value="draft.owners"
              :options="ownerOptions"
              multiple
              :placeholder="t('common.any')"
            />
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
      :title="t('leads.modalTitle')"
      :style="{ width: isCompact ? '92%' : '480px' }"
    >
      <NForm ref="createFormRef" :model="newLead" :rules="createRules" label-placement="top">
        <NFormItem :label="t('leads.name')" path="name"
          ><NInput v-model:value="newLead.name" :placeholder="t('leads.namePlaceholder')"
        /></NFormItem>
        <NFormItem :label="t('common.company')" path="company"
          ><NInput v-model:value="newLead.company" :placeholder="t('leads.companyPlaceholder')"
        /></NFormItem>
        <NFormItem :label="t('common.email')" path="email"
          ><NInput v-model:value="newLead.email" :placeholder="t('leads.emailPlaceholder')"
        /></NFormItem>
        <NFormItem :label="t('common.phone')" path="phone"
          ><NInput v-model:value="newLead.phone" :placeholder="t('leads.phonePlaceholder')"
        /></NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('leads.source')" path="source"
            ><NSelect v-model:value="newLead.source" :options="sourceOptions"
          /></NFormItem>
          <NFormItem :label="t('common.owner')" path="owner"
            ><NSelect v-model:value="newLead.owner" :options="ownerOptions"
          /></NFormItem>
        </div>
        <NFormItem :label="t('leads.estimatedValue')" path="estimatedValue">
          <NInputNumber v-model:value="newLead.estimatedValue" :min="0" class="w-full" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{
            t('common.cancel')
          }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{
            t('leads.createLead')
          }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
