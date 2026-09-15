<script setup lang="ts">
import { useDealsFilters } from '../composables/useDealsFilters'

const show = defineModel<boolean>('show', { required: true })

const { draft, stageOptions, ownerOptions, applyDraft, resetDraft } = useDealsFilters()

function handleApply() {
  applyDraft()
  show.value = false
}

function handleReset() {
  resetDraft()
}
</script>

<template>
  <NDrawer v-model:show="show" placement="bottom" height="85%">
    <NDrawerContent title="Filter deals" closable>
      <div class="flex flex-col gap-5 pb-4">
        <NFormItem label="Search" label-placement="top">
          <NInput v-model:value="draft.search" placeholder="Search deals, companies, owners…" clearable />
        </NFormItem>

        <NFormItem label="Stage" label-placement="top">
          <NCheckboxGroup v-model:value="draft.stages">
            <div class="flex flex-col gap-3">
              <NCheckbox v-for="option in stageOptions" :key="option.value" :value="option.value" :label="option.label" class="min-h-11" />
            </div>
          </NCheckboxGroup>
        </NFormItem>

        <NFormItem label="Owner" label-placement="top">
          <NSelect v-model:value="draft.ownerIds" :options="ownerOptions" multiple placeholder="Any owner" />
        </NFormItem>

        <NFormItem label="Deal value" label-placement="top">
          <div class="flex items-center gap-2">
            <NInputNumber v-model:value="draft.valueMin" placeholder="Min" :min="0" class="flex-1" />
            <span class="text-gray-400" aria-hidden="true">–</span>
            <NInputNumber v-model:value="draft.valueMax" placeholder="Max" :min="0" class="flex-1" />
          </div>
        </NFormItem>
      </div>

      <template #footer>
        <div class="flex w-full gap-3">
          <NButton class="min-h-11 flex-1" @click="handleReset">Reset</NButton>
          <NButton class="min-h-11 flex-1" type="primary" @click="handleApply">Apply</NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
