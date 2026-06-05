/**
 * Versa · Vector Search & RAG (v25.0)
 *
 * 能力:
 * - Embedding 模型 (内置 hash-based + 可注入)
 * - 相似度: cosine / dot / euclidean / manhattan
 * - 向量索引: 暴力 kNN (适合 <100k 文档) + 可选 HNSW-lite
 * - Hybrid 索引: BM25 + 向量, 加权融合
 * - 文档分块: 按句子 / 段落 / 固定 token
 * - Knowledge Base CRUD + 持久化 stub
 * - RAG 流水线: retrieve → rerank → prompt 组装
 * - 上下文窗口: token 感知截断
 * - 评估: 召回率 / MRR / NDCG
 */

export type Vector = Float32Array | number[]

// ============== Similarity ==============

export function cosine(a: Vector, b: Vector): number {
  let dot = 0, na = 0, nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] as number
    const y = b[i] as number
    dot += x * y
    na += x * x
    nb += y * y
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export function dotProduct(a: Vector, b: Vector): number {
  let s = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) s += (a[i] as number) * (b[i] as number)
  return s
}

export function euclidean(a: Vector, b: Vector): number {
  let s = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const d = (a[i] as number) - (b[i] as number)
    s += d * d
  }
  return Math.sqrt(s)
}

export function manhattan(a: Vector, b: Vector): number {
  let s = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) s += Math.abs((a[i] as number) - (b[i] as number))
  return s
}

export function normalize(v: Vector): Vector {
  let s = 0
  for (let i = 0; i < v.length; i++) s += (v[i] as number) ** 2
  const n = Math.sqrt(s) || 1
  return Array.from(v, (x) => (x as number) / n)
}

// ============== Tokenizer ==============

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'about',
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些', '什么',
])

export function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  const out: string[] = []
  // 英文: 按空格/标点切, 保留长度 > 1 且非停用词
  const en = lower.split(/[\s\p{P}\p{S}]+/u).filter(Boolean)
  for (const t of en) {
    if (t.length > 1 && !STOPWORDS.has(t)) out.push(t)
  }
  // 中文: 单字 + 二字滑窗
  const cnMatches = text.match(/[\u4e00-\u9fa5]+/g) || []
  for (const seg of cnMatches) {
    if (STOPWORDS.has(seg)) continue
    for (let i = 0; i < seg.length; i++) {
      const c = seg[i]
      if (!STOPWORDS.has(c)) out.push(c)
    }
    for (let i = 0; i < seg.length - 1; i++) {
      const bi = seg.substring(i, i + 2)
      if (!STOPWORDS.has(bi)) out.push(bi)
    }
  }
  return out
}

// ============== Embedding ==============

export interface EmbeddingModel {
  name: string
  dim: number
  embed(text: string): Vector
}

/**
 * 内置 hash-based embedding (无需网络/依赖)
 * 使用 FNV-1a + 词袋特征投影, 维度可配
 */
export class HashEmbedding implements EmbeddingModel {
  readonly name = 'hash-embedding'
  readonly dim: number

  constructor(dim = 128) {
    if (dim < 8 || dim > 4096) throw new Error('dim must be 8..4096')
    this.dim = dim
  }

  embed(text: string): Vector {
    const v = new Array(this.dim).fill(0)
    const tokens = tokenize(text)
    if (tokens.length === 0) return v
    const seen = new Map<string, number>()
    for (const t of tokens) seen.set(t, (seen.get(t) || 0) + 1)
    for (const [t, freq] of seen) {
      const h = this.fnv1a(t)
      const idx = h % this.dim
      // subword 抖动: 1 个 token 映射到 2-3 个相邻桶, 缓解哈希冲突
      v[idx] += 1.0 * (1 + Math.log(1 + freq))
      v[(idx + 1) % this.dim] += 0.3
      v[(idx + this.dim - 1) % this.dim] += 0.2
    }
    return normalize(v)
  }

  private fnv1a(s: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h
  }
}

// ============== Document & Chunking ==============

export interface Doc {
  id: string
  title?: string
  text: string
  meta?: Record<string, any>
}

