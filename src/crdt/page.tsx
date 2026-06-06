import { useState } from 'react'
import { CrdtManager, GCounter, PNCounter, GSet, ORSet, LWWRegister, RgaText, CrdtMap } from './index'

const m1 = new CrdtManager('r1')
const m2 = new CrdtManager('r2')
m1.createDoc('doc1', 'Shared Doc')
m2.createDoc('doc1', 'Shared Doc')

export default function CrdtPage() {
  const [tab, setTab] = useState<'overview' | 'doc' | 'sync' | 'peers' | 'metrics'>('overview')
  const [text, setText] = useState('Hello')
  const [pos, setPos] = useState(text.length)
  const [char, setChar] = useState('!')
  const [peer, setPeer] = useState('alice')
  const [peers, setPeers] = useState<{ id: string; name: string; online: boolean; cursor?: { docId: string; position: number } }[]>([])
  const [metrics, setMetrics] = useState(m1.getMetrics())
  const [doc1Text, setDoc1Text] = useState(m1.getText('doc1'))
  const [doc2Text, setDoc2Text] = useState(m2.getText('doc1'))

  const handleInsert = () => {
    m1.textInsert('doc1', pos, char)
    setDoc1Text(m1.getText('doc1'))
    setMetrics(m1.getMetrics())
  }
  const handleDelete = () => {
    m1.textDelete('doc1', Math.max(0, pos - 1))
    setDoc1Text(m1.getText('doc1'))
    setMetrics(m1.getMetrics())
  }
  const handleSetText = () => {
    const doc = m1.getDoc('doc1')!
    doc.text = new RgaText('r1')
    for (let i = 0; i < text.length; i++) m1.textInsert('doc1', i, text[i]!)
    setDoc1Text(m1.getText('doc1'))
    setMetrics(m1.getMetrics())
  }
  const handleSync = () => {
    m1.sync(m2, 'doc1')
    setDoc2Text(m2.getText('doc1'))
    setMetrics(m1.getMetrics())
  }
  const handleReverse = () => {
    m2.sync(m1, 'doc1')
    setDoc1Text(m1.getText('doc1'))
    setMetrics(m1.getMetrics())
  }
  const handleAddPeer = () => {
    m1.registerPeer({ id: peer, name: peer, online: true, lastSeen: Date.now() })
    setPeers(m1.listPeers())
    setMetrics(m1.getMetrics())
  }
  const handleTogglePeer = (id: string) => {
    const p = m1.listPeers().find(p => p.id === id)
    if (p) m1.setPeerOnline(id, !p.online)
    setPeers(m1.listPeers())
  }
  const handleCursor = () => {
    m1.setCursor(peer, 'doc1', pos)
    setPeers(m1.listPeers())
  }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'doc', label: '文档' },
    { id: 'sync', label: '同步' },
    { id: 'peers', label: 'Peers' },
    { id: 'metrics', label: '指标' }
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">CRDT 协作</h1>
      <p className="text-gray-500 mb-4">G-Counter / PN-Counter / G-Set / 2P-Set / OR-Set / LWW-Reg / MV-Reg / RGA 文本</p>

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 whitespace-nowrap ${tab === t.id ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'doc' && (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border">
              <h3 className="font-bold mb-2">Replica 1 (r1)</h3>
              <div className="font-mono text-2xl mb-2 min-h-12 p-2 bg-white rounded border">{doc1Text || '(empty)'}</div>
              <div className="text-xs text-gray-500 mb-2">Length: {doc1Text.length}</div>
              <div className="flex gap-2 items-end">
                <div><label className="block text-xs">Pos</label><input type="number" value={pos} onChange={e => setPos(Number(e.target.value))} className="border rounded px-2 py-1 w-20" /></div>
                <div><label className="block text-xs">Char</label><input value={char} onChange={e => setChar(e.target.value)} maxLength={1} className="border rounded px-2 py-1 w-12" /></div>
                <button onClick={handleInsert} className="px-3 py-1 bg-blue-500 text-white rounded">Insert</button>
                <button onClick={handleDelete} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
              </div>
              <div className="mt-3 flex gap-2 items-end">
                <input value={text} onChange={e => setText(e.target.value)} className="border rounded px-2 py-1 flex-1" />
                <button onClick={handleSetText} className="px-3 py-1 bg-gray-200 rounded">Reset</button>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border">
              <h3 className="font-bold mb-2">Replica 2 (r2)</h3>
              <div className="font-mono text-2xl mb-2 min-h-12 p-2 bg-white rounded border">{doc2Text || '(empty)'}</div>
              <div className="text-xs text-gray-500 mb-2">Length: {doc2Text.length}</div>
              <button onClick={handleReverse} className="px-3 py-1 bg-green-500 text-white rounded">从 r2 拉取</button>
            </div>
          </div>
        </div>
      )}
      {tab === 'sync' && (
        <div>
          <button onClick={handleSync} className="px-4 py-2 bg-blue-500 text-white rounded">r1 → r2 同步</button>
          <button onClick={handleReverse} className="ml-2 px-4 py-2 bg-green-500 text-white rounded">r2 → r1 反向</button>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded">r1: <span className="font-mono">{doc1Text}</span></div>
            <div className="p-3 bg-green-50 rounded">r2: <span className="font-mono">{doc2Text}</span></div>
          </div>
        </div>
      )}
      {tab === 'peers' && (
        <div>
          <div className="flex gap-2 mb-3 items-end">
            <input value={peer} onChange={e => setPeer(e.target.value)} className="border rounded px-2 py-1" />
            <button onClick={handleAddPeer} className="px-3 py-1 bg-blue-500 text-white rounded">添加</button>
            <button onClick={handleCursor} className="px-3 py-1 bg-gray-200 rounded">设置光标</button>
          </div>
          {peers.length === 0 ? <div className="text-gray-400">尚无 Peers</div> : (
            <table className="w-full text-sm border">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">ID</th><th className="p-2 text-left">Name</th><th className="p-2">Status</th><th className="p-2">Cursor</th><th className="p-2">Action</th></tr></thead>
              <tbody>{peers.map(p => <tr key={p.id} className="border-t"><td className="p-2 font-mono">{p.id}</td><td className="p-2">{p.name}</td><td className="p-2 text-center"><span className={`px-2 py-0.5 rounded text-white text-xs ${p.online ? 'bg-green-500' : 'bg-gray-500'}`}>{p.online ? 'online' : 'offline'}</span></td><td className="p-2 text-center text-xs">{p.cursor ? `${p.cursor.docId}@${p.cursor.position}` : '-'}</td><td className="p-2 text-center"><button onClick={() => handleTogglePeer(p.id)} className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded">Toggle</button></td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'metrics' && (
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Docs" value={metrics.totalDocs} />
          <Metric label="Peers" value={metrics.totalPeers} />
          <Metric label="Syncs" value={metrics.totalSyncs} />
          <Metric label="Merges" value={metrics.totalMerges} />
          <Metric label="Total Ops" value={metrics.totalOps} />
        </div>
      )}
    </div>
  )
}

function OverviewTab() {
  const features = [
    { title: 'G-Counter', desc: '只增不减的分布式计数器' },
    { title: 'PN-Counter', desc: '可增可减（两个 G-Counter 相减）' },
    { title: 'G-Set / 2P-Set / OR-Set', desc: '集合 CRDT（增加/删除/观察删除）' },
    { title: 'LWW Register', desc: '最后写入胜出，按 (timestamp, replicaId) 决胜' },
    { title: 'MV Register', desc: '并发写保留多个值，由应用层消解' },
    { title: 'RGA 文本', desc: '链表式序列 CRDT，支持并发插入/删除' },
    { title: 'Map CRDT', desc: '嵌套键值对，每个键 LWW 解决' },
    { title: 'Peer Awareness', desc: '光标位置 / 在线状态 / 最后心跳' }
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {features.map(f => <div key={f.title} className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg border"><div className="font-bold mb-1">{f.title}</div><div className="text-sm text-gray-600">{f.desc}</div></div>)}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border"><div className="text-sm text-gray-600">{label}</div><div className="text-3xl font-bold">{value}</div></div>
}
