// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mockProvider, openaiProvider, ai, getCostStats, trackCost, setProvider, getProvider } from '../provider'

beforeEach(() => {
  localStorage.clear()
})

describe('AI provider · 估算', () => {
  it('CN 中文 1.5 倍', () => {
    // '你好世界' = 4 个中文字符
    expect(mockProvider.estimateTokens('你好世界')).toBe(6)
  })

  it('EN 英文 0.25 倍', () => {
    expect(mockProvider.estimateTokens('hello world')).toBe(Math.ceil(11 * 0.25))
  })

  it('空字符串 → 0', () => {
    expect(mockProvider.estimateTokens('')).toBe(0)
  })

  it('openai 用同一估算函数', () => {
    expect(openaiProvider.estimateTokens('你好')).toBe(3)
  })
})

describe('AI provider · pricing', () => {
  it('mock 价格 0', () => {
    expect(mockProvider.pricing.input).toBe(0)
    expect(mockProvider.pricing.output).toBe(0)
  })

  it('openai 价格 > 0', () => {
    expect(openaiProvider.pricing.input).toBeGreaterThan(0)
    expect(openaiProvider.pricing.output).toBeGreaterThan(0)
  })

  it('output 比 input 贵 (OpenAI 惯例)', () => {
    expect(openaiProvider.pricing.output).toBeGreaterThanOrEqual(openaiProvider.pricing.input)
  })
})

describe('AI provider · mock 行为', () => {
  it('基础 complete', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: 'hi' }])
    expect(r.text).toBeTruthy()
    expect(r.provider).toBe('mock')
    expect(r.cost).toBe(0)
    expect(r.usage.totalTokens).toBeGreaterThan(0)
    expect(r.finishReason).toBe('stop')
  })

  it('中文 hi → 包含中文回复', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: '你好' }])
    expect(r.text).toMatch(/Versa|你好|购物|辩论|摘要|助手/)
  })

  it('辩论关键词触发辩论模板', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: '我想了解辩论' }])
    expect(r.text).toMatch(/辩论/)
  })

  it('购物关键词触发推荐模板', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: '推荐个商品' }])
    expect(r.text).toMatch(/商品|推荐/)
  })

  it('流式 (AsyncIterable)', async () => {
    const chunks: string[] = []
    for await (const c of mockProvider.stream([{ role: 'user', content: 'hi' }])) {
      chunks.push(c.text)
    }
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBeTruthy()
  })
})

describe('AI provider · openai', () => {
  it('无 API key → 抛错', async () => {
    await expect(
      openaiProvider.complete([{ role: 'user', content: 'x' }])
    ).rejects.toThrow(/VITE_OPENAI_API_KEY/)
  })

  it('流式无 API key → 抛错', async () => {
    const iter = openaiProvider.stream([{ role: 'user', content: 'x' }])
    await expect(iter.next()).rejects.toThrow(/VITE_OPENAI_API_KEY/)
  })
})

describe('AI provider · provider 切换', () => {
  it('默认是 mock', () => {
    expect(getProvider().name).toBe('mock')
    expect(ai.name).toBe('auto')  // ai 是 auto 包装
  })

  it('setProvider 切换', () => {
    setProvider('openai')
    // 由于 localStorage 是 versa:ai:provider, getProvider 读这个, 但 openai 还需要 key
    // 所以即便设置了 'openai', 没 key 也会 fallback 到 mock
    setProvider('mock')
    expect(getProvider().name).toBe('mock')
  })
})

describe('AI provider · 成本追踪', () => {
  it('trackCost 累加', () => {
    trackCost({ promptTokens: 100, completionTokens: 50, totalTokens: 150 }, 0.001)
    trackCost({ promptTokens: 200, completionTokens: 100, totalTokens: 300 }, 0.002)
    const stats = getCostStats()
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.calls).toBeGreaterThanOrEqual(2)
  })
})
