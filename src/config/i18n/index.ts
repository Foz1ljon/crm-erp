import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import uz from './locales/uz.json'
import uzCyrl from './locales/uz-cyrl.json'
import ru from './locales/ru.json'

export type SupportedLocale = 'en' | 'uz' | 'uz-Cyrl' | 'ru'

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'uz', label: "O'zbekcha" },
  { code: 'uz-Cyrl', label: 'Ўзбекча' },
  { code: 'ru', label: 'Русский' },
]

const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code)

function detectInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem('crm-locale')
  if (stored && (LOCALE_CODES as string[]).includes(stored)) return stored as SupportedLocale
  const browser = navigator.language.slice(0, 2)
  return browser === 'uz' ? 'uz' : browser === 'ru' ? 'ru' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, uz, 'uz-Cyrl': uzCyrl, ru },
})

export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale
  localStorage.setItem('crm-locale', locale)
  document.documentElement.setAttribute('lang', locale)
}
