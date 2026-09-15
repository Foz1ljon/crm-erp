import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/root/auth.store'
import { useWorkspaceStore } from '@/stores/root/workspace.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Log in', public: true, bare: true },
    },
    {
      path: '/workspace',
      name: 'workspace',
      component: () => import('@/views/WorkspaceSelectView.vue'),
      meta: { title: 'Choose workspace', bare: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/crm/leads',
      name: 'crm-leads',
      component: () => import('@/views/LeadsView.vue'),
      meta: { title: 'Leads' },
    },
    {
      path: '/crm/deals',
      name: 'crm-deals',
      component: () => import('@/views/DealsView.vue'),
      meta: { title: 'Deals' },
    },
    {
      path: '/crm/contacts',
      name: 'crm-contacts',
      component: () => import('@/views/ContactsView.vue'),
      meta: { title: 'Contacts' },
    },
    {
      path: '/crm/activities',
      name: 'crm-activities',
      component: () => import('@/views/ActivitiesView.vue'),
      meta: { title: 'Activities' },
    },
    {
      path: '/erp/inventory',
      name: 'erp-inventory',
      component: () => import('@/views/InventoryView.vue'),
      meta: { title: 'Inventory' },
    },
    {
      path: '/erp/hr',
      name: 'erp-hr',
      component: () => import('@/views/HrView.vue'),
      meta: { title: 'HR' },
    },
    {
      path: '/erp/finance',
      name: 'erp-finance',
      component: () => import('@/views/FinanceView.vue'),
      meta: { title: 'Finance' },
    },
    {
      path: '/erp/suppliers',
      name: 'erp-suppliers',
      component: () => import('@/views/SuppliersView.vue'),
      meta: { title: 'Suppliers' },
    },
    {
      path: '/erp/purchase-orders',
      name: 'erp-purchase-orders',
      component: () => import('@/views/PurchaseOrdersView.vue'),
      meta: { title: 'Purchase Orders' },
    },
    {
      path: '/erp/logistics',
      name: 'erp-logistics',
      component: () => import('@/views/LogisticsView.vue'),
      meta: { title: 'Logistics' },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { title: 'Notifications' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: 'Settings' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.public && auth.isAuthenticated) {
    return { path: '/dashboard' }
  }
  const workspace = useWorkspaceStore()
  if (auth.isAuthenticated && workspace.workspace === null && to.name !== 'workspace') {
    return { path: '/workspace' }
  }
  return true
})

export default router
