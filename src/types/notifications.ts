export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'
export type NotificationCategory = 'deal' | 'inventory' | 'finance' | 'hr' | 'logistics' | 'system'

export interface INotification {
  id: string
  title: string
  message: string
  severity: NotificationSeverity
  category: NotificationCategory
  isRead: boolean
  createdAt: string
}
