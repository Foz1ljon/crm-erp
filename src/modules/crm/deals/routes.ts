import type { RouteRecordRaw } from 'vue-router'

export const dealsRoutes: RouteRecordRaw[] = [
  {
    path: '/crm/deals',
    name: 'crm-deals',
    component: () => import('./pages/DealsListPage.vue'),
    meta: { title: 'Pipeline' },
  },
]