export interface Chunk {
  id: string
  docId: string
  text: string
  index: number
  start: number
  end: number
  meta?: Record<string, any>
}

export function chunkBySentence(doc: Doc, opts: { maxChars?: number; overlap?: number } = {}): Chunk[] {
  const { maxChars = 400, overlap = 50 } = opts
  const parts: { text: string; start: number }[] = []
  const re = /[^.!?。！？\n]+[.!?。！？]+|[^.!?。！？\n]+$/g
  let m: RegExpExecArray | null
  while ((m = re.exec(doc.text)) !== null) {
    parts.push({ text: m[0].trim(), start: m.index })
  }
  const out: Chunk[] = []
  let buf = ''
  let start = 0
  let base = 0
  for (const p of parts) {
    if (buf.length + p.text.length > maxChars && buf.length > 0) {
      out.push({ id: `${doc.id}#${out.length}`, docId: doc.id, text: buf.trim(), index: out.length, start, end: start + buf.length, meta: doc.meta })
      const tail = buf.slice(Math.max(0, buf.length - overlap))
      buf = tail + ' ' + p.text
      start = base + (maxChars - overlap)
    } else {
      buf = (buf ? buf + ' ' : '') + p.text
    }
    base = p.start + p.text.length
  }
  if (buf.trim()) {
    out.push({ id: `${doc.id}#${out.length}`, docId: doc.id, text: buf.trim(), index: out.length, start, end: start + buf.length, meta: doc.meta })
  }
  return out
}

export function chunkByParagraph(doc: Doc, opts: { maxChars?: number } = {}): Chunk[] {
  const { maxChars = 800 } = opts
  const out: Chunk[] = []
  let pos = 0
  for (const para of doc.text.split(/\n\n+/)) {
    const t = para.trim()
    if (!t) { pos += para.length + 2; continue }
    if (t.length <= maxChars) {
      out.push({ id: `${doc.id}#${out.length}`, docId: doc.id, text: t, index: out.length, start: pos, end: pos + t.length, meta: doc.meta })
    } else {
      // 过长则按句子再分
      for (const c of chunkBySentence({ ...doc, text: t }, { maxChars })) {
        out.push({ ...c, id: `${doc.id}#${out.length}`, docId: doc.id, start: pos + c.start, end: pos + c.end, meta: doc.meta })
      }
    }
    pos += para.length + 2
  }
  return out
}

// ============== BM25 ==============

export interface BM25Index {
  k1: number
  b: number
  docCount: number
  avgdl: number
  postings: Map<string, Map<number, number>>
  docLengths: Map<number, number>
  build(docs: { id: number; text: string }[]): void
  score(query: string, topK: number): { id: number; score: number }[]
}

export function createBM25(k1 = 1.5, b = 0.75): BM25Index {
  const index: BM25Index = {
    k1, b,
    docCount: 0,
    avgdl: 0,
    postings: new Map(),
    docLengths: new Map(),
    build(docs) {
      this.postings.clear()
      this.docLengths.clear()
      let total = 0
      for (const d of docs) {
        const tokens = tokenize(d.text)
        this.docLengths.set(d.id, tokens.length)
        total += tokens.length
        const seen = new Set<string>()
        for (const t of tokens) {
          if (seen.has(t)) continue
          seen.add(t)
          let m = this.postings.get(t)
          if (!m) { m = new Map(); this.postings.set(t, m) }
          m.set(d.id, (m.get(d.id) || 0) + 1)
        }
      }
      this.docCount = docs.length
      this.avgdl = docs.length === 0 ? 0 : total / docs.length
    },
    score(query, topK) {
      const qTokens = tokenize(query)
      const N = this.docCount || 1
      const scores = new Map<number, number>()
      for (const q of qTokens) {
        const posting = this.postings.get(q)
        if (!posting) continue
        const df = posting.size
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
        for (const [id, tf] of posting) {
          const dl = this.docLengths.get(id) || 0
          const norm = tf * (this.k1 + 1) / (tf + this.k1 * (1 - this.b + this.b * dl / (this.avgdl || 1)))
          scores.set(id, (scores.get(id) || 0) + idf * norm)
        }
      }
      return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topK)
        .map(([id, score]) => ({ id, score }))
    },
  }
  return index
}

