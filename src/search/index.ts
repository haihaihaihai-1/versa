/**
 * Versa · 全文搜索引擎 (v16.0)
 *
 * 设计：
 * - 中文按字符 + 二元组 (bigram) 分词, 英文按空格
 * - 倒排索引 (Map<term, Map<docId, tf>>)
 * - TF-IDF 评分
 * - 高亮 (snippet)
 * - 模糊匹配 (Levenshtein ≤ 2)
 * - 增量索引更新
 */

export interface IndexedDoc {
  id: string
  title: string
  body: string
  tags?: string[]
  author?: string
  category?: string
  createdAt?: number
  [k: string]: any
}

export interface SearchHit {
  id: string
  score: number
  title: string
  snippet: string
  matchedTerms: string[]
  doc: IndexedDoc
}

export interface SearchOptions {
  category?: string
  author?: string
  tags?: string[]
  limit?: number
  minScore?: number
  fuzzy?: boolean
  highlight?: boolean
}

const STOP_WORDS = new Set([
  '的', '了', '和', '是', '在', '我', '有', '不', '这', '也', '就', '都', '而', '及', '与', '或',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
])

function tokenize(text: string): string[] {
  if (!text) return []
  const tokens: string[] = []
  // CJK chars individually
  const cjkSegments: string[] = []
  let buf = ''
  for (const ch of text.toLowerCase()) {
    if (/[\u4e00-\u9fa5]/.test(ch)) {
      cjkSegments.push(ch)
      // bigrams
      if (buf) {
        cjkSegments.push(buf + ch)
        buf = ''
      } else {
        buf = ch
      }
    } else {
      // flush
      buf = ''
      // English word
    }
  }
  tokens.push(...cjkSegments)
  // English words
  const enWords = text.toLowerCase().match(/[a-z0-9]+/g) || []
  tokens.push(...enWords)
  return tokens.filter((t) => t.length > 0 && !STOP_WORDS.has(t))
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const m: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) m[i][0] = i
  for (let j = 0; j <= b.length; j++) m[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = a[i - 1] === b[j - 1] ? m[i - 1][j - 1] : 1 + Math.min(m[i - 1][j], m[i][j - 1], m[i - 1][j - 1])
    }
  }
  return m[a.length][b.length]
}

function fuzzyMatch(term: string, candidate: string, maxDist = 2): boolean {
  if (term === candidate) return true
  if (Math.abs(term.length - candidate.length) > maxDist) return false
  return levenshtein(term, candidate) <= maxDist
}

class SearchIndex {
  private docs: Map<string, IndexedDoc> = new Map()
  private inverted: Map<string, Map<string, number>> = new Map()  // term -> (docId -> tf)
  private docLen: Map<string, number> = new Map()
  private avgDocLen = 0
  private dirty = true

  size(): number {
    return this.docs.size
  }

  add(doc: IndexedDoc): void {
    if (this.docs.has(doc.id)) this.remove(doc.id)
    this.docs.set(doc.id, doc)
    const tokens = this.tokenizeDoc(doc)
    this.docLen.set(doc.id, tokens.length)
    for (const t of tokens) {
      if (!this.inverted.has(t)) this.inverted.set(t, new Map())
      const m = this.inverted.get(t)!
      m.set(doc.id, (m.get(doc.id) || 0) + 1)
    }
    this.dirty = true
  }

  addAll(docs: IndexedDoc[]): void {
    for (const d of docs) this.add(d)
  }

  remove(id: string): void {
    const doc = this.docs.get(id)
    if (!doc) return
    this.docs.delete(id)
    const tokens = this.tokenizeDoc(doc)
    for (const t of tokens) {
      const m = this.inverted.get(t)
      if (m) {
        m.delete(id)
        if (m.size === 0) this.inverted.delete(t)
      }
    }
    this.docLen.delete(id)
    this.dirty = true
  }

  clear(): void {
    this.docs.clear()
    this.inverted.clear()
    this.docLen.clear()
    this.dirty = true
  }

  private tokenizeDoc(doc: IndexedDoc): string[] {
    const all: string[] = []
    all.push(...tokenize(doc.title))
    all.push(...tokenize(doc.body))
    if (doc.tags) for (const t of doc.tags) all.push(...tokenize(t))
    if (doc.author) all.push(...tokenize(doc.author))
    if (doc.category) all.push(...tokenize(doc.category))
    return all
  }

