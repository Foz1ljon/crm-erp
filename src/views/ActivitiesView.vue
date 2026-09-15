<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NIcon, NPopconfirm, NTag, type SelectOption } from 'naive-ui'
import {
  Notes,
  Phone,
  Mail,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Search,
  Trash,
} from '@vicons/tabler'
import { feedback } from '@/core/api/feedback'
import { useCrmStore } from '@/stores/useCrmStore'
import { ACTIVITY_KINDS, type ActivityKind, type IActivity } from '@/types/crm'

const store = useCrmStore()
const { t, locale } = useI18n()

const KIND_ICON: Record<ActivityKind, unknown> = {
  call: Phone,
  email: Mail,
  meeting: UsersIcon,
  note: Notes,
  system: SettingsIcon,
}

const KIND_COLOR: Record<ActivityKind, string> = {
  call: 'text-info',
  email: 'text-brand-500',
  meeting: 'text-success',
  note: 'text-warning',
  system: 'text-gray-500',
}

function kindLabel(kind: ActivityKind): string {
  return t(`activities.kinds.${kind}`)
}

function relatedTypeLabel(relatedType: IActivity['relatedType']): string {
  const map: Record<IActivity['relatedType'], string> = {
    customer: t('common.company'),
    deal: t('deals.deal'),
    product: t('inventory.product'),
    lead: t('leads.title'),
    contact: t('contacts.contact'),
  }
  return map[relatedType]
}

const kindOptions = computed<SelectOption[]>(() =>
  ACTIVITY_KINDS.map((k) => ({ label: kindLabel(k), value: k })),
)

const search = ref('')
const kindFilter = ref<ActivityKind[]>([])
const page = ref(1)
const pageSize = 10

const filtered = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return store.activities.filter((activity) => {
    if (
      needle &&
      !`${activity.message} ${activity.actor} ${activity.relatedLabel}`
        .toLowerCase()
        .includes(needle)
    )
      return false
    if (kindFilter.value.length > 0 && !kindFilter.value.includes(activity.kind)) return false
    return true
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

function relativeTime(iso: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  const diffMs = new Date(iso).getTime() - Date.now()
  const diffHours = Math.round(diffMs / 3_600_000)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')
  const diffDays = Math.round(diffMs / 86_400_000)
  return formatter.format(diffDays, 'day')
}

function handleDelete(activity: IActivity) {
  store.removeActivity(activity.id)
  feedback.message?.success(t('activities.removedToast'))
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div>
      <h1 class="text-xl font-semibold">{{ t('activities.title') }}</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ t('activities.logged', { count: filtered.length }) }}
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <NInput
        v-model:value="search"
        :placeholder="t('activities.searchPlaceholder')"
        clearable
        class="min-h-11 w-[80%]! flex-1"
        :aria-label="t('common.search')"
      >
        <template #prefix
          ><NIcon><Search /></NIcon
        ></template>
      </NInput>
      <NSelect
        v-model:value="kindFilter"
        :options="kindOptions"
        multiple
        :placeholder="t('activities.allTypes')"
        class="min-h-11 w-[20%]! flex-1"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="paginated.length === 0"
        class="py-12 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        {{ t('activities.noMatch') }}
      </div>
      <ol v-else class="flex flex-col gap-3 pb-4">
        <li
          v-for="activity in paginated"
          :key="activity.id"
          class="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-0 p-3 dark:border-surface-dark-border dark:bg-surface-dark-100"
        >
          <div
            class="mt-0.5 shrink-0 rounded-full bg-surface-50 p-2 dark:bg-surface-dark-200"
            :class="KIND_COLOR[activity.kind]"
          >
            <NIcon size="18"><component :is="KIND_ICON[activity.kind]" /></NIcon>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm">{{ activity.message }}</p>
            <div
              class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <span>{{ activity.actor }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ relativeTime(activity.createdAt) }}</span>
              <NTag size="tiny" round>{{ relatedTypeLabel(activity.relatedType) }}</NTag>
            </div>
          </div>
          <NPopconfirm @positive-click="() => handleDelete(activity)">
            <template #trigger>
              <NButton
                quaternary
                circle
                size="small"
                class="min-h-11 min-w-11 shrink-0"
                :aria-label="t('common.delete')"
              >
                <template #icon
                  ><NIcon><Trash /></NIcon
                ></template>
              </NButton>
            </template>
            {{ t('activities.deleteConfirmGeneric') }}
          </NPopconfirm>
        </li>
      </ol>

      <NPagination
        v-if="pageCount > 1"
        :page="page"
        :page-count="pageCount"
        simple
        class="mt-2 justify-center"
        @update:page="(p: number) => (page = p)"
      />
    </div>
  </div>
</template>