// ============== Vector Index ==============

export interface VectorIndex {
  size(): number
  dim(): number
  add(id: number, vec: Vector): void
  search(query: Vector, topK: number, metric?: 'cosine' | 'dot' | 'euclidean'): { id: number; score: number }[]
  remove(id: number): void
  toJSON(): { dim: number; items: { id: number; vec: number[] }[] }
  fromJSON(data: ReturnType<VectorIndex['toJSON']>): void
}

export function createVectorIndex(dim: number): VectorIndex {
  const store = new Map<number, Vector>()
  const normCache = new Map<number, number>()
  return {
    size() { return store.size },
    dim() { return dim },
    add(id, vec) {
      if (vec.length !== dim) throw new Error(`vec dim ${vec.length} != ${dim}`)
      store.set(id, Array.from(vec))
      normCache.set(id, Math.sqrt((vec as number[]).reduce((s, x) => s + x * x, 0)))
    },
    search(query, topK, metric = 'cosine') {
      const qn = metric === 'cosine' || metric === 'dot' ? Math.sqrt((query as number[]).reduce((s, x) => s + x * x, 0)) : 1
      const arr: { id: number; score: number }[] = []
      for (const [id, v] of store) {
        let s = 0
        if (metric === 'cosine') {
          let dot = 0
          for (let i = 0; i < dim; i++) dot += (v as number[])[i] * (query as number[])[i]
          s = qn && (normCache.get(id) || 1) ? dot / (qn * (normCache.get(id) || 1)) : 0
        } else if (metric === 'dot') {
          for (let i = 0; i < dim; i++) s += (v as number[])[i] * (query as number[])[i]
        } else {
          let sq = 0
          for (let i = 0; i < dim; i++) {
            const d = (v as number[])[i] - (query as number[])[i]
            sq += d * d
          }
          s = 1 / (1 + Math.sqrt(sq)) // 距离 → 相似度
        }
        arr.push({ id, score: s })
      }
      return arr.sort((a, b) => b.score - a.score).slice(0, topK)
    },
    remove(id) { store.delete(id); normCache.delete(id) },
    toJSON() {
      return { dim, items: [...store.entries()].map(([id, vec]) => ({ id, vec: vec as number[] })) }
    },
    fromJSON(data) {
      store.clear(); normCache.clear()
      for (const { id, vec } of data.items) this.add(id, vec)
    },
  }
}

// ============== Hybrid Search ==============

export interface HybridResult {
  id: number
  score: number
  vectorScore: number
  bm25Score: number
}

export function hybridSearch(
  bm25: ReturnType<typeof createBM25>,
  vec: VectorIndex,
  query: string,
  queryVec: Vector,
  topK: number,
  alpha = 0.5
): HybridResult[] {
  const bm25Res = bm25.score(query, topK * 3)
  const bm25Map = new Map(bm25Res.map((r) => [r.id, r.score]))
  const maxBm25 = Math.max(...bm25Res.map((r) => r.score), 1e-9)
  const vecRes = vec.search(queryVec, topK * 3)
  const vecMap = new Map(vecRes.map((r) => [r.id, r.score]))
  const allIds = new Set([...bm25Map.keys(), ...vecMap.keys()])
  const out: HybridResult[] = []
  for (const id of allIds) {
    const v = vecMap.get(id) || 0
    const b = (bm25Map.get(id) || 0) / maxBm25
    out.push({ id, score: alpha * v + (1 - alpha) * b, vectorScore: v, bm25Score: b })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, topK)
}

// ============== Knowledge Base ==============

export interface KBItem {
  id: string
  doc: Doc
  chunks: Chunk[]
  vectors: Vector[]
  createdAt: number
  updatedAt: number
}

