import { i18n } from '@/config/i18n'

export interface GroqMessage {
  role: 'user' | 'assistant'
  text: string
}

/** Carries the HTTP status so callers can tell a bad key from an outage. */
export class GroqRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'GroqRequestError'
  }
}

const GROQ_MODEL = 'openai/gpt-oss-120b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Calls Groq's OpenAI-compatible Chat Completions API directly from the
 * browser with `stream: true`, invoking `onToken` for each delta chunk so the
 * UI can render a live typing effect. Returns the full concatenated reply.
 *
 * No backend proxy in this reference build — the key is therefore visible to
 * anyone who can open the app, so a shared/hardcoded key should be treated as
 * public.
 */
export async function askGroqStream(
  apiKey: string,
  systemContext: string,
  history: GroqMessage[],
  newMessage: string,
  onToken: (chunk: string) => void,
): Promise<string> {
  const body = {
    model: GROQ_MODEL,
    stream: true,
    messages: [
      { role: 'system', content: systemContext },
      ...history.map((m) => ({ role: m.role, content: m.text })),
      { role: 'user', content: newMessage },
    ],
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => null)
    const message = errorBody?.error?.message ?? i18n.global.t('ai.requestFailedError', { status: response.status })
    throw new GroqRequestError(message, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  // Server-Sent Events: lines prefixed with `data: `, terminated by `data: [DONE]`.
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const delta: string = json?.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          onToken(delta)
        }
      } catch {
        // Ignore partial/non-JSON keep-alive lines.
      }
    }
  }

  if (!full) throw new Error(i18n.global.t('ai.emptyResponseError'))
  return full
}
