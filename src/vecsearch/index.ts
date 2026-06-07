// Vector Search: vector indexing, k-NN retrieval, similarity metrics, metadata filtering, chunked text, batch operations.

export type SimilarityMetric = 'cosine' | 'dot' | 'euclidean' | 'manhattan' | (string & {})

export interface VectorDocument {
  id: string
  vector: number[]
  metadata?: Record<string, string | number | boolean>
  text?: string
  chunks?: VectorChunk[]
  createdAt: number
  updatedAt: number
}

export interface VectorChunk {
  id: string
  start: number
  end: number
  text: string
  vector: number[]
  metadata?: Record<string, string | number | boolean>
}

export interface VectorIndexConfig {
  metric?: SimilarityMetric
  normalize?: boolean
  efConstruction?: number
  M?: number
  dimension?: number
}

export interface SearchQuery {
  vector?: number[]
  text?: string
  k?: number
  minScore?: number
  filter?: Record<string, string | number | boolean>
  includeChunks?: boolean
}

export interface SearchResult {
  document: VectorDocument
  score: number
  chunk?: VectorChunk
}

export interface VectorStats {
  documents: number
  chunks: number
  avgVectorSize: number
  totalStorageBytes: number
  indexHealth: 'good' | 'fragmented'
}

export class VectorIndex {
  private docs = new Map<string, VectorDocument>()
  private chunks = new Map<string, { docId: string; chunk: VectorChunk }>()
  private config: Required<VectorIndexConfig>

  constructor(config: VectorIndexConfig = {}) {
    this.config = {
      metric: config.metric ?? 'cosine',
      normalize: config.normalize ?? false,
      efConstruction: config.efConstruction ?? 200,
      M: config.M ?? 16,
      dimension: config.dimension ?? 0,
    }
  }