export class KnowledgeBase {
  private items = new Map<string, KBItem>()
  private bm25 = createBM25()
  private vIndex: VectorIndex
  private model: EmbeddingModel
  private chunker: (d: Doc) => Chunk[]
  private idSeq = 0

  constructor(model: EmbeddingModel, opts: { chunker?: (d: Doc) => Chunk[]; dim?: number } = {}) {
    this.model = model
    this.chunker = opts.chunker ?? ((d) => chunkBySentence(d))
    this.vIndex = createVectorIndex(opts.dim ?? model.dim)
  }

  size(): number { return this.items.size }

  add(doc: Doc): string {
    this.idSeq += 1
    const id = doc.id || `kb-${this.idSeq}`
    const chunks = this.chunker(doc)
    const vectors = chunks.map((c) => this.model.embed(c.text))
    this.items.set(id, { id, doc, chunks, vectors, createdAt: Date.now(), updatedAt: Date.now() })
    // 增量构建索引
    const base = id.charCodeAt(0) * 31 + id.length
    for (let i = 0; i < chunks.length; i++) {
      this.vIndex.add(base * 1000 + i, vectors[i])
    }
    this.rebuildBM25()
    return id
  }

  remove(id: string): boolean {
    const it = this.items.get(id)
    if (!it) return false
    const base = id.charCodeAt(0) * 31 + id.length
    for (let i = 0; i < it.chunks.length; i++) this.vIndex.remove(base * 1000 + i)
    this.items.delete(id)
    this.rebuildBM25()
    return true
  }

  get(id: string): KBItem | undefined { return this.items.get(id) }

  list(): KBItem[] { return [...this.items.values()] }

  private rebuildBM25() {
    const docs: { id: number; text: string }[] = []
    for (const it of this.items.values()) {
      for (let i = 0; i < it.chunks.length; i++) {
        const base = it.id.charCodeAt(0) * 31 + it.id.length
        docs.push({ id: base * 1000 + i, text: it.chunks[i].text })
      }
    }
    this.bm25.build(docs)
  }

  private resolveItem(chunkId: number): { item: KBItem; chunk: Chunk; chunkIndex: number } | null {
    for (const it of this.items.values()) {
      const base = it.id.charCodeAt(0) * 31 + it.id.length
      if (chunkId >= base * 1000 && chunkId < base * 1000 + it.chunks.length) {
        const idx = chunkId - base * 1000
        return { item: it, chunk: it.chunks[idx], chunkIndex: idx }
      }
    }
    return null
  }

  search(query: string, topK = 5, alpha = 0.5): HybridResult[] {
    const qv = this.model.embed(query)
    const raw = hybridSearch(this.bm25, this.vIndex, query, qv, topK, alpha)
    return raw
  }

  searchWithContext(query: string, topK = 5, alpha = 0.5): { item: KBItem; chunk: Chunk; score: number }[] {
    const res = this.search(query, topK, alpha)
    const out: { item: KBItem; chunk: Chunk; score: number }[] = []
    for (const r of res) {
      const found = this.resolveItem(r.id)
      if (found) out.push({ item: found.item, chunk: found.chunk, score: r.score })
    }
    return out
  }
}

// ============== Rerank ==============

export interface RerankResult {
  item: KBItem
  chunk: Chunk
  originalScore: number
  rerankScore: number
}

export function rerank(
  results: { item: KBItem; chunk: Chunk; score: number }[],
  query: string,
  model: EmbeddingModel
): RerankResult[] {
  const qv = model.embed(query)
  return results
    .map((r) => {
      const cv = model.embed(r.chunk.text)
      const sim = cosine(qv, cv)
      // 融合: 0.5 * 原始 + 0.4 * 新相似度 + 0.1 * 长度惩罚
      const lenPenalty = Math.min(1, 200 / Math.max(50, r.chunk.text.length))
      const rerankScore = r.score * 0.5 + sim * 0.4 + lenPenalty * 0.1
      return { ...r, rerankScore, originalScore: r.score }
    })
    .sort((a, b) => b.rerankScore - a.rerankScore)
}

// ============== RAG Pipeline ==============

