<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref } from 'vue'
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
const localeOptions: DropdownOption[] = SUPPORTED_LOCALES.map((l) => ({
  label: l.label,
  key: l.code,
}))

function handleLocaleSelect(code: string) {
  setLocale(code as SupportedLocale)
}

const userMenuOptions = computed<DropdownOption[]>(() => [
  {
    label: t('nav.settings'),
    key: '/settings',
    icon: () => h(NIcon, null, { default: () => h(UserCircle) }),
  },
  {
    label: t('nav.switchWorkspace'),
    key: 'switch-workspace',
    icon: () => h(NIcon, null, { default: () => h(ArrowsLeftRight) }),
  },
  { type: 'divider', key: 'd1' },
  {
    label: t('nav.logOut'),
    key: 'logout',
    icon: () => h(NIcon, null, { default: () => h(Logout) }),
  },
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
      {
        label: t('nav.purchaseOrders'),
        key: '/erp/purchase-orders',
        icon: renderIcon(ClipboardList),
      },
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
// manual toggle button. Two rules stop it from flapping open and shut while
// the pointer is merely travelling across the screen:
//   1. Hover intent — a short delay before expanding and a longer one before
//      collapsing, each cancelling the other, so a quick pass over the rail
//      (or a brief exit while aiming at an item) changes nothing.
//   2. The expanded panel overlays the content instead of widening the
//      layout, so the page never reflows as the sidebar opens. See the
//      fixed-width rail wrapper in the template.
const SIDEBAR_EXPAND_DELAY_MS = 140
const SIDEBAR_COLLAPSE_DELAY_MS = 280

const sidebarHovering = ref(false)
let sidebarHoverTimer: ReturnType<typeof setTimeout> | undefined

function setSidebarHovering(next: boolean, delayMs: number) {
  clearTimeout(sidebarHoverTimer)
  if (sidebarHovering.value === next) return
  sidebarHoverTimer = setTimeout(() => {
    sidebarHovering.value = next
  }, delayMs)
}

// Keyboard users get the labels the moment focus enters the rail — a hover
// delay they can't trigger would leave them tabbing through blind icons.
function expandSidebarNow() {
  clearTimeout(sidebarHoverTimer)
  sidebarHovering.value = true
}

onBeforeUnmount(() => clearTimeout(sidebarHoverTimer))

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
    <!-- The rail keeps a constant 64px of layout width; the sider itself is
         absolutely positioned inside it, so expanding on hover floats over the
         content instead of pushing it sideways. -->
    <div v-if="!isCompact" class="relative z-20 w-16 shrink-0">
      <NLayoutSider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="220"
        :collapsed="sidebarEffectivelyCollapsed"
        :style="{ position: 'absolute', top: 0, bottom: 0, left: 0 }"
        :class="sidebarEffectivelyCollapsed ? '' : 'shadow-lg'"
        content-class="flex h-full flex-col"
        @mouseenter="setSidebarHovering(true, SIDEBAR_EXPAND_DELAY_MS)"
        @mouseleave="setSidebarHovering(false, SIDEBAR_COLLAPSE_DELAY_MS)"
        @focusin="expandSidebarNow()"
        @focusout="setSidebarHovering(false, SIDEBAR_COLLAPSE_DELAY_MS)"
      >
        <div
          class="flex h-14 shrink-0 items-center justify-center border-b border-(--n-border-color) px-3"
        >
          <span v-if="!sidebarEffectivelyCollapsed" class="truncate text-sm font-semibold">{{
            tenant.tenantName
          }}</span>
          <span v-else class="text-sm font-semibold">{{ tenant.tenantName.charAt(0) }}</span>
        </div>
        <!-- Only the nav list scrolls, and only when it outgrows the rail —
             the sider itself stays put. -->
        <div class="min-h-0 flex-1 overflow-y-auto">
          <NMenu
            :options="menuOptions"
            :value="activeKey"
            :collapsed="sidebarEffectivelyCollapsed"
            :collapsed-width="64"
            @update:value="handleMenuSelect"
          />
        </div>
      </NLayoutSider>
    </div>

    <NDrawer v-if="isCompact" v-model:show="mobileNavOpen" placement="left" :width="260">
      <NDrawerContent :title="t('nav.menu')" closable>
        <NMenu :options="menuOptions" :value="activeKey" @update:value="handleMenuSelect" />
      </NDrawerContent>
    </NDrawer>

    <!-- `content-class` targets Naive's inner scroll container — laying it out
         as a column is what keeps the header pinned. Without it the header and
         the full-height content stack to 100% + 56px and the whole column
         scrolls, carrying the header off-screen. -->
    <NLayout content-class="flex h-full flex-col">
      <NLayoutHeader
        bordered
        class="flex h-14 shrink-0 items-center justify-between gap-3 px-3 sm:px-4"
      >
        <div class="flex items-center gap-2">
          <NButton
            v-if="isCompact"
            quaternary
            circle
            :aria-label="t('nav.openMenu')"
            @click="mobileNavOpen = true"
          >
            <template #icon
              ><NIcon><Menu2 /></NIcon
            ></template>
          </NButton>
          <span class="text-base font-semibold">{{ tenant.tenantName }}</span>
        </div>

        <div class="flex items-center gap-2">
          <NBadge
            :value="notifications.unreadCount + 3"
            :show="notifications.unreadCount > 0"
            :max="99"
            :offset="[-2, 6]"
          >
            <NButton
              quaternary
              circle
              class="min-h-11 min-w-11"
              :aria-label="t('nav.notifications')"
              @click="router.push('/notifications')"
            >
              <template #icon
                ><NIcon><Bell /></NIcon
              ></template>
            </NButton>
          </NBadge>
          <NDropdown :options="localeOptions" trigger="click" @select="handleLocaleSelect">
            <NButton
              quaternary
              circle
              class="min-h-11 min-w-11"
              :aria-label="t('nav.changeLanguage')"
            >
              <template #icon
                ><NIcon><Language /></NIcon
              ></template>
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
            <NAvatar round size="small" class="cursor-pointer">{{
              (auth.user?.name ?? 'U').charAt(0)
            }}</NAvatar>
          </NDropdown>
        </div>
      </NLayoutHeader>

      <NLayoutContent class="min-h-0 flex-1" content-style="height: 100%;">
        <main class="h-full overflow-y-auto bg-surface-50 p-4 dark:bg-surface-dark-50 sm:p-6">
          <RouterView />
        </main>
      </NLayoutContent>
    </NLayout>
  </NLayout>

  <AiHelperWidget />
</template>
