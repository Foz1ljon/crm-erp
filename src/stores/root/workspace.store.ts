import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Workspace = 'crm' | 'erp'

/**
 * Which half of the product (CRM or ERP) the sidebar currently shows.
 * Chosen once after login on /workspace; switchable later from the user
 * menu. Dashboard/Notifications/Settings stay visible regardless — this
 * only scopes the CRM/ERP module groups so a single-purpose user isn't
 * shown the other domain's nav every session.
 */
export const useWorkspaceStore = defineStore(
  'workspace',
  () => {
    const workspace = ref<Workspace | null>(null)

    function selectWorkspace(next: Workspace) {
      workspace.value = next
    }

    function clearWorkspace() {
      workspace.value = null
    }

    return { workspace, selectWorkspace, clearWorkspace }
  },
  { persist: true },
)
