// RAG Pipeline: chunking, retrieval, generation simulation, citations, evaluation.

export type DocId = string
export type ChunkId = string

export interface RagDoc {
  id: DocId
  title: string
  text: string
  source?: string
  metadata?: Record<string, string>
}

export interface RagChunk {
  id: ChunkId
  docId: DocId
  text: string
  start: number
  end: number
  index: number
  tokens: number
}

export interface Citation {
  chunkId: ChunkId
  docId: DocId
  title: string
  start: number
  end: number
  quote: string
  score: number
}

export interface RagConfig {
  chunkSize: number
  chunkOverlap: number
  topK: number
  minScore: number
  temperature: number
  maxContextTokens: number
  systemPrompt: string
}

const DEFAULT_CONFIG: RagConfig = {
  chunkSize: 200,
  chunkOverlap: 30,
  topK: 4,
  minScore: 0,
  temperature: 0.2,
  maxContextTokens: 1500,
  systemPrompt: 'You are a helpful assistant. Use the provided context to answer. Cite sources.',
}

export const estimateTokens = (s: string): number => Math.ceil(s.length / 4)

export const splitSentences = (s: string): string[] => {
  const out: string[] = []
  const re = /[^.!?\n]+[.!?\n]?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    const t = m[0].trim()
    if (t) out.push(t)
  }
  return out
}

export const chunkText = (text: string, chunkSize: number, overlap: number): { text: string; start: number; end: number }[] => {
  if (chunkSize <= 0) throw new Error('chunkSize must be > 0')
  if (overlap < 0 || overlap >= chunkSize) throw new Error('overlap must be in [0, chunkSize)')
  const out: { text: string; start: number; end: number }[] = []
  let pos = 0
  const n = text.length
  while (pos < n) {
    const end = Math.min(pos + chunkSize, n)
    let chunkEnd = end
    if (end < n) {
      const lastPeriod = text.lastIndexOf('.', end)
      if (lastPeriod > pos + chunkSize / 2) chunkEnd = lastPeriod + 1
    }
    const piece = text.slice(pos, chunkEnd).trim()
    if (piece.length > 0) out.push({ text: piece, start: pos, end: chunkEnd })
    if (chunkEnd === n) break
    pos = Math.max(chunkEnd - overlap, pos + 1)
  }
  return out
}

