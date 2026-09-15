<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NIcon } from 'naive-ui'
import { Robot, Send, Trash, X } from '@vicons/tabler'
import { useAiStore } from '@/stores/useAiStore'

const ai = useAiStore()
const router = useRouter()
const { t } = useI18n()

const draft = ref('')
const scrollRef = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' })
}

watch(() => ai.messages.length, scrollToBottom)
// Follow the text as it streams in (length stays constant, content grows).
watch(() => ai.messages[ai.messages.length - 1]?.text, scrollToBottom)
watch(() => ai.isPanelOpen, (open) => {
  if (open) scrollToBottom()
})

function handleSend() {
  const text = draft.value
  draft.value = ''
  void ai.sendMessage(text)
}

const hasKey = computed(() => ai.hasKey)

function goToSettings() {
  ai.isPanelOpen = false
  void router.push('/settings')
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-40">
    <NButton
      circle
      type="primary"
      size="large"
      class="h-14 w-14 shadow-lg"
      :aria-label="t('ai.openLabel')"
      @click="ai.isPanelOpen = true"
    >
      <template #icon><NIcon size="22"><Robot /></NIcon></template>
    </NButton>
  </div>

  <NDrawer v-model:show="ai.isPanelOpen" placement="right" :width="420">
    <NDrawerContent :title="t('ai.title')" closable>
      <template #header>
        <div class="flex w-full items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <NIcon size="18"><Robot /></NIcon>
            <span>{{ t('ai.title') }}</span>
          </div>
          <NButton quaternary circle size="small" :aria-label="t('ai.clearConversation')" @click="ai.clearConversation()">
            <template #icon><NIcon><Trash /></NIcon></template>
          </NButton>
        </div>
      </template>

      <div class="flex h-full flex-col gap-3">
        <div v-if="!hasKey" class="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          {{ t('ai.noKeyBanner') }}
          <button type="button" class="font-medium text-brand-600 underline dark:text-brand-400" @click="goToSettings">{{ t('ai.addKeyLink') }}</button>
          {{ t('ai.noKeyBannerSuffix') }}
        </div>

        <div ref="scrollRef" class="min-h-0 flex-1 overflow-y-auto pr-1">
          <div v-if="ai.messages.length === 0" class="py-8 text-center text-sm text-gray-600 dark:text-gray-400">
            {{ t('ai.emptyState') }}
          </div>
          <div v-else class="flex flex-col gap-3">
            <div v-for="message in ai.messages" :key="message.id" class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
              <div
                class="max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
                :class="
                  message.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : message.isError
                      ? 'bg-error/10 text-error'
                      : 'bg-surface-100 text-gray-800 dark:bg-surface-dark-200 dark:text-gray-100'
                "
              >
                <span v-if="message.isStreaming && !message.text" class="text-gray-600 dark:text-gray-400">{{ t('ai.thinking') }}</span>
                <template v-else>{{ message.text }}<span v-if="message.isStreaming" class="ai-caret" aria-hidden="true">▍</span></template>
              </div>
            </div>
          </div>
        </div>

        <form class="flex items-center gap-2" @submit.prevent="handleSend">
          <NInput
            v-model:value="draft"
            :placeholder="t('ai.placeholder')"
            class="min-h-11 flex-1"
            :disabled="!hasKey"
            :aria-label="t('ai.placeholder')"
            @keydown.enter.prevent="handleSend"
          />
          <NButton type="primary" circle class="min-h-11 min-w-11 shrink-0" :disabled="!hasKey || !draft.trim()" :aria-label="t('ai.sendLabel')" @click="handleSend">
            <template #icon><NIcon><Send /></NIcon></template>
          </NButton>
        </form>
      </div>

      <template #footer>
        <div class="flex w-full items-center justify-between text-xs text-gray-500">
          <span>{{ t('ai.poweredBy') }}</span>
          <NButton quaternary size="tiny" @click="ai.isPanelOpen = false">
            <template #icon><NIcon><X /></NIcon></template>
            {{ t('ai.close') }}
          </NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.ai-caret {
  display: inline-block;
  margin-left: 1px;
  animation: ai-caret-blink 1s step-end infinite;
}
@keyframes ai-caret-blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ai-caret {
    animation: none;
  }
}
</style>
