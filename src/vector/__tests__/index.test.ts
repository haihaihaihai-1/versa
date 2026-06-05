import { describe, it, expect, beforeEach } from 'vitest'
import {
  cosine, dotProduct, euclidean, manhattan, normalize, tokenize, estimateTokens,
  HashEmbedding, createVectorIndex, createBM25, hybridSearch,
  chunkBySentence, chunkByParagraph,
  KnowledgeBase, rerank, rag, buildDemoKB, SAMPLE_CORPORA, SAMPLE_EVAL,
  recallAtK, mrr, ndcgAtK, evaluate,
  type Doc, type Vector, type EmbeddingModel,
} from '../index'

describe('similarity', () => {
  it('cosine 相同向量 = 1', () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 5)
  })
  it('cosine 正交 = 0', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 5)
  })
  it('dotProduct', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32)
  })
  it('euclidean', () => {
    expect(euclidean([0, 0], [3, 4])).toBe(5)
  })
  it('manhattan', () => {
    expect(manhattan([0, 0], [3, 4])).toBe(7)
  })
  it('normalize', () => {
    const n = normalize([3, 4]) as number[]
    expect(Math.hypot(n[0], n[1])).toBeCloseTo(1, 5)
  })
})

describe('tokenize + estimateTokens', () => {
  it('过滤停用词', () => {
    const t = tokenize('the quick brown fox is fast')
    expect(t).toContain('quick')
    expect(t).toContain('brown')
    expect(t).not.toContain('the')
  })
  it('中文分词粗切', () => {
    const t = tokenize('向量数据库是现代 AI 的核心组件')
    expect(t.length).toBeGreaterThan(0)
  })
  it('estimateTokens 中英', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0)
    expect(estimateTokens('向量数据库')).toBeGreaterThan(0)
  })
})

describe('HashEmbedding', () => {
  it('稳定 & 归一化', () => {
    const m = new HashEmbedding(64)
    const a = m.embed('hello world')
    const b = m.embed('hello world')
    expect(a).toEqual(b)
    const n = Math.sqrt((a as number[]).reduce((s, x) => s + x * x, 0))
    expect(n).toBeCloseTo(1, 3)
  })
  it('维度', () => {
    expect(new HashEmbedding(32).dim).toBe(32)
    expect(new HashEmbedding(128).dim).toBe(128)
  })
  it('相似文本高相似度', () => {
    const m = new HashEmbedding(128)
    const s = cosine(m.embed('向量数据库推荐系统'), m.embed('向量数据库 检索'))
    const d = cosine(m.embed('向量数据库推荐系统'), m.embed('今天天气不错'))
    expect(s).toBeGreaterThan(d)
  })
  it('非法维度抛错', () => {
    expect(() => new HashEmbedding(2)).toThrow()
    expect(() => new HashEmbedding(9999)).toThrow()
  })
})

describe('VectorIndex', () => {
  it('add/search/remove', () => {
    const idx = createVectorIndex(3)
    idx.add(1, [1, 0, 0])
    idx.add(2, [0, 1, 0])
    idx.add(3, [0.9, 0.1, 0])
    const r = idx.search([1, 0, 0], 2)
    expect(r[0].id).toBe(1)
    expect(r[0].score).toBeGreaterThan(r[1].score)
    idx.remove(1)
    expect(idx.size()).toBe(2)
  })
  it('维度校验', () => {
    const idx = createVectorIndex(3)
    expect(() => idx.add(1, [1, 0])).toThrow()
  })
  it('三种度量', () => {
    const idx = createVectorIndex(2)
    idx.add(1, [1, 0])
    idx.add(2, [0, 1])
    expect(idx.search([1, 0], 2, 'cosine')[0].id).toBe(1)
    expect(idx.search([1, 0], 2, 'dot')[0].id).toBe(1)
    expect(idx.search([1, 0], 2, 'euclidean')[0].id).toBe(1)
  })
  it('toJSON/fromJSON', () => {
    const a = createVectorIndex(2)
    a.add(1, [1, 2])
    a.add(2, [3, 4])
    const b = createVectorIndex(2)
    b.fromJSON(a.toJSON())
    expect(b.size()).toBe(2)
    expect(b.search([1, 2], 1)[0].id).toBe(1)
  })
})

describe('BM25', () => {
  it('基本排序', () => {
    const docs = [
      { id: 1, text: '向量数据库 是 用于 相似度 检索 的 数据库' },
      { id: 2, text: '今天 天气 不错' },
      { id: 3, text: 'BM25 是 经典 检索 算法' },
    ]
    const b = createBM25()
    b.build(docs)
    const r = b.score('向量数据库', 3)
    expect(r[0].id).toBe(1)
  })
  it('空 query', () => {
    const b = createBM25()
    b.build([{ id: 1, text: 'foo' }])
    expect(b.score('', 1)).toEqual([])
  })
})

