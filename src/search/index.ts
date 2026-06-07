// Search & Ranking: tokenization, BM25, query understanding, hybrid scoring, rerank, filters.

export type DocId = string
export type Field = 'title' | 'body' | 'tags' | 'category'

export interface SearchDoc {
  id: DocId
  fields: Partial<Record<Field, string>>
  boost?: number
  freshness?: number
  tag?: string
  category?: string
}

export interface Token {
  text: string
  position: number
}

export interface ScoredDoc {
  id: DocId
  score: number
  bm25: number
  vector: number
  boost: number
  freshness: number
  highlights: string[]
}

export interface SearchQuery {
  text: string
  filters?: { field: 'tag' | 'category'; op: 'eq' | 'in'; value: string | string[] }[]
  limit?: number
  fields?: Field[]
  minScore?: number
  doRerank?: boolean
}

export interface SearchConfig {
  bm25K1: number
  bm25B: number
  vectorWeight: number
  bm25Weight: number
  boostWeight: number
  freshnessWeight: number
  rerankDepth: number
  stopWords: Set<string>
  enableRerank: boolean
  defaultFields: Field[]
}

const DEFAULT_STOP = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'but'])

const DEFAULT_CONFIG: SearchConfig = {
  bm25K1: 1.2,
  bm25B: 0.75,
  vectorWeight: 0.3,
  bm25Weight: 0.6,
  boostWeight: 0.05,
  freshnessWeight: 0.05,
  rerankDepth: 20,
  stopWords: DEFAULT_STOP,
  enableRerank: true,
  defaultFields: ['title', 'body', 'tags'],
}

export const tokenize = (text: string, stopWords: Set<string> = DEFAULT_STOP): Token[] => {
  const out: Token[] = []
  const re = /[A-Za-z0-9\u4e00-\u9fff]+/g
  let m: RegExpExecArray | null
  let pos = 0
  while ((m = re.exec(text)) !== null) {
    const t = m[0]
    if (/^[A-Za-z0-9]+$/.test(t)) {
      const lower = t.toLowerCase()
      if (stopWords.has(lower)) { pos += 1; continue }
      out.push({ text: lower, position: pos++ })
    } else {
      for (const ch of t) {
        if (stopWords.has(ch)) { pos += 1; continue }
        out.push({ text: ch, position: pos++ })
      }
    }
  }
  return out
}

// Simple character n-gram (3-grams) for Chinese-friendly embeddings
export const ngrams = (s: string, n = 3): string[] => {
  const padded = '  ' + s.toLowerCase() + '  '
  const out: string[] = []
  for (let i = 0; i + n <= padded.length; i++) out.push(padded.slice(i, i + n))
  return out
}

