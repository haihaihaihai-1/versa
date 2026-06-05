import { useState, useEffect } from 'react'
import { LockManager, InMemoryLockStore, ResourceQueue } from './index'

export default function DistlockPage() {
  const [tab, setTab] = useState<'demo' | 'cluster' | 'queue' | 'health'>('demo')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Distributed Lock · v36.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Redlock-style · fencing tokens · auto-renewal · resource queue · health checks
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'demo' && <DemoTab />}
        {tab === 'cluster' && <ClusterTab />}
        {tab === 'queue' && <QueueTab />}
        {tab === 'health' && <HealthTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['demo', 'Demo'], ['cluster', 'Cluster'],
    ['queue', 'Resource Queue'], ['health', 'Health'],
  ]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd' }}>
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

function DemoTab() {
  const [log, setLog] = useState<string[]>([])
  const [held, setHeld] = useState(0)
  const [mgr] = useState(() => new LockManager([new InMemoryLockStore('demo')]))

  const acquire = async () => {
    const t0 = Date.now()
    const lock = await mgr.acquire('demo-key', 'owner-a', { ttlMs: 3000 })
    if (!lock) { setLog(L => [...L, `[${Date.now() - t0}ms] FAILED to acquire`]); return }
    setHeld(mgr.getHeld().length)
    setLog(L => [...L, `[${Date.now() - t0}ms] ACQUIRE fencing=${lock.fencingToken} expires=${new Date(lock.expiresAt).toISOString().slice(11, 19)}`])
    setTimeout(async () => {
      await mgr.release(lock)
      setHeld(mgr.getHeld().length)
      setLog(L => [...L, `[${Date.now() - t0}ms] RELEASED fencing=${lock.fencingToken}`])
    }, 2000)
  }

  return (
    <div>
      <Card title="Single-Store Demo">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          <Stat label="Held" value={held} />
          <Stat label="Stores" value={1} color="#9c27b0" />
          <Stat label="Quorum" value={1} color="#2e7d32" />
        </div>
        <button onClick={acquire} style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Acquire demo-key (2s hold)</button>
        <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12, maxHeight: 200, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </Card>
    </div>
  )
}

function ClusterTab() {
  const [stores, setStores] = useState<InMemoryLockStore[]>([
    new InMemoryLockStore('redis-1'),
    new InMemoryLockStore('redis-2'),
    new InMemoryLockStore('redis-3'),
  ])
  const [mgr] = useState(() => new LockManager(stores))
  const [acquireLog, setAcquireLog] = useState<string[]>([])

  const toggleHealthy = (s: InMemoryLockStore) => {
    s.setHealthy(!((s as any).healthy ?? true))
    setAcquireLog(L => [...L, `toggled ${s.name} healthy=${(s as any).healthy}`])
  }
  const setFailure = (s: InMemoryLockStore, rate: number) => {
    s.setFailureRate(rate / 100)
    setAcquireLog(L => [...L, `${s.name} failure rate=${rate}%`])
  }

  const acquireCluster = async () => {
    const lock = await mgr.acquire('shared-resource', 'worker-1', { ttlMs: 5000, autoRenew: false })
    if (!lock) { setAcquireLog(L => [...L, 'ACQUIRE FAILED (no quorum)']); return }
    setAcquireLog(L => [...L, `ACQUIRE OK fencing=${lock.fencingToken} token=${lock.token.slice(-6)}`])
    setTimeout(() => { void mgr.release(lock) }, 1000)
  }

  return (
    <div>
      <Card title="3-Node Cluster (Redlock)">
        <table style={{ width: '100%', fontSize: 12, marginBottom: 12 }}>
          <thead><tr><th>Store</th><th>Healthy</th><th>Failure %</th><th>Locks Held</th><th>Actions</th></tr></thead>
          <tbody>
            {stores.map(s => (
              <tr key={s.name}>
                <td><strong>{s.name}</strong></td>
                <td>✅</td>
                <td>0%</td>
                <td>{s.size()}</td>
                <td>
                  <button onClick={() => toggleHealthy(s)} style={btnSmall}>Toggle Health</button>
                  <button onClick={() => setFailure(s, 50)} style={btnSmall}>50% fail</button>
                  <button onClick={() => setFailure(s, 0)} style={btnSmall}>reset</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={acquireCluster} style={btnPrimary}>Acquire shared-resource</button>
        <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12, maxHeight: 150, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
          {acquireLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </Card>
    </div>
  )
}

function QueueTab() {
  const [mgr] = useState(() => new LockManager([new InMemoryLockStore('q1')]))
  const [queue] = useState(() => new ResourceQueue<number>(mgr, n => `res-${n % 3}`))
  const [log, setLog] = useState<string[]>([])

  const enqueueBatch = async () => {
    setLog([])
    const tasks: Promise<void>[] = []
    for (let i = 0; i < 9; i++) {
      tasks.push(queue.enqueue(i, 'worker', async (item) => {
        const k = `res-${item % 3}`
        setLog(L => [...L, `start item=${item} (key=${k})`])
        await new Promise(r => setTimeout(r, 300))
        setLog(L => [...L, `end item=${item}`])
      }, { ttlMs: 5000, waitMs: 5000 }))
    }
    await Promise.all(tasks)
  }

  return (
    <Card title="Resource Queue (3 keys, 9 items)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <Stat label="Pending" value={queue.size()} color="#f57c00" />
        <Stat label="Active" value={queue.activeCount()} color="#2e7d32" />
        <Stat label="Total Processed" value={log.filter(l => l.startsWith('end')).length} color="#1976d2" />
      </div>
      <button onClick={enqueueBatch} style={btnPrimary}>Enqueue 9 items (key = item % 3)</button>
      <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11, maxHeight: 250, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function HealthTab() {
  const [mgr] = useState(() => new LockManager([
    new InMemoryLockStore('h1'),
    new InMemoryLockStore('h2'),
    new InMemoryLockStore('h3'),
  ]))
  const [health, setHealth] = useState<{ store: string; healthy: boolean }[]>([])

  const check = async () => {
    const h = await mgr.healthCheck()
    setHealth(h)
  }
  useEffect(() => { void check() }, [])

  return (
    <Card title="Store Health">
      <button onClick={check} style={btnPrimary}>Check Health</button>
      <table style={{ width: '100%', fontSize: 12, marginTop: 12 }}>
        <thead><tr><th>Store</th><th>Status</th></tr></thead>
        <tbody>
          {health.map(h => (
            <tr key={h.store}>
              <td><code>{h.store}</code></td>
              <td>{h.healthy ? '✅ healthy' : '❌ down'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4 }
