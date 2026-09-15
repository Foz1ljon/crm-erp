<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FormRules } from 'naive-ui'
import { Login as LoginIcon } from '@vicons/tabler'
import { useAuthStore } from '@/stores/root/auth.store'
import { useTenantStore } from '@/stores/root/tenant.store'
import { feedback } from '@/core/api/feedback'

const auth = useAuthStore()
const tenant = useTenantStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const formRef = ref()
const form = reactive({ email: '', password: '' })
const rules = computed<FormRules>(() => ({
  email: { required: true, type: 'email', message: t('login.emailRule'), trigger: 'blur' },
  password: { required: true, min: 4, message: t('login.passwordRule'), trigger: 'blur' },
}))
const submitting = ref(false)

const ADMIN_PERMISSIONS = [
  'crm.deals.create', 'crm.deals.edit', 'crm.deals.delete',
  'crm.leads.create', 'crm.contacts.create',
  'erp.inventory.create', 'erp.hr.create', 'erp.finance.create',
  'erp.suppliers.create', 'erp.purchase_orders.create', 'erp.logistics.create',
]
const MANAGER_PERMISSIONS = ['crm.deals.create', 'crm.deals.edit', 'crm.leads.create', 'crm.contacts.create']

function completeLogin(name: string, email: string, roles: string[], permissions: string[]) {
  auth.login({
    user: { id: `user-${Date.now()}`, name, email, roles },
    accessToken: `demo-token-${Date.now()}`,
    permissions,
  })
  feedback.message?.success(t('login.welcome', { name }))
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  void router.push(redirect)
}

function handleSubmit() {
  formRef.value?.validate((errors: unknown) => {
    if (errors) return
    submitting.value = true
    setTimeout(() => {
      const name = form.email.split('@')[0] ?? 'User'
      completeLogin(name.charAt(0).toUpperCase() + name.slice(1), form.email, ['admin'], ADMIN_PERMISSIONS)
      submitting.value = false
    }, 400)
  })
}

function quickLogin(role: 'admin' | 'manager') {
  if (role === 'admin') completeLogin('Aziz Karimov', 'aziz@zarafshonholding.uz', ['admin'], ADMIN_PERMISSIONS)
  else completeLogin('Malika Yusupova', 'malika@zarafshonholding.uz', ['manager'], MANAGER_PERMISSIONS)
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center bg-surface-50 p-4 dark:bg-surface-dark-50">
    <NCard class="w-full max-w-sm" :bordered="true">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
          <NIcon size="24"><LoginIcon /></NIcon>
        </div>
        <h1 class="text-lg font-semibold">{{ tenant.tenantName }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('login.subtitle') }}</p>
      </div>

      <NForm ref="formRef" :model="form" :rules="rules" label-placement="top" @keyup.enter="handleSubmit">
        <NFormItem :label="t('login.email')" path="email">
          <NInput v-model:value="form.email" placeholder="you@company.com" class="min-h-11" />
        </NFormItem>
        <NFormItem :label="t('login.password')" path="password">
          <NInput v-model:value="form.password" type="password" show-password-on="click" placeholder="••••••••" class="min-h-11" />
        </NFormItem>
        <NButton type="primary" block class="min-h-11" :loading="submitting" @click="handleSubmit">{{ t('login.submit') }}</NButton>
      </NForm>

      <NDivider>{{ t('login.or') }}</NDivider>

      <div class="flex gap-3">
        <NButton class="min-h-11 flex-1" @click="quickLogin('admin')">{{ t('login.demoAdmin') }}</NButton>
        <NButton class="min-h-11 flex-1" @click="quickLogin('manager')">{{ t('login.demoManager') }}</NButton>
      </div>
      <p class="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">{{ t('login.hint') }}</p>
    </NCard>
  </div>
</template>
