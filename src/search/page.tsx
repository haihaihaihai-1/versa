import { useState, useEffect, useMemo } from 'react'
import { SearchEngine, type Document, type SearchHit, type SearchOptions } from './index'

const engine = new SearchEngine({ fields: ['title', 'body'], fieldBoosts: { title: 3, body: 1 }, enableFuzzy: true, fuzzyDistance: 1 })
let inited = false

function ensure() {
  if (inited) return
  const sampleDocs: Document[] = [
    { id: '1', fields: { title: 'JavaScript Tutorial', body: 'Learn JavaScript basics including variables, functions, and async programming' }, tags: ['js', 'tutorial'] },
    { id: '2', fields: { title: 'TypeScript Handbook', body: 'Master TypeScript types, interfaces, generics, and advanced patterns' }, tags: ['ts'] },
    { id: '3', fields: { title: 'React vs Vue', body: 'Comparing React and Vue frameworks for building modern user interfaces' }, tags: ['frontend'] },
    { id: '4', fields: { title: 'Node.js Guide', body: 'Building scalable server-side applications with Node.js and Express' }, tags: ['node'] },
    { id: '5', fields: { title: 'Python for Data Science', body: 'Using Python with pandas, numpy, and scikit-learn for data analysis' }, tags: ['python', 'data'] },
    { id: '6', fields: { title: 'Rust Programming', body: 'Memory-safe systems programming with Rust ownership model' }, tags: ['rust'] },
    { id: '7', fields: { title: 'Go Web Services', body: 'Building fast web services and microservices in Go' }, tags: ['go'] },
    { id: '8', fields: { title: 'Docker and Containers', body: 'Containerization with Docker, Kubernetes, and cloud-native deployments' }, tags: ['devops'] },
    { id: '9', fields: { title: 'PostgreSQL Deep Dive', body: 'Advanced PostgreSQL features, indexing, and query optimization' }, tags: ['db'] },
    { id: '10', fields: { title: 'GraphQL APIs', body: 'Building flexible APIs with GraphQL schema and resolvers' }, tags: ['api'] },
  ]
  engine.indexBatch(sampleDocs)
  inited = true
}