export const jaccard = (a: string[], b: string[]): number => {
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter += 1
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

export const tf = (tokens: Token[]): Map<string, number> => {
  const m = new Map<string, number>()
  for (const t of tokens) m.set(t.text, (m.get(t.text) ?? 0) + 1)
  return m
}

export class SearchEngine {
  readonly config: SearchConfig
  private docs: Map<DocId, SearchDoc> = new Map()
  private docLen: Map<DocId, number> = new Map()
  private avgDl = 0
  private docFreq: Map<string, number> = new Map()
  private docTokens: Map<DocId, Token[]> = new Map()
  private docNgrams: Map<DocId, string[]> = new Map()
  private idfCache: Map<string, number> = new Map()

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config, stopWords: config.stopWords ?? DEFAULT_CONFIG.stopWords }
  }

  addDoc(doc: SearchDoc): void {
    if (this.docs.has(doc.id)) this.removeDoc(doc.id)
    this.docs.set(doc.id, doc)
    const fields = this.config.defaultFields
    const text = fields.map(f => doc.fields[f] ?? '').join(' ')
    const tokens = tokenize(text, this.config.stopWords)
    this.docTokens.set(doc.id, tokens)
    this.docLen.set(doc.id, tokens.length)
    this.docNgrams.set(doc.id, ngrams(text))
    const seen = new Set<string>()
    for (const t of tokens) {
      if (seen.has(t.text)) continue
      seen.add(t.text)
      this.docFreq.set(t.text, (this.docFreq.get(t.text) ?? 0) + 1)
    }
    this.recomputeAvgDl()
  }

  removeDoc(id: DocId): boolean {
    const tokens = this.docTokens.get(id)
    if (!tokens) return false
    const seen = new Set<string>()
    for (const t of tokens) {
      if (seen.has(t.text)) continue
      seen.add(t.text)
      const c = this.docFreq.get(t.text) ?? 0
      if (c <= 1) this.docFreq.delete(t.text)
      else this.docFreq.set(t.text, c - 1)
    }
    this.docs.delete(id)
    this.docTokens.delete(id)
    this.docLen.delete(id)
    this.docNgrams.delete(id)
    this.idfCache.clear()
    this.recomputeAvgDl()
    return true
  }

  private recomputeAvgDl(): void {
    let sum = 0
    for (const l of this.docLen.values()) sum += l
    this.avgDl = this.docLen.size === 0 ? 0 : sum / this.docLen.size
  }

  size(): number {
    return this.docs.size
  }

  private idf(term: string): number {
    if (this.idfCache.has(term)) return this.idfCache.get(term)!
    const df = this.docFreq.get(term) ?? 0
    const N = this.docs.size
    const v = Math.log(1 + (N - df + 0.5) / (df + 0.5))
    this.idfCache.set(term, v)
    return v
  }

  bm25Score(queryTokens: Token[], docId: DocId): number {
    const docTokens = this.docTokens.get(docId) ?? []
    const dl = this.docLen.get(docId) ?? 0
    if (dl === 0) return 0
    const tfMap = tf(docTokens)
    let s = 0
    for (const qt of queryTokens) {
      const f = tfMap.get(qt.text) ?? 0
      if (f === 0) continue
      const idf = this.idf(qt.text)
      const denom = f + this.config.bm25K1 * (1 - this.config.bm25B + this.config.bm25B * (dl / (this.avgDl || 1)))
      s += idf * (f * (this.config.bm25K1 + 1)) / denom
    }
    return s
  }

  vectorScore(queryTokens: Token[], docId: DocId): number {
    const qText = queryTokens.map(t => t.text).join(' ')
    const qGrams = ngrams(qText)
    const dGrams = this.docNgrams.get(docId) ?? []
    return jaccard(qGrams, dGrams)
  }

  private matchesFilter(doc: SearchDoc, filter: NonNullable<SearchQuery['filters']>[number]): boolean {
    if (filter.field === 'tag') {
      if (filter.op === 'eq') return doc.tag === filter.value
      if (filter.op === 'in' && Array.isArray(filter.value)) return filter.value.includes(doc.tag ?? '')
    }
    if (filter.field === 'category') {
      if (filter.op === 'eq') return doc.category === filter.value
      if (filter.op === 'in' && Array.isArray(filter.value)) return filter.value.includes(doc.category ?? '')
    }
    return true
  }

  search(query: SearchQuery): ScoredDoc[] {
    const limit = query.limit ?? 10
    const minScore = query.minScore ?? 0
    const doRerank = query.doRerank ?? this.config.enableRerank
    if (query.text.trim() === '') return []
    const queryTokens = tokenize(query.text, this.config.stopWords)
    if (queryTokens.length === 0) return []
    const out: ScoredDoc[] = []
    for (const doc of this.docs.values()) {
      if (query.filters) {
        let ok = true
        for (const f of query.filters) if (!this.matchesFilter(doc, f)) { ok = false; break }
        if (!ok) continue
      }
      const bm = this.bm25Score(queryTokens, doc.id)
      if (bm === 0) continue
      const vc = this.vectorScore(queryTokens, doc.id)
      const boost = doc.boost ?? 1
      const fresh = doc.freshness ?? 0
      const score = this.config.bm25Weight * bm + this.config.vectorWeight * vc + this.config.boostWeight * (boost - 1) + this.config.freshnessWeight * fresh
      if (score < minScore) continue
      out.push({ id: doc.id, score, bm25: bm, vector: vc, boost, freshness: fresh, highlights: this.highlight(query.text, doc) })
    }
    out.sort((a, b) => b.score - a.score)
    const top = out.slice(0, doRerank ? Math.max(limit, this.config.rerankDepth) : limit)
    if (doRerank) {
      top.sort((a, b) => {
        const adj = (x: ScoredDoc) => x.score + (x.freshness * 0.01) + (x.boost * 0.01)
        return adj(b) - adj(a)
      })
    }
    return top.slice(0, limit)
  }

  highlight(q: string, doc: SearchDoc): string[] {
    const qTokens = tokenize(q, this.config.stopWords).map(t => t.text)
    const out: string[] = []
    for (const f of this.config.defaultFields) {
      const txt = doc.fields[f]
      if (!txt) continue
      const lower = txt.toLowerCase()
      for (const t of qTokens) {
        if (lower.includes(t)) out.push('<<' + t + '>>')
      }
    }
    return [...new Set(out)]
  }

  explain(query: SearchQuery, docId: DocId): { bm25: number; vector: number; boost: number; freshness: number; total: number } | null {
    if (!this.docs.has(docId)) return null
    const doc = this.docs.get(docId)!
    const queryTokens = tokenize(query.text, this.config.stopWords)
    const bm = this.bm25Score(queryTokens, docId)
    const vc = this.vectorScore(queryTokens, docId)
    const boost = doc.boost ?? 1
    const fresh = doc.freshness ?? 0
    const total = this.config.bm25Weight * bm + this.config.vectorWeight * vc + this.config.boostWeight * (boost - 1) + this.config.freshnessWeight * fresh
    return { bm25: bm, vector: vc, boost, freshness: fresh, total }
  }
}

let _engine: SearchEngine | null = null
export const getSearchEngine = (config?: Partial<SearchConfig>): SearchEngine => {
  if (!_engine) _engine = new SearchEngine(config)
  return _engine
}
export const resetSearchEngine = (): void => { _engine = null }
