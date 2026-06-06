import { useState } from 'react'
import { FlagEngine, evaluateRule, evaluateSegment, getFlagEngine, resetFlagEngine } from './index'

const TABS = ['Flags', 'Rules', 'Segments', 'Evaluate', 'A/B', 'Kill'] as const
type Tab = typeof TABS[number]

export default function FlagTargetingPage() {
  const [tab, setTab] = useState<Tab>('Flags')
  const [eng] = useState(() => {
    resetFlagEngine()
    const e = new FlagEngine()
    e.createFlag({ id: 'new-checkout', name: 'new-checkout', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 50 })
    e.createFlag({
      id: 'premium-feature', name: 'premium-feature', defaultValue: false, state: 'on',
      variants: [{ name: 'control', value: 'control', weight: 50 }, { name: 'treatment', value: 'treatment', weight: 50 }],
      rules: [{ rules: [{ attribute: 'plan', op: 'eq', value: 'premium' }], combinator: 'all', serve: { variant: 'treatment' } }],
      rolloutPercentage: 100,
    })
    e.createSegment({ id: 'enterprise', name: 'Enterprise', rules: [{ attribute: 'company_size', op: 'gte', value: 500 }], combinator: 'all' })
    return e
  })
  const [out, setOut] = useState('')
  const [userCtx, setUserCtx] = useState('{"userId":"u1","country":"CN","plan":"premium","age":30,"app_version":"2.5.0"}')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v66.0 Feature Flag Targeting</h1>
      <p className="text-sm text-slate-400">用户分段 · 规则求值 · 上下文评估 · 批量评估 · A/B 流量分配 · 灰度 rollout · Kill switch</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Flags' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(eng.listFlags().map(f => `[${f.id}] ${f.name} state=${f.state} rollout=${f.rolloutPercentage}% rules=${f.rules.length}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list flags</button>
            <button onClick={() => {
              const f = eng.createFlag({ id: `f${Date.now()}`, name: 'temp', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
              setOut('created: ' + f.id)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">create new</button>
            <button onClick={() => setOut('metrics: ' + JSON.stringify(eng.metrics()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">metrics</button>
          </div>
        </div>
      )}

      {tab === 'Rules' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('country=CN eq: ' + evaluateRule({ attribute: 'country', op: 'eq', value: 'CN' }, { country: 'CN' }))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test eq</button>
            <button onClick={() => setOut('age=30 between [18,65]: ' + evaluateRule({ attribute: 'age', op: 'between', values: [18, 65] }, { age: 30 }))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test between</button>
            <button onClick={() => setOut('app_version=2.5.0 semver 2.0.0: ' + evaluateRule({ attribute: 'app_version', op: 'semver', value: '2.0.0' }, { app_version: '2.5.0' }))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test semver</button>
            <button onClick={() => setOut('tags=[vip,beta] contains vip: ' + evaluateRule({ attribute: 'tags', op: 'contains', value: 'vip' }, { tags: ['vip', 'beta'] }))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test contains</button>
            <button onClick={() => setOut('user.country=CN: ' + evaluateRule({ attribute: 'user.country', op: 'eq', value: 'CN' }, { user: { country: 'CN' } }))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">test dot-path</button>
            <button onClick={() => {
              const seg = eng.getSegment('enterprise')!
              setOut('enterprise segment with company_size=500: ' + evaluateSegment(seg, { company_size: 500 }))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">test segment</button>
          </div>
        </div>
      )}

      {tab === 'Segments' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(eng.listSegments().map(s => `[${s.id}] ${s.name} (${s.combinator}, ${s.rules.length} rules)`).join('\n') || '(no segments)')} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list</button>
            <button onClick={() => {
              const seg = eng.createSegment({ id: `s${Date.now()}`, name: 'New', rules: [{ attribute: 'country', op: 'in', values: ['US', 'CA'] }], combinator: 'all' })
              setOut('created: ' + seg.name)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">create</button>
            <button onClick={() => {
              const seg = eng.createSegment({ id: 'beta-testers', name: 'Beta Testers', rules: [{ attribute: 'beta', op: 'eq', value: true }], combinator: 'all' })
              const ctx = { beta: true, userId: 'u1' }
              setOut(`Segment [${seg.name}]: ${evaluateSegment(seg, ctx)}`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">test inline</button>
          </div>
        </div>
      )}

      {tab === 'Evaluate' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <textarea value={userCtx} onChange={e => setUserCtx(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono h-20" />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => {
                try {
                  const ctx = JSON.parse(userCtx)
                  const r = eng.evaluateBulk(['new-checkout', 'premium-feature'], ctx)
                  setOut(JSON.stringify(r, null, 2))
                } catch (e) { setOut('error: ' + (e as Error).message) }
              }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">evaluate all</button>
              <button onClick={() => {
                try {
                  const ctx = JSON.parse(userCtx)
                  const r = eng.evaluate('new-checkout', ctx)
                  setOut(`new-checkout: ${JSON.stringify(r)}`)
                } catch (e) { setOut('error: ' + (e as Error).message) }
              }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">evaluate new-checkout</button>
              <button onClick={() => {
                try {
                  const ctx = JSON.parse(userCtx)
                  const r = eng.evaluate('premium-feature', ctx)
                  setOut(`premium-feature: ${JSON.stringify(r)}`)
                } catch (e) { setOut('error: ' + (e as Error).message) }
              }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">evaluate premium-feature</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'A/B' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="ab-user" defaultValue="user-42" placeholder="user id" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const userId = (document.getElementById('ab-user') as HTMLInputElement).value
              const r = eng.evaluate('premium-feature', { userId, plan: 'premium' })
              setOut(`[${userId}] premium=true: ${JSON.stringify(r)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">evaluate as premium</button>
            <button onClick={() => {
              const userId = (document.getElementById('ab-user') as HTMLInputElement).value
              const r = eng.evaluate('premium-feature', { userId, plan: 'basic' })
              setOut(`[${userId}] premium=false: ${JSON.stringify(r)}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">evaluate as basic</button>
            <button onClick={() => {
              const userId = (document.getElementById('ab-user') as HTMLInputElement).value
              const r1 = eng.evaluate('new-checkout', { userId })
              const r2 = eng.evaluate('new-checkout', { userId })
              setOut(`[${userId}] stable: r1=${JSON.stringify(r1)} r2=${JSON.stringify(r2)}`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">check bucket stability</button>
          </div>
        </div>
      )}

      {tab === 'Kill' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const n = eng.killAll()
              setOut(`Kill switch activated: ${n} flags disabled`)
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">⚠ Kill All Flags</button>
            <button onClick={() => {
              eng.setState('new-checkout', 'on')
              eng.setState('premium-feature', 'on')
              setOut('Re-enabled all flags')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">re-enable</button>
            <button onClick={() => {
              eng.override('new-checkout', 'u-vip', true)
              setOut('Override new-checkout=true for u-vip')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">force u-vip on</button>
            <button onClick={() => {
              const ov = eng.getOverride('new-checkout', 'u-vip')
              setOut('Override for u-vip: ' + JSON.stringify(ov))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">get override</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see flag targeting operations'}</pre>
    </div>
  )
}