describe('hybridSearch', () => {
  it('加权和', () => {
    const docs = [{ id: 1, text: 'a b c' }, { id: 2, text: 'd e f' }]
    const bm = createBM25(); bm.build(docs)
    const vi = createVectorIndex(2)
    vi.add(1, [1, 0]); vi.add(2, [0, 1])
    const r = hybridSearch(bm, vi, 'a b c', [1, 0], 2, 0.5)
    expect(r[0].id).toBe(1)
  })
})

describe('Chunker', () => {
  const doc: Doc = { id: 'd1', text: '第一句. 第二句很长很长很长很长很长很长很长很长很长很长很长很长很长很长. 第三句. 第四句.' }
  it('按句子分块', () => {
    const c = chunkBySentence(doc, { maxChars: 50 })
    expect(c.length).toBeGreaterThan(0)
    expect(c[0].docId).toBe('d1')
  })
  it('按段落分块', () => {
    const c = chunkByParagraph({ id: 'p1', text: '段一\n\n段二内容非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长非常长' })
    expect(c.length).toBeGreaterThan(0)
  })
})

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase
  let model: EmbeddingModel
  beforeEach(() => {
    model = new HashEmbedding(64)
    kb = new KnowledgeBase(model)
  })
  it('add / list / get', () => {
    const id = kb.add({ id: 'a', text: 'hello world' })
    expect(kb.get(id)).toBeDefined()
    expect(kb.list().length).toBe(1)
  })
  it('remove', () => {
    const id = kb.add({ id: 'a', text: 'hello' })
    expect(kb.remove(id)).toBe(true)
    expect(kb.list().length).toBe(0)
  })
  it('search / searchWithContext', () => {
    kb.add({ id: 'a', title: 'A', text: '向量数据库 用于 相似度 检索' })
    kb.add({ id: 'b', title: 'B', text: 'BM25 是 经典 检索 算法' })
    const r = kb.searchWithContext('向量数据库', 2)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].item.id).toBe('a')
  })
})

describe('rerank', () => {
  it('重排不空', () => {
    const kb = buildDemoKB('tech')
    const res = kb.searchWithContext('RAG 检索增强', 3)
    const r = rerank(res, 'RAG 检索增强', kb['model'])
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].rerankScore).toBeGreaterThanOrEqual(0)
  })
})

describe('RAG pipeline', () => {
  it('完整流程', () => {
    const kb = buildDemoKB('tech')
    const r = rag(kb, '什么是 RAG', kb['model'], { topK: 3, maxContextTokens: 500 })
    expect(r.question).toBe('什么是 RAG')
    expect(r.citations.length).toBeGreaterThan(0)
    expect(r.prompt).toContain('什么是 RAG')
    expect(r.usage.contextTokens).toBeGreaterThan(0)
  })
  it('token 截断', () => {
    const kb = buildDemoKB('news')
    const r = rag(kb, '气候', kb['model'], { topK: 5, maxContextTokens: 50 })
    expect(r.usage.contextTokens).toBeLessThanOrEqual(50)
  })
  it('自定义模板', () => {
    const kb = buildDemoKB('shop')
    const r = rag(kb, '无线耳机', kb['model'], { template: (c, q) => `C=${c}|Q=${q}` })
    expect(r.prompt).toContain('C=')
  })
})

describe('Evaluation', () => {
  it('recall / mrr / ndcg', () => {
    const kb = buildDemoKB('tech')
    const results = SAMPLE_EVAL.map((q) => rag(kb, q.query, kb['model'], { topK: 3 }))
    const metrics = evaluate(results, SAMPLE_EVAL)
    expect(metrics.recall).toBeGreaterThanOrEqual(0)
    expect(metrics.mrr).toBeGreaterThanOrEqual(0)
    expect(metrics.ndcg).toBeGreaterThanOrEqual(0)
  })
  it('mrr 首位命中 = 1', () => {
    expect(mrr({ citations: [{ id: 'a', chunk: '', score: 1 }] } as any, { query: 'x', relevantIds: ['a'] })).toBe(1)
    expect(mrr({ citations: [{ id: 'b', chunk: '', score: 1 }] } as any, { query: 'x', relevantIds: ['a'] })).toBe(0)
  })
  it('ndcg 完美排序', () => {
    expect(ndcgAtK({ citations: [{ id: 'a', chunk: '', score: 1 }, { id: 'b', chunk: '', score: 0.5 }] } as any, { query: 'x', relevantIds: ['a', 'b'] })).toBeCloseTo(1, 5)
  })
})

describe('buildDemoKB', () => {
  it('三个 corpus 都可用', () => {
    expect(buildDemoKB('tech').size()).toBeGreaterThan(0)
    expect(buildDemoKB('shop').size()).toBeGreaterThan(0)
    expect(buildDemoKB('news').size()).toBeGreaterThan(0)
  })
})
