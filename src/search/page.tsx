import { useState } from 'react'
import { SearchEngine, getSearchEngine, type SearchDoc, type ScoredDoc, type SearchQuery } from './index'

const seed = (e: SearchEngine): void => {
  if (e.size() > 0) return
  const docs: SearchDoc[] = [
    { id: 'd1', fields: { title: 'Machine Learning Basics', body: 'Introduction to algorithms and models', tags: 'ml,ai,intro' }, tag: 'tech', category: 'ml' },
    { id: 'd2', fields: { title: 'Deep Learning Guide', body: 'Neural networks and backpropagation', tags: 'dl,ai,deep' }, tag: 'tech', category: 'ml' },
    { id: 'd3', fields: { title: 'Cooking Recipes', body: 'Pasta carbonara with eggs and cheese', tags: 'food,recipe' }, tag: 'life', category: 'food' },
    { id: 'd4', fields: { title: 'Advanced ML', body: 'Ensemble methods and gradient boosting', tags: 'ml,advanced' }, tag: 'tech', category: 'ml', boost: 1.5, freshness: 0.9 },
    { id: 'd5', fields: { title: 'Search Engines', body: 'BM25 ranking and vector retrieval', tags: 'search,ir' }, tag: 'tech', category: 'ir' },
  ]
  for (const d of docs) e.addDoc(d)
}

const engine = getSearchEngine()
seed(engine)

type Tab = 'search' | 'index' | 'stats' | 'explain'

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>('search')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Search Engine · v85.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        BM25 + vector hybrid · tokenization (CJK char-level) · filters · rerank · highlights
      </p>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
        {(['search', 'index', 'stats', 'explain'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', border: 'none', background: tab === t ? '#eee' : 'transparent', cursor: 'pointer' }}>{t}</button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        {tab === 'search' && <SearchTab />}
        {tab === 'index' && <IndexTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'explain' && <ExplainTab />}
      </div>
    </div>
  )
}

function SearchTab() {
  const [q, setQ] = useState('machine learning')
  const [tag, setTag] = useState('')
  const [results, setResults] = useState<ScoredDoc[]>([])

  const doSearch = () => {
    const query: SearchQuery = { text: q, limit: 10 }
    if (tag) query.filters = [{ field: 'tag', op: 'eq', value: tag }]
    setResults(engine.search(query))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <input value={tag} onChange={e => setTag(e.target.value)} placeholder="tag filter" style={{ padding: 8 }} />
        <button onClick={doSearch} style={{ padding: '8px 16px' }}>Search</button>
      </div>
      <ul style={{ marginTop: 12, listStyle: 'none', padding: 0 }}>
        {results.map(r => (
          <li key={r.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <strong>{r.id}</strong> — score {r.score.toFixed(3)} (bm25 {r.bm25.toFixed(3)}, vec {r.vector.toFixed(3)})
            {r.highlights.length > 0 && <div style={{ color: '#888', fontSize: 12 }}>highlights: {r.highlights.join(' ')}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function IndexTab() {
  const [id, setId] = useState('nx')
  const [title, setTitle] = useState('New Doc')
  const [body, setBody] = useState('New body text')
  const [tag, setTag] = useState('tech')
  const add = () => {
    engine.addDoc({ id, fields: { title, body }, tag })
    setId(''); setTitle(''); setBody('')
  }
  return (
    <div>
      <h3>Add Document</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={id} onChange={e => setId(e.target.value)} placeholder="id" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="title" />
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="body" />
        <input value={tag} onChange={e => setTag(e.target.value)} placeholder="tag" />
        <button onClick={add}>Add</button>
      </div>
    </div>
  )
}

function StatsTab() {
  return (
    <div>
      <p>Total docs: <strong>{engine.size()}</strong></p>
      <p>Config: bm25K1={engine.config.bm25K1}, bm25B={engine.config.bm25B}, vectorWeight={engine.config.vectorWeight}</p>
    </div>
  )
}

function ExplainTab() {
  const [docId, setDocId] = useState('d1')
  const [q, setQ] = useState('machine')
  const [out, setOut] = useState<unknown>(null)
  const run = () => setOut(engine.explain({ text: q }, docId))
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={docId} onChange={e => setDocId(e.target.value)} placeholder="doc id" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="query" />
        <button onClick={run}>Explain</button>
      </div>
      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 12 }}>{out ? JSON.stringify(out, null, 2) : ''}</pre>
    </div>
  )
}
