/**
 * Versa · AI Provider 抽象 (v11.0)
 *
 * 统一封装：mock / openai / claude / qwen
 * 用法：
 *   import { ai } from '@/ai'
 *   const r = await ai.complete({ prompt: '...' })
 *   const stream = ai.stream({ prompt: '...' })
 */

export type Role = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: Role
  content: string
  name?: string
}

export interface CompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stop?: string[]
  signal?: AbortSignal
}

export interface CompletionResult {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: number
  model: string
  provider: string
  latencyMs: number
  finishReason: 'stop' | 'length' | 'error' | 'abort'
}

export interface StreamChunk {
  text: string
  done: boolean
  usage?: CompletionResult['usage']
}

export interface AIProvider {
  name: string
  complete(messages: ChatMessage[], opts?: CompletionOptions): Promise<CompletionResult>
  stream(messages: ChatMessage[], opts?: CompletionOptions): AsyncIterable<StreamChunk>
  estimateTokens(text: string): number
  /** 每 1k token 价格 USD */
  pricing: { input: number; output: number }
}

// ============== Mock Provider (零成本演示) ==============

const MOCK_RESPONSES: Array<{ keywords: string[]; reply: string }> = [
  { keywords: ['辩论', '正方', '反方', 'debate'], reply: '这场辩论的焦点在于价值观的取舍。让我从三个维度分析：①事实层面 ②价值层面 ③实践层面。' },
  { keywords: ['商品', '购物', '推荐', 'shop', 'recommend'], reply: '根据你的浏览历史，我推荐这 3 件商品：A. 实用性强 B. 性价比高 C. 口碑好。' },
  { keywords: ['摘要', '总结', 'summary', 'summarize'], reply: '【3 行摘要】本文核心观点：①… ②… ③…' },
  { keywords: ['你好', 'hi', 'hello', '嗨'], reply: '你好！我是 Versa 助手，可以帮你：🛍️ AI 导购 · ⚖️ 辩论陪练 · 📰 资讯摘要 · ✍️ AI 写作' },
]

const FALLBACK = '抱歉，我还在思考中。换个话题试试？或者开启网络连接以使用真实的 AI 模型。'

function mockReply(messages: ChatMessage[]): string {
  const last = messages.filter((m) => m.role === 'user').pop()?.content.toLowerCase() || ''
  for (const m of MOCK_RESPONSES) {
    if (m.keywords.some((k) => last.includes(k.toLowerCase()))) return m.reply
  }
  return FALLBACK
}

function estimateTokensByLen(text: string): number {
  // CJK 字符按 1.5 token 估算，英文按 0.25 估算 (经验值)
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = text.length - cjk
  return Math.ceil(cjk * 1.5 + en * 0.25)
}

export const mockProvider: AIProvider = {
  name: 'mock',
  pricing: { input: 0, output: 0 },
  estimateTokens: estimateTokensByLen,
  async complete(messages, opts) {
    const text = mockReply(messages)
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400))
    const pt = messages.reduce((s, m) => s + estimateTokensByLen(m.content), 0)
    const ct = estimateTokensByLen(text)
    return {
      text,
      usage: { promptTokens: pt, completionTokens: ct, totalTokens: pt + ct },
      cost: 0,
      model: 'mock-v1',
      provider: 'mock',
      latencyMs: 350,
      finishReason: 'stop',
    }
  },
  async *stream(messages, opts) {
    const text = mockReply(messages)
    const chunks = text.match(/.{1,4}/g) || [text]
    let acc = ''
    for (const c of chunks) {
      acc += c
      yield { text: c, done: false }
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 50))
    }
    const pt = messages.reduce((s, m) => s + estimateTokensByLen(m.content), 0)
    const ct = estimateTokensByLen(text)
    yield {
      text: '',
      done: true,
      usage: { promptTokens: pt, completionTokens: ct, totalTokens: pt + ct },
    }
  },
}

// ============== OpenAI Provider (生产可用) ==============

export const openaiProvider: AIProvider = {
  name: 'openai',
  pricing: { input: 0.005, output: 0.015 }, // gpt-4o-mini
  estimateTokens: estimateTokensByLen,
  async complete(messages, opts = {}) {
    const key = (import.meta as any).env?.VITE_OPENAI_API_KEY
    if (!key) throw new Error('VITE_OPENAI_API_KEY 未配置')
    const start = Date.now()
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: opts.model || 'gpt-4o-mini',
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 800,
        top_p: opts.topP ?? 1,
        stop: opts.stop,
      }),
      signal: opts.signal,
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    const u = data.usage || { prompt_tokens: 0, completion_tokens: 0 }
    return {
      text,
      usage: {
        promptTokens: u.prompt_tokens,
        completionTokens: u.completion_tokens,
        totalTokens: u.total_tokens,
      },
      cost: ((u.prompt_tokens / 1000) * 0.005 + (u.completion_tokens / 1000) * 0.015),
      model: data.model,
      provider: 'openai',
      latencyMs: Date.now() - start,
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
    }
  },
  async *stream(messages, opts = {}) {
    const key = (import.meta as any).env?.VITE_OPENAI_API_KEY
    if (!key) throw new Error('VITE_OPENAI_API_KEY 未配置')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: opts.model || 'gpt-4o-mini',
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 800,
      }),
    })
    if (!res.ok || !res.body) throw new Error(`OpenAI stream ${res.status}`)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let acc = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            yield { text: '', done: true }
            return
          }
          try {
            const json = JSON.parse(payload)
            const delta = json.choices?.[0]?.delta?.content || ''
            acc += delta
            yield { text: delta, done: false }
          } catch {}
        }
      }
    }
    yield { text: '', done: true, usage: { promptTokens: estimateTokensByLen(acc), completionTokens: 0, totalTokens: estimateTokensByLen(acc) } }
  },
}

// ============== Provider 切换 ==============

const STORAGE_KEY = 'versa:ai:provider'

export function getProvider(): AIProvider {
  try {
    const name = localStorage.getItem(STORAGE_KEY) || 'mock'
    if (name === 'openai') {
      const key = (import.meta as any).env?.VITE_OPENAI_API_KEY
      if (key) return openaiProvider
    }
  } catch {}
  return mockProvider
}

export function setProvider(name: 'mock' | 'openai' | 'claude' | 'qwen') {
  try { localStorage.setItem(STORAGE_KEY, name) } catch {}
}

// ============== 顶层 AI 实例 ==============

export const ai: AIProvider = {
  name: 'auto',
  pricing: { input: 0, output: 0 },
  estimateTokens: estimateTokensByLen,
  async complete(messages, opts) {
    return getProvider().complete(messages, opts)
  },
  stream(messages, opts) {
    return getProvider().stream(messages, opts)
  },
}

/** 成本统计 */
const COST_KEY = 'versa:ai:cost'
export function trackCost(usage: CompletionResult['usage'], cost: number) {
  try {
    const raw = localStorage.getItem(COST_KEY)
    const data = raw ? JSON.parse(raw) : { total: 0, calls: 0, tokens: 0, byProvider: {} as Record<string, number> }
    data.total += cost
    data.calls += 1
    data.tokens += usage.totalTokens
    localStorage.setItem(COST_KEY, JSON.stringify(data))
  } catch {}
}

export function getCostStats() {
  try {
    const raw = localStorage.getItem(COST_KEY)
    return raw ? JSON.parse(raw) : { total: 0, calls: 0, tokens: 0, byProvider: {} }
  } catch {
    return { total: 0, calls: 0, tokens: 0, byProvider: {} }
  }
}