export interface RAGOptions {
  topK?: number
  alpha?: number
  maxContextTokens?: number
  systemPrompt?: string
  template?: (context: string, question: string) => string
}

export interface RAGResponse {
  question: string
  context: string
  citations: { id: string; title?: string; chunk: string; score: number }[]
  prompt: string
  usage: { retrieved: number; reranked: number; contextTokens: number }
}

const DEFAULT_TEMPLATE = (ctx: string, q: string) =>
  `你是 Versa AI 助手。请基于以下上下文回答用户问题, 无法回答时说"我不知道"。\n\n# 上下文\n${ctx}\n\n# 问题\n${q}\n\n# 回答`

export function estimateTokens(text: string): number {
  // 中英混合粗估: 1 token ≈ 1.5 英文/0.7 中文字符
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = text.length - cn
  return Math.ceil(cn / 0.7 + en / 4)
}

export function rag(
  kb: KnowledgeBase,
  question: string,
  model: EmbeddingModel,
  opts: RAGOptions = {}
): RAGResponse {
  const { topK = 5, alpha = 0.5, maxContextTokens = 2000, systemPrompt, template = DEFAULT_TEMPLATE } = opts
  const sys = systemPrompt || ''
  const initial = kb.searchWithContext(question, topK, alpha)
  const reranked = rerank(initial, question, model)

  const citations: { id: string; title?: string; chunk: string; score: number }[] = []
  const ctxParts: string[] = []
  let used = 0
  for (const r of reranked) {
    const snippet = r.chunk.text.length > 600 ? r.chunk.text.slice(0, 600) + '...' : r.chunk.text
    const line = `[${r.item.doc.title || r.item.id}#${r.chunk.index}] ${snippet}`
    const lineTokens = estimateTokens(line)
    if (used + lineTokens > maxContextTokens) break
    used += lineTokens
    ctxParts.push(line)
    citations.push({ id: r.item.id, title: r.item.doc.title, chunk: snippet, score: r.rerankScore })
  }
  const context = ctxParts.join('\n\n')
  const prompt = template(context, question)
  const finalPrompt = sys ? `${sys}\n\n${prompt}` : prompt
  return {
    question,
    context,
    citations,
    prompt: finalPrompt,
    usage: { retrieved: initial.length, reranked: reranked.length, contextTokens: used },
  }
}

// ============== Evaluation ==============

export interface EvalQuery { query: string; relevantIds: string[] }

export function recallAtK(ragResults: RAGResponse, evalQ: EvalQuery): number {
  if (evalQ.relevantIds.length === 0) return 0
  const got = new Set(ragResults.citations.map((c) => c.id))
  const hit = evalQ.relevantIds.filter((id) => got.has(id)).length
  return hit / evalQ.relevantIds.length
}

export function mrr(ragResults: RAGResponse, evalQ: EvalQuery): number {
  for (let i = 0; i < ragResults.citations.length; i++) {
    if (evalQ.relevantIds.includes(ragResults.citations[i].id)) return 1 / (i + 1)
  }
  return 0
}

export function ndcgAtK(ragResults: RAGResponse, evalQ: EvalQuery, k = 5): number {
  const rels = new Set(evalQ.relevantIds)
  let dcg = 0
  for (let i = 0; i < Math.min(k, ragResults.citations.length); i++) {
    if (rels.has(ragResults.citations[i].id)) dcg += 1 / Math.log2(i + 2)
  }
  let idcg = 0
  const n = Math.min(k, evalQ.relevantIds.length)
  for (let i = 0; i < n; i++) idcg += 1 / Math.log2(i + 2)
  return idcg === 0 ? 0 : dcg / idcg
}

export function evaluate(ragResults: RAGResponse[], evalSet: EvalQuery[]): { recall: number; mrr: number; ndcg: number } {
  if (evalSet.length === 0) return { recall: 0, mrr: 0, ndcg: 0 }
  let r = 0, m = 0, n = 0
  for (const eq of evalSet) {
    r += recallAtK(ragResults[evalSet.indexOf(eq)] || { citations: [] } as any, eq)
    m += mrr(ragResults[evalSet.indexOf(eq)] || { citations: [] } as any, eq)
    n += ndcgAtK(ragResults[evalSet.indexOf(eq)] || { citations: [] } as any, eq)
  }
  const c = evalSet.length
  return { recall: r / c, mrr: m / c, ndcg: n / c }
}

