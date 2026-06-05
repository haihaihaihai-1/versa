import { describe, it, expect, beforeEach } from 'vitest'
import { SearchEngine } from '../index'

const docs = [
  { id: '1', fields: { title: 'Hello World', body: 'The quick brown fox jumps over the lazy dog' }, tags: ['animals'] },
  { id: '2', fields: { title: 'Vue vs React', body: 'Comparing JavaScript frameworks for modern web development' }, tags: ['web'] },
  { id: '3', fields: { title: 'Python tutorial', body: 'Learn Python programming language basics for beginners' }, tags: ['python'] },
  { id: '4', fields: { title: 'TypeScript guide', body: 'Advanced TypeScript types and generics for production code' }, tags: ['typescript'] },
  { id: '5', fields: { title: 'BM25 algorithm', body: 'The BM25 ranking function is used in information retrieval' }, tags: ['search'] },
  { id: '6', fields: { title: 'Elasticsearch', body: 'Distributed search engine built on Lucene with full text search' }, tags: ['search'] },
]

describe('SearchEngine - indexing', () => {
  let s: SearchEngine
  beforeEach(() => { s = new SearchEngine({ fields: ['title', 'body'] }) })

  it('index and search', () => {
    s.index(docs[0]!)
    const hits = s.search({ query: 'hello' })
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('1')
  })

  it('index replaces existing', () => {
    s.index(docs[0]!)
    s.index({ id: '1', fields: { title: 'Goodbye', body: 'farewell' } })
    const hits = s.search({ query: 'hello' })
    expect(hits).toHaveLength(0)
    const hits2 = s.search({ query: 'goodbye' })
    expect(hits2).toHaveLength(1)
  })

  it('indexBatch indexes multiple', () => {
    s.indexBatch(docs)
    expect(s.size()).toBe(6)
  })

  it('remove deletes document', () => {
    s.index(docs[0]!)
    expect(s.remove('1')).toBe(true)
    expect(s.search({ query: 'hello' })).toHaveLength(0)
  })

  it('remove non-existent returns false', () => {
    expect(s.remove('missing')).toBe(false)
  })

  it('clear empties index', () => {
    s.indexBatch(docs)
    s.clear()
    expect(s.size()).toBe(0)
  })

  it('hasTerm', () => {
    s.index(docs[0]!)
    expect(s.hasTerm('hello')).toBe(true)
    expect(s.hasTerm('missing')).toBe(false)
  })

  it('getPostings returns postings', () => {
    s.index(docs[0]!)
    const p = s.getPostings('hello')
    expect(p).toHaveLength(1)
    expect(p[0].docId).toBe('1')
  })

  it('getDoc returns indexed doc', () => {
    s.index(docs[0]!)
    expect(s.getDoc('1')?.fields.title).toBe('Hello World')
  })

  it('listDocs', () => {
    s.indexBatch(docs)
    expect(s.listDocs()).toHaveLength(6)
  })
})

describe('SearchEngine - basic search', () => {
  let s: SearchEngine
  beforeEach(() => { s = new SearchEngine({ fields: ['title', 'body'] }); s.indexBatch(docs) })

  it('finds single term', () => {
    const hits = s.search({ query: 'python' })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some(h => h.id === '3')).toBe(true)
  })

  it('case-insensitive', () => {
    const lower = s.search({ query: 'python' })
    const upper = s.search({ query: 'PYTHON' })
    expect(lower.length).toBe(upper.length)
  })

  it('multi-term OR', () => {
    const hits = s.search({ query: 'python typescript', operator: 'or' })
    expect(hits.length).toBeGreaterThanOrEqual(2)
  })

  it('multi-term AND', () => {
    const hits = s.search({ query: 'python tutorial', operator: 'and' })
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('3')
  })

  it('limit and offset', () => {
    const hits = s.search({ query: 'search', limit: 1 })
    expect(hits).toHaveLength(1)
  })

  it('empty query returns nothing', () => {
    expect(s.search({ query: '' })).toEqual([])
  })

  it('no match returns empty', () => {
    expect(s.search({ query: 'zzznotawordzzz' })).toEqual([])
  })

  it('stopword filter', () => {
    const hits = s.search({ query: 'the' })
    // 'the' is a stopword
    expect(hits).toHaveLength(0)
  })

  it('matchedTerms returned', () => {
    s.index(docs[0]!)
    const hits = s.search({ query: 'hello world' })
    expect(hits[0].matchedTerms).toContain('hello')
    expect(hits[0].matchedTerms).toContain('world')
  })
})

describe('SearchEngine - field boosts', () => {
  it('title match ranks higher than body match', () => {
    const s = new SearchEngine({ fields: ['title', 'body'], fieldBoosts: { title: 5, body: 1 } })
    s.indexBatch(docs)
    // Add a doc with python in body but not title to differentiate
    s.index({ id: '7', fields: { title: 'Other', body: 'python is great' } })
    const hits = s.search({ query: 'python' })
    // Doc 3 has 'Python' in title, doc 7 has 'python' in body — doc 3 should win
    expect(hits[0].id).toBe('3')
  })
})

describe('SearchEngine - filter', () => {
  let s: SearchEngine
  beforeEach(() => { s = new SearchEngine({ fields: ['title', 'body'] }); s.indexBatch(docs) })

  it('filter by field value', () => {
    const hits = s.search({ query: 'search', filter: [{ field: 'tags', value: 'search' }] })
    expect(hits.every(h => ['5', '6'].includes(h.id))).toBe(true)
  })

  it('filter excludes non-matching', () => {
    const hits = s.search({ query: 'python', filter: [{ field: 'tags', value: 'web' }] })
    expect(hits).toHaveLength(0)
  })

  it('filter by regular field', () => {
    const hits = s.search({ query: 'BM25', filter: [{ field: 'title', value: 'BM25 algorithm' }] })
    expect(hits).toHaveLength(1)
  })
})

