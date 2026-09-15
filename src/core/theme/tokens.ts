/**
 * Single source of truth for values that must render identically whether
 * they're applied via a Tailwind utility class or a Naive UI component
 * prop. Mirrors the `@theme` block in src/assets/main.css — update both
 * together.
 */
export const brand = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
} as const

export const status = {
  success: '#18a058',
  warning: '#f0a020',
  error: '#d03050',
  info: '#2080f0',
} as const

/**
 * Light neutrals sit one step deeper than Tailwind's slate-50/100/200 on
 * purpose: against pure-white cards, slate-50 (#f8fafc) is a ~1% step and the
 * whole UI reads as one flat white sheet. Cards keep #ffffff so the elevation
 * difference is what carries the hierarchy.
 */
export const surfaceLight = {
  0: '#ffffff',
  50: '#eef1f6',
  100: '#e3e8ef',
  200: '#d4dbe5',
  border: '#d8dee7',
} as const

export const surfaceDark = {
  0: '#101014',
  50: '#18181c',
  100: '#202024',
  200: '#2a2a30',
  border: '#303038',
} as const

export const fontFamily = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
