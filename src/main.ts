import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import '@/assets/main.css'

import App from './App.vue'
import router from './router'
import { i18n } from '@/config/i18n'
import { registerRbacDirective } from '@/core/directives/can'
import '@/core/theme/chartRegistry'

export const GROQ_API_KEYS = [import.meta.env.VITE_API1, import.meta.env.VITE_API2]

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
registerRbacDirective(app)

app.mount('#app')
