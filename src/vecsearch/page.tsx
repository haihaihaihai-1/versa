import { useState } from 'react'
import { VectorIndex, splitText, getVectorIndex, resetVectorIndex } from './index'

const TABS = ['Setup', 'Ingest', 'Search', 'Chunks', 'Embed', 'Stats'] as const
type Tab = typeof TABS[number]

export default function VectorSearchPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [v, setV] = useState(() => {
    resetVectorIndex()
    const vi = new VectorIndex({ metric: 'cosine' })
    // Pre-populate with sample documents
    vi.upsert({ id: 'd1', vector: vi.embed('machine learning models and training data'), metadata: { kind: 'ml', lang: 'en' }, text: 'machine learning models and training data' })
    vi.upsert({ id: 'd2', vector: vi.embed('cooking recipes and kitchen tips'), metadata: { kind: 'food', lang: 'en' }, text: 'cooking recipes and kitchen tips' })
    vi.upsert({ id: 'd3', vector: vi.embed('deep learning neural networks'), metadata: { kind: 'ml', lang: 'en' }, text: 'deep learning neural networks' })
    vi.upsert({ id: 'd4', vector: vi.embed('machine learning inference and prediction'), metadata: { kind: 'ml', lang: 'en' }, text: 'machine learning inference and prediction' })
    return vi
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v74.0 Vector Search / Embedding Index</h1>
      <p className="text-sm text-slate-400">向量索引 · k-NN 检索 · 相似度度量 · 元数据过滤 · 文本分块 · 批处理</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('current metric: ' + (v as any)['config']?.metric || 'cosine')} className="px-3 py-1.5 bg-blue-700 rounded text-xs">show config</button>
            <button onClick={() => setOut(v.list().map(d => `${d.id} | dim=${d.vector.length} | text="${d.text?.slice(0, 30) ?? ''}"`).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list documents</button>
            <button onClick={() => {
              const newV = new VectorIndex({ metric: 'dot' })
              setV(newV)
              setOut('reset and switched to dot metric')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">reset to dot</button>
          </div>
        </div>
      )}

      {tab === 'Ingest' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="vs-id" placeholder="doc id (optional)" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="vs-text" placeholder="text to embed" defaultValue="vector database search" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs flex-1 min-w-32" />
            <input id="vs-kind" placeholder="kind meta" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-24" />
            <button onClick={() => {
              const id = (document.getElementById('vs-id') as HTMLInputElement).value
              const text = (document.getElementById('vs-text') as HTMLInputElement).value
              const kind = (document.getElementById('vs-kind') as HTMLInputElement).value
              const d = v.upsert({
                id: id || undefined,
                vector: v.embed(text),
                text,
                metadata: kind ? { kind } : undefined,
              } as any)
              setOut(`ingested: ${d.id} (text="${text.slice(0, 40)}")`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">upsert</button>
            <button onClick={() => {
              const id = (document.getElementById('vs-id') as HTMLInputElement).value
              if (id) {
                const ok = v.remove(id)
                setOut(ok ? 'removed' : 'not found')
              }
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">remove</button>
          </div>
        </div>
      )}

      {tab === 'Search' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="vs-q" placeholder="search text" defaultValue="machine learning" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs flex-1 min-w-32" />
            <input id="vs-k" type="number" defaultValue={3} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-16" />
            <button onClick={() => {
              const q = (document.getElementById('vs-q') as HTMLInputElement).value
              const k = Number((document.getElementById('vs-k') as HTMLInputElement).value)
              const r = v.searchByText(q, { k })
              setOut(r.map(x => `${x.document.id} | score=${x.score.toFixed(4)} | "${x.document.text?.slice(0, 40)}"`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">search</button>
            <button onClick={() => {
              const r = v.searchByText('machine learning', { k: 10, filter: { kind: 'ml' } })
              setOut(r.map(x => `${x.document.id} | score=${x.score.toFixed(4)}`).join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">filter kind=ml</button>
          </div>
        </div>
      )}

      {tab === 'Chunks' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="vs-chunk-text" defaultValue="The quick brown fox jumps over the lazy dog. This is a sample text that will be chunked for vector indexing. Each chunk becomes a separate searchable unit in the index." className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-full" />
            <input id="vs-cs" type="number" defaultValue={50} placeholder="chunk size" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-24" />
            <input id="vs-co" type="number" defaultValue={10} placeholder="overlap" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-24" />
            <button onClick={() => {
              const text = (document.getElementById('vs-chunk-text') as HTMLInputElement).value
              const cs = Number((document.getElementById('vs-cs') as HTMLInputElement).value)
              const co = Number((document.getElementById('vs-co') as HTMLInputElement).value)
              const chunks = splitText(text, cs, co)
              setOut(chunks.map(c => `[${c.start}-${c.end}] "${c.text.slice(0, 40)}"`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">split</button>
            <button onClick={() => {
              const text = (document.getElementById('vs-chunk-text') as HTMLInputElement).value
              const cs = 50
              const co = 10
              const chunks = splitText(text, cs, co)
              const vectorChunks = chunks.map((c, i) => ({
                id: `chunk_${i}`,
                start: c.start,
                end: c.end,
                text: c.text,
                vector: v.embed(c.text),
              }))
              v.upsert({ id: `chunked_doc_${Date.now()}`, vector: v.embed(text), text, chunks: vectorChunks })
              setOut(`indexed ${vectorChunks.length} chunks`)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">index chunks</button>
          </div>
        </div>
      )}

      {tab === 'Embed' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="vs-embed-text" defaultValue="hello world" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const text = (document.getElementById('vs-embed-text') as HTMLInputElement).value
              const e = v.embed(text)
              setOut(`dim=${e.length}\nfirst 8: [${e.slice(0, 8).map(x => x.toFixed(3)).join(', ')}]`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">embed</button>
            <button onClick={() => {
              const e1 = v.embed('cat')
              const e2 = v.embed('kitten')
              const e3 = v.embed('airplane')
              setOut(`cat↔kitten: ${v.cosine(e1, e2).toFixed(4)}\ncat↔airplane: ${v.cosine(e1, e3).toFixed(4)}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">cosine demo</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(v.stats(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">stats</button>
            <button onClick={() => { v.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see vector search operations'}</pre>
    </div>
  )
}
