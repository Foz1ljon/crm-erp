import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { computed } from 'vue'

/**
 * Central breakpoint source for every "table on desktop, cards on mobile"
 * decision in the app. Values match the Tailwind `--breakpoint-*` tokens in
 * src/assets/main.css so a component never disagrees with its own CSS.
 */
export function useBreakpoint() {
  const breakpoints = useBreakpoints(breakpointsTailwind)

  const isMobile = breakpoints.smaller('md')
  const isTablet = breakpoints.between('md', 'lg')
  const isDesktop = breakpoints.greaterOrEqual('lg')

  /** Collapse to a single flag: below this, dense data views must become card lists. */
  const isCompact = computed(() => isMobile.value || isTablet.value)

  return { isMobile, isTablet, isDesktop, isCompact }
}