describe('SearchEngine - highlights', () => {
  let s: SearchEngine
  beforeEach(() => { s = new SearchEngine({ fields: ['title', 'body'] }); s.indexBatch(docs) })

  it('highlights matched terms', () => {
    const hits = s.search({ query: 'python', highlight: { pre: '<b>', post: '</b>' } })
    const h = hits.find(h => h.id === '3')
    expect(h).toBeDefined()
    const allFrags = Object.values(h!.highlights).flat()
    expect(allFrags.some(f => f.includes('<b>python</b>') || f.includes('<b>Python</b>'))).toBe(true)
  })

  it('highlight with no match returns empty', () => {
    const hits = s.search({ query: 'zzznotawordzzz', highlight: { pre: '<b>', post: '</b>' } })
    expect(hits).toHaveLength(0)
  })

  it('fragment size limits', () => {
    const s2 = new SearchEngine({ fields: ['body'] })
    s2.index({ id: 'big', fields: { body: 'a'.repeat(1000) + ' python ' + 'b'.repeat(1000) } })
    const hits = s2.search({ query: 'python', highlight: { pre: '<b>', post: '</b>', fragmentSize: 30 } })
    expect(hits[0].highlights.body[0].length).toBeLessThan(50)
  })
})

describe('SearchEngine - fuzzy', () => {
  it('fuzzy match finds typos', () => {
    const s = new SearchEngine({ fields: ['title', 'body'], enableFuzzy: true, fuzzyDistance: 1 })
    s.index(docs[2]!) // "Python tutorial"
    const hits = s.search({ query: 'Pythn' }) // missing 'o'
    expect(hits.length).toBeGreaterThan(0)
  })

  it('exact match still works in fuzzy mode', () => {
    const s = new SearchEngine({ fields: ['title', 'body'], enableFuzzy: true, fuzzyDistance: 1 })
    s.index(docs[2]!)
    const hits = s.search({ query: 'Python' })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('distance 2 allows more typos', () => {
    const s = new SearchEngine({ fields: ['title', 'body'], enableFuzzy: true, fuzzyDistance: 2 })
    s.index(docs[2]!)
    const hits = s.search({ query: 'Pyton' }) // 2 chars different
    expect(hits.length).toBeGreaterThan(0)
  })
})

describe('SearchEngine - parser', () => {
  let s: SearchEngine
  beforeEach(() => { s = new SearchEngine({ fields: ['title', 'body'] }); s.indexBatch(docs) })

  it('parseQuery must', () => {
    const p = s.parseQuery('+python +tutorial')
    expect(p.must).toEqual(['python', 'tutorial'])
  })

  it('parseQuery mustNot', () => {
    const p = s.parseQuery('python -bad')
    expect(p.mustNot).toEqual(['bad'])
  })

  it('parseQuery phrases', () => {
    const p = s.parseQuery('"machine learning" python')
    expect(p.phrases).toEqual(['machine learning'])
  })

  it('searchWithParsed must', () => {
    const p = s.parseQuery('+python')
    const hits = s.searchWithParsed({ query: 'python', parsed: p })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('searchWithParsed mustNot', () => {
    const p = s.parseQuery('python -tutorial')
    const hits = s.searchWithParsed({ query: 'python tutorial', parsed: p })
    // 'python tutorial' doc 3 has tutorial in body, so excluded
    expect(hits.find(h => h.id === '3')).toBeUndefined()
  })
})

describe('SearchEngine - BM25 scoring', () => {
  it('higher TF ranks higher', () => {
    const s = new SearchEngine({ fields: ['body'] })
    s.index({ id: 'a', fields: { body: 'python python python' } })
    s.index({ id: 'b', fields: { body: 'python is great' } })
    const hits = s.search({ query: 'python' })
    expect(hits[0].id).toBe('a')
  })

  it('shorter doc ranks higher for same TF', () => {
    const s = new SearchEngine({ fields: ['body'] })
    s.index({ id: 'short', fields: { body: 'python' } })
    s.index({ id: 'long', fields: { body: 'a b c d e f g h i j python' } })
    const hits = s.search({ query: 'python' })
    // BM25 prefers shorter docs with same TF
    expect(hits[0].id).toBe('short')
  })
})

describe('SearchEngine - stats', () => {
  it('reports totalDocs and totalTerms', () => {
    const s = new SearchEngine({ fields: ['title', 'body'] })
    s.indexBatch(docs)
    const st = s.stats()
    expect(st.totalDocs).toBe(6)
    expect(st.totalTerms).toBeGreaterThan(10)
    expect(st.avgDocLength).toBeGreaterThan(0)
    expect(st.indexSize).toBeGreaterThan(0)
  })

  it('getMetrics tracks searches/indexed/removed', () => {
    const s = new SearchEngine({ fields: ['title', 'body'] })
    s.indexBatch(docs)
    s.search({ query: 'python' })
    s.remove('1')
    const m = s.getMetrics()
    expect(m.indexed).toBe(6)
    expect(m.searches).toBe(1)
    expect(m.removed).toBe(1)
  })
})

describe('SearchEngine - ngram tokenizer', () => {
  it('ngram tokenizer enables partial matching', () => {
    const s = new SearchEngine({ fields: ['body'], tokenizer: 'ngram', ngramSize: 3 })
    s.index(docs[0]!) // "The quick brown fox..."
    const hits = s.search({ query: 'qui' })
    expect(hits.length).toBeGreaterThan(0)
  })
})