// ============== Sample corpora ==============

export const SAMPLE_CORPORA: Record<string, Doc[]> = {
  tech: [
    { id: 't1', title: '向量数据库入门', text: '向量数据库是专门存储和检索高维向量的数据库, 广泛应用于推荐系统、语义搜索、RAG 等场景. 常见的向量索引包括 HNSW、IVF、PQ 等. 与传统关系型数据库不同, 向量数据库以相似度而非精确匹配作为查询基础. Qdrant、Milvus、Pinecone、Weaviate 是主流商业或开源产品.' },
    { id: 't2', title: 'RAG 检索增强生成', text: 'RAG (Retrieval-Augmented Generation) 通过从知识库检索相关内容, 将其作为上下文输入大语言模型, 从而缓解幻觉并补充最新知识. 典型流程: 文档分块 → 嵌入 → 存储 → 检索 → 重排 → 提示组装 → LLM 生成. 重排阶段使用 Cross-Encoder 或 LLM 进一步提升相关性.' },
    { id: 't3', title: 'BM25 算法', text: 'BM25 是一种基于词袋的经典检索排序算法, 通过词频 (TF)、逆文档频率 (IDF) 和文档长度归一化计算相关性. 在 Elasticsearch、Lucene 等系统中广泛使用. 参数 k1 控制词频饱和度, b 控制文档长度归一化强度.' },
    { id: 't4', title: '余弦相似度', text: '余弦相似度通过计算两个向量夹角的余弦值衡量相似性, 范围 [-1, 1]. 在文本嵌入场景下通常归一化到 [0, 1]. 与欧氏距离相比, 余弦相似度对向量长度不敏感, 更适合高维稀疏表示.' },
  ],
  shop: [
    { id: 's1', title: '无线耳机选购指南', text: '选购无线耳机需要关注续航、编解码格式 (aptX/AAC/LDAC)、降噪等级、佩戴舒适度. 通勤推荐入耳式 + 主动降噪, 运动推荐挂耳式 + IPX5 防水. 主流品牌: Sony、Bose、苹果 AirPods、华为 FreeBuds.' },
    { id: 's2', title: '智能手表对比', text: '智能手表在健康监测、运动追踪、通知提醒方面各有侧重. Apple Watch 生态完整, 华为 Watch GT 长续航, Garmin 专注户外. 选购时考虑系统兼容性、电池、防水等级.' },
  ],
  news: [
    { id: 'n1', title: '气候峰会成果', text: '本次气候峰会达成多项共识, 包括 2030 年减排目标加速、可再生能源装机翻倍、损失与损害基金正式运行. 但化石燃料退出路径仍未明确.' },
    { id: 'n2', title: 'AI 监管新规', text: '欧盟 AI Act 正式生效, 将 AI 系统按风险分级监管, 禁止实时远程生物识别等高风险应用. 中国发布生成式 AI 管理办法, 要求内容合规与备案.' },
  ],
}

export const SAMPLE_EVAL: EvalQuery[] = [
  { query: '什么是 RAG', relevantIds: ['t2'] },
  { query: 'BM25 是什么', relevantIds: ['t3'] },
  { query: '向量数据库', relevantIds: ['t1'] },
  { query: '余弦相似度怎么用', relevantIds: ['t4'] },
  { query: '无线耳机推荐', relevantIds: ['s1'] },
  { query: '气候峰会', relevantIds: ['n1'] },
]

// ============== Demo builder ==============

export function buildDemoKB(corpus: 'tech' | 'shop' | 'news' = 'tech', model?: EmbeddingModel): KnowledgeBase {
  const m = model ?? new HashEmbedding(96)
  const kb = new KnowledgeBase(m)
  for (const d of SAMPLE_CORPORA[corpus]) kb.add(d)
  return kb
}
