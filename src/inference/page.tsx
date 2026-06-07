import { useState } from 'react'
import { OnlineInferenceEngine, type PredictionRequest, type PredictionResponse, type ModelHandler } from './index'
import { ModelRegistry } from '../modelreg'

const TABS = ['Setup', 'Predict', 'Routing', 'Cache', 'Stats'] as const
type Tab = typeof TABS[number]

const ctrHandler: ModelHandler = (features) => {
  const age = (features['user_age'] as number ?? 25) / 100
  const ctr = (features['item_ctr'] as number ?? 0.1)
  return { prediction: Math.min(1, age * 0.3 + ctr * 0.7), confidence: 0.85 }
}

const churnHandler: ModelHandler = (features) => {
  const tenure = (features['tenure_days'] as number ?? 0) / 365
  return { prediction: tenure < 1 ? 0.8 : 0.2, confidence: 0.72 }
}

const buildEngine = (): { registry: ModelRegistry; engine: OnlineInferenceEngine } => {
  const registry = new ModelRegistry()
  const v1 = registry.registerVersion({ modelName: 'ctr', framework: 'pytorch', description: 'ctr v1 baseline' })
  registry.registerVersion({ modelName: 'ctr', framework: 'pytorch', description: 'ctr v2 wide-deep', parentVersionId: v1.id, metrics: { auc: 0.87 } })
  registry.transitionStage('ctr', 1, 'staging', { by: 'demo' })
  registry.transitionStage('ctr', 1, 'production', { by: 'demo' })
  registry.transitionStage('ctr', 2, 'staging', { by: 'demo' })
  registry.transitionStage('ctr', 2, 'production', { by: 'demo' })
  registry.registerVersion({ modelName: 'churn', framework: 'sklearn' })
  const engine = new OnlineInferenceEngine(registry)
  engine.registerHandler('ctr', ctrHandler)
  engine.registerHandler('churn', churnHandler)
  return { registry, engine }
}

const formatResp = (r: PredictionResponse): string => {
  return 'trace: ' + r.traceId + '\nmodel: ' + r.modelName + ' v' + r.version + '\nprediction: ' + JSON.stringify(r.prediction) + '\nconfidence: ' + (r.confidence ?? '-') + '\nlatency: ' + r.latencyMs + 'ms\ncached: ' + r.cached + '\nsource: ' + r.source
}

