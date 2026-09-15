import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import '@/assets/main.css'

import App from './App.vue'
import router from './router'
import { i18n } from '@/config/i18n'
import { registerRbacDirective } from '@/core/directives/can'
import '@/core/theme/chartRegistry'

// Build-time key pool. Filtered here so a missing or blank .env entry never
// reaches the store as `undefined` — `hasKey` calls `.trim()` on every entry
// and would throw during render, taking the whole app down with it.
export const GROQ_API_KEYS: string[] = [import.meta.env.VITE_API1, import.meta.env.VITE_API2]
  .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
  .map((key) => key.trim())

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
registerRbacDirective(app)

app.mount('#app')
