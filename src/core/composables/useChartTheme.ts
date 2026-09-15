import { computed } from 'vue'
import type { ChartOptions } from 'chart.js'
import { useTheme } from './useTheme'

/**
 * Chart color tokens, validated for CVD-safety and contrast against both
 * chart surfaces (dataviz skill palette, first 5 categorical slots — this
 * app never shows more than 5 series/slices at once, e.g. 5 branches).
 * Ordering is the CVD-safety mechanism — never reorder or cycle it.
 */
const CATEGORICAL_LIGHT = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a']
const CATEGORICAL_DARK = ['#3987e5', '#008300', '#d55181', '#c98500', '#199e70']

const SEQUENTIAL_LIGHT = '#2a78d6'
const SEQUENTIAL_DARK = '#3987e5'

const STATUS = {
  good: { light: '#0ca30c', dark: '#0ca30c' },
  critical: { light: '#d03b3b', dark: '#e66767' },
}

/**
 * Shared Chart.js color tokens + base options, kept in sync with the app's
 * light/dark mode so canvas-rendered charts (which can't read CSS vars)
 * still track the rest of the UI when the theme toggles.
 */
export function useChartTheme() {
  const { isDark } = useTheme()

  const categorical = computed(() => (isDark.value ? CATEGORICAL_DARK : CATEGORICAL_LIGHT))
  const sequential = computed(() => (isDark.value ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT))
  const good = computed(() => (isDark.value ? STATUS.good.dark : STATUS.good.light))
  const critical = computed(() => (isDark.value ? STATUS.critical.dark : STATUS.critical.light))

  const ink = computed(() => (isDark.value ? '#ffffff' : '#0b0b0b'))
  const inkSecondary = computed(() => (isDark.value ? '#c3c2b7' : '#52514e'))
  const inkMuted = computed(() => '#898781')
  const gridline = computed(() => (isDark.value ? '#2c2c2a' : '#e1e0d9'))
  const surface = computed(() => (isDark.value ? '#1a1a19' : '#fcfcfb'))

  const baseFont = { family: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif", size: 12 }

  /** Recessive axes/grid, no dual-axis, tooltip enabled by default (the hover layer). */
  function cartesianOptions<T extends 'bar' | 'line'>(): ChartOptions<T> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: surface.value,
          titleColor: ink.value,
          bodyColor: inkSecondary.value,
          borderColor: gridline.value,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: baseFont,
          bodyFont: baseFont,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: gridline.value },
          ticks: { color: inkMuted.value, font: baseFont },
        },
        y: {
          grid: { color: gridline.value },
          border: { display: false },
          ticks: { color: inkMuted.value, font: baseFont },
          beginAtZero: true,
        },
      },
    }
  }

  function donutOptions(): ChartOptions<'doughnut'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: inkSecondary.value, font: baseFont, usePointStyle: true, pointStyle: 'circle', padding: 14 },
        },
        tooltip: {
          backgroundColor: surface.value,
          titleColor: ink.value,
          bodyColor: inkSecondary.value,
          borderColor: gridline.value,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: baseFont,
          bodyFont: baseFont,
        },
      },
    }
  }

  return { categorical, sequential, good, critical, ink, inkSecondary, inkMuted, gridline, surface, cartesianOptions, donutOptions }
}
