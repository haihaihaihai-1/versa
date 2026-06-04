// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mockProvider, ai, trackCost, getCostStats } from '../provider'
import { brief, recommend, writer } from '../features'

describe('AI · mock provider', () => {
  it('complete returns text + usage', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: '你好' }])
    expect(r.text).toBeTruthy()
    expect(r.usage.totalTokens).toBeGreaterThan(0)
    expect(r.cost).toBe(0)
  })

  it('stream yields chunks ending with done', async () => {
    const chunks: string[] = []
    let lastDone = false
    for await (const c of mockProvider.stream([{ role: 'user', content: '推荐商品' }])) {
      chunks.push(c.text)
      if (c.done) lastDone = true
    }
    expect(chunks.length).toBeGreaterThan(0)
    expect(lastDone).toBe(true)
  })

  it('estimateTokens counts CJK differently', () => {
    const cn = mockProvider.estimateTokens('你好世界')
    const en = mockProvider.estimateTokens('hello world')
    expect(cn).toBeGreaterThan(en)
  })

  it('shopper intent detected', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: '推荐一些商品' }])
    expect(r.text).toMatch(/商品|推荐/)
  })

  it('debate intent detected', async () => {
    const r = await mockProvider.complete([{ role: 'user', content: '我想参加辩论' }])
    expect(r.text).toMatch(/辩论|观点|分析/)
  })
})

describe('AI · 顶层 ai 实例', () => {
  it('ai.complete 走 mock provider', async () => {
    const r = await ai.complete([{ role: 'user', content: 'hello' }])
    expect(r.provider).toBe('mock')
  })
})

describe('AI · cost 追踪', () => {
  it('trackCost 增加统计', () => {
    const before = getCostStats()
    trackCost({ promptTokens: 100, completionTokens: 200, totalTokens: 300 }, 0.001)
    const after = getCostStats()
    expect(after.calls).toBe(before.calls + 1)
    expect(after.tokens).toBe(before.tokens + 300)
    expect(after.total).toBeCloseTo(before.total + 0.001, 6)
  })
})

describe('AI · features · brief', () => {
  it('mock brief 仍然返回结构化数据 (fallback)', async () => {
    const r = await brief({ title: '测试', content: '这是一段测试内容,用于验证 brief 功能。' })
    expect(r.summary.length).toBeGreaterThan(0)
  })
})

describe('AI · features · writer', () => {
  it('writer 返回 content', async () => {
    const r = await writer({ type: 'post', topic: '新品发布', tone: 'casual' })
    expect(r.content).toBeTruthy()
  })
})

describe('AI · features · recommend (本地算法)', () => {
  it('推荐 = 浏览 × 3 + 收藏 × 5 + 分类加权', async () => {
    const products = [
      { id: 'p1', category: 'tech', rating: 4.8 },
      { id: 'p2', category: 'tech', rating: 4.0 },
      { id: 'p3', category: 'fashion', rating: 4.5 },
    ]
    const r = await recommend({
      userId: 'u1',
      recentViews: ['p1'],
      favorites: ['p2'],
      purchases: [],
      followedCategories: ['fashion'],
    }, products)
    const p1 = r.items.find((x) => x.productId === 'p1')
    const p2 = r.items.find((x) => x.productId === 'p2')
    const p3 = r.items.find((x) => x.productId === 'p3')
    expect(p1).toBeDefined()
    expect(p2).toBeDefined()
    expect(p3).toBeDefined()
    expect(p2!.score).toBeGreaterThan(p1!.score) // 收藏 5 > 浏览 3
  })

  it('空输入返回空', async () => {
    const r = await recommend({ userId: 'u', recentViews: [], favorites: [], purchases: [], followedCategories: [] }, [])
    expect(r.items).toHaveLength(0)
  })
})
