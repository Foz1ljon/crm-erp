<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { NIcon, type DropdownOption, type MenuOption } from 'naive-ui'
import type { Component } from 'vue'
import {
  Dashboard,
  Moon,
  Sun,
  Target,
  Menu2,
  Building,
  Users,
  Truck,
  Language,
  UserCircle,
  Logout,
  UserSearch,
  Activity,
  BuildingWarehouse,
  IdBadge,
  ReportMoney,
  ClipboardList,
  Bell,
  ArrowsLeftRight,
} from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import { useBreakpoint } from '@/core/composables/useBreakpoint'
import { useTheme } from '@/core/composables/useTheme'
import { useUiStore } from '@/stores/root/ui.store'
import { useTenantStore } from '@/stores/root/tenant.store'
import { useAuthStore } from '@/stores/root/auth.store'
import { useWorkspaceStore } from '@/stores/root/workspace.store'
import { useNotificationsStore } from '@/stores/useNotificationsStore'
import { SUPPORTED_LOCALES, setLocale, type SupportedLocale } from '@/config/i18n'
import AiHelperWidget from '@/app/components/AiHelperWidget.vue'

const { isCompact } = useBreakpoint()
const { isDark, setMode } = useTheme()
const ui = useUiStore()
const tenant = useTenantStore()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const notifications = useNotificationsStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Language names are shown in their own language regardless of the
// currently active locale (e.g. "Русский" stays "Русский" even in English).
const localeOptions: DropdownOption[] = SUPPORTED_LOCALES.map((l) => ({ label: l.label, key: l.code }))

function handleLocaleSelect(code: string) {
  setLocale(code as SupportedLocale)
}

const userMenuOptions = computed<DropdownOption[]>(() => [
  { label: t('nav.settings'), key: '/settings', icon: () => h(NIcon, null, { default: () => h(UserCircle) }) },
  { label: t('nav.switchWorkspace'), key: 'switch-workspace', icon: () => h(NIcon, null, { default: () => h(ArrowsLeftRight) }) },
  { type: 'divider', key: 'd1' },
  { label: t('nav.logOut'), key: 'logout', icon: () => h(NIcon, null, { default: () => h(Logout) }) },
])

function handleUserMenuSelect(key: string) {
  if (key === 'logout') {
    auth.logout()
    void router.push('/login')
    return
  }
  if (key === 'switch-workspace') {
    workspace.clearWorkspace()
    void router.push('/workspace')
    return
  }
  void router.push(key)
}

function renderIcon(component: Component) {
  return () => h(NIcon, null, { default: () => h(component) })
}

// Sidebar is scoped to the workspace chosen on /workspace — a CRM-only user
// never sees ERP nav clutter, and vice versa. Dashboard/Notifications stay global.
const menuOptions = computed<MenuOption[]>(() => {
  const crmGroup: MenuOption = {
    type: 'group',
    label: t('nav.crmGroup'),
    key: 'crm-group',
    children: [
      { label: t('nav.leads'), key: '/crm/leads', icon: renderIcon(UserSearch) },
      { label: t('nav.deals'), key: '/crm/deals', icon: renderIcon(Target) },
      { label: t('nav.contacts'), key: '/crm/contacts', icon: renderIcon(Users) },
      { label: t('nav.activities'), key: '/crm/activities', icon: renderIcon(Activity) },
    ],
  }

  const erpGroup: MenuOption = {
    type: 'group',
    label: t('nav.erpGroup'),
    key: 'erp-group',
    children: [
      { label: t('nav.inventory'), key: '/erp/inventory', icon: renderIcon(BuildingWarehouse) },
      { label: t('nav.hr'), key: '/erp/hr', icon: renderIcon(IdBadge) },
      { label: t('nav.finance'), key: '/erp/finance', icon: renderIcon(ReportMoney) },
      { label: t('nav.suppliers'), key: '/erp/suppliers', icon: renderIcon(Building) },
      { label: t('nav.purchaseOrders'), key: '/erp/purchase-orders', icon: renderIcon(ClipboardList) },
      { label: t('nav.logistics'), key: '/erp/logistics', icon: renderIcon(Truck) },
    ],
  }

  return [
    { label: t('nav.dashboard'), key: '/dashboard', icon: renderIcon(Dashboard) },
    ...(workspace.workspace === 'crm' ? [crmGroup] : []),
    ...(workspace.workspace === 'erp' ? [erpGroup] : []),
    { label: t('nav.notifications'), key: '/notifications', icon: renderIcon(Bell) },
  ]
})

