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
import { Filter, Plus, Search, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useErpStore } from '@/stores/useErpStore'
import {
  DEPARTMENTS,
  type Department,
  type EmployeeFilters,
  type EmploymentStatus,
  type IEmployee,
} from '@/types/erp'

const store = useErpStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

function statusLabel(status: EmploymentStatus): string {
  return t(`hr.statuses.${status}`)
}

function statusTagType(status: EmploymentStatus): 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success'
  if (status === 'on_leave') return 'warning'
  return 'error'
}

const departmentOptions: SelectOption[] = DEPARTMENTS.map((d) => ({ label: d, value: d }))
const statusOptions = computed<SelectOption[]>(() =>
  (['active', 'on_leave', 'terminated'] as EmploymentStatus[]).map((s) => ({
    label: statusLabel(s),
    value: s,
  })),
)

function formatSalary(employee: IEmployee): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: employee.currency,
    maximumFractionDigits: 0,
  }).format(employee.salaryMinorUnits / 100)
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function handleDelete(employee: IEmployee) {
  store.removeEmployee(employee.id)
  feedback.message?.success(t('common.removedToast', { name: employee.name }))
}

const columns = computed<DataTableColumns<IEmployee>>(() => [
  {
    title: t('hr.employee'),
    key: 'name',
    minWidth: 180,
    width: 180,
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h('span', { class: 'block truncate text-sm font-medium' }, row.name),
        h(
          'span',
          { class: 'block truncate text-xs text-gray-600 dark:text-gray-400' },
          row.jobTitle,
        ),
      ]),
  },
  { title: t('hr.department'), key: 'department', width: 130 },
  {
    title: t('common.status'),
    key: 'employmentStatus',
    width: 120,
    render: (row) =>
      h(
        NTag,
        { type: statusTagType(row.employmentStatus), size: 'small', round: true },
        { default: () => statusLabel(row.employmentStatus) },
      ),
  },
  { title: t('common.branch'), key: 'branch', width: 160 },
  {
    title: t('hr.hireDate'),
    key: 'hireDate',
    width: 130,
    render: (row) => dateFormatter.format(new Date(row.hireDate)),
  },
  {
    title: t('hr.salary'),
    key: 'salaryMinorUnits',
    width: 120,
    align: 'right',
    render: (row) => h('span', { class: 'tabular-nums' }, formatSalary(row)),
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
  page: store.employeePage,
  pageSize: store.employeePageSize,
  itemCount: store.employeesTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => (store.employeePage = page),
  onUpdatePageSize: (pageSize: number) => {
    store.employeePageSize = pageSize
    store.employeePage = 1
  },
}))

const filterDrawerOpen = ref(false)
const draft = reactive<EmployeeFilters>({ ...store.employeeFilters })

watch(
  () => store.employeeFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setEmployeeFilters({ ...draft })
  filterDrawerOpen.value = false
}

function resetFilters() {
  store.resetEmployeeFilters()
  Object.assign(draft, store.employeeFilters)
}

function updateQuickSearch(value: string) {
  store.setEmployeeFilters({ search: value })
}

