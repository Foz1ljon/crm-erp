import type { App, Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/root/auth.store'

export type Permission = string

/**
 * `v-can="'manage_inventory'"` — removes the element from the DOM (not just
 * visually hidden) when the current user lacks the permission, so it can
 * never be reached via devtools or a stray tab-focus.
 *
 * Supports a single permission or an array (element shows if the user has
 * ANY of them): `v-can="['manage_inventory', 'view_inventory']"`.
 *
 * Deliberately evaluated once, on mount, like vue-element-admin's
 * v-permission: permissions are resolved at login and don't change mid-
 * session in this app. If a role changes, the RBAC flow forces the current
 * route to remount (see auth.store.ts `applyRoleChange`), which re-runs
 * `mounted` with the fresh permission set — a reactive `updated` hook here
 * would fight Vue's own DOM patching once the node has been detached.
 */
function hasPermission(binding: DirectiveBinding<Permission | Permission[]>): boolean {
  const auth = useAuthStore()
  const required = Array.isArray(binding.value) ? binding.value : [binding.value]
  return required.some((permission) => auth.permissions.has(permission))
}

export const can: Directive<HTMLElement, Permission | Permission[]> = {
  mounted(el, binding) {
    if (!hasPermission(binding)) {
      el.parentNode?.removeChild(el)
    }
  },
}

export function registerRbacDirective(app: App) {
  app.directive('can', can)
}
