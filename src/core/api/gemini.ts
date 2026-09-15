import { i18n } from '@/config/i18n'

export interface GeminiMessage {
  role: 'user' | 'model'
  text: string
}

const GEMINI_MODEL = 'gemini-2.0-flash'

/**
 * Calls Google's Generative Language REST API directly from the browser
 * using the user's own API key (entered in Settings, stored locally —
 * never hardcoded or sent anywhere but Google). No backend proxy in this
 * reference build.
 */
export async function askGemini(apiKey: string, systemContext: string, history: GeminiMessage[], newMessage: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = {
    systemInstruction: { parts: [{ text: systemContext }] },
    contents: [...history, { role: 'user', text: newMessage }].map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message = errorBody?.error?.message ?? i18n.global.t('ai.requestFailedError', { status: response.status })
    throw new Error(message)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  if (!text) throw new Error(i18n.global.t('ai.emptyResponseError'))
  return text
}
