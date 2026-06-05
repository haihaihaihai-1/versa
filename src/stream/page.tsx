import { useState, useEffect, useMemo } from 'react'
import { StreamEngine, type StreamMessage } from './index'

const engine = new StreamEngine()
let inited = false
function ensure() {
  if (inited) return
  if (!engine.topicExists('events')) {
    engine.createTopic({ name: 'events', partitions: 3, cleanupPolicy: 'delete', maxMessagesPerPartition: 50 })
  }
  if (engine.endOffset('events', 0) === 0 && engine.endOffset('events', 1) === 0 && engine.endOffset('events', 2) === 0) {
    const users = ['alice', 'bob', 'carol', 'dave', 'eve']
    const events = ['login', 'click', 'purchase', 'logout', 'signup']
    for (let i = 0; i < 12; i++) {
      engine.produce('events', users[i % users.length]!, { event: events[i % events.length]!, ts: Date.now() }, { 'content-type': 'json' })
    }
  }
  inited = true
}

export default function StreamPage() {
  const [tab, setTab] = useState<'topics' | 'produce' | 'consume' | 'groups' | 'window' | 'metrics'>('topics')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Stream Processing · v38.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Kafka-like topics · partitions · consumer groups · offset commit · windowing
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'topics' && <TopicsTab />}
        {tab === 'produce' && <ProduceTab />}
        {tab === 'consume' && <ConsumeTab />}
        {tab === 'groups' && <GroupsTab />}
        {tab === 'window' && <WindowTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['topics', 'Topics'], ['produce', 'Produce'], ['consume', 'Consume'],
    ['groups', 'Consumer Groups'], ['window', 'Windowing'], ['metrics', 'Metrics'],
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

function TopicsTab() {
  useEffect(() => { ensure() }, [])
  const [name, setName] = useState('new-topic')
  const [partitions, setPartitions] = useState(2)
  const [topics, setTopics] = useState(engine.listTopics())

  const create = () => {
    try { engine.createTopic({ name, partitions, cleanupPolicy: 'delete' }); setTopics(engine.listTopics()) }
    catch (e) { alert((e as Error).message) }
  }
  const del = (n: string) => { try { engine.deleteTopic(n); setTopics(engine.listTopics()) } catch (e) { alert((e as Error).message) } }

  return (
    <Card title="Topics">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 12 }}>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input type="number" min="1" max="32" value={partitions} onChange={e => setPartitions(+e.target.value)} style={inputStyle} />
        <button onClick={create} style={btnPrimary}>Create</button>
      </div>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Name</th><th>Partitions</th><th>Policy</th><th>Max/Partition</th><th>Total Messages</th><th>Actions</th></tr></thead>
        <tbody>
          {topics.map(t => {
            let total = 0
            for (let p = 0; p < t.partitions; p++) total += engine.endOffset(t.name, p)
            return (
              <tr key={t.name}>
                <td><strong>{t.name}</strong></td>
                <td>{t.partitions}</td>
                <td>{t.cleanupPolicy}</td>
                <td>{t.maxMessagesPerPartition ?? '∞'}</td>
                <td>{total}</td>
                <td><button onClick={() => del(t.name)} style={btnSmall}>×</button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function ProduceTab() {
  useEffect(() => { ensure() }, [])
  const [topic, setTopic] = useState('events')
  const [key, setKey] = useState('user-1')
  const [value, setValue] = useState('{"event":"click"}')
  const [log, setLog] = useState<string[]>([])

  const send = () => {
    try {
      let v: unknown = value
      try { v = JSON.parse(value) } catch {}
      const m = engine.produce(topic, key || null, v, { 'producer': 'ui' })
      setLog(L => [...L, `→ ${m.topic}-p${m.partition}@${m.offset} key=${m.key}`])
    } catch (e) { alert((e as Error).message) }
  }

  return (
    <Card title="Produce">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <label>Topic <select value={topic} onChange={e => setTopic(e.target.value)} style={inputStyle}>{engine.listTopics().map(t => <option key={t.name}>{t.name}</option>)}</select></label>
        <label>Key <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
        <div></div>
        <label style={{ gridColumn: '1 / -1' }}>Value (JSON or text)
          <textarea value={value} onChange={e => setValue(e.target.value)} rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </label>
      </div>
      <button onClick={send} style={btnPrimary}>Send</button>
      <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11, maxHeight: 200, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function ConsumeTab() {
  useEffect(() => { ensure() }, [])
  const [topic, setTopic] = useState('events')
  const [partition, setPartition] = useState(0)
  const [offset, setOffset] = useState(0)
  const [max, setMax] = useState(10)
  const [msgs, setMsgs] = useState<StreamMessage[]>([])

  const fetch = () => {
    try { setMsgs(engine.fetch(topic, partition, offset, max)) }
    catch (e) { alert((e as Error).message) }
  }
  useEffect(() => { fetch() }, [topic, partition, offset])

  return (
    <Card title="Consume">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <label>Topic <select value={topic} onChange={e => setTopic(e.target.value)} style={inputStyle}>{engine.listTopics().map(t => <option key={t.name}>{t.name}</option>)}</select></label>
        <label>Partition <input type="number" min="0" value={partition} onChange={e => setPartition(+e.target.value)} style={inputStyle} /></label>
        <label>Offset <input type="number" min="0" value={offset} onChange={e => setOffset(+e.target.value)} style={inputStyle} /></label>
        <label>Max <input type="number" min="1" max="100" value={max} onChange={e => setMax(+e.target.value)} style={inputStyle} /></label>
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>End offset: {engine.endOffset(topic, partition)}</div>
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>Offset</th><th>Key</th><th>Value</th><th>Timestamp</th></tr></thead>
        <tbody>
          {msgs.map(m => (
            <tr key={m.offset}>
              <td>{m.offset}</td>
              <td><code>{m.key ?? '∅'}</code></td>
              <td><code style={{ wordBreak: 'break-all' }}>{JSON.stringify(m.value)}</code></td>
              <td>{new Date(m.timestamp).toISOString().slice(11, 19)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function GroupsTab() {
  useEffect(() => { ensure() }, [])
  const [groupId, setGroupId] = useState('analytics')
  const [topic, setTopic] = useState('events')
  const [membersText, setMembersText] = useState('worker-1,worker-2,worker-3')
  const [group, setGroup] = useState<any>(null)
  const [log, setLog] = useState<string[]>([])

  const create = () => {
    const members = membersText.split(',').map(s => s.trim()).filter(Boolean)
    try { setGroup(engine.createGroup(groupId, topic, members)); setLog(L => [...L, `created group ${groupId}`]) }
    catch (e) { alert((e as Error).message) }
  }

  const heartbeat = (m: string) => {
    try { engine.heartbeat(groupId, topic, m); setLog(L => [...L, `${m} heartbeat`]) }
    catch (e) { alert((e as Error).message) }
  }

  const leave = (m: string) => {
    engine.leaveGroup(groupId, topic, m)
    setGroup(engine.getGroup(groupId, topic))
    setLog(L => [...L, `${m} left (now ${engine.getGroup(groupId, topic)?.members.size ?? 0} members)`])
  }

  const join = (m: string) => {
    try {
      const assigned = engine.joinGroup(groupId, topic, m)
      setGroup(engine.getGroup(groupId, topic))
      setLog(L => [...L, `${m} joined → partitions [${assigned.join(',')}]`])
    } catch (e) { alert((e as Error).message) }
  }

  const commit = (partition: number) => {
    const offset = engine.endOffset(topic, partition)
    engine.commitOffset(groupId, topic, partition, offset)
    setLog(L => [...L, `committed ${topic}-${partition}@${offset}`])
  }

  return (
    <Card title="Consumer Group">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8, marginBottom: 8 }}>
        <input value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="group id" style={inputStyle} />
        <select value={topic} onChange={e => setTopic(e.target.value)} style={inputStyle}>{engine.listTopics().map(t => <option key={t.name}>{t.name}</option>)}</select>
        <input value={membersText} onChange={e => setMembersText(e.target.value)} placeholder="members (comma)" style={inputStyle} />
        <button onClick={create} style={btnPrimary}>Create</button>
      </div>
      {group && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => { const m = prompt('member?'); if (m) join(m) }} style={btnSmall}>+ Join</button>
            {group.members && [...group.members.keys()].map((m: string) => (
              <span key={m} style={{ padding: '2px 8px', background: '#fff', borderRadius: 4, fontSize: 11, display: 'inline-flex', gap: 4 }}>
                <code>{m}</code>
                <button onClick={() => heartbeat(m)} style={btnSmall}>♥</button>
                <button onClick={() => leave(m)} style={btnSmall}>×</button>
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12 }}>Generation: <strong>{group.generation}</strong> · Leader: <code>{group.leader}</code></div>
          <table style={{ width: '100%', fontSize: 11, marginTop: 8 }}>
            <thead><tr><th>Member</th><th>Assigned Partitions</th><th>Action</th></tr></thead>
            <tbody>
              {group.members && [...group.members.entries()].map(([m, info]: any) => (
                <tr key={m}>
                  <td><code>{m}</code></td>
                  <td>[{info.assignedPartitions.join(', ')}]</td>
                  <td>
                    {info.assignedPartitions.map((p: number) => (
                      <button key={p} onClick={() => commit(p)} style={btnSmall}>commit p{p}</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, maxHeight: 120, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function WindowTab() {
  useEffect(() => { ensure() }, [])
  const [topic] = useState('events')
  const [partition] = useState(0)
  const [windowMs, setWindowMs] = useState(10_000)

  const windows = useMemo(() => {
    return engine.window(topic, partition, windowMs, nums => ({
      sum: nums.reduce((a, b) => a + b, 0),
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    }))
  }, [windowMs, topic, partition])

  return (
    <Card title={`Window Aggregation (window=${windowMs}ms)`}>
      <label>Window Size (ms) <input type="number" min="1000" value={windowMs} onChange={e => setWindowMs(+e.target.value)} style={inputStyle} /></label>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Note: demo data is timestamped at the same moment. Try producing new messages with different delays.</div>
      <table style={{ width: '100%', fontSize: 11, marginTop: 8 }}>
        <thead><tr><th>Window</th><th>Count</th><th>Sum</th><th>Avg</th><th>Min</th><th>Max</th></tr></thead>
        <tbody>
          {windows.map((w: any, i: number) => (
            <tr key={i}>
              <td>{new Date(w.start).toISOString().slice(11, 19)} → {new Date(w.end).toISOString().slice(11, 19)}</td>
              <td>{w.count}</td>
              <td>{w.sum.toFixed(2)}</td>
              <td>{w.avg.toFixed(2)}</td>
              <td>{w.min}</td>
              <td>{w.max}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MetricsTab() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const m = engine.getMetrics()
  const totalMessages = engine.listTopics().reduce((s, t) => {
    let total = 0
    for (let p = 0; p < t.partitions; p++) total += engine.endOffset(t.name, p)
    return s + total
  }, 0)
  return (
    <Card title="Engine Metrics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <Stat label="Produced" value={m.produced} color="#2e7d32" />
        <Stat label="Consumed" value={m.consumed} color="#1976d2" />
        <Stat label="Rebalances" value={m.rebalances} color="#9c27b0" />
        <Stat label="Commits" value={m.commits} color="#f57c00" />
        <Stat label="Total Messages" value={totalMessages} color="#d32f2f" />
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4 }