// New employee modal
const createModalOpen = ref(false)
const createFormRef = ref()
type NewEmployeeDraft = Pick<IEmployee, 'name' | 'email' | 'phone' | 'department' | 'jobTitle'> & {
  salary: number
}
function emptyDraft(): NewEmployeeDraft {
  return {
    name: '',
    email: '',
    phone: '',
    department: DEPARTMENTS[0],
    jobTitle: '',
    salary: 96_000_000,
  }
}
const newEmployee = ref<NewEmployeeDraft>(emptyDraft())
const createRules = computed<FormRules>(() => ({
  name: { required: true, message: t('hr.nameRule'), trigger: 'blur' },
  email: { required: true, type: 'email', message: t('hr.emailRule'), trigger: 'blur' },
  jobTitle: { required: true, message: t('hr.jobTitleRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newEmployee.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newEmployee.value
    store.addEmployee({
      id: `emp-${Date.now()}`,
      name: d.name,
      email: d.email,
      phone: d.phone,
      department: d.department as Department,
      jobTitle: d.jobTitle,
      employmentStatus: 'active',
      managerName: null,
      branch: 'Toshkent — Bosh ofis',
      hireDate: new Date().toISOString(),
      salaryMinorUnits: Math.round(d.salary * 100),
      currency: 'UZS',
    })
    feedback.message?.success(t('hr.addedToast', { name: d.name }))
    createModalOpen.value = false
  })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('hr.title') }}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            t('hr.summary', {
              total: store.employeesTotalCount,
              active: store.activeEmployeesCount,
            })
          }}
        </p>
      </div>
      <NButton v-can="'erp.hr.create'" type="primary" class="min-h-11" @click="openCreateModal">
        <template #icon
          ><NIcon><Plus /></NIcon
        ></template>
        {{ t('hr.newEmployee') }}
      </NButton>
    </div>

    <div class="flex items-center gap-2">
      <NInput
        :value="store.employeeFilters.search"
        :placeholder="t('hr.searchPlaceholder')"
        clearable
        class="min-h-11 flex-1"
        :aria-label="t('common.search')"
        @update:value="updateQuickSearch"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NBadge :value="store.activeEmployeeFilterCount" :show="store.activeEmployeeFilterCount > 0">
        <NButton
          class="min-h-11 min-w-11"
          :aria-label="t('hr.advancedFilters')"
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
        :data="store.paginatedEmployees"
        :pagination="pagination"
        :row-key="(row: IEmployee) => row.id"
        remote
        flex-height
        class="h-full"
        :bordered="false"
      />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="store.paginatedEmployees.length === 0"
        class="py-12 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        {{ t('hr.noMatch') }}
      </div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard
          v-for="employee in store.paginatedEmployees"
          :key="employee.id"
          size="small"
          :bordered="true"
          content-style="padding: 14px;"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ employee.name }}</p>
              <p class="truncate text-xs text-gray-600 dark:text-gray-400">
                {{ employee.jobTitle }} · {{ employee.department }}
              </p>
            </div>
            <NTag
              :type="statusTagType(employee.employmentStatus)"
              size="small"
              round
              class="shrink-0"
              >{{ statusLabel(employee.employmentStatus) }}</NTag
            >
          </div>
          <div
            class="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"
          >
            <span>{{ employee.branch }}</span>
            <span>{{ t('hr.perYear', { amount: formatSalary(employee) }) }}</span>
          </div>
          <div
            class="mt-3 flex items-center justify-end gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border"
          >
            <NPopconfirm @positive-click="() => handleDelete(employee)">
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  class="min-h-11 min-w-11"
                  :aria-label="`${t('common.delete')} ${employee.name}`"
                >
                  <template #icon
                    ><NIcon><Trash /></NIcon
                  ></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: employee.name }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination
        v-if="store.employeesPageCount > 1"
        :page="store.employeePage"
        :page-count="store.employeesPageCount"
        simple
        class="mt-2 justify-center"
        @update:page="(p: number) => (store.employeePage = p)"
      />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('hr.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput
              v-model:value="draft.search"
              :placeholder="t('hr.searchPlaceholder')"
              clearable
            />
          </NFormItem>
          <NFormItem :label="t('hr.filter.department')" label-placement="top">
            <NCheckboxGroup v-model:value="draft.departments">
              <div class="flex flex-col gap-3">
                <NCheckbox
                  v-for="option in departmentOptions"
                  :key="option.value as string"
                  :value="option.value"
                  :label="option.label as string"
                  class="min-h-11"
                />
              </div>
            </NCheckboxGroup>
          </NFormItem>
          <NFormItem :label="t('hr.filter.status')" label-placement="top">
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
      :title="t('hr.modalTitle')"
      :style="{ width: isCompact ? '92%' : '480px' }"
    >
      <NForm ref="createFormRef" :model="newEmployee" :rules="createRules" label-placement="top">
        <NFormItem :label="t('common.name')" path="name"
          ><NInput v-model:value="newEmployee.name"
        /></NFormItem>
        <NFormItem :label="t('common.email')" path="email"
          ><NInput v-model:value="newEmployee.email" placeholder="ism@zarafshonholding.uz"
        /></NFormItem>
        <NFormItem :label="t('common.phone')" path="phone"
          ><NInput v-model:value="newEmployee.phone" :placeholder="t('leads.phonePlaceholder')"
        /></NFormItem>
        <div class="grid grid-cols-2 gap-3">
          <NFormItem :label="t('hr.department')" path="department"
            ><NSelect v-model:value="newEmployee.department" :options="departmentOptions"
          /></NFormItem>
          <NFormItem :label="t('hr.jobTitle')" path="jobTitle"
            ><NInput v-model:value="newEmployee.jobTitle"
          /></NFormItem>
        </div>
        <NFormItem :label="t('hr.annualSalary')" path="salary"
          ><NInputNumber v-model:value="newEmployee.salary" :min="0" class="w-full"
        /></NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{
            t('common.cancel')
          }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{
            t('hr.addEmployee')
          }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
