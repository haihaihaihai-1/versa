// v41.0 Search Engine (inverted index, BM25, fuzzy match, boolean query, highlight)

export interface Document {
  id: string
  fields: Record<string, string | number | boolean>
  tags?: string[]
}

export interface IndexConfig {
  fields: string[]
  fieldBoosts?: Record<string, number>
  tokenizer?: 'default' | 'unicode' | 'ngram'
  ngramSize?: number
  k1?: number  // BM25 parameter
  b?: number   // BM25 parameter
  enableFuzzy?: boolean
  fuzzyDistance?: number
}

export interface SearchHit {
  id: string
  score: number
  highlights: Record<string, string[]>  // field -> highlighted snippets
  matchedTerms: string[]
}

export interface SearchOptions {
  query: string
  fields?: string[]                 // override fields
  filter?: { field: string; value: string | number | boolean }[]
  limit?: number
  offset?: number
  highlight?: { pre?: string; post?: string; fragmentSize?: number }
  fuzzy?: boolean
  operator?: 'and' | 'or'           // implicit operator between terms
}

export interface InvertedPosting {
  docId: string
  field: string
  tf: number          // term frequency in field
  positions: number[] // term positions (for phrase)
}

export interface IndexStats {
  totalDocs: number
  totalTerms: number
  avgDocLength: number
  indexSize: number
}

// ============== Tokenizer ==============

function defaultTokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9_\u4e00-\u9fff]+/i).filter(Boolean)
}

function unicodeTokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean)
}

function ngramTokenize(text: string, n = 3): string[] {
  const s = text.toLowerCase().replace(/\s+/g, ' ')
  const out: string[] = []
  if (s.length < n) return [s]
  for (let i = 0; i <= s.length - n; i++) out.push(s.slice(i, i + n))
  return out
}

// ============== Edit distance (Levenshtein) ==============

function levenshtein(a: string, b: string, maxDist = Infinity): number {
  if (a === b) return 0
  const la = a.length, lb = b.length
  if (Math.abs(la - lb) > maxDist) return maxDist + 1
  if (la === 0) return lb
  if (lb === 0) return la
  const prev = new Array(lb + 1)
  const curr = new Array(lb + 1)
  for (let j = 0; j <= lb; j++) prev[j] = j
  for (let i = 1; i <= la; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > maxDist) return maxDist + 1
    for (let j = 0; j <= lb; j++) prev[j] = curr[j]
  }
  return prev[lb]
}

// ============== Search Engine ==============