  // ---- Ingest ----
  upsert(doc: Omit<VectorDocument, 'createdAt' | 'updatedAt' | 'chunks'> & { id?: string; chunks?: VectorChunk[] }): VectorDocument {
    const id = doc.id ?? `vec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()
    const dimension = this.config.dimension
    if (dimension > 0 && doc.vector.length !== dimension) {
      throw new Error(`Vector dimension mismatch: expected ${dimension}, got ${doc.vector.length}`)
    }
    if (this.config.dimension === 0 && doc.vector.length > 0) {
      this.config.dimension = doc.vector.length
    }
    let existing = this.docs.get(id)
    const stored: VectorDocument = {
      id,
      vector: this.config.normalize ? this.normalizeVector(doc.vector) : doc.vector,
      metadata: doc.metadata,
      text: doc.text,
      chunks: doc.chunks,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    if (stored.chunks) {
      // Remove old chunks
      for (const c of stored.chunks) this.chunks.delete(c.id)
    }
    this.docs.set(id, stored)
    if (stored.chunks) {
      for (const c of stored.chunks) {
        this.chunks.set(c.id, { docId: id, chunk: this.config.normalize ? { ...c, vector: this.normalizeVector(c.vector) } : c })
      }
    }
    return stored
  }

  remove(id: string): boolean {
    const doc = this.docs.get(id)
    if (!doc) return false
    if (doc.chunks) for (const c of doc.chunks) this.chunks.delete(c.id)
    this.docs.delete(id)
    return true
  }

  get(id: string): VectorDocument | undefined {
    return this.docs.get(id)
  }

  list(filter?: Record<string, string | number | boolean>): VectorDocument[] {
    let arr = Array.from(this.docs.values())
    if (filter) arr = arr.filter(d => this.matchFilter(d, filter))
    return arr
  }

  private matchFilter(doc: VectorDocument, filter: Record<string, string | number | boolean>): boolean {
    if (!doc.metadata) return false
    for (const [k, v] of Object.entries(filter)) {
      if (doc.metadata[k] !== v) return false
    }
    return true
  }

  // ---- Search ----
  search(q: SearchQuery): SearchResult[] {
    if (!q.vector) throw new Error('Query vector is required')
    const queryVec = this.config.normalize ? this.normalizeVector(q.vector) : q.vector
    const candidates = q.filter ? this.list(q.filter) : Array.from(this.docs.values())
    const results: SearchResult[] = []
    for (const doc of candidates) {
      const score = this.computeScore(queryVec, doc.vector)
      if (q.minScore !== undefined && score < q.minScore) continue
      results.push({ document: doc, score })
      if (q.includeChunks && doc.chunks) {
        for (const c of doc.chunks) {
          const cscore = this.computeScore(queryVec, c.vector)
          if (q.minScore !== undefined && cscore < q.minScore) continue
          results.push({ document: doc, score: cscore, chunk: c })
        }
      }
    }
    const k = q.k ?? 10
    return results.sort((a, b) => b.score - a.score).slice(0, k)
  }

  // Batch upsert
  upsertBatch(docs: Array<Omit<VectorDocument, 'createdAt' | 'updatedAt' | 'chunks'> & { id?: string; chunks?: VectorChunk[] }>): VectorDocument[] {
    return docs.map(d => this.upsert(d))
  }

  // ---- Similarity ----
  private computeScore(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    switch (this.config.metric) {
      case 'cosine':
        return this.cosine(a, b)
      case 'dot':
        return this.dot(a, b)
      case 'euclidean':
        return 1 / (1 + this.euclidean(a, b))
      case 'manhattan':
        return 1 / (1 + this.manhattan(a, b))
      default:
        return this.cosine(a, b)
    }
  }

  cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      na += a[i] * a[i]
      nb += b[i] * b[i]
    }
    if (na === 0 || nb === 0) return 0
    return dot / (Math.sqrt(na) * Math.sqrt(nb))
  }

  dot(a: number[], b: number[]): number {
    let s = 0
    for (let i = 0; i < a.length; i++) s += a[i] * b[i]
    return s
  }

  euclidean(a: number[], b: number[]): number {
    let s = 0
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
    return Math.sqrt(s)
  }

  manhattan(a: number[], b: number[]): number {
    let s = 0
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
    return s
  }

  // ---- Helpers ----
  normalizeVector(v: number[]): number[] {
    let norm = 0
    for (const x of v) norm += x * x
    norm = Math.sqrt(norm)
    if (norm === 0) return v.slice()
    return v.map(x => x / norm)
  }

  // Auto-embed: a simple bag-of-words + hashing style embedding (deterministic from text)
  embed(text: string, dim: number = 64): number[] {
    const v = new Array(dim).fill(0)
    const tokens = text.toLowerCase().split(/\W+/).filter(t => t.length > 0)
    for (const t of tokens) {
      let h = 0
      for (let i = 0; i < t.length; i++) h = ((h * 31) + t.charCodeAt(i)) >>> 0
      const idx = h % dim
      v[idx] += 1
    }
    return v
  }

  // Search by text using embed()
  searchByText(text: string, q: SearchQuery = {}): SearchResult[] {
    const dim = this.config.dimension || 64
    const vec = this.embed(text, dim)
    return this.search({ ...q, vector: vec })
  }

  // ---- Stats ----
  stats(): VectorStats {
    let totalSize = 0
    let totalDims = 0
    for (const d of this.docs.values()) {
      totalDims += d.vector.length
      totalSize += d.vector.length * 8
      if (d.chunks) {
        for (const c of d.chunks) totalSize += c.vector.length * 8
      }
    }
    const avgVectorSize = this.docs.size > 0 ? totalDims / this.docs.size : 0
    return {
      documents: this.docs.size,
      chunks: this.chunks.size,
      avgVectorSize,
      totalStorageBytes: totalSize,
      indexHealth: this.docs.size > 0 && this.chunks.size / this.docs.size > 5 ? 'fragmented' : 'good',
    }
  }

  clear(): void {
    this.docs.clear()
    this.chunks.clear()
    this.config.dimension = 0
  }
}

// ---- Text splitter ----
export function splitText(text: string, chunkSize: number = 200, overlap: number = 50): { start: number; end: number; text: string }[] {
  if (chunkSize <= 0) throw new Error('chunkSize must be > 0')
  if (overlap < 0) throw new Error('overlap must be >= 0')
  if (overlap >= chunkSize) throw new Error('overlap must be < chunkSize')
  const out: { start: number; end: number; text: string }[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    out.push({ start, end, text: text.slice(start, end) })
    if (end === text.length) break
    start = end - overlap
  }
  return out
}

let _vecSingleton: VectorIndex | null = null
export function getVectorIndex(): VectorIndex {
  if (!_vecSingleton) _vecSingleton = new VectorIndex()
  return _vecSingleton
}
export function resetVectorIndex(): void {
  if (_vecSingleton) _vecSingleton.clear()
  _vecSingleton = null
}