export default function SearchPage() {
  const [tab, setTab] = useState<'search' | 'index' | 'stats' | 'parser'>('search')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Search Engine · v41.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Inverted index · BM25 ranking · fuzzy match · boolean query · field boosts · highlights
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'search' && <SearchTab />}
        {tab === 'index' && <IndexTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'parser' && <ParserTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['search', 'Search'], ['index', 'Index'], ['stats', 'Stats'], ['parser', 'Query Parser'],
  ]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: '8px 14px', border: 'none', background: 'transparent',
          borderBottom: current === k ? '2px solid #1976d2' : '2px solid transparent',
          color: current === k ? '#1976d2' : '#444', fontWeight: current === k ? 600 : 400, cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fafafa' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value, color = '#1976d2' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function SearchTab() {
  useEffect(() => { ensure() }, [])
  const [query, setQuery] = useState('python tutorial')
  const [operator, setOperator] = useState<'and' | 'or'>('or')
  const [fuzzy, setFuzzy] = useState(true)
  const [limit, setLimit] = useState(10)
  const [tagFilter, setTagFilter] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])

  const doSearch = () => {
    const opts: SearchOptions = { query, operator, fuzzy, limit, highlight: { pre: '<mark>', post: '</mark>' } }
    if (tagFilter) opts.filter = [{ field: 'tags', value: tagFilter }]
    setHits(engine.search(opts))
  }
  useEffect(() => { doSearch() }, [query, operator, fuzzy, limit, tagFilter])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const d of engine.listDocs()) for (const t of d.tags ?? []) s.add(t)
    return [...s].sort()
  }, [hits])

  return (
    <div>
      <Card title="Query">
        <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1fr 1fr', gap: 8 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search..." style={inputStyle} />
          <select value={operator} onChange={e => setOperator(e.target.value as any)} style={inputStyle}>
            <option value="or">OR</option><option value="and">AND</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={fuzzy} onChange={e => setFuzzy(e.target.checked)} /> Fuzzy</label>
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={inputStyle}>
            <option value="">(any tag)</option>
            {allTags.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Limit: {limit}</div>
      </Card>
      <Card title={`Results (${hits.length})`}>
        {hits.map(h => {
          const doc = engine.getDoc(h.id)!
          return (
            <div key={h.id} style={{ padding: 12, borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>📄 {doc.fields.title}</strong>
                <span style={{ color: '#666', fontSize: 12 }}>score: {h.score.toFixed(3)}</span>
              </div>
              {Object.entries(h.highlights).map(([field, frags]) => (
                <div key={field} style={{ fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: '#666' }}>{field}:</span>{' '}
                  {frags.map((f, i) => <span key={i} style={{ marginRight: 8 }} dangerouslySetInnerHTML={{ __html: f }} />)}
                </div>
              ))}
              <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>matched: {h.matchedTerms.join(', ')} · tags: {(doc.tags ?? []).join(', ')}</div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

function IndexTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  const [id, setId] = useState('new-doc')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const docs = engine.listDocs()

  const add = () => {
    try { engine.index({ id, fields: { title, body } }); setId(`new-${Date.now()}`); setTitle(''); setBody(''); setTick(t => t + 1) }
    catch (e) { alert((e as Error).message) }
  }
  const del = (d: string) => { engine.remove(d); setTick(t => t + 1) }

  return (
    <div>
      <Card title="Add Document">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr auto', gap: 8 }}>
          <input value={id} onChange={e => setId(e.target.value)} placeholder="id" style={inputStyle} />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="title" style={inputStyle} />
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="body" style={inputStyle} />
          <button onClick={add} style={btnPrimary}>+ Index</button>
        </div>
      </Card>
      <Card title={`Indexed Documents (${docs.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>ID</th><th>Title</th><th>Tags</th><th>Actions</th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td><code>{d.id}</code></td>
                <td>{d.fields.title}</td>
                <td>{(d.tags ?? []).join(', ')}</td>
                <td><button onClick={() => del(d.id)} style={btnSmall}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function StatsTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const st = engine.stats()
  const m = engine.getMetrics()
  // sample terms
  const sampleTerms = ['python', 'javascript', 'web', 'docker', 'api'].filter(t => engine.hasTerm(t))
  return (
    <div>
      <Card title="Index Stats">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Stat label="Total Docs" value={st.totalDocs} color="#1976d2" />
          <Stat label="Total Terms" value={st.totalTerms} color="#2e7d32" />
          <Stat label="Avg Doc Length" value={st.avgDocLength.toFixed(1)} color="#9c27b0" />
          <Stat label="Postings" value={st.indexSize} color="#f57c00" />
        </div>
      </Card>
      <Card title="Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Stat label="Searches" value={m.searches} color="#1976d2" />
          <Stat label="Indexed" value={m.indexed} color="#2e7d32" />
          <Stat label="Removed" value={m.removed} color="#d32f2f" />
        </div>
      </Card>
      <Card title="Sample Term Postings">
        {sampleTerms.map(t => {
          const p = engine.getPostings(t)
          return (
            <div key={t} style={{ fontSize: 12, marginBottom: 8 }}>
              <code>{t}</code> → {p.length} postings across {new Set(p.map(x => x.docId)).size} docs
            </div>
          )
        })}
      </Card>
    </div>
  )
}

function ParserTab() {
  useEffect(() => { ensure() }, [])
  const [q, setQ] = useState('+python -beginner "data science"')
  const parsed = engine.parseQuery(q)
  const hits = engine.searchWithParsed({ query: q, parsed, highlight: { pre: '<mark>', post: '</mark>' }, limit: 5 })

  return (
    <div>
      <Card title="Parsed Query">
        <input value={q} onChange={e => setQ(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12 }}>
          <div><strong>Must (+):</strong> {parsed.must.join(', ') || '—'}</div>
          <div><strong>Must Not (-):</strong> {parsed.mustNot.join(', ') || '—'}</div>
          <div><strong>Should:</strong> {parsed.should.join(', ') || '—'}</div>
          <div><strong>Phrases:</strong> {parsed.phrases.map(p => `"${p}"`).join(', ') || '—'}</div>
        </div>
      </Card>
      <Card title="Results">
        {hits.map(h => {
          const doc = engine.getDoc(h.id)!
          return (
            <div key={h.id} style={{ padding: 8, borderBottom: '1px solid #e0e0e0', fontSize: 12 }}>
              <strong>{doc.fields.title}</strong> — score: {h.score.toFixed(2)}
              {Object.values(h.highlights).flat().map((f, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: f }} />
              ))}
            </div>
          )
        })}
      </Card>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4 }