export default function InferencePage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [{ registry, engine }] = useState(buildEngine)
  const [out, setOut] = useState('')
  const [traceId, setTraceId] = useState('t-1')
  const [modelName, setModelName] = useState('ctr')
  const [features, setFeatures] = useState('{"user_age":32,"item_ctr":0.15}')
  const [version, setVersion] = useState('2')
  const [abBucket, setAbBucket] = useState('0.5')

  const runPredict = (over: Partial<PredictionRequest> = {}): PredictionResponse | null => {
    let parsed: PredictionRequest['features']
    try { parsed = JSON.parse(features) as PredictionRequest['features'] } catch { setOut('invalid features JSON'); return null }
    return engine.predict({
      traceId,
      modelName,
      features: parsed,
      version: version.trim() === '' ? undefined : parseInt(version, 10),
      abBucket: abBucket.trim() === '' ? undefined : parseFloat(abBucket),
      ...over,
    })
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v79.0 Online Inference</h1>
      <p className="text-sm text-slate-400">低延迟预测引擎 · 版本路由 · LRU 缓存 · A/B 分流 · 特征富化 · 指标</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('handlers: ' + engine.listHandlers().join(', ') + '\nmodels: ' + registry.listModelNames().join(', ') + '\nprod: ctr v' + (registry.getProductionVersion('ctr')?.version ?? 'none'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">info</button>
            <button onClick={() => {
              const v2 = registry.getProductionVersion('ctr')
              setOut('ctr lineage:\n' + registry.getLineage('ctr').versions.map(v => '  v' + v.version + ' [' + v.stage + ']').join('\n') + '\nproduction: ' + (v2?.version ?? '-'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">lineage</button>
            <button onClick={() => {
              const featureProvider = (id: string) => ({ user_age: 25 + (id.charCodeAt(0) % 30), item_ctr: 0.1 })
              engine.registerFeatureProvider('user', featureProvider)
              const enriched = engine.enrichFeatures('user', 'u-42', { user_age: 30 })
              setOut('enriched: ' + JSON.stringify(enriched))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">register feature provider</button>
          </div>
        </div>
      )}

      {tab === 'Predict' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">trace id<input value={traceId} onChange={e => setTraceId(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">model<input value={modelName} onChange={e => setModelName(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">version (blank=auto)<input value={version} onChange={e => setVersion(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">ab bucket (0-1)<input value={abBucket} onChange={e => setAbBucket(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
          </div>
          <label className="block text-xs text-slate-400">features (JSON)
            <textarea value={features} onChange={e => setFeatures(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono" rows={3} />
          </label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { const r = runPredict(); if (r) setOut(formatResp(r)) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">predict</button>
            <button onClick={() => { const r = runPredict({ bypassCache: true }); if (r) setOut('bypassed cache: ' + formatResp(r)) }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">predict (bypass cache)</button>
            <button onClick={() => {
              const res: PredictionResponse[] = []
              for (let i = 0; i < 5; i++) {
                const r = engine.predict({ traceId: 'batch-' + i, modelName: 'ctr', features: { user_age: 20 + i * 5, item_ctr: 0.1 + i * 0.05 } })
                res.push(r)
              }
              setOut('batch of 5:\n' + res.map(r => '  v' + r.version + ' pred=' + (r.prediction as number).toFixed(3) + ' latency=' + r.latencyMs + 'ms cached=' + r.cached).join('\n'))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">batch predict (5)</button>
            <button onClick={() => {
              const r = runPredict({ modelName: 'churn', features: { tenure_days: 120 } })
              if (r) setOut('churn: ' + formatResp(r))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">switch to churn</button>
          </div>
        </div>
      )}

      {tab === 'Routing' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              engine.setAbRule({ modelName: 'ctr', splits: [{ version: 1, weight: 1 }, { version: 2, weight: 1 }] })
              const counts: Record<number, number> = { 1: 0, 2: 0 }
              for (let i = 0; i < 100; i++) {
                const r = engine.predict({ traceId: 'ab-' + i, modelName: 'ctr', features: { user_age: 25, item_ctr: 0.1 } })
                counts[r.version] = (counts[r.version] ?? 0) + 1
              }
              setOut('A/B over 100 requests: v1=' + counts[1] + ' v2=' + counts[2])
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">enable 50/50 A/B</button>
            <button onClick={() => {
              engine.setAbRule({ modelName: 'ctr', splits: [{ version: 1, weight: 0 }, { version: 2, weight: 1 }] })
              const r = engine.predict({ traceId: 't', modelName: 'ctr', features: { user_age: 25, item_ctr: 0.1 } })
              setOut('100% v2: served v' + r.version)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">100% to v2</button>
            <button onClick={() => {
              engine.clearAbRule('ctr')
              const r = engine.predict({ traceId: 't', modelName: 'ctr', features: { user_age: 25, item_ctr: 0.1 } })
              setOut('A/B cleared, fell back to production: v' + r.version)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">clear A/B</button>
            <button onClick={() => {
              const r = engine.predict({ traceId: 'override', modelName: 'ctr', features: { user_age: 25, item_ctr: 0.1 }, version: 1 })
              setOut('explicit version=1: served v' + r.version)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">explicit version</button>
          </div>
        </div>
      )}

      {tab === 'Cache' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const a = engine.predict({ traceId: 'cache-1', modelName: 'ctr', features: { user_age: 40, item_ctr: 0.2 } })
              const b = engine.predict({ traceId: 'cache-1', modelName: 'ctr', features: { user_age: 40, item_ctr: 0.2 } })
              setOut('first: cached=' + a.cached + '\nsecond: cached=' + b.cached + '\ncache size: ' + engine.cacheSize())
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">cache hit demo</button>
            <button onClick={() => setOut('cache size: ' + engine.cacheSize())} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">cache size</button>
            <button onClick={() => { engine.clearCache(); setOut('cache cleared, size: ' + engine.cacheSize()) }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">clear cache</button>
            <button onClick={() => {
              const ttlEngine = new OnlineInferenceEngine(registry, { cacheTtlMs: 1 })
              ttlEngine.registerHandler('ctr', ctrHandler)
              const a = ttlEngine.predict({ traceId: 'ttl', modelName: 'ctr', features: { user_age: 50, item_ctr: 0.3 } })
              setTimeout(() => {
                const b = ttlEngine.predict({ traceId: 'ttl', modelName: 'ctr', features: { user_age: 50, item_ctr: 0.3 } })
                setOut('ttl=1ms, after 5ms:\nfirst: cached=' + a.cached + '\nsecond: cached=' + b.cached)
              }, 5)
            }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">ttl expiry demo</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const s = engine.stats()
              setOut('total: ' + s.totalRequests + '\nhits: ' + s.cacheHits + '\nmisses: ' + s.cacheMisses + '\nhit rate: ' + (s.hitRate * 100).toFixed(1) + '%\nerrors: ' + s.errors + '\nuptime: ' + s.uptimeMs + 'ms\np50: ' + s.p50LatencyMs + 'ms\np95: ' + s.p95LatencyMs + 'ms\np99: ' + s.p99LatencyMs + 'ms\navg: ' + s.avgLatencyMs.toFixed(2) + 'ms')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">overall stats</button>
            <button onClick={() => setOut('by model:\n' + Object.entries(engine.stats().byModel).map(([k, v]) => '  ' + k + ': reqs=' + v.requests + ' errs=' + v.errors + ' avg=' + v.avgLatencyMs.toFixed(2) + 'ms').join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">by model</button>
            <button onClick={() => setOut('by version:\n' + Object.entries(engine.stats().byVersion).map(([k, v]) => '  ' + k + ': reqs=' + v.requests + ' errs=' + v.errors).join('\n'))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">by version</button>
            <button onClick={() => setOut('latency buckets:\n' + engine.stats().latencyBuckets.map(b => '  ' + b.range + ': ' + b.count).join('\n'))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">latency buckets</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see online inference operations'}</pre>
    </div>
  )
}
