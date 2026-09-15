import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { askGroqStream, type GroqMessage } from '@/core/api/groq'
import { buildAiContext } from '@/core/composables/useAiContext'
import { i18n } from '@/config/i18n'
import { GROQ_API_KEYS } from '@/main'
import { idbGet, idbSet } from '@/core/storage/idb'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  isError?: boolean
  isStreaming?: boolean
}

// IndexedDB keys for the persisted slices of this store.
const IDB_KEYS = 'ai.keys'
const IDB_MESSAGES = 'ai.messages'
const IDB_ACTIVE_INDEX = 'ai.activeKeyIndex'

export const useAiStore = defineStore('ai', () => {
  // Rotating pool of API keys — each request uses the next key round-robin,
  // and falls back to the others if one fails (rate limit / invalid key).
  const keys = ref<string[]>([...GROQ_API_KEYS])
  const activeKeyIndex = ref(0)
  const messages = ref<AiChatMessage[]>([])
  const isLoading = ref(false)
  const isPanelOpen = ref(false)

  const hasKey = computed(() => keys.value.some((k) => k.trim().length > 0))

  function setKeys(next: string[]) {
    keys.value = next.map((k) => k.trim())
    if (activeKeyIndex.value >= keys.value.length) activeKeyIndex.value = 0
  }

  function clearConversation() {
    messages.value = []
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return

    const activeKeys = keys.value.filter((k) => k.trim().length > 0)
    if (activeKeys.length === 0) {
      messages.value.push({ id: `msg-${Date.now()}`, role: 'assistant', text: i18n.global.t('ai.noKeyMessage'), isError: true })
      return
    }

    // History is the prior conversation (exclude errors); the new user message
    // is passed separately to the API.
    const history: GroqMessage[] = messages.value
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }))

    messages.value.push({ id: `msg-${Date.now()}-u`, role: 'user', text: trimmed })
    const assistant: AiChatMessage = { id: `msg-${Date.now()}-a`, role: 'assistant', text: '', isStreaming: true }
    messages.value.push(assistant)
    isLoading.value = true

    const context = buildAiContext()
    const startIndex = activeKeyIndex.value % activeKeys.length
    let lastError: unknown = null
    let succeeded = false

    // Try the chosen key first, then rotate through the rest as fallback.
    for (let attempt = 0; attempt < activeKeys.length; attempt++) {
      const key = activeKeys[(startIndex + attempt) % activeKeys.length]!
      assistant.text = ''
      try {
        await askGroqStream(key, context, history, trimmed, (chunk) => {
          assistant.text += chunk
        })
        // Advance so the *next* request starts from the following key.
        activeKeyIndex.value = (startIndex + attempt + 1) % activeKeys.length
        succeeded = true
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!succeeded) {
      assistant.isError = true
      assistant.text = lastError instanceof Error ? lastError.message : i18n.global.t('ai.requestFailedError', { status: 'error' })
    }

    assistant.isStreaming = false
    isLoading.value = false
  }

  // --- IndexedDB persistence (async; replaces localStorage) --------------
  let hydrated = false

  async function hydrate() {
    const [savedKeys, savedMessages, savedIndex] = await Promise.all([
      idbGet<string[]>(IDB_KEYS),
      idbGet<AiChatMessage[]>(IDB_MESSAGES),
      idbGet<number>(IDB_ACTIVE_INDEX),
    ])
    if (savedKeys && savedKeys.length) keys.value = savedKeys
    if (savedMessages) messages.value = savedMessages.map((m) => ({ ...m, isStreaming: false }))
    if (typeof savedIndex === 'number') activeKeyIndex.value = savedIndex
    hydrated = true
  }
  void hydrate()

  const persist = useDebounceFn(() => {
    if (!hydrated) return
    void idbSet(IDB_KEYS, [...keys.value])
    void idbSet(IDB_MESSAGES, JSON.parse(JSON.stringify(messages.value)))
    void idbSet(IDB_ACTIVE_INDEX, activeKeyIndex.value)
  }, 400)

  watch([keys, messages, activeKeyIndex], persist, { deep: true })

  return { keys, activeKeyIndex, messages, isLoading, isPanelOpen, hasKey, setKeys, clearConversation, sendMessage }
})
