import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Chrome-level UI state that must survive a refresh (sidebar collapse) but
 * has nothing to do with any single domain module.
 */
export const useUiStore = defineStore(
  'ui',
  () => {
    // Rests collapsed (icon rail); DefaultLayout expands it on hover.
    const sidebarCollapsed = ref(true)
    const mobileFilterDrawerOpen = ref(false)

    return { sidebarCollapsed, mobileFilterDrawerOpen }
  },
  { persist: { pick: ['sidebarCollapsed'] } },
)
