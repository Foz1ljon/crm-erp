<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView, useRoute } from 'vue-router'
import {
  dateEnUS,
  dateRuRU,
  dateUzUZ,
  enUS,
  NConfigProvider,
  NDialogProvider,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider,
  ruRU,
  uzUZ,
  type NDateLocale,
  type NLocale,
} from 'naive-ui'
import { useTheme } from '@/core/composables/useTheme'
import NaiveProviderRegistry from '@/app/providers/NaiveProviderRegistry.vue'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'

const { naiveTheme, naiveThemeOverrides } = useTheme()
const { locale } = useI18n()
const route = useRoute()

const NAIVE_LOCALES: Record<string, NLocale> = { en: enUS, ru: ruRU, uz: uzUZ, 'uz-Cyrl': uzUZ }
const NAIVE_DATE_LOCALES: Record<string, NDateLocale> = { en: dateEnUS, ru: dateRuRU, uz: dateUzUZ, 'uz-Cyrl': dateUzUZ }

const naiveLocale = computed(() => NAIVE_LOCALES[locale.value] ?? enUS)
const naiveDateLocale = computed(() => NAIVE_DATE_LOCALES[locale.value] ?? dateEnUS)
</script>

<template>
  <NConfigProvider
    :theme="naiveTheme"
    :theme-overrides="naiveThemeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
    class="h-full"
  >
    <NLoadingBarProvider>
      <NMessageProvider placement="top">
        <NDialogProvider>
          <NNotificationProvider>
            <NaiveProviderRegistry />
            <DefaultLayout v-if="!route.meta.bare" />
            <RouterView v-else />
          </NNotificationProvider>
        </NDialogProvider>
      </NMessageProvider>
    </NLoadingBarProvider>
  </NConfigProvider>
</template>
