import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  roles: string[]
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<AuthUser | null>(null)
    const accessToken = ref<string | null>(null)
    const permissionList = ref<string[]>([])

    const isAuthenticated = computed(() => accessToken.value !== null)
    const permissions = computed(() => new Set(permissionList.value))

    function login(payload: { user: AuthUser; accessToken: string; permissions: string[] }) {
      user.value = payload.user
      accessToken.value = payload.accessToken
      permissionList.value = payload.permissions
    }

    function logout() {
      user.value = null
      accessToken.value = null
      permissionList.value = []
    }

    /**
     * Called after an admin changes this user's role mid-session (e.g. via a
     * websocket push). Updates the permission set immediately for any check
     * done in script (`auth.permissions.has(...)`); `v-can` only evaluates
     * on mount, so DOM nodes gated by it pick up the change on the user's
     * next full navigation rather than instantly — acceptable because role
     * changes are rare and the app prompts a "permissions changed, refresh"
     * toast rather than trying to hot-patch already-rendered chrome.
     */
    function applyRoleChange(nextPermissions: string[]) {
      permissionList.value = nextPermissions
    }

    return { user, accessToken, permissionList, isAuthenticated, permissions, login, logout, applyRoleChange }
  },
  {
    persist: {
      pick: ['user', 'accessToken', 'permissionList'],
    },
  },
)
