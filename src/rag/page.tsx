import { useState } from 'react'
import { RagPipeline, getRagPipeline, type RagDoc } from './index'

const seed = (r: RagPipeline) => {
  if (r.size().docs > 0) return
  const docs: RagDoc[] = [
    { id: 'ml1', title: 'Intro to ML', text: 'Machine learning is a subset of artificial intelligence. It focuses on algorithms that learn from data. Neural networks are a popular technique. Deep learning uses multi-layer networks. Supervised learning uses labeled data. Unsupervised learning finds hidden patterns. Reinforcement learning trains agents via rewards.' },
    { id: 'cook', title: 'Cooking 101', text: 'Pasta is made from wheat and eggs. Carbonara uses eggs, cheese, and guanciale. Boil the pasta in salted water. Italian cuisine emphasizes fresh ingredients.' },
    { id: 'travel', title: 'Travel Guide', text: 'Paris is the capital of France. The Eiffel Tower is its most famous landmark. Visit the Louvre for art. The Seine river runs through the city. French cuisine is renowned worldwide.' },
  ]
  for (const d of docs) r.addDoc(d)
}

const rag = getRagPipeline()
seed(rag)

type Tab = 'query' | 'docs' | 'eval' | 'stats'

export const RagPage = () => {
  const [tab, setTab] = useState<Tab>('query')
  const [out, setOut] = useState<string>('')

  return (
    <div style={{ padding: 24 }}>
      <h2>RAG Pipeline v86.0</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['query', 'docs', 'eval', 'stats'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} data-active={tab === t} style={{ padding: '4px 12px' }}>{t}</button>
        ))}
      </div>
      {tab === 'query' && <QueryTab setOut={setOut} />}
      {tab === 'docs' && <DocsTab setOut={setOut} />}
      {tab === 'eval' && <EvalTab setOut={setOut} />}
      {tab === 'stats' && <StatsTab setOut={setOut} />}
      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 16, maxHeight: 400, overflow: 'auto' }}>{out}</pre>
    </div>
  )
}

const QueryTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const [q, setQ] = useState('How does machine learning work?')
  const run = () => {
    const r = rag.query(q)
    setOut(JSON.stringify({ answer: r.answer, citations: r.citations, totalTokens: r.totalTokens }, null, 2))
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <button onClick={run} style={{ padding: '8px 16px' }}>Query</button>
      </div>
    </div>
  )
}

const DocsTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const [id, setId] = useState('doc-x')
  const [title, setTitle] = useState('Custom Doc')
  const [text, setText] = useState('This is a sample text. It has multiple sentences. Use it to test chunking.')
  const add = () => {
    const chunks = rag.addDoc({ id, title, text })
    setOut(`Added ${chunks.length} chunks for doc "${title}"`)
  }
  return (
    <div>
      <h3>Add Document</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={id} onChange={e => setId(e.target.value)} placeholder="id" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="title" />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={4} style={{ width: '100%', marginTop: 8, padding: 8 }} />
      <button onClick={add} style={{ marginTop: 8, padding: '8px 16px' }}>Add</button>
    </div>
  )
}

const EvalTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const [q, setQ] = useState('neural networks')
  const [kws, setKws] = useState('neural,learning,deep')
  const run = () => {
    const r = rag.evaluate(q, kws.split(',').map(x => x.trim()).filter(Boolean))
    setOut(JSON.stringify(r, null, 2))
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="query" />
        <input value={kws} onChange={e => setKws(e.target.value)} placeholder="keywords" style={{ flex: 1 }} />
        <button onClick={run}>Evaluate</button>
      </div>
    </div>
  )
}

const StatsTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const run = () => setOut(JSON.stringify({ ...rag.size(), config: rag.config }, null, 2))
  return <button onClick={run}>Get Stats</button>
}