const activeKey = computed(() => route.path)

// Desktop sidebar rests collapsed (icon rail) and expands on hover — no
// manual toggle button. Hovering temporarily reveals labels; moving the
// mouse away collapses it back.
const sidebarHovering = ref(false)
const sidebarEffectivelyCollapsed = computed(() => ui.sidebarCollapsed && !sidebarHovering.value)

// Mobile: the sidebar becomes an overlay drawer, opened from the topbar.
const mobileNavOpen = ref(false)

function handleMenuSelect(key: string) {
  mobileNavOpen.value = false
  if (key !== route.path) {
    void router.push(key)
  }
}
</script>

<template>
  <NLayout class="h-full" has-sider>
    <NLayoutSider
      v-if="!isCompact"
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="sidebarEffectivelyCollapsed"
      @mouseenter="sidebarHovering = true"
      @mouseleave="sidebarHovering = false"
    >
      <div class="flex h-14 items-center justify-center border-b border-[var(--n-border-color)] px-3">
        <span v-if="!sidebarEffectivelyCollapsed" class="truncate text-sm font-semibold">{{ tenant.tenantName }}</span>
        <span v-else class="text-sm font-semibold">{{ tenant.tenantName.charAt(0) }}</span>
      </div>
      <NMenu :options="menuOptions" :value="activeKey" :collapsed="sidebarEffectivelyCollapsed" :collapsed-width="64" @update:value="handleMenuSelect" />
    </NLayoutSider>

    <NDrawer v-if="isCompact" v-model:show="mobileNavOpen" placement="left" :width="260">
      <NDrawerContent :title="t('nav.menu')" closable>
        <NMenu :options="menuOptions" :value="activeKey" @update:value="handleMenuSelect" />
      </NDrawerContent>
    </NDrawer>

    <NLayout>
      <NLayoutHeader bordered class="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
        <div class="flex items-center gap-2">
          <NButton v-if="isCompact" quaternary circle :aria-label="t('nav.openMenu')" @click="mobileNavOpen = true">
            <template #icon><NIcon><Menu2 /></NIcon></template>
          </NButton>
          <span class="text-base font-semibold">{{ tenant.tenantName }}</span>
        </div>

        <div class="flex items-center gap-2">
          <NBadge :value="notifications.unreadCount" :show="notifications.unreadCount > 0" :max="99">
            <NButton quaternary circle class="min-h-11 min-w-11" :aria-label="t('nav.notifications')" @click="router.push('/notifications')">
              <template #icon><NIcon><Bell /></NIcon></template>
            </NButton>
          </NBadge>
          <NDropdown :options="localeOptions" trigger="click" @select="handleLocaleSelect">
            <NButton quaternary circle class="min-h-11 min-w-11" :aria-label="t('nav.changeLanguage')">
              <template #icon><NIcon><Language /></NIcon></template>
            </NButton>
          </NDropdown>
          <NButton
            quaternary
            circle
            class="min-h-11 min-w-11"
            :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            @click="setMode(isDark ? 'light' : 'dark')"
          >
            <template #icon>
              <NIcon><Sun v-if="isDark" /><Moon v-else /></NIcon>
            </template>
          </NButton>
          <NDropdown :options="userMenuOptions" trigger="click" @select="handleUserMenuSelect">
            <NAvatar round size="small" class="cursor-pointer">{{ (auth.user?.name ?? 'U').charAt(0) }}</NAvatar>
          </NDropdown>
        </div>
      </NLayoutHeader>

      <NLayoutContent class="h-full min-h-0" content-style="height: 100%;">
        <main class="h-full overflow-y-auto bg-surface-50 p-4 dark:bg-surface-dark-50 sm:p-6">
          <RouterView />
        </main>
      </NLayoutContent>
    </NLayout>
  </NLayout>

  <AiHelperWidget />
</template>
