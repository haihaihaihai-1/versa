import { describe, it, expect } from 'vitest'
import { VectorIndex, splitText, getVectorIndex, resetVectorIndex } from '../index'

describe('VectorIndex', () => {
  describe('upsert & get', () => {
    it('upserts a document', () => {
      const v = new VectorIndex()
      const d = v.upsert({ vector: [1, 0, 0] })
      expect(d.id).toMatch(/^vec_/)
      expect(v.get(d.id)?.vector).toEqual([1, 0, 0])
    })

    it('uses provided id', () => {
      const v = new VectorIndex()
      const d = v.upsert({ id: 'doc1', vector: [1, 0] })
      expect(d.id).toBe('doc1')
    })

    it('updates existing', () => {
      const v = new VectorIndex()
      const d1 = v.upsert({ id: 'doc1', vector: [1, 0, 0] })
      const d2 = v.upsert({ id: 'doc1', vector: [0, 1, 0] })
      expect(d1.createdAt).toBe(d2.createdAt)
      expect(d2.updatedAt).toBeGreaterThanOrEqual(d1.updatedAt)
    })

    it('removes document', () => {
      const v = new VectorIndex()
      const d = v.upsert({ id: 'doc1', vector: [1, 0] })
      expect(v.remove('doc1')).toBe(true)
      expect(v.get('doc1')).toBeUndefined()
    })

    it('dimension mismatch throws', () => {
      const v = new VectorIndex({ dimension: 3 })
      expect(() => v.upsert({ vector: [1, 0] })).toThrow('dimension')
    })

    it('auto-detects dimension', () => {
      const v = new VectorIndex()
      v.upsert({ vector: [1, 0, 0, 0] })
      const d = v.upsert({ vector: [0, 1, 0, 0] })
      expect(d.vector).toHaveLength(4)
    })
  })

  describe('similarity', () => {
    it('cosine similarity', () => {
      const v = new VectorIndex({ metric: 'cosine' })
      v.upsert({ id: 'a', vector: [1, 0, 0] })
      v.upsert({ id: 'b', vector: [0, 1, 0] })
      v.upsert({ id: 'c', vector: [1, 1, 0] })
      const r = v.search({ vector: [1, 0, 0] })
      expect(r[0].document.id).toBe('a')
      expect(r[0].score).toBeCloseTo(1, 5)
    })

    it('dot product', () => {
      const v = new VectorIndex({ metric: 'dot' })
      v.upsert({ id: 'a', vector: [1, 2, 3] })
      v.upsert({ id: 'b', vector: [-1, -2, -3] })
      const r = v.search({ vector: [1, 2, 3] })
      expect(r[0].document.id).toBe('a')
      expect(r[0].score).toBeCloseTo(14, 5)
    })

    it('euclidean distance', () => {
      const v = new VectorIndex({ metric: 'euclidean' })
      v.upsert({ id: 'a', vector: [0, 0] })
      v.upsert({ id: 'b', vector: [3, 4] })
      const r = v.search({ vector: [0, 0] })
      expect(r[0].document.id).toBe('a')
    })

    it('manhattan distance', () => {
      const v = new VectorIndex({ metric: 'manhattan' })
      v.upsert({ id: 'a', vector: [0, 0] })
      v.upsert({ id: 'b', vector: [1, 1] })
      const r = v.search({ vector: [0, 0] })
      expect(r[0].document.id).toBe('a')
    })
  })

  describe('search options', () => {
    it('respects k limit', () => {
      const v = new VectorIndex()
      for (let i = 0; i < 10; i++) v.upsert({ vector: [i, 10 - i] })
      const r = v.search({ vector: [1, 0], k: 3 })
      expect(r).toHaveLength(3)
    })

    it('respects minScore', () => {
      const v = new VectorIndex()
      v.upsert({ id: 'a', vector: [1, 0, 0] })
      v.upsert({ id: 'b', vector: [-1, 0, 0] })
      const r = v.search({ vector: [1, 0, 0], minScore: 0.5 })
      expect(r).toHaveLength(1)
      expect(r[0].document.id).toBe('a')
    })

    it('filters by metadata', () => {
      const v = new VectorIndex()
      v.upsert({ id: 'a', vector: [1, 0, 0], metadata: { type: 'doc', lang: 'en' } })
      v.upsert({ id: 'b', vector: [1, 0, 0], metadata: { type: 'doc', lang: 'zh' } })
      const r = v.search({ vector: [1, 0, 0], filter: { lang: 'en' } })
      expect(r).toHaveLength(1)
      expect(r[0].document.id).toBe('a')
    })
  })

  describe('chunks', () => {
    it('indexes chunks', () => {
      const v = new VectorIndex()
      v.upsert({
        id: 'doc1',
        vector: [1, 0, 0],
        chunks: [
          { id: 'c1', start: 0, end: 5, text: 'hello', vector: [1, 0, 0] },
          { id: 'c2', start: 5, end: 10, text: 'world', vector: [0, 1, 0] },
        ],
      })
      const r = v.search({ vector: [0, 1, 0], includeChunks: true })
      expect(r.some(x => x.chunk?.id === 'c2')).toBe(true)
    })

    it('removes old chunks on update', () => {
      const v = new VectorIndex()
      v.upsert({ id: 'd1', vector: [1, 0, 0], chunks: [{ id: 'c1', start: 0, end: 5, text: 'a', vector: [1, 0, 0] }] })
      v.upsert({ id: 'd1', vector: [0, 1, 0] })
      const r = v.search({ vector: [1, 0, 0], includeChunks: true })
      expect(r.find(x => x.chunk?.id === 'c1')).toBeUndefined()
    })
  })

  describe('batch & helpers', () => {
    it('batch upsert', () => {
      const v = new VectorIndex()
      const ds = v.upsertBatch([
        { vector: [1, 0] },
        { vector: [0, 1] },
        { vector: [1, 1] },
      ])
      expect(ds).toHaveLength(3)
    })

    it('list with filter', () => {
      const v = new VectorIndex()
      v.upsert({ id: 'a', vector: [1, 0], metadata: { kind: 'a' } })
      v.upsert({ id: 'b', vector: [0, 1], metadata: { kind: 'b' } })
      expect(v.list({ kind: 'a' })).toHaveLength(1)
    })

    it('embed produces deterministic vector', () => {
      const v = new VectorIndex()
      const e1 = v.embed('hello world')
      const e2 = v.embed('hello world')
      expect(e1).toEqual(e2)
    })

    it('searchByText', () => {
      const v = new VectorIndex()
      v.upsert({ id: 'a', vector: v.embed('machine learning models') })
      v.upsert({ id: 'b', vector: v.embed('cooking recipes') })
      const r = v.searchByText('machine learning', { k: 1 })
      expect(r[0].document.id).toBe('a')
    })

    it('normalizeVector', () => {
      const v = new VectorIndex()
      const n = v.normalizeVector([3, 4])
      expect(n[0]).toBeCloseTo(0.6, 5)
      expect(n[1]).toBeCloseTo(0.8, 5)
    })
  })

  describe('stats & lifecycle', () => {
    it('returns stats', () => {
      const v = new VectorIndex()
      v.upsert({ vector: [1, 0, 0] })
      v.upsert({ vector: [0, 1, 0] })
      const s = v.stats()
      expect(s.documents).toBe(2)
      expect(s.avgVectorSize).toBe(3)
    })

    it('clear all', () => {
      const v = new VectorIndex()
      v.upsert({ vector: [1, 0] })
      v.clear()
      expect(v.stats().documents).toBe(0)
    })

    it('singleton lifecycle', () => {
      resetVectorIndex()
      const v1 = getVectorIndex()
      const v2 = getVectorIndex()
      expect(v1).toBe(v2)
      resetVectorIndex()
    })
  })
})

describe('splitText', () => {
  it('chunks text with overlap', () => {
    const text = 'a'.repeat(500)
    const chunks = splitText(text, 100, 20)
    expect(chunks).toHaveLength(6)
    expect(chunks[0].text.length).toBe(100)
    expect(chunks[0].start).toBe(0)
    expect(chunks[1].start).toBe(80)
    expect(chunks[chunks.length - 1].end).toBe(500)
  })

  it('handles text shorter than chunkSize', () => {
    const chunks = splitText('hello', 100, 0)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe('hello')
  })

  it('exact chunkSize multiple', () => {
    const chunks = splitText('a'.repeat(300), 100, 0)
    expect(chunks).toHaveLength(3)
  })

  it('throws on invalid overlap', () => {
    expect(() => splitText('a'.repeat(100), 50, 50)).toThrow()
  })

  it('throws on invalid chunkSize', () => {
    expect(() => splitText('a', 0, 0)).toThrow()
  })
})
