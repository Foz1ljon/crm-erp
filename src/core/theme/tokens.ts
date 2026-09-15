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

export const surfaceLight = {
  0: '#ffffff',
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  border: '#e2e8f0',
} as const

export const surfaceDark = {
  0: '#101014',
  50: '#18181c',
  100: '#202024',
  200: '#2a2a30',
  border: '#303038',
} as const

export const fontFamily = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
