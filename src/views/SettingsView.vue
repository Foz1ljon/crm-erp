<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SelectOption } from 'naive-ui'
import { useAuthStore } from '@/stores/root/auth.store'
import { useTenantStore } from '@/stores/root/tenant.store'
import { useWorkspaceStore, type Workspace } from '@/stores/root/workspace.store'
import { useCrmStore } from '@/stores/useCrmStore'
import { useErpStore } from '@/stores/useErpStore'
import { useAiStore } from '@/stores/useAiStore'
import { feedback } from '@/core/api/feedback'
import { SUPPORTED_LOCALES, setLocale, type SupportedLocale } from '@/config/i18n'
import { CURRENCIES } from '@/types/crm'

const auth = useAuthStore()
const tenant = useTenantStore()
const workspace = useWorkspaceStore()
const crm = useCrmStore()
const erp = useErpStore()
const ai = useAiStore()
const { t, locale } = useI18n()

const keyDrafts = reactive<string[]>([ai.keys[0] ?? '', ai.keys[1] ?? ''])
function saveApiKey() {
  ai.setKeys(keyDrafts.filter((k) => k.trim().length > 0))
  feedback.message?.success(ai.hasKey ? t('settings.apiKeySavedToast') : t('settings.apiKeyClearedToast'))
}

function switchWorkspace(next: Workspace) {
  workspace.selectWorkspace(next)
  feedback.message?.success(t('settings.workspaceSwitchedToast', { workspace: next === 'crm' ? 'CRM' : 'ERP' }))
}

const profileDraft = reactive({ name: auth.user?.name ?? '', email: auth.user?.email ?? '' })

function saveProfile() {
  if (!auth.user) return
  auth.user = { ...auth.user, name: profileDraft.name, email: profileDraft.email }
  feedback.message?.success(t('settings.profileUpdatedToast'))
}

const companyDraft = reactive({ tenantName: tenant.tenantName, baseCurrency: tenant.baseCurrency })
const currencyOptions: SelectOption[] = CURRENCIES.map((c) => ({ label: `${c.label} (${c.code})`, value: c.code }))

function saveCompany() {
  tenant.switchTenant({
    tenantId: tenant.tenantId,
    tenantName: companyDraft.tenantName,
    baseCurrency: companyDraft.baseCurrency,
    locale: tenant.locale,
  })
  feedback.message?.success(t('settings.companyUpdatedToast'))
}

const localeOptions: SelectOption[] = SUPPORTED_LOCALES.map((l) => ({ label: l.label, value: l.code }))
const displayCurrencyOptions: SelectOption[] = CURRENCIES.map((c) => ({ label: `${c.label} (${c.code})`, value: c.code }))

function handleLocaleChange(code: SupportedLocale) {
  setLocale(code)
}

function handleDisplayCurrencyChange(code: string) {
  crm.setUniversalFilters({ currency: code as (typeof CURRENCIES)[number]['code'] })
}

const demoMode = ref(crm.mode === 'demo')
watch(demoMode, (isDemo) => {
  const next = isDemo ? 'demo' : 'live'
  crm.setMode(next)
  erp.setMode(next)
  feedback.message?.success(isDemo ? t('settings.demoModeToast') : t('settings.liveModeToast'))
})

const ROLE_PERMISSIONS: Record<'admin' | 'manager', string[]> = {
  admin: [
    'crm.deals.create', 'crm.deals.edit', 'crm.deals.delete',
    'crm.leads.create', 'crm.contacts.create',
    'erp.inventory.create', 'erp.hr.create', 'erp.finance.create',
    'erp.suppliers.create', 'erp.purchase_orders.create', 'erp.logistics.create',
  ],
  manager: ['crm.deals.create', 'crm.deals.edit', 'crm.leads.create', 'crm.contacts.create'],
}

function switchRole(role: 'admin' | 'manager') {
  if (!auth.user) return
  auth.user = { ...auth.user, roles: [role] }
  auth.applyRoleChange(ROLE_PERMISSIONS[role])
  feedback.message?.success(t('settings.roleSwitchedToast', { role: role === 'admin' ? t('settings.admin') : t('settings.manager') }))
}
</script>

