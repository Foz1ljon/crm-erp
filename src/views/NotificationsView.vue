<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NButton, NIcon } from 'naive-ui'
import { AlertCircle, AlertTriangle, Check, CircleCheck, InfoCircle, Trash } from '@vicons/tabler'
import { useNotificationsStore } from '@/stores/useNotificationsStore'
import type { INotification, NotificationSeverity } from '@/types/notifications'

const store = useNotificationsStore()
const { t, locale } = useI18n()

const SEVERITY_ICON: Record<NotificationSeverity, unknown> = {
  info: InfoCircle,
  success: CircleCheck,
  warning: AlertTriangle,
  error: AlertCircle,
}

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

function categoryLabel(category: INotification['category']): string {
  return t(`notifications.categories.${category}`)
}

function relativeTime(iso: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  const diffMs = new Date(iso).getTime() - Date.now()
  const diffHours = Math.round(diffMs / 3_600_000)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')
  return formatter.format(Math.round(diffMs / 86_400_000), 'day')
}

function handleRemove(notification: INotification) {
  store.remove(notification.id)
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('notifications.title') }}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('notifications.summary', { unread: store.unreadCount, total: store.notifications.length }) }}</p>
      </div>
      <NButton v-if="store.unreadCount > 0" class="min-h-11" @click="store.markAllRead()">
        <template #icon><NIcon><Check /></NIcon></template>
        {{ t('notifications.markAllRead') }}
      </NButton>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="store.sortedNotifications.length === 0" class="py-12 text-center text-sm text-gray-600 dark:text-gray-400">{{ t('notifications.caughtUp') }}</div>
      <ul v-else class="flex flex-col gap-2 pb-4">
        <li
          v-for="notification in store.sortedNotifications"
          :key="notification.id"
          class="flex items-start gap-3 rounded-xl border p-3 dark:border-surface-dark-border"
          :class="notification.isRead ? 'border-surface-border bg-surface-0 dark:bg-surface-dark-100' : 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-surface-dark-200'"
        >
          <NIcon size="20" class="mt-0.5 shrink-0" :class="SEVERITY_COLOR[notification.severity]">
            <component :is="SEVERITY_ICON[notification.severity]" />
          </NIcon>
          <div class="min-w-0 flex-1 cursor-pointer" @click="store.markRead(notification.id)">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-medium">{{ notification.title }}</p>
              <span v-if="!notification.isRead" class="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
            </div>
            <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ notification.message }}</p>
            <div class="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>{{ categoryLabel(notification.category) }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ relativeTime(notification.createdAt) }}</span>
            </div>
          </div>
          <NButton quaternary circle size="small" class="min-h-11 min-w-11 shrink-0" :aria-label="t('notifications.dismiss', { title: notification.title })" @click="handleRemove(notification)">
            <template #icon><NIcon><Trash /></NIcon></template>
          </NButton>
        </li>
      </ul>
    </div>
  </div>
</template>
