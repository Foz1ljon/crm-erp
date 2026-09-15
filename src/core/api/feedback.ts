import type { DialogApi, LoadingBarApi, MessageApi, NotificationApi } from 'naive-ui'

/**
 * Naive UI's message/dialog/notification/loading-bar APIs are only
 * reachable via composables (`useMessage()`, etc.) *inside* the component
 * tree that sits under their providers. API interceptors, Pinia actions,
 * and other non-component code need a way to trigger "Session expired" or
 * "Save failed" feedback too — this registry is populated once by
 * <NaiveProviderRegistry /> (mounted inside the providers in App.vue) and
 * read from anywhere.
 */
interface FeedbackRegistry {
  message: MessageApi | null
  dialog: DialogApi | null
  notification: NotificationApi | null
  loadingBar: LoadingBarApi | null
}

export const feedback: FeedbackRegistry = {
  message: null,
  dialog: null,
  notification: null,
  loadingBar: null,
}
