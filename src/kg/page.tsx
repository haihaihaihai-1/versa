import { useState } from 'react'
import { KnowledgeGraph, getKnowledgeGraph, type EntityId, type RelationId, type Value } from './index'

type Tab = 'view' | 'entities' | 'relations' | 'traverse' | 'query' | 'stats'

const kg = getKnowledgeGraph()

const seed = (k: KnowledgeGraph) => {
  if (k.countEntities() > 0) return
  k.addEntity({ id: 'alice', type: 'person', label: 'Alice', properties: { age: 30, country: 'US' } })
  k.addEntity({ id: 'bob', type: 'person', label: 'Bob', properties: { age: 25, country: 'US' } })
  k.addEntity({ id: 'acme', type: 'company', label: 'ACME', properties: { founded: 1990, country: 'US' } })
  k.addRelation({ id: 'r1', type: 'works_at', from: 'alice', to: 'acme' })
  k.addRelation({ id: 'r2', type: 'works_at', from: 'bob', to: 'acme' })
  k.addRelation({ id: 'r3', type: 'knows', from: 'alice', to: 'bob' })
}

export const KgPage = () => {
  const [tab, setTab] = useState<Tab>('view')
  const [out, setOut] = useState<string>('')
  const log = (x: unknown) => setOut(JSON.stringify(x, null, 2))

  // View state
  const [startId, setStartId] = useState<EntityId>('alice')
  const [relTypeFilter, setRelTypeFilter] = useState<string>('')
  const [pathFrom, setPathFrom] = useState<EntityId>('alice')
  const [pathTo, setPathTo] = useState<EntityId>('bob')

  // Entity form
  const [eId, setEId] = useState('e1')
  const [eType, setEType] = useState('person')
  const [eLabel, setELabel] = useState('Eve')
  const [eProps, setEProps] = useState('role:engineer,age:28')

  // Relation form
  const [rId, setRId] = useState('r1')
  const [rType, setRType] = useState('knows')
  const [rFrom, setRFrom] = useState('alice')
  const [rTo, setRTo] = useState('eve')
  const [rWeight, setRWeight] = useState('1')

  // Query
  const [qType, setQType] = useState('person')
  const [qKey, setQKey] = useState('country')
  const [qOp, setQOp] = useState('eq')
  const [qVal, setQVal] = useState('US')

  const parseProps = (s: string): Record<string, Value> => {
    const out: Record<string, Value> = {}
    for (const part of s.split(',').map(p => p.trim()).filter(Boolean)) {
      const [k, v] = part.split(':')
      if (!k) continue
      const n = Number(v)
      out[k.trim()] = !isNaN(n) && v !== '' ? n : (v ?? '')
    }
    return out
  }

  const runBfs = () => log(kg.bfs(startId, { relType: relTypeFilter || undefined }))

  const runPath = () => log(kg.findPath(pathFrom, pathTo))

  const addEntity = () => {
    try { kg.addEntity({ id: eId, type: eType, label: eLabel, properties: parseProps(eProps) }); log(kg.getEntity(eId)) }
    catch (e) { setOut('Error: ' + (e as Error).message) }
  }

  const addRelation = () => {
    try { kg.addRelation({ id: rId, type: rType, from: rFrom, to: rTo, weight: Number(rWeight) }); log(kg.getRelation(rId as RelationId)) }
    catch (e) { setOut('Error: ' + (e as Error).message) }
  }

  const runQuery = () => {
    let v: Value | Value[] = qVal
    if (qOp === 'gt' || qOp === 'lt') v = Number(qVal)
    if (qOp === 'in') v = qVal.split(',').map(x => x.trim())
    const res = kg.queryEntities({ type: qType, propertyFilters: [{ key: qKey, op: qOp as 'eq' | 'gt' | 'lt' | 'in' | 'contains', value: v }] })
    log(res)
  }

  const runStats = () => log(kg.stats())

  seed(kg)

  return (
    <div className="page" style={{ padding: 16 }}>
      <h2>Knowledge Graph v84.0</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['view', 'entities', 'relations', 'traverse', 'query', 'stats'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} data-active={tab === t} style={{ padding: '4px 12px' }}>{t}</button>
        ))}
      </div>

      {tab === 'view' && (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label>Start: <input value={startId} onChange={e => setStartId(e.target.value)} /></label>
            <label>RelType: <input value={relTypeFilter} onChange={e => setRelTypeFilter(e.target.value)} placeholder="(any)" /></label>
            <button onClick={runBfs}>BFS</button>
            <button onClick={runStats}>Stats</button>
          </div>
        </div>
      )}

      {tab === 'entities' && (
        <div>
          <h3>Add Entity</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label>id: <input value={eId} onChange={e => setEId(e.target.value)} /></label>
            <label>type: <input value={eType} onChange={e => setEType(e.target.value)} /></label>
            <label>label: <input value={eLabel} onChange={e => setELabel(e.target.value)} /></label>
            <label>props: <input value={eProps} onChange={e => setEProps(e.target.value)} placeholder="k:v,k:v" /></label>
            <button onClick={addEntity}>Add</button>
          </div>
        </div>
      )}

      {tab === 'relations' && (
        <div>
          <h3>Add Relation</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label>id: <input value={rId} onChange={e => setRId(e.target.value)} /></label>
            <label>type: <input value={rType} onChange={e => setRType(e.target.value)} /></label>
            <label>from: <input value={rFrom} onChange={e => setRFrom(e.target.value)} /></label>
            <label>to: <input value={rTo} onChange={e => setRTo(e.target.value)} /></label>
            <label>weight: <input value={rWeight} onChange={e => setRWeight(e.target.value)} /></label>
            <button onClick={addRelation}>Add</button>
          </div>
        </div>
      )}

      {tab === 'traverse' && (
        <div>
          <h3>Shortest Path (Dijkstra)</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <label>from: <input value={pathFrom} onChange={e => setPathFrom(e.target.value)} /></label>
            <label>to: <input value={pathTo} onChange={e => setPathTo(e.target.value)} /></label>
            <button onClick={runPath}>Find</button>
          </div>
        </div>
      )}

      {tab === 'query' && (
        <div>
          <h3>Query Entities</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label>type: <input value={qType} onChange={e => setQType(e.target.value)} /></label>
            <label>key: <input value={qKey} onChange={e => setQKey(e.target.value)} /></label>
            <label>op: <select value={qOp} onChange={e => setQOp(e.target.value)}><option>eq</option><option>gt</option><option>lt</option><option>in</option><option>contains</option></select></label>
            <label>value: <input value={qVal} onChange={e => setQVal(e.target.value)} /></label>
            <button onClick={runQuery}>Run</button>
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div>
          <button onClick={runStats}>Get Stats</button>
        </div>
      )}

      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 16, maxHeight: 400, overflow: 'auto' }}>{out}</pre>
    </div>
  )
}