export class SearchEngine {
  private docs = new Map<string, Document>()
  private inverted = new Map<string, InvertedPosting[]>() // term -> postings
  private docLengths = new Map<string, number>() // docId -> total terms
  private fieldLengths = new Map<string, Map<string, number>>() // docId -> field -> length
  private avgDocLength = 0
  private config: Required<IndexConfig>
  private stopwords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'and', 'or', 'is', 'are', 'to'])
  private metrics = { searches: 0, indexed: 0, removed: 0 }

  constructor(config: IndexConfig) {
    this.config = {
      fields: config.fields,
      fieldBoosts: config.fieldBoosts ?? {},
      tokenizer: config.tokenizer ?? 'default',
      ngramSize: config.ngramSize ?? 3,
      k1: config.k1 ?? 1.2,
      b: config.b ?? 0.75,
      enableFuzzy: config.enableFuzzy ?? false,
      fuzzyDistance: config.fuzzyDistance ?? 1,
    }
  }

  // ---- Indexing ----
  index(doc: Document): void {
    if (this.docs.has(doc.id)) this.remove(doc.id)
    this.docs.set(doc.id, { ...doc, fields: { ...doc.fields }, tags: [...(doc.tags ?? [])] })
    let totalLen = 0
    const fieldLens = new Map<string, number>()
    for (const field of this.config.fields) {
      const v = doc.fields[field]
      if (v === undefined) continue
      const text = String(v)
      const tokens = this.tokenize(text)
      fieldLens.set(field, tokens.length)
      totalLen += tokens.length
      for (let pos = 0; pos < tokens.length; pos++) {
        const term = tokens[pos]!
        if (this.stopwords.has(term) && this.config.tokenizer !== 'ngram') continue
        if (!this.inverted.has(term)) this.inverted.set(term, [])
        this.inverted.get(term)!.push({ docId: doc.id, field, tf: 1, positions: [pos] })
      }
    }
    this.docLengths.set(doc.id, totalLen)
    this.fieldLengths.set(doc.id, fieldLens)
    this.recomputeAvgDocLength()
    this.metrics.indexed++
  }

  indexBatch(docs: Document[]): void {
    for (const d of docs) this.index(d)
  }

  remove(docId: string): boolean {
    if (!this.docs.has(docId)) return false
    this.docs.delete(docId)
    this.docLengths.delete(docId)
    this.fieldLengths.delete(docId)
    for (const [term, postings] of this.inverted) {
      const filtered = postings.filter(p => p.docId !== docId)
      if (filtered.length === 0) this.inverted.delete(term)
      else if (filtered.length !== postings.length) this.inverted.set(term, filtered)
    }
    this.recomputeAvgDocLength()
    this.metrics.removed++
    return true
  }

  clear(): void {
    this.docs.clear()
    this.inverted.clear()
    this.docLengths.clear()
    this.fieldLengths.clear()
    this.avgDocLength = 0
  }

  // ---- Search ----
  search(opts: SearchOptions): SearchHit[] {
    this.metrics.searches++
    const { query, fields, filter, limit = 10, offset = 0, highlight, fuzzy, operator = 'or' } = opts
    const useFields = fields ?? this.config.fields
    const terms = this.tokenize(query).filter(t => !this.stopwords.has(t) || this.config.tokenizer === 'ngram')
    if (terms.length === 0) return []
    const useFuzzy = fuzzy ?? this.config.enableFuzzy
    // For each term, find matching documents with BM25 score
    const scores = new Map<string, { score: number; matchedTerms: Set<string> }>()
    for (const term of terms) {
      const matchedTerms = useFuzzy ? this.fuzzyMatchTerms(term) : [term]
      for (const matchedTerm of matchedTerms) {
        const postings = this.inverted.get(matchedTerm)
        if (!postings) continue
        const idf = this.idf(matchedTerm)
        for (const p of postings) {
          if (!useFields.includes(p.field)) continue
          if (filter && !this.matchesFilter(p.docId, filter)) continue
          const docLen = this.docLengths.get(p.docId) ?? 1
          const fieldBoost = this.config.fieldBoosts[p.field] ?? 1
          const bm25 = this.bm25Score(p.tf, docLen, idf) * fieldBoost
          const cur = scores.get(p.docId) ?? { score: 0, matchedTerms: new Set() }
          cur.score += bm25
          cur.matchedTerms.add(matchedTerm)
          scores.set(p.docId, cur)
        }
      }
    }
    // AND operator: only keep docs containing all terms
    if (operator === 'and') {
      for (const [docId, info] of scores) {
        if (info.matchedTerms.size < terms.length) scores.delete(docId)
      }
    }
    // Sort and return
    const sorted = [...scores.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(offset, offset + limit)
    return sorted.map(([docId, info]) => ({
      id: docId,
      score: info.score,
      highlights: highlight ? this.buildHighlights(docId, info.matchedTerms, highlight) : {},
      matchedTerms: [...info.matchedTerms],
    }))
  }

  // ---- Query parsers ----
  parseQuery(q: string): { must: string[]; mustNot: string[]; should: string[]; phrases: string[] } {
    const must: string[] = []
    const mustNot: string[] = []
    const should: string[] = []
    const phrases: string[] = []
    // Strip field prefix
    const tokens = q.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []
    for (const t of tokens) {
      if (t.startsWith('-')) { mustNot.push(t.slice(1).replace(/"/g, '')); continue }
      if (t.startsWith('+')) { must.push(t.slice(1).replace(/"/g, '')); continue }
      if (t.startsWith('"') && t.endsWith('"')) { phrases.push(t.slice(1, -1)); continue }
      should.push(t.replace(/"/g, ''))
    }
    return { must, mustNot, should, phrases }
  }

  searchWithParsed(opts: SearchOptions & { parsed?: ReturnType<SearchEngine['parseQuery']> }): SearchHit[] {
    if (!opts.parsed) return this.search(opts)
    const { must, mustNot, should, phrases } = opts.parsed
    // Start with docs matching must + phrases
    const { parsed: _ignored, ...restOpts } = opts
    void _ignored
    const mustHits = this.search({ ...restOpts, query: [...must, ...phrases].join(' '), operator: 'and' })
    const mustNotIds = new Set<string>()
    if (mustNot.length > 0) {
      const hits = this.search({ ...restOpts, query: mustNot.join(' ') })
      hits.forEach(h => mustNotIds.add(h.id))
    }
    const shouldHits = should.length > 0 ? this.search({ ...restOpts, query: should.join(' ') }) : []
    const mustIds = new Set(mustHits.map(h => h.id))
    const shouldIds = new Set(shouldHits.map(h => h.id))
    const finalIds = [...mustIds].filter(id => !mustNotIds.has(id))
    // Add should hits not already included
    for (const h of shouldHits) {
      if (!mustIds.has(h.id) && !mustNotIds.has(h.id)) finalIds.push(h.id)
    }
    // Build results with score
    const scoreMap = new Map<string, number>()
    for (const h of mustHits) scoreMap.set(h.id, h.score)
    for (const h of shouldHits) scoreMap.set(h.id, (scoreMap.get(h.id) ?? 0) + h.score * 0.5)
    return finalIds.slice(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 10))
      .map(id => ({
        id,
        score: scoreMap.get(id) ?? 0,
        highlights: opts.highlight ? this.buildHighlights(id, new Set([...must, ...should]), opts.highlight) : {},
        matchedTerms: [...new Set([...must, ...should])].slice(0, 5),
      }))
      .sort((a, b) => b.score - a.score)
  }

  // ---- Stats ----
  stats(): IndexStats {
    return {
      totalDocs: this.docs.size,
      totalTerms: this.inverted.size,
      avgDocLength: this.avgDocLength,
      indexSize: this.totalPostings(),
    }
  }

  getMetrics() { return { ...this.metrics } }
  getDoc(id: string): Document | null {
    const d = this.docs.get(id); return d ? { ...d, fields: { ...d.fields }, tags: [...(d.tags ?? [])] } : null
  }
  listDocs(): Document[] { return [...this.docs.values()].map(d => ({ ...d, fields: { ...d.fields } })) }
  size(): number { return this.docs.size }
  hasTerm(term: string): boolean { return this.inverted.has(term.toLowerCase()) }
  getPostings(term: string): InvertedPosting[] {
    return (this.inverted.get(term.toLowerCase()) ?? []).map(p => ({ ...p, positions: [...p.positions] }))
  }

  // ---- Internals ----
  private tokenize(text: string): string[] {
    if (this.config.tokenizer === 'ngram') return ngramTokenize(text, this.config.ngramSize)
    if (this.config.tokenizer === 'unicode') return unicodeTokenize(text)
    return defaultTokenize(text)
  }

  private fuzzyMatchTerms(term: string): string[] {
    const results: string[] = []
    for (const known of this.inverted.keys()) {
      if (known === term) { results.push(known); continue }
      if (Math.abs(known.length - term.length) > this.config.fuzzyDistance) continue
      if (levenshtein(known, term, this.config.fuzzyDistance) <= this.config.fuzzyDistance) {
        results.push(known)
      }
    }
    return results.length > 0 ? results : [term]
  }

  private idf(term: string): number {
    const N = this.docs.size
    const df = new Set((this.inverted.get(term) ?? []).map(p => p.docId)).size
    return Math.log(1 + (N - df + 0.5) / (df + 0.5))
  }

  private bm25Score(tf: number, docLen: number, idf: number): number {
    const { k1, b } = this.config
    const norm = 1 - b + b * (docLen / Math.max(1, this.avgDocLength))
    return idf * (tf * (k1 + 1)) / (tf + k1 * norm)
  }

  private matchesFilter(docId: string, filter: NonNullable<SearchOptions['filter']>): boolean {
    const doc = this.docs.get(docId)
    if (!doc) return false
    return filter.every(f => {
      if (f.field === 'tags') return doc.tags?.includes(String(f.value)) ?? false
      return doc.fields[f.field] === f.value
    })
  }

  private buildHighlights(docId: string, terms: Set<string>, opts: NonNullable<SearchOptions['highlight']>): Record<string, string[]> {
    const doc = this.docs.get(docId)
    if (!doc) return {}
    const pre = opts.pre ?? '<mark>'
    const post = opts.post ?? '</mark>'
    const fragSize = opts.fragmentSize ?? 80
    const result: Record<string, string[]> = {}
    for (const field of this.config.fields) {
      const v = doc.fields[field]
      if (v === undefined) continue
      const text = String(v)
      const lower = text.toLowerCase()
      const frags: string[] = []
      for (const term of terms) {
        const idx = lower.indexOf(term)
        if (idx === -1) continue
        const start = Math.max(0, idx - Math.floor(fragSize / 3))
        const end = Math.min(text.length, idx + term.length + Math.floor(fragSize * 2 / 3))
        let frag = text.slice(start, end)
        // Replace ALL occurrences of any term in fragment
        for (const t of terms) {
          const re = new RegExp(`(${this.escapeRegex(t)})`, 'gi')
          frag = frag.replace(re, `${pre}$1${post}`)
        }
        frags.push((start > 0 ? '…' : '') + frag + (end < text.length ? '…' : ''))
      }
      if (frags.length > 0) result[field] = [...new Set(frags)]
    }
    return result
  }

  private escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

  private recomputeAvgDocLength() {
    if (this.docLengths.size === 0) { this.avgDocLength = 0; return }
    let sum = 0
    for (const l of this.docLengths.values()) sum += l
    this.avgDocLength = sum / this.docLengths.size
  }

  private totalPostings(): number {
    let total = 0
    for (const p of this.inverted.values()) total += p.length
    return total
  }
}

export const search = { SearchEngine }
