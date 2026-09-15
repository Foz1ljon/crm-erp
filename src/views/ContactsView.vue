<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NIcon,
  NModal,
  NPopconfirm,
  NSelect,
  type DataTableColumns,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { Filter, Phone, Plus, Search, Star, Trash } from '@vicons/tabler'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { feedback } from '@/core/api/feedback'
import { useCrmStore } from '@/stores/useCrmStore'
import type { ContactFilters, IContact } from '@/types/crm'

const store = useCrmStore()
const { isCompact } = useBreakpoint()
const { t } = useI18n()

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function handleDelete(contact: IContact) {
  store.removeContact(contact.id)
  feedback.message?.success(t('common.removedToast', { name: contact.name }))
}

const customerOptions = computed<SelectOption[]>(() =>
  Array.from(new Map(store.contacts.map((c) => [c.customerId, c.customerName])).entries()).map(
    ([value, label]) => ({ label, value }),
  ),
)

const columns = computed<DataTableColumns<IContact>>(() => [
  {
    title: t('contacts.contact'),
    key: 'name',
    minWidth: 200,
    width: 240,
    render: (row) =>
      h('div', { class: 'flex min-w-0 items-center gap-2' }, [
        row.isPrimary
          ? h(NIcon, { class: 'shrink-0 text-brand-500' }, { default: () => h(Star) })
          : null,
        h('div', { class: 'min-w-0' }, [
          h('span', { class: 'block truncate text-sm font-medium' }, row.name),
          h('span', { class: 'block truncate text-xs text-gray-600 dark:text-gray-400' }, row.role),
        ]),
      ]),
  },
  { title: t('common.company'), key: 'customerName', width: 180 },
  { title: t('common.email'), key: 'email', width: 220 },
  { title: t('common.phone'), key: 'phone', width: 160 },
  {
    title: t('contacts.lastContacted'),
    key: 'lastContactedAt',
    width: 140,
    render: (row) => dateFormatter.format(new Date(row.lastContactedAt)),
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
  page: store.contactPage,
  pageSize: store.contactPageSize,
  itemCount: store.contactsTotalCount,
  showSizePicker: true,
  pageSizes: [10, 25, 50],
  onUpdatePage: (page: number) => store.setContactPage(page),
  onUpdatePageSize: (pageSize: number) => store.setContactPageSize(pageSize),
}))

const filterDrawerOpen = ref(false)
const draft = reactive<ContactFilters>({ ...store.contactFilters })

watch(
  () => store.contactFilters,
  (next) => Object.assign(draft, next),
  { deep: true },
)

function applyFilters() {
  store.setContactFilters({ ...draft })
  filterDrawerOpen.value = false
}

function resetFilters() {
  store.resetContactFilters()
  Object.assign(draft, store.contactFilters)
}

function updateQuickSearch(value: string) {
  store.setContactFilters({ search: value })
}

// ---------------------------------------------------------------------------
// New contact modal
// ---------------------------------------------------------------------------
const createModalOpen = ref(false)
const createFormRef = ref()
type NewContactDraft = Pick<IContact, 'customerId' | 'name' | 'role' | 'email' | 'phone'>
function emptyDraft(): NewContactDraft {
  return { customerId: store.customers[0]?.id ?? '', name: '', role: '', email: '', phone: '' }
}
const newContact = ref<NewContactDraft>(emptyDraft())
const allCustomerOptions = computed<SelectOption[]>(() =>
  store.customers.map((c) => ({ label: c.name, value: c.id })),
)
const createRules = computed<FormRules>(() => ({
  customerId: { required: true, message: t('contacts.companyRule'), trigger: 'change' },
  name: { required: true, message: t('contacts.nameRule'), trigger: 'blur' },
  email: { required: true, type: 'email', message: t('contacts.emailRule'), trigger: 'blur' },
}))

function openCreateModal() {
  newContact.value = emptyDraft()
  createModalOpen.value = true
}