  private ensureStats() {
    if (this.dirty) {
      this.avgDocLen = this.docLen.size === 0
        ? 1
        : Array.from(this.docLen.values()).reduce((s, n) => s + n, 0) / this.docLen.size
      this.dirty = false
    }
  }

  /** BM25 评分 */
  private score(docId: string, queryTerms: string[]): { score: number; matched: string[] } {
    this.ensureStats()
    const N = this.docs.size
    const k1 = 1.5
    const b = 0.75
    const dl = this.docLen.get(docId) || 0
    let s = 0
    const matched: string[] = []
    for (const q of queryTerms) {
      // 直接命中
      let postings = this.inverted.get(q)
      if (!postings && q.length >= 2) {
        const maxDist = Math.max(1, Math.min(2, Math.floor(q.length / 3)))
        for (const [term, p] of this.inverted) {
          if (fuzzyMatch(q, term, maxDist)) {
            postings = p
            matched.push(term)
            break
          }
        }
      } else if (postings) {
        matched.push(q)
      }
      if (!postings) continue
      const tf = postings.get(docId) || 0
      if (tf === 0) continue
      const df = postings.size
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      const norm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / this.avgDocLen))
      s += idf * norm
    }
    return { score: s, matched }
  }

  search(query: string, opts: SearchOptions = {}): SearchHit[] {
    const q = query.trim()
    if (!q) return []
    const terms = tokenize(q)
    if (terms.length === 0) return []

    const candidates = new Set<string>()
    for (const t of terms) {
      const m = this.inverted.get(t)
      if (m) m.forEach((_, id) => candidates.add(id))
      else if (opts.fuzzy && t.length >= 2) {
        const maxDist = Math.max(1, Math.min(2, Math.floor(t.length / 3)))
        for (const [term, p] of this.inverted) {
          if (fuzzyMatch(t, term, maxDist)) {
            p.forEach((_, id) => candidates.add(id))
          }
        }
      }
    }
    if (candidates.size === 0) return []

    const hits: SearchHit[] = []
    for (const id of candidates) {
      const doc = this.docs.get(id)!
      if (opts.category && doc.category !== opts.category) continue
      if (opts.author && doc.author !== opts.author) continue
      if (opts.tags && opts.tags.length > 0) {
        if (!doc.tags?.some((t) => opts.tags!.includes(t))) continue
      }
      const { score, matched } = this.score(id, terms)
      if (score < (opts.minScore ?? 0)) continue
      hits.push({
        id,
        score,
        title: doc.title,
        snippet: opts.highlight === false ? doc.body.slice(0, 200) : this.highlight(doc.body, terms, 200),
        matchedTerms: matched,
        doc,
      })
    }
    hits.sort((a, b) => b.score - a.score)
    return hits.slice(0, opts.limit ?? 20)
  }

  private highlight(text: string, terms: string[], maxLen: number): string {
    if (!text) return ''
    let lower = text.toLowerCase()
    let firstHit = -1
    for (const t of terms) {
      const i = lower.indexOf(t.toLowerCase())
      if (i >= 0 && (firstHit < 0 || i < firstHit)) firstHit = i
    }
    let start = firstHit > 50 ? firstHit - 30 : 0
    let end = Math.min(text.length, start + maxLen)
    let snippet = text.slice(start, end)
    if (start > 0) snippet = '…' + snippet
    if (end < text.length) snippet += '…'
    for (const t of terms) {
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      snippet = snippet.replace(re, (m) => `<mark>${m}</mark>`)
    }
    return snippet
  }

  /** 相关推荐: 找到与给定文档最相似的其他文档 */
  related(docId: string, limit = 5): SearchHit[] {
    const doc = this.docs.get(docId)
    if (!doc) return []
    const terms = this.tokenizeDoc(doc)
    const counts: Map<string, number> = new Map()
    for (const t of terms) {
      const m = this.inverted.get(t)
      if (!m) continue
      m.forEach((tf, id) => {
        if (id === docId) return
        counts.set(id, (counts.get(id) || 0) + tf)
      })
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => ({
        id,
        score: score / terms.length,
        title: this.docs.get(id)!.title,
        snippet: this.docs.get(id)!.body.slice(0, 200),
        matchedTerms: [],
        doc: this.docs.get(id)!,
      }))
  }
}

export const searchIndex = new SearchIndex()

export { tokenize, levenshtein, fuzzyMatch, SearchIndex }