const jaccard = (a: string[], b: string[]): number => {
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter += 1
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

const wordNgrams = (s: string, n = 2): string[] => {
  const words = s.toLowerCase().split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '))
  return out
}

export class RagPipeline {
  readonly config: RagConfig
  private docs: Map<DocId, RagDoc> = new Map()
  private chunks: Map<ChunkId, RagChunk> = new Map()
  private chunksByDoc: Map<DocId, ChunkId[]> = new Map()

  constructor(config: Partial<RagConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  addDoc(doc: RagDoc): RagChunk[] {
    if (this.docs.has(doc.id)) this.removeDoc(doc.id)
    this.docs.set(doc.id, doc)
    const pieces = chunkText(doc.text, this.config.chunkSize, this.config.chunkOverlap)
    const created: RagChunk[] = []
    pieces.forEach((p, i) => {
      const id: ChunkId = `${doc.id}#${i}`
      const c: RagChunk = { id, docId: doc.id, text: p.text, start: p.start, end: p.end, index: i, tokens: estimateTokens(p.text) }
      this.chunks.set(id, c)
      if (!this.chunksByDoc.has(doc.id)) this.chunksByDoc.set(doc.id, [])
      this.chunksByDoc.get(doc.id)!.push(id)
      created.push(c)
    })
    return created
  }

  removeDoc(id: DocId): boolean {
    if (!this.docs.has(id)) return false
    for (const cid of this.chunksByDoc.get(id) ?? []) this.chunks.delete(cid)
    this.chunksByDoc.delete(id)
    this.docs.delete(id)
    return true
  }

  size(): { docs: number; chunks: number } {
    return { docs: this.docs.size, chunks: this.chunks.size }
  }

  getDoc(id: DocId): RagDoc | undefined { return this.docs.get(id) }
  getChunk(id: ChunkId): RagChunk | undefined { return this.chunks.get(id) }
  listChunks(docId?: DocId): RagChunk[] {
    if (docId) return (this.chunksByDoc.get(docId) ?? []).map(id => this.chunks.get(id)!)
    return [...this.chunks.values()]
  }

  private score(query: string, chunk: RagChunk): number {
    const qWords = query.toLowerCase().split(/\s+/).filter(Boolean)
    const cWords = chunk.text.toLowerCase().split(/\s+/).filter(Boolean)
    const qSet = new Set(qWords)
    let direct = 0
    for (const w of cWords) if (qSet.has(w)) direct += 1
    const directScore = qWords.length === 0 ? 0 : direct / qWords.length
    const ng1 = jaccard(qWords, cWords)
    const ng2 = jaccard(wordNgrams(query, 2), wordNgrams(chunk.text, 2))
    return 0.5 * directScore + 0.2 * ng1 + 0.3 * ng2
  }

  retrieve(query: string, opts?: { topK?: number; minScore?: number; docId?: DocId }): { chunk: RagChunk; score: number }[] {
    const topK = opts?.topK ?? this.config.topK
    const minScore = opts?.minScore ?? this.config.minScore
    const candidates = opts?.docId ? this.listChunks(opts.docId) : this.listChunks()
    const scored: { chunk: RagChunk; score: number }[] = []
    for (const c of candidates) {
      const s = this.score(query, c)
      if (s <= 0 || s < minScore) continue
      scored.push({ chunk: c, score: s })
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  }

  buildContext(retrieved: { chunk: RagChunk; score: number }[]): { context: string; totalTokens: number; citations: Citation[] } {
    const citations: Citation[] = []
    let totalTokens = 0
    const parts: string[] = []
    for (const r of retrieved) {
      const doc = this.docs.get(r.chunk.docId)
      if (!doc) continue
      if (totalTokens + r.chunk.tokens > this.config.maxContextTokens) break
      parts.push(`[${r.chunk.docId}#${r.chunk.index}] ${doc.title}: ${r.chunk.text}`)
      totalTokens += r.chunk.tokens
      citations.push({ chunkId: r.chunk.id, docId: r.chunk.docId, title: doc.title, start: r.chunk.start, end: r.chunk.end, quote: r.chunk.text, score: r.score })
    }
    return { context: parts.join('\n\n'), totalTokens, citations }
  }

  // Generation simulation: extract most relevant sentences from context.
  generate(query: string, context: string, citations: Citation[]): { answer: string; usedCitations: Citation[] } {
    const qWords = new Set(query.toLowerCase().split(/\s+/).filter(Boolean))
    const sentences = splitSentences(context)
    const ranked = sentences.map(s => {
      const words = s.toLowerCase().split(/\s+/).filter(Boolean)
      let hits = 0
      for (const w of words) if (qWords.has(w)) hits += 1
      return { s, hits }
    }).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, 3)
    const answer = ranked.length === 0 ? 'No relevant information found.' : ranked.map(r => r.s.trim()).join(' ')
    const usedCitations = citations.filter(c => answer.includes(c.quote.slice(0, 60)))
    return { answer, usedCitations }
  }

  query(query: string, opts?: { topK?: number; minScore?: number; docId?: DocId; skipGenerate?: boolean }): { context: string; totalTokens: number; citations: Citation[]; answer: string; retrieved: { chunk: RagChunk; score: number }[] } {
    const retrieved = this.retrieve(query, opts)
    const built = this.buildContext(retrieved)
    if (opts?.skipGenerate) return { ...built, answer: '', retrieved }
    const gen = this.generate(query, built.context, built.citations)
    return { ...built, answer: gen.answer, retrieved }
  }

  evaluate(query: string, expectedKeywords: string[]): { hit: number; total: number; score: number; citations: number } {
    const result = this.query(query)
    const lower = result.answer.toLowerCase()
    let hit = 0
    for (const k of expectedKeywords) if (lower.includes(k.toLowerCase())) hit += 1
    return { hit, total: expectedKeywords.length, score: expectedKeywords.length === 0 ? 0 : hit / expectedKeywords.length, citations: result.citations.length }
  }
}

let _pipeline: RagPipeline | null = null
export const getRagPipeline = (config?: Partial<RagConfig>): RagPipeline => {
  if (!_pipeline) _pipeline = new RagPipeline(config)
  return _pipeline
}
export const resetRagPipeline = (): void => { _pipeline = null }
