<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NIcon } from 'naive-ui'
import { Building, Target } from '@vicons/tabler'
import { useTenantStore } from '@/stores/root/tenant.store'
import { useWorkspaceStore, type Workspace } from '@/stores/root/workspace.store'

const tenant = useTenantStore()
const workspace = useWorkspaceStore()
const router = useRouter()
const { t } = useI18n()

function choose(next: Workspace) {
  workspace.selectWorkspace(next)
  void router.push('/dashboard')
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center bg-surface-50 p-4 dark:bg-surface-dark-50">
    <div class="w-full max-w-2xl">
      <div class="mb-8 text-center">
        <h1 class="text-xl font-semibold">{{ tenant.tenantName }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('workspace.question') }}</p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          class="min-h-11 rounded-2xl border border-surface-border bg-surface-0 p-6 text-left transition hover:border-brand-500 hover:shadow-md dark:border-surface-dark-border dark:bg-surface-dark-100"
          @click="choose('crm')"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <NIcon size="24"><Target /></NIcon>
          </div>
          <h2 class="mt-4 text-lg font-semibold">{{ t('workspace.crmTitle') }}</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('workspace.crmDesc') }}</p>
        </button>

        <button
          type="button"
          class="min-h-11 rounded-2xl border border-surface-border bg-surface-0 p-6 text-left transition hover:border-brand-500 hover:shadow-md dark:border-surface-dark-border dark:bg-surface-dark-100"
          @click="choose('erp')"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <NIcon size="24"><Building /></NIcon>
          </div>
          <h2 class="mt-4 text-lg font-semibold">{{ t('workspace.erpTitle') }}</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('workspace.erpDesc') }}</p>
        </button>
      </div>

      <p class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">{{ t('workspace.hint') }}</p>
    </div>
  </div>
</template>
