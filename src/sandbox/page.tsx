import { useState } from 'react'
import { Sandbox, SandboxRegistry } from './index'

const TABS = ['Run JS', 'Timeout', 'Forbidden', 'Allow/Deny', 'Modules', 'Template', 'History', 'Metrics', 'Registry'] as const
type Tab = typeof TABS[number]

export default function SandboxPage() {
  const [tab, setTab] = useState<Tab>('Run JS')
  const [code, setCode] = useState('let sum = 0; for(let i=1;i<=10;i++) sum += i; sum')
  const [template, setTemplate] = useState('return {{x}} * 2 + {{y}}')
  const [tplVars, setTplVars] = useState('{"x":10,"y":5}')
  const [out, setOut] = useState('')
  const [registry] = useState(() => new SandboxRegistry())

  const sb = new Sandbox({ timeoutMs: 2000 })

  const run = () => {
    const r = sb.runJs(code)
    setOut(JSON.stringify({ success: r.success, value: r.value, error: r.error, durationMs: r.durationMs, logs: r.logs }, null, 2))
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v59.0 Code Sandbox</h1>
      <p className="text-sm text-slate-400">基于 Node vm · 超时强制 · 危险全局黑名单 · 模块解析 · 模板插值 · 注册中心</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Run JS' && (
        <div className="space-y-3">
          <textarea value={code} onChange={e => setCode(e.target.value)} rows={6} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs font-mono" />
          <button onClick={run} className="px-3 py-1.5 bg-blue-700 rounded text-xs">run</button>
        </div>
      )}

      {tab === 'Timeout' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const r = new Sandbox({ timeoutMs: 200 }).runJs('while(true){}')
              setOut(JSON.stringify({ success: r.success, error: r.error, timedOut: r.timedOut }, null, 2))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">while(true) 200ms</button>
            <button onClick={() => {
              const r = new Sandbox({ timeoutMs: 200 }).runJs('for(let i=0;i<1e9;i++){}')
              setOut(JSON.stringify({ success: r.success, error: r.error, timedOut: r.timedOut }, null, 2))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">1e9 iterations</button>
          </div>
        </div>
      )}

      {tab === 'Forbidden' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(sb.runJs('eval("1+1")'), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">try eval</button>
            <button onClick={() => setOut(JSON.stringify(sb.runJs('new Function("return 1")()'), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">try Function</button>
            <button onClick={() => setOut(JSON.stringify(sb.runJs('process.exit(0)'), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">try process.exit</button>
            <button onClick={() => setOut(JSON.stringify(sb.runJs('require("fs")'), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">try require</button>
            <button onClick={() => setOut(JSON.stringify(sb.runJs('globalThis'), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">try globalThis</button>
          </div>
        </div>
      )}

      {tab === 'Allow/Deny' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(new Sandbox({ allowGlobals: ['Math', 'Date'] }).runJs('Math.sqrt(16) + Date.now() % 1000'), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">allow Math+Date</button>
            <button onClick={() => setOut(JSON.stringify(new Sandbox({ denyGlobals: ['Date'] }).runJs('Date.now()'), null, 2))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">deny Date</button>
          </div>
        </div>
      )}

      {tab === 'Modules' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(sb.runModule('export const x = 5; export default x * 2'), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">export const + default</button>
            <button onClick={() => setOut(JSON.stringify(sb.runModule('import { foo } from "./lib.js"; foo()', { modules: { './lib.js': 'export function foo(){return 7}' } }), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">import + foo()</button>
            <button onClick={() => setOut(JSON.stringify(sb.runModule('import { add } from "./m.js"; export default add(3,4)', { modules: { './m.js': 'export function add(a,b){return a+b}' } }), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">import + export default</button>
          </div>
        </div>
      )}

      {tab === 'Template' && (
        <div className="space-y-3">
          <input value={template} onChange={e => setTemplate(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs font-mono" />
          <input value={tplVars} onChange={e => setTplVars(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs font-mono" />
          <button onClick={() => {
            try {
              const vars = JSON.parse(tplVars) as Record<string, string | number | boolean>
              const r = sb.runTemplate(template, vars)
              setOut(JSON.stringify(r, null, 2))
            } catch (e) { setOut('parse err: ' + (e as Error).message) }
          }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">expand</button>
          <button onClick={() => {
            const r = sb.runTemplate('{{code}}', { code: 'process.exit(0)' })
            setOut('injection test: ' + JSON.stringify(r, null, 2))
          }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">injection test (denied)</button>
        </div>
      )}

      {tab === 'History' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(sb.getHistory(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">all history</button>
            <button onClick={() => setOut(JSON.stringify(sb.getHistory({ success: true }), null, 2))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">success only</button>
            <button onClick={() => setOut(JSON.stringify(sb.getHistory({ success: false }), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">failed only</button>
            <button onClick={() => setOut(JSON.stringify(sb.getHistory({ limit: 3 }), null, 2))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">last 3</button>
            <button onClick={() => { sb.clearHistory(); setOut('cleared') }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">clear</button>
          </div>
        </div>
      )}

      {tab === 'Metrics' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(sb.getMetrics(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">metrics</button>
            <button onClick={() => { sb.resetMetrics(); setOut('reset') }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">reset</button>
          </div>
        </div>
      )}

      {tab === 'Registry' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { registry.register('worker-1', new Sandbox()); registry.register('worker-2', new Sandbox()); setOut('registered: ' + JSON.stringify(registry.list())) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">register 2</button>
            <button onClick={() => setOut('list: ' + JSON.stringify(registry.list()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
            <button onClick={() => setOut('worker-1: ' + !!registry.get('worker-1'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">get worker-1</button>
            <button onClick={() => { registry.remove('worker-1'); setOut('removed: ' + JSON.stringify(registry.list())) }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">remove</button>
            <button onClick={() => { registry.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out}</pre>
    </div>
  )
}
