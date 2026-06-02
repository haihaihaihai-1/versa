interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  signal?: AbortSignal
  onChunk?: (chunk: string) => void
}

interface ChatResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
}

const BASE = import.meta.env.VITE_MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1'
const DEFAULT_MODEL = import.meta.env.VITE_MIMO_MODEL || 'mimo-v2.5'
const API_KEY = import.meta.env.VITE_MIMO_API_KEY || ''

export const isAIEnabled = (): boolean => {
  return Boolean(API_KEY) && import.meta.env.VITE_MIMO_ENABLED !== 'false'
}

export const getAIModel = (): string => DEFAULT_MODEL

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatResponse> {
  if (!isAIEnabled()) {
    throw new AIError('AI 未配置：请在 .env.local 中设置 VITE_MIMO_API_KEY', 'not_configured')
  }

  const body = {
    model: opts.model || DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: Boolean(opts.stream),
  }

  if (body.stream) {
    return streamChat(body, opts)
  }
  return blockingChat(body, opts.signal)
}

async function blockingChat(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AIError(`MiMo API ${res.status}: ${text || res.statusText}`, 'api_error')
  }
  const json = await res.json()
  return {
    content: json.choices?.[0]?.message?.content || '',
    usage: json.usage
      ? {
          promptTokens: json.usage.prompt_tokens,
          completionTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens,
        }
      : undefined,
    model: json.model || DEFAULT_MODEL,
  }
}

async function streamChat(
  body: Record<string, unknown>,
  opts: ChatOptions
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new AIError(`MiMo stream ${res.status}: ${text || res.statusText}`, 'stream_error')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          opts.onChunk?.(delta)
        }
      } catch {
        // ignore
      }
    }
  }

  return { content: full, model: DEFAULT_MODEL }
}

export class AIError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'AIError'
    this.code = code
  }
}

// Convenience helpers
export const aiComplete = (prompt: string, sys?: string, opts?: ChatOptions) =>
  chat(
    sys ? [{ role: 'system', content: sys }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
    opts
  ).then((r) => r.content)

export const aiStream = (
  prompt: string,
  onChunk: (c: string) => void,
  sys?: string,
  opts?: Omit<ChatOptions, 'stream' | 'onChunk'>
) =>
  chat(
    sys ? [{ role: 'system', content: sys }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
    { ...opts, stream: true, onChunk }
  )

export const aiJson = async <T,>(prompt: string, sys?: string): Promise<T | null> => {
  const text = await aiComplete(prompt, sys + '\n\n请只输出合法 JSON，不要任何解释或代码块标记。')
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

export type { ChatMessage, ChatOptions, ChatResponse }
