import { describe, it, expect, beforeEach } from 'vitest'
import { SearchEngine, tokenize, ngrams, jaccard, tf, resetSearchEngine } from '../index'

const corpus = () => [
  { id: 'd1', fields: { title: 'Machine Learning Basics', body: 'Introduction to algorithms and models', tags: 'ml,ai,intro' }, tag: 'tech', category: 'ml' },
  { id: 'd2', fields: { title: 'Deep Learning Guide', body: 'Neural networks and backpropagation', tags: 'dl,ai,deep' }, tag: 'tech', category: 'ml' },
  { id: 'd3', fields: { title: 'Cooking Recipes', body: 'Pasta carbonara with eggs and cheese', tags: 'food,recipe' }, tag: 'life', category: 'food' },
  { id: 'd4', fields: { title: 'Advanced ML', body: 'Ensemble methods and gradient boosting', tags: 'ml,advanced' }, tag: 'tech', category: 'ml', boost: 1.5, freshness: 0.9 },
  { id: 'd5', fields: { title: 'Search Engines', body: 'BM25 ranking and vector retrieval', tags: 'search,ir' }, tag: 'tech', category: 'ir' },
]

let engine: SearchEngine

beforeEach(() => {
  resetSearchEngine()
  engine = new SearchEngine()
  for (const d of corpus()) engine.addDoc(d)
})

describe('SearchEngine', () => {
  it('tokenizes text and lowercases', () => {
    const t = tokenize('Hello World')
    expect(t.map(x => x.text)).toEqual(['hello', 'world'])
  })

  it('tokenizes strips stop words', () => {
    const t = tokenize('The cat is on the mat')
    expect(t.map(x => x.text)).toContain('cat')
    expect(t.map(x => x.text)).not.toContain('the')
  })

  it('tokenizes position is increasing', () => {
    const t = tokenize('foo bar baz')
    expect(t[1]!.position).toBe(1)
  })

  it('ngrams produces overlapping n-grams', () => {
    const g = ngrams('abc')
    expect(g).toContain('  a')
    expect(g).toContain('bc ')
  })

  it('jaccard returns 1 for identical sets', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1)
  })

  it('jaccard returns 0 for disjoint sets', () => {
    expect(jaccard(['a', 'b'], ['c', 'd'])).toBe(0)
  })

  it('jaccard returns 0 for empty inputs', () => {
    expect(jaccard([], [])).toBe(0)
  })

  it('jaccard handles partial overlap', () => {
    const v = jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])
    expect(v).toBeCloseTo(2 / 4, 5)
  })

  it('tf counts term frequencies', () => {
    const m = tf(tokenize('foo bar foo baz foo'))
    expect(m.get('foo')).toBe(3)
  })

  it('addDoc and size', () => {
    const e = new SearchEngine()
    e.addDoc({ id: 'a', fields: { body: 'hello' } })
    expect(e.size()).toBe(1)
  })

  it('removeDoc returns false for missing', () => {
    expect(engine.removeDoc('nope')).toBe(false)
  })

  it('removeDoc removes from index', () => {
    engine.removeDoc('d1')
    expect(engine.size()).toBe(4)
    const r = engine.search({ text: 'machine' })
    expect(r.find(s => s.id === 'd1')).toBeUndefined()
  })

  it('search returns sorted by score', () => {
    const r = engine.search({ text: 'machine learning', limit: 5 })
    expect(r.length).toBeGreaterThan(0)
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.score).toBeGreaterThanOrEqual(r[i]!.score)
  })

  it('search ranks matching docs over non-matching', () => {
    const r = engine.search({ text: 'machine learning' })
    expect(r.find(s => s.id === 'd1')).toBeDefined()
    expect(r.find(s => s.id === 'd3')).toBeUndefined()
  })

  it('search applies boost and freshness', () => {
    const r = engine.search({ text: 'ml advanced' })
    const d4 = r.find(s => s.id === 'd4')
    expect(d4).toBeDefined()
  })

  it('search filters by tag eq', () => {
    const r = engine.search({ text: 'learning', filters: [{ field: 'tag', op: 'eq', value: 'tech' }] })
    expect(r.every(s => s.id !== 'd3')).toBe(true)
  })

  it('search filters by tag in', () => {
    const r = engine.search({ text: 'learning', filters: [{ field: 'tag', op: 'in', value: ['life'] }] })
    expect(r.length).toBe(0)
  })

  it('search filters by category eq', () => {
    const r = engine.search({ text: 'BM25', filters: [{ field: 'category', op: 'eq', value: 'ir' }] })
    expect(r.length).toBe(1)
    expect(r[0]!.id).toBe('d5')
  })

  it('search filters by category in', () => {
    const r = engine.search({ text: 'pasta', filters: [{ field: 'category', op: 'in', value: ['food'] }] })
    expect(r.length).toBe(1)
  })

  it('search returns empty for no match', () => {
    const r = engine.search({ text: 'xyzzy' })
    expect(r).toHaveLength(0)
  })

  it('search minScore filters low', () => {
    const r = engine.search({ text: 'machine', minScore: 1000 })
    expect(r).toHaveLength(0)
  })

  it('search doRerank flag works', () => {
    const r = engine.search({ text: 'learning', doRerank: true, limit: 3 })
    expect(r.length).toBeGreaterThan(0)
  })

  it('search highlight includes matched tokens', () => {
    const r = engine.search({ text: 'machine', limit: 1 })
    expect(r[0]!.highlights).toContain('<<machine>>')
  })

  it('explain returns component scores', () => {
    const e = engine.explain({ text: 'machine' }, 'd1')
    expect(e).not.toBeNull()
    expect(e!.bm25).toBeGreaterThan(0)
  })

  it('explain returns null for missing doc', () => {
    expect(engine.explain({ text: 'x' }, 'nope')).toBeNull()
  })

  it('search empty query', () => {
    const r = engine.search({ text: '' })
    expect(r.length).toBe(0)
  })

  it('search supports Chinese tokenization', () => {
    const e = new SearchEngine()
    e.addDoc({ id: 'c1', fields: { title: '机器学习入门', body: '深度学习与神经网络' } })
    const r = e.search({ text: '学习' })
    expect(r.length).toBe(1)
  })

  it('search supports custom stopwords', () => {
    const e = new SearchEngine({ stopWords: new Set(['the']) })
    e.addDoc({ id: 'x', fields: { body: 'the cat sat' } })
    const r = e.search({ text: 'the cat' })
    expect(r[0]!.id).toBe('x')
  })

  it('getSearchEngine returns singleton', async () => {
    const { getSearchEngine } = await import('../index')
    const a = getSearchEngine()
    const b = getSearchEngine()
    expect(a).toBe(b)
  })
})
