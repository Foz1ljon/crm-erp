import { darkTheme, type GlobalTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useStorage } from '@vueuse/core'
import { computed, watchEffect } from 'vue'
import { darkThemeOverrides, lightThemeOverrides } from '@/core/theme/naiveThemeOverrides'

export type ThemeMode = 'light' | 'dark' | 'system'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
const mode = useStorage<ThemeMode>('crm-theme-mode', 'system')

const isDark = computed(() => {
  if (mode.value === 'system') return prefersDark.matches
  return mode.value === 'dark'
})

/**
 * Keeps three things in lockstep on every toggle:
 * 1. The `.dark` class on <html> (drives Tailwind's `dark:` variant)
 * 2. Naive UI's `theme` object (drives every Naive component's palette)
 * 3. Naive UI's `themeOverrides` (drives our brand tokens on top of that palette)
 */
export function useTheme() {
  watchEffect(() => {
    document.documentElement.classList.toggle('dark', isDark.value)
  })

  const naiveTheme = computed<GlobalTheme | null>(() => (isDark.value ? darkTheme : null))
  const naiveThemeOverrides = computed<GlobalThemeOverrides>(() =>
    isDark.value ? darkThemeOverrides : lightThemeOverrides,
  )

  function setMode(next: ThemeMode) {
    mode.value = next
  }

  return { mode, isDark, naiveTheme, naiveThemeOverrides, setMode }
}
