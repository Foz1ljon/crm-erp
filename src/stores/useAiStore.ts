import { defineStore } from 'pinia'
import { ref } from 'vue'
import { askGemini, type GeminiMessage } from '@/core/api/gemini'
import { buildAiContext } from '@/core/composables/useAiContext'
import { i18n } from '@/config/i18n'

export interface AiChatMessage {
  id: string
  role: 'user' | 'model'
  text: string
  isError?: boolean
}

export const useAiStore = defineStore(
  'ai',
  () => {
    const apiKey = ref('')
    const messages = ref<AiChatMessage[]>([])
    const isLoading = ref(false)
    const isPanelOpen = ref(false)

    function setApiKey(key: string) {
      apiKey.value = key.trim()
    }

    function clearConversation() {
      messages.value = []
    }

    async function sendMessage(text: string) {
      const trimmed = text.trim()
      if (!trimmed || isLoading.value) return

      if (!apiKey.value) {
        messages.value.push({ id: `msg-${Date.now()}`, role: 'model', text: i18n.global.t('ai.noKeyMessage'), isError: true })
        return
      }

      const userMessage: AiChatMessage = { id: `msg-${Date.now()}-u`, role: 'user', text: trimmed }
      messages.value.push(userMessage)
      isLoading.value = true

      try {
        const context = buildAiContext()
        const history: GeminiMessage[] = messages.value
          .filter((m) => !m.isError)
          .slice(0, -1)
          .map((m) => ({ role: m.role, text: m.text }))
        const reply = await askGemini(apiKey.value, context, history, trimmed)
        messages.value.push({ id: `msg-${Date.now()}-m`, role: 'model', text: reply })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong talking to Gemini.'
        messages.value.push({ id: `msg-${Date.now()}-e`, role: 'model', text: message, isError: true })
      } finally {
        isLoading.value = false
      }
    }

    return { apiKey, messages, isLoading, isPanelOpen, setApiKey, clearConversation, sendMessage }
  },
  {
    persist: { pick: ['apiKey', 'messages'] },
  },
)