function submitCreate() {
  createFormRef.value?.validate((errors: unknown) => {
    if (errors) return
    const d = newContact.value
    const customer = store.customers.find((c) => c.id === d.customerId)
    if (!customer) return
    store.addContact({
      id: `contact-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      name: d.name,
      role: d.role || 'Contact',
      email: d.email,
      phone: d.phone,
      isPrimary: false,
      tags: [],
      createdAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
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
        <h1 class="text-xl font-semibold">{{ t('contacts.title') }}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            t('common.matching', {
              count: store.contactsTotalCount,
              item: t('contacts.title').toLowerCase(),
            })
          }}
        </p>
      </div>
      <NButton
        v-can="'crm.contacts.create'"
        type="primary"
        class="min-h-11"
        @click="openCreateModal"
      >
        <template #icon
          ><NIcon><Plus /></NIcon
        ></template>
        {{ t('contacts.newContact') }}
      </NButton>
    </div>

    <div class="flex items-center gap-2">
      <NInput
        :value="store.contactFilters.search"
        :placeholder="t('contacts.searchPlaceholder')"
        clearable
        class="min-h-11 flex-1"
        :aria-label="t('common.search')"
        @update:value="updateQuickSearch"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NBadge :value="store.activeContactFilterCount" :show="store.activeContactFilterCount > 0">
        <NButton
          class="min-h-11 min-w-11"
          :aria-label="t('contacts.advancedFilters')"
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
        :data="store.paginatedContacts"
        :pagination="pagination"
        :row-key="(row: IContact) => row.id"
        remote
        flex-height
        class="h-full"
        :bordered="false"
      />
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="store.paginatedContacts.length === 0"
        class="py-12 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        {{ t('contacts.noMatch') }}
      </div>
      <div v-else class="flex flex-col gap-3 pb-4">
        <NCard
          v-for="contact in store.paginatedContacts"
          :key="contact.id"
          size="small"
          :bordered="true"
          content-style="padding: 14px;"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <NIcon v-if="contact.isPrimary" class="shrink-0 text-brand-500"><Star /></NIcon>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ contact.name }}</p>
                <p class="truncate text-xs text-gray-600 dark:text-gray-400">
                  {{ contact.role }} · {{ contact.customerName }}
                </p>
              </div>
            </div>
            <a
              :href="`tel:${contact.phone}`"
              class="shrink-0 rounded-full p-2 text-brand-600 dark:text-brand-400"
              :aria-label="t('contacts.callContact')"
              ><NIcon><Phone /></NIcon
            ></a>
          </div>

          <div
            class="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"
          >
            <span class="truncate">{{ contact.email }}</span>
            <span>{{ dateFormatter.format(new Date(contact.lastContactedAt)) }}</span>
          </div>

          <div
            class="mt-3 flex items-center justify-end gap-2 border-t border-surface-border pt-3 dark:border-surface-dark-border"
          >
            <NPopconfirm @positive-click="() => handleDelete(contact)">
              <template #trigger>
                <NButton
                  quaternary
                  circle
                  class="min-h-11 min-w-11"
                  :aria-label="`${t('common.delete')} ${contact.name}`"
                >
                  <template #icon
                    ><NIcon><Trash /></NIcon
                  ></template>
                </NButton>
              </template>
              {{ t('common.deleteConfirm', { name: contact.name }) }}
            </NPopconfirm>
          </div>
        </NCard>
      </div>

      <NPagination
        v-if="store.contactsPageCount > 1"
        :page="store.contactPage"
        :page-count="store.contactsPageCount"
        simple
        class="mt-2 justify-center"
        @update:page="store.setContactPage"
      />
    </div>

    <NDrawer v-model:show="filterDrawerOpen" placement="right" :width="isCompact ? '92%' : 400">
      <NDrawerContent :title="t('contacts.advancedFilters')" closable>
        <div class="flex flex-col gap-5 pb-4">
          <NFormItem :label="t('common.search')" label-placement="top">
            <NInput
              v-model:value="draft.search"
              :placeholder="t('contacts.searchPlaceholder')"
              clearable
            />
          </NFormItem>
          <NFormItem :label="t('contacts.filter.company')" label-placement="top">
            <NSelect
              v-model:value="draft.customerIds"
              :options="customerOptions"
              multiple
              :placeholder="t('common.any')"
            />
          </NFormItem>
          <NFormItem label-placement="left" :label="t('contacts.filter.primaryOnly')">
            <NSwitch v-model:value="draft.primaryOnly" />
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
      :title="t('contacts.modalTitle')"
      :style="{ width: isCompact ? '92%' : '480px' }"
    >
      <NForm ref="createFormRef" :model="newContact" :rules="createRules" label-placement="top">
        <NFormItem :label="t('common.company')" path="customerId"
          ><NSelect v-model:value="newContact.customerId" :options="allCustomerOptions"
        /></NFormItem>
        <NFormItem :label="t('common.name')" path="name"
          ><NInput v-model:value="newContact.name" :placeholder="t('leads.namePlaceholder')"
        /></NFormItem>
        <NFormItem :label="t('contacts.role')" path="role"
          ><NInput v-model:value="newContact.role" :placeholder="t('contacts.rolePlaceholder')"
        /></NFormItem>
        <NFormItem :label="t('common.email')" path="email"
          ><NInput v-model:value="newContact.email" :placeholder="t('leads.emailPlaceholder')"
        /></NFormItem>
        <NFormItem :label="t('common.phone')" path="phone"
          ><NInput v-model:value="newContact.phone" :placeholder="t('leads.phonePlaceholder')"
        /></NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton class="min-h-11" @click="createModalOpen = false">{{
            t('common.cancel')
          }}</NButton>
          <NButton class="min-h-11" type="primary" @click="submitCreate">{{
            t('contacts.createContact')
          }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
