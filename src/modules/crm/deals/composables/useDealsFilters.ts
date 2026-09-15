import { computed, onMounted, reactive, watch } from 'vue'
import type { SelectOption } from 'naive-ui'
import { useDealsStore } from '../stores/deals.store'
import { DEAL_STAGES, type DealFilters, type DealStage } from '../types/deal.types'

export interface StageOption extends SelectOption {
  label: string
  value: DealStage
}

/**
 * Two consumption modes share this composable:
 *  - Desktop filter bar: mutates the store directly, filter-as-you-type
 *    (debounced in the store), because a mouse+keyboard user expects
 *    instant feedback and can see the table update live.
 *  - Mobile filter drawer: edits `draft` locally and only commits via
 *    `applyDraft()` on an explicit "Apply" tap — firing a network request
 *    per keystroke on a touch keyboard, possibly on cellular, is wasted
 *    work and makes the sheet feel laggy while it's still open.
 */
export function useDealsFilters() {
  const store = useDealsStore()

  const stageOptions = computed<StageOption[]>(() =>
    DEAL_STAGES.map((stage) => ({ label: stageLabel(stage), value: stage })),
  )

  const ownerOptions = computed(() => store.owners.map((owner) => ({ label: owner.name, value: owner.id })))

  onMounted(() => {
    if (store.owners.length === 0) void store.loadOwners()
  })

  const draft = reactive<DealFilters>({ ...store.filters })

  // Keep the draft in sync if filters are reset elsewhere (e.g. a "Clear all" chip on the table).
  watch(
    () => store.filters,
    (next) => Object.assign(draft, next),
    { deep: true },
  )

  function applyDraft() {
    store.setFilters({ ...draft })
  }

  function resetDraft() {
    store.resetFilters()
    Object.assign(draft, store.filters)
  }

  const hasDraftChanges = computed(() => JSON.stringify(draft) !== JSON.stringify(store.filters))

  return { store, draft, stageOptions, ownerOptions, applyDraft, resetDraft, hasDraftChanges }
}

export function stageLabel(stage: DealStage): string {
  return stage
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function stageTagType(stage: DealStage): 'default' | 'info' | 'warning' | 'success' | 'error' {
  switch (stage) {
    case 'prospecting':
      return 'default'
    case 'qualification':
      return 'info'
    case 'proposal':
    case 'negotiation':
      return 'warning'
    case 'closed_won':
      return 'success'
    case 'closed_lost':
      return 'error'
  }
}
