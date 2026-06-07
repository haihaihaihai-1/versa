import { describe, it, expect, beforeEach } from 'vitest'
import { RagPipeline, chunkText, estimateTokens, splitSentences, resetRagPipeline } from '../index'

const corpus = [
  { id: 'a', title: 'Intro to ML', text: 'Machine learning is a subset of AI. It focuses on algorithms that learn from data. Neural networks are a popular technique. Deep learning uses multi-layer networks.' },
  { id: 'b', title: 'Cooking 101', text: 'Pasta is made from wheat and eggs. Carbonara uses eggs, cheese, and guanciale. Boil the pasta in salted water.' },
  { id: 'c', title: 'Travel Guide', text: 'Paris is the capital of France. The Eiffel Tower is its most famous landmark. Visit the Louvre for art.' },
]

let rag: RagPipeline

beforeEach(() => {
  resetRagPipeline()
  rag = new RagPipeline({ chunkSize: 50, chunkOverlap: 10 })
  for (const d of corpus) rag.addDoc(d)
})

describe('estimateTokens', () => {
  it('estimates token count by length/4', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcdefgh')).toBe(2)
  })
})

describe('splitSentences', () => {
  it('splits on punctuation', () => {
    const s = splitSentences('First. Second! Third?')
    expect(s.length).toBe(3)
  })
  it('handles newlines', () => {
    expect(splitSentences('a\nb').length).toBe(2)
  })
})

describe('chunkText', () => {
  it('chunks without overlap', () => {
    const c = chunkText('abcdefghij', 4, 0)
    expect(c.length).toBe(3)
    expect(c[0]!.text).toBe('abcd')
  })
  it('chunks with overlap', () => {
    const c = chunkText('abcdefghij', 4, 2)
    expect(c.length).toBeGreaterThan(1)
  })
  it('breaks at sentence boundary', () => {
    const c = chunkText('Hello world. This is a test. Another sentence.', 25, 0)
    expect(c.length).toBeGreaterThan(0)
  })
  it('rejects invalid config', () => {
    expect(() => chunkText('abc', 0, 0)).toThrow()
    expect(() => chunkText('abc', 5, 5)).toThrow()
  })
})

describe('RagPipeline', () => {
  it('adds docs and reports size', () => {
    expect(rag.size().docs).toBe(3)
    expect(rag.size().chunks).toBeGreaterThan(0)
  })

  it('adds doc with custom metadata', () => {
    const chunks = rag.addDoc({ id: 'm', title: 'M', text: 'Some text here.', metadata: { lang: 'en' } })
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('replaces doc when re-added', () => {
    rag.addDoc({ id: 'a', title: 'New', text: 'Different text here' })
    expect(rag.getDoc('a')?.title).toBe('New')
  })

  it('removes doc and its chunks', () => {
    expect(rag.removeDoc('a')).toBe(true)
    expect(rag.getDoc('a')).toBeUndefined()
    expect(rag.listChunks('a')).toHaveLength(0)
  })

  it('removeDoc returns false for missing', () => {
    expect(rag.removeDoc('nope')).toBe(false)
  })

  it('getChunk returns chunk by id', () => {
    const cs = rag.listChunks()
    const c = rag.getChunk(cs[0]!.id)
    expect(c).toBeDefined()
  })

  it('listChunks filters by doc', () => {
    const cs = rag.listChunks('a')
    expect(cs.every(c => c.docId === 'a')).toBe(true)
  })

  it('listChunks returns all when no filter', () => {
    expect(rag.listChunks().length).toBeGreaterThan(0)
  })

  it('retrieve ranks ML docs higher for ML query', () => {
    const r = rag.retrieve('machine learning algorithms', { topK: 2 })
    expect(r.length).toBe(2)
    expect(r[0]!.chunk.docId).toBe('a')
  })

  it('retrieve returns empty for unrelated query', () => {
    const r = rag.retrieve('xyzzy foobar')
    expect(r.length).toBe(0)
  })

  it('retrieve respects minScore', () => {
    const r = rag.retrieve('pasta', { minScore: 0.99 })
    expect(r.length).toBe(0)
  })

  it('retrieve respects docId filter', () => {
    const r = rag.retrieve('the', { topK: 5, docId: 'b' })
    expect(r.every(x => x.chunk.docId === 'b')).toBe(true)
  })

  it('buildContext concatenates chunks with citations', () => {
    const r = rag.retrieve('machine learning', { topK: 2 })
    const ctx = rag.buildContext(r)
    expect(ctx.context).toContain('Intro to ML')
    expect(ctx.citations.length).toBeGreaterThan(0)
    expect(ctx.totalTokens).toBeGreaterThan(0)
  })

  it('buildContext respects maxContextTokens', () => {
    const r = new RagPipeline({ chunkSize: 50, chunkOverlap: 10, maxContextTokens: 5 })
    for (const d of corpus) r.addDoc(d)
    const res = r.retrieve('machine', { topK: 10 })
    const ctx = r.buildContext(res)
    expect(ctx.totalTokens).toBeLessThanOrEqual(5)
  })

  it('generate produces answer from context', () => {
    const r = rag.retrieve('machine learning', { topK: 2 })
    const ctx = rag.buildContext(r)
    const gen = rag.generate('machine learning', ctx.context, ctx.citations)
    expect(gen.answer.length).toBeGreaterThan(0)
  })

  it('generate returns "no relevant" for empty context', () => {
    const gen = rag.generate('foo', '', [])
    expect(gen.answer).toContain('No relevant')
  })

  it('query returns full result with answer and retrieved', () => {
    const r = rag.query('machine learning algorithms')
    expect(r.answer.length).toBeGreaterThan(0)
    expect(r.retrieved.length).toBeGreaterThan(0)
    expect(r.citations.length).toBeGreaterThan(0)
  })

  it('query skipGenerate returns empty answer', () => {
    const r = rag.query('cooking', { skipGenerate: true })
    expect(r.answer).toBe('')
  })

  it('evaluate counts hit keywords', () => {
    const r = rag.evaluate('machine learning', ['machine', 'learning', 'neural'])
    expect(r.hit).toBe(2)
    expect(r.total).toBe(3)
    expect(r.score).toBeCloseTo(2 / 3, 5)
  })

  it('evaluate returns 0 hit for unrelated', () => {
    const r = rag.evaluate('xyzzy', ['foo', 'bar'])
    expect(r.hit).toBe(0)
  })

  it('getRagPipeline returns singleton', async () => {
    const { getRagPipeline } = await import('../index')
    const a = getRagPipeline()
    const b = getRagPipeline()
    expect(a).toBe(b)
  })

  it('chunking respects overlap', () => {
    const r = new RagPipeline({ chunkSize: 30, chunkOverlap: 10 })
    const c = r.addDoc({ id: 'x', title: 'X', text: 'abcdefghijklmnopqrstuvwxyz0123456789' })
    expect(c.length).toBeGreaterThan(1)
  })

  it('retrieve uses bigram signal', () => {
    const r = rag.retrieve('neural network', { topK: 1 })
    expect(r[0]!.chunk.docId).toBe('a')
  })
})