<template>
  <div class="flex h-full flex-col gap-6 overflow-y-auto pb-6">
    <div>
      <h1 class="text-xl font-semibold">{{ t('settings.title') }}</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('settings.subtitle') }}</p>
    </div>

    <NCard :title="t('settings.profile')" size="small">
      <NForm label-placement="top" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NFormItem :label="t('settings.fullName')"><NInput v-model:value="profileDraft.name" /></NFormItem>
        <NFormItem :label="t('common.email')"><NInput v-model:value="profileDraft.email" /></NFormItem>
      </NForm>
      <template #footer>
        <NButton class="min-h-11" type="primary" @click="saveProfile">{{ t('settings.saveProfile') }}</NButton>
      </template>
    </NCard>

    <NCard :title="t('settings.role')" size="small">
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {{ t('settings.roleBody', { role: auth.user?.roles[0] === 'admin' ? t('settings.admin') : t('settings.manager') }) }}
      </p>
      <div class="flex gap-3">
        <NButton class="min-h-11" :type="auth.user?.roles[0] === 'admin' ? 'primary' : 'default'" @click="switchRole('admin')">{{ t('settings.admin') }}</NButton>
        <NButton class="min-h-11" :type="auth.user?.roles[0] === 'manager' ? 'primary' : 'default'" @click="switchRole('manager')">{{ t('settings.manager') }}</NButton>
      </div>
    </NCard>

    <NCard :title="t('settings.company')" size="small">
      <NForm label-placement="top" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NFormItem :label="t('settings.companyName')"><NInput v-model:value="companyDraft.tenantName" /></NFormItem>
        <NFormItem :label="t('settings.baseCurrency')"><NSelect v-model:value="companyDraft.baseCurrency" :options="currencyOptions" /></NFormItem>
      </NForm>
      <template #footer>
        <NButton class="min-h-11" type="primary" @click="saveCompany">{{ t('settings.saveCompany') }}</NButton>
      </template>
    </NCard>

    <NCard :title="t('settings.languageCurrency')" size="small">
      <NForm label-placement="top" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NFormItem :label="t('settings.interfaceLanguage')">
          <NSelect :value="locale" :options="localeOptions" @update:value="handleLocaleChange" />
        </NFormItem>
        <NFormItem :label="t('settings.displayCurrency')">
          <NSelect :value="crm.universalFilters.currency" :options="displayCurrencyOptions" @update:value="handleDisplayCurrencyChange" />
        </NFormItem>
      </NForm>
    </NCard>

    <NCard :title="t('settings.workspace')" size="small">
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {{ t('settings.workspaceBody', { workspace: workspace.workspace === 'crm' ? 'CRM' : 'ERP' }) }}
      </p>
      <div class="flex gap-3">
        <NButton class="min-h-11" :type="workspace.workspace === 'crm' ? 'primary' : 'default'" @click="switchWorkspace('crm')">CRM</NButton>
        <NButton class="min-h-11" :type="workspace.workspace === 'erp' ? 'primary' : 'default'" @click="switchWorkspace('erp')">ERP</NButton>
      </div>
    </NCard>

    <NCard :title="t('settings.aiHelper')" size="small">
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">{{ t('settings.aiHelperBody') }}</p>
      <NForm label-placement="top">
        <NFormItem :label="`${t('settings.aiApiKey')} 1`">
          <NInput v-model:value="keyDrafts[0]" type="password" show-password-on="click" placeholder="gsk_…" class="min-h-11" />
        </NFormItem>
        <NFormItem :label="`${t('settings.aiApiKey')} 2`">
          <NInput v-model:value="keyDrafts[1]" type="password" show-password-on="click" placeholder="gsk_…" class="min-h-11" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NButton class="min-h-11" type="primary" @click="saveApiKey">{{ t('settings.saveApiKey') }}</NButton>
      </template>
    </NCard>

    <NCard :title="t('settings.dataMode')" size="small">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ t('settings.demoModeLabel') }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ demoMode ? t('settings.demoModeOn') : t('settings.demoModeOff') }}
          </p>
        </div>
        <NSwitch v-model:value="demoMode" />
      </div>
    </NCard>
  </div>
</template>
