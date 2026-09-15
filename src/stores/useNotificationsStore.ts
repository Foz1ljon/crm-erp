import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { INotification } from '@/types/notifications'
import { generateNotificationsDataset } from './notifications.mock'

export const useNotificationsStore = defineStore(
  'notifications',
  () => {
    const notifications = ref<INotification[]>([])

    function loadDemoData() {
      notifications.value = generateNotificationsDataset()
    }

    if (notifications.value.length === 0) {
      loadDemoData()
    }

    const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)

    const sortedNotifications = computed(() =>
      [...notifications.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    )

    function markRead(id: string) {
      const index = notifications.value.findIndex((n) => n.id === id)
      if (index === -1) return
      const existing = notifications.value[index]
      if (!existing) return
      notifications.value.splice(index, 1, { ...existing, isRead: true })
    }

    function markAllRead() {
      notifications.value = notifications.value.map((n) => ({ ...n, isRead: true }))
    }

    function remove(id: string) {
      notifications.value = notifications.value.filter((n) => n.id !== id)
    }

    return { notifications, sortedNotifications, unreadCount, loadDemoData, markRead, markAllRead, remove }
  },
  {
    persist: { pick: ['notifications'] },
  },
)
