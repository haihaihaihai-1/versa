import { useMemo, useState } from 'react'
import {
  buildDemoKB, rag, HashEmbedding, evaluate, SAMPLE_EVAL,
  type RAGResponse, type KnowledgeBase, type EmbeddingModel,
} from './index'

type Corpus = 'tech' | 'shop' | 'news'
type Tab = 'search' | 'rag' | 'eval' | 'chunks'

export function VectorPage() {
  const [tab, setTab] = useState<Tab>('search')
  const [corpus, setCorpus] = useState<Corpus>('tech')
  const model: EmbeddingModel = useMemo(() => new HashEmbedding(96), [])
  const [kb, setKb] = useState<KnowledgeBase>(() => buildDemoKB('tech', model))
  const [query, setQuery] = useState('什么是 RAG')
  const [alpha, setAlpha] = useState(0.5)
  const [topK, setTopK] = useState(3)
  const [maxTokens, setMaxTokens] = useState(800)
  const [ragResult, setRagResult] = useState<RAGResponse | null>(null)
  const [evalMetrics, setEvalMetrics] = useState<{ recall: number; mrr: number; ndcg: number } | null>(null)

  const switchCorpus = (c: Corpus) => {
    setCorpus(c)
    setKb(buildDemoKB(c, model))
    setRagResult(null)
    setEvalMetrics(null)
  }

  const searchHits = useMemo(() => kb.searchWithContext(query, topK, alpha), [query, topK, alpha, kb])

  const runRAG = () => {
    setRagResult(rag(kb, query, model, { topK, alpha, maxContextTokens: maxTokens }))
  }
  const runEval = () => {
    const results = SAMPLE_EVAL.map((q) => rag(kb, q.query, model, { topK: 3, alpha, maxContextTokens: 500 }))
    setEvalMetrics(evaluate(results, SAMPLE_EVAL))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Vector Search & RAG · v25.0
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            自研 hash embedding · BM25 + 向量混合检索 · 重排 · RAG 组装 · 评估
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {(['tech', 'shop', 'news'] as Corpus[]).map((c) => (
            <button
              key={c}
              onClick={() => switchCorpus(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                corpus === c ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
              }`}
            >
              {c === 'tech' ? '技术语料' : c === 'shop' ? '商品语料' : '新闻语料'}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-500">文档 {kb.size()} 篇 · 嵌入维度 96</div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-200">
          {([
            ['search', '混合检索'],
            ['rag', 'RAG 流水线'],
            ['eval', '评估'],
            ['chunks', '知识库'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
          <label className="text-xs font-medium text-slate-500">查询</label>
          <div className="mt-1 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-violet-400 focus:outline-none"
              placeholder="例如: 什么是 RAG / 向量数据库 / 无线耳机"
            />
            <button onClick={runRAG} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
              RAG
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <Slider label="向量权重 α" value={alpha} setValue={setAlpha} min={0} max={1} step={0.05} />
            <Slider label="Top-K" value={topK} setValue={setTopK} min={1} max={10} step={1} />
            <Slider label="上下文 Tokens" value={maxTokens} setValue={setMaxTokens} min={100} max={2000} step={50} />
          </div>
        </div>

        {tab === 'search' && (
          <div className="space-y-3">
            {searchHits.map((h, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">#{i + 1}</span>
                  <span>{h.item.doc.title || h.item.id}</span>
                  <span className="ml-auto font-mono">score={h.score.toFixed(3)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{h.chunk.text}</p>
              </div>
            ))}
            {searchHits.length === 0 && <p className="text-center text-slate-400 py-8">无结果</p>}
          </div>
        )}

        {tab === 'rag' && (
          <div className="space-y-4">
            {ragResult ? (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">检索到 {ragResult.citations.length} 块 · 上下文 ~{ragResult.usage.contextTokens} tokens</div>
                  <div className="space-y-2">
                    {ragResult.citations.map((c, i) => (
                      <div key={i} className="text-sm bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-500 mb-1">[{c.title || c.id}] rerank={c.score.toFixed(3)}</div>
                        <div className="text-slate-700">{c.chunk}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm font-mono whitespace-pre-wrap">
                  {ragResult.prompt}
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 py-12">点击 RAG 按钮运行流水线</div>
            )}
          </div>
        )}

        {tab === 'eval' && (
          <div className="space-y-4">
            <button onClick={runEval} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700">
              运行 {SAMPLE_EVAL.length} 条评估
            </button>
            {evalMetrics && (
              <div className="grid grid-cols-3 gap-3">
                {([['Recall@K', evalMetrics.recall], ['MRR', evalMetrics.mrr], ['NDCG@K', evalMetrics.ndcg]] as [string, number][]).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <div className="text-xs text-slate-500">{k}</div>
                    <div className="text-2xl font-bold text-violet-700 mt-1">{(v * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500 mb-2">评估集 ({SAMPLE_EVAL.length})</div>
              <ul className="text-sm space-y-1">
                {SAMPLE_EVAL.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">{i + 1}.</span>
                    <span className="text-slate-700">{q.query}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-violet-600 font-mono text-xs">{q.relevantIds.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'chunks' && (
          <div className="space-y-3">
            {kb.list().map((it) => (
              <div key={it.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800 mb-1">{it.doc.title || it.id}</div>
                <div className="text-xs text-slate-500 mb-2">{it.chunks.length} 块 · {(it.doc.text || '').length} 字</div>
                <div className="space-y-1">
                  {it.chunks.slice(0, 3).map((c) => (
                    <div key={c.id} className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 truncate">
                      [{c.index}] {c.text}
                    </div>
                  ))}
                  {it.chunks.length > 3 && <div className="text-xs text-slate-400">... +{it.chunks.length - 3} 块</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Slider({ label, value, setValue, min, max, step }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-violet-600"
      />
    </div>
  )
}
