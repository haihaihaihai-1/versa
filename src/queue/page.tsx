import { useState, useEffect } from 'react'
import {
  queues,
  jobRegistry,
  type Job,
  type JobStatus,
  type QueueMetrics,
} from './index'

export default function QueuePage() {
  const [tab, setTab] = useState<'enqueue' | 'jobs' | 'workers' | 'dlq' | 'events' | 'metrics' | 'handlers'>('enqueue')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t) }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Job Queue / Background Tasks · v32.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        BullMQ-style · priority · delay · retry · rate limit · stuck detection · DLQ · events
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'enqueue' && <EnqueueTab tick={tick} />}
        {tab === 'jobs' && <JobsTab tick={tick} />}
        {tab === 'workers' && <WorkersTab tick={tick} />}
        {tab === 'dlq' && <DlqTab tick={tick} />}
        {tab === 'events' && <EventsTab tick={tick} />}
        {tab === 'metrics' && <MetricsTab tick={tick} />}
        {tab === 'handlers' && <HandlersTab tick={tick} />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['enqueue', 'Enqueue'], ['jobs', 'Jobs'], ['workers', 'Workers'],
    ['dlq', 'DLQ'], ['events', 'Events'], ['metrics', 'Metrics'], ['handlers', 'Handlers'],
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

function ensureDemoHandlers() {
  if (jobRegistry.list('demo').length === 0) {
    jobRegistry.register('demo', 'echo', async (j) => {
      await new Promise(r => setTimeout(r, 200))
      return j.data
    })
    jobRegistry.register('demo', 'fail', async () => { throw new Error('intentional fail') })
    jobRegistry.register('demo', 'slow', async (j, update) => {
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 100))
        update(i)
      }
      return 'done'
    })
  }
  if (!queues.get('demo')) {
    const q = queues.create('demo')
    q.registerWorker('worker-1', 2)
  }
}

function EnqueueTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('echo')
  const [data, setData] = useState('{"x": 42}')
  const [priority, setPriority] = useState(5)
  const [attempts, setAttempts] = useState(3)
  const [delay, setDelay] = useState(0)
  const [last, setLast] = useState<{ id: string; status: string } | null>(null)

  useEffect(() => { ensureDemoHandlers() }, [])

  const enq = () => {
    let parsed: unknown
    try { parsed = JSON.parse(data) } catch { setLast({ id: '?', status: 'parse-error' }); return }
    const q = queues.get('demo')!
    const j = q.enqueue(name, parsed, { priority, attempts, delay })
    setLast({ id: j.id, status: j.status })
  }

  return (
    <Card title="Enqueue Job">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <label>Name
          <select value={name} onChange={e => setName(e.target.value)} style={inputStyle}>
            <option>echo</option><option>fail</option><option>slow</option>
          </select>
        </label>
        <label>Priority <input type="number" value={priority} onChange={e => setPriority(+e.target.value)} style={inputStyle} /></label>
        <label>Attempts <input type="number" value={attempts} onChange={e => setAttempts(+e.target.value)} style={inputStyle} /></label>
        <label>Delay (ms) <input type="number" value={delay} onChange={e => setDelay(+e.target.value)} style={inputStyle} /></label>
        <label style={{ gridColumn: 'span 2' }}>Data (JSON)
          <input value={data} onChange={e => setData(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </label>
      </div>
      <button onClick={enq} style={btnPrimary}>Enqueue</button>
      {last && <div style={{ marginTop: 8, fontSize: 13 }}>Last: <code>{last.id.slice(-12)}</code> · {last.status}</div>}
    </Card>
  )
}

function JobsTab({ tick }: { tick: number }) {
  void tick
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const [queueName, setQueueName] = useState('demo')
  useEffect(() => { ensureDemoHandlers() }, [])

  const allJobs: Job[] = (() => {
    const q = queues.get(queueName)
    if (!q) return []
    return filter === 'all' ? q.list() : q.list({ status: filter })
  })()

  return (
    <Card title="Jobs">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Queue
          <select value={queueName} onChange={e => setQueueName(e.target.value)} style={inputStyle}>
            {queues.names().map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Status
          <select value={filter} onChange={e => setFilter(e.target.value as any)} style={inputStyle}>
            <option>all</option><option>waiting</option><option>delayed</option>
            <option>delayed_retry</option><option>active</option>
            <option>completed</option><option>failed</option><option>cancelled</option>
          </select>
        </label>
      </div>
      <table style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
        <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Attempts</th><th>Priority</th><th>Created</th><th>Error</th></tr></thead>
        <tbody>
          {allJobs.slice(-50).reverse().map(j => (
            <tr key={j.id}>
              <td><code>{j.id.slice(-10)}</code></td>
              <td>{j.name}</td>
              <td style={{ color: statusColor(j.status) }}>{j.status}</td>
              <td>{j.attemptsMade}/{j.attemptsMax}</td>
              <td>{j.priority}</td>
              <td>{new Date(j.createdAt).toLocaleTimeString()}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.error ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function statusColor(s: JobStatus): string {
  return { completed: '#2e7d32', failed: '#c62828', waiting: '#1976d2', active: '#f57c00', delayed: '#9e9e9e', delayed_retry: '#fbc02d', cancelled: '#616161' }[s]
}

function WorkersTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemoHandlers() }, [])
  return (
    <Card title="Workers">
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead><tr><th>ID</th><th>Queue</th><th>Concurrency</th><th>Active</th><th>Processed</th><th>Failed</th><th>Stop</th></tr></thead>
        <tbody>
          {queues.all().flatMap(q => q.workersList().map(w => ({ q, w }))).map(({ q, w }) => (
            <tr key={w.id}>
              <td>{w.id}</td>
              <td>{q.name}</td>
              <td>{w.concurrency}</td>
              <td>{w.active}</td>
              <td>{w.processed}</td>
              <td>{w.failed}</td>
              <td><button onClick={() => q.workerStop(w.id)} style={btnSecondary}>Stop</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function DlqTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemoHandlers() }, [])
  const dlqs = queues.all().flatMap(q => q.dlqList().map(j => ({ q, j })))
  return (
    <Card title="Dead Letter Queue">
      {dlqs.length === 0 ? <em>Empty</em> : (
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>ID</th><th>Queue</th><th>Name</th><th>Attempts</th><th>Error</th><th>Action</th></tr></thead>
          <tbody>
            {dlqs.map(({ q, j }) => (
              <tr key={j.id}>
                <td><code>{j.id.slice(-10)}</code></td>
                <td>{q.name}</td>
                <td>{j.name}</td>
                <td>{j.attemptsMade}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.error}</td>
                <td>
                  <button onClick={() => q.retry(j.id)} style={btnSecondary}>Retry</button>
                  <button onClick={() => q.remove(j.id)} style={btnSecondary}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function EventsTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemoHandlers() }, [])
  const events = queues.all().flatMap(q => q.events().slice(-10)).sort((a, b) => b.ts - a.ts).slice(0, 50)
  return (
    <Card title="Recent Events">
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Time</th><th>Type</th><th>Queue</th><th>Job ID</th><th>Detail</th></tr></thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i}>
              <td>{new Date(e.ts).toLocaleTimeString()}</td>
              <td style={{ color: e.type === 'failed' ? '#c62828' : '#2e7d32' }}>{e.type}</td>
              <td>{e.queue}</td>
              <td><code>{e.jobId.slice(-10)}</code></td>
              <td>{e.detail ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MetricsTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemoHandlers() }, [])
  const metrics: QueueMetrics[] = queues.all().map(q => q.metrics())
  const totals = metrics.reduce((s, m) => ({
    waiting: s.waiting + m.waiting, active: s.active + m.active,
    completed: s.completed + m.completed, failed: s.failed + m.failed,
  }), { waiting: 0, active: 0, completed: 0, failed: 0 })

  return (
    <div>
      <Card title="Totals">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Stat label="Waiting" value={totals.waiting} color="#1976d2" />
          <Stat label="Active" value={totals.active} color="#f57c00" />
          <Stat label="Completed" value={totals.completed} color="#2e7d32" />
          <Stat label="Failed" value={totals.failed} color="#c62828" />
        </div>
      </Card>
      <Card title="Per-Queue Metrics">
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Queue</th><th>Wait</th><th>Active</th><th>Done</th><th>Fail</th><th>Throughput/min</th><th>Avg(ms)</th><th>Success</th></tr></thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.queue}>
                <td>{m.queue}</td>
                <td>{m.waiting}</td><td>{m.active}</td><td>{m.completed}</td><td>{m.failed}</td>
                <td>{m.throughput}</td>
                <td>{Math.round(m.avgDurationMs)}</td>
                <td>{(m.successRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function HandlersTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemoHandlers() }, [])
  return (
    <Card title="Job Handlers">
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead><tr><th>Queue</th><th>Job</th></tr></thead>
        <tbody>
          {queues.names().map(n => jobRegistry.list(n).map(j => (
            <tr key={`${n}-${j}`}><td>{n}</td><td><code>{j}</code></td></tr>
          )))}
        </tbody>
      </table>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }
const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#666', marginLeft: 4, fontSize: 11, padding: '3px 8px' }
