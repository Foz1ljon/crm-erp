import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    // Auto-import Vue/Router/Pinia composables so modules stay lean —
    // no manual `import { ref } from 'vue'` boilerplate across 100+ module files.
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
      },
      vueTemplate: true,
    }),
    // On-demand Naive UI component + style registration (tree-shaken, no full-bundle import).
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // Naive UI ships many small ESM chunks; pre-bundling avoids a cold-start
    // waterfall of 100s of dev-server requests.
    include: ['naive-ui'],
  },
  build: {
    rollupOptions: {
      output: {
        // Naive UI + Vue core change far less often than app/module code and
        // are shared by every route, so they get their own long-lived cache
        // chunk instead of being duplicated into (or bloating) each module's
        // lazy-loaded chunk. This build uses Rolldown (Vite 8), whose
        // `manualChunks` only accepts a function, not Rollup's object shorthand.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('naive-ui') || id.includes('vueuc') || id.includes('css-render') || id.includes('vdirs')) {
              return 'vendor-naive-ui'
            }
            if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia') || id.includes('vue-i18n')) {
              return 'vendor-vue'
            }
          }
        },
      },
    },
  },
})
