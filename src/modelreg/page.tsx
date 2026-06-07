import { useState } from 'react'
import { ModelRegistry, resetModelRegistry, type ModelStage } from './index'

const TABS = ['Setup', 'Versions', 'Stage', 'Artifacts', 'Lineage', 'Stats'] as const
type Tab = typeof TABS[number]

const STAGES: ModelStage[] = ['dev', 'staging', 'production', 'archived']

const seedDemo = (r: ModelRegistry) => {
  const v1 = r.registerVersion({ modelName: 'ctr_predictor', framework: 'pytorch', tags: ['rec', 'baseline'], description: 'baseline CTR model' })
  r.addTextArtifact('ctr_predictor', 1, 'config', 'config.json', JSON.stringify({ lr: 0.001, layers: 3 }))
  r.addTextArtifact('ctr_predictor', 1, 'metadata', 'meta.json', JSON.stringify({ dataset: 'avazu' }))
  r.registerVersion({ modelName: 'ctr_predictor', framework: 'pytorch', tags: ['rec', 'wide-deep'], description: 'wide & deep', parentVersionId: v1.id, metrics: { accuracy: 0.82, auc: 0.87 } })
  r.addTextArtifact('ctr_predictor', 2, 'weights', 'model.bin', 'binary-weights-data')
  r.addTextArtifact('ctr_predictor', 2, 'config', 'config.json', JSON.stringify({ lr: 0.0005, layers: 5 }))
  r.registerVersion({ modelName: 'churn_classifier', framework: 'sklearn', tags: ['cls'], description: 'churn risk' })
}

export default function ModelRegistryPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [registry] = useState<ModelRegistry>(() => {
    resetModelRegistry()
    const r = new ModelRegistry()
    seedDemo(r)
    return r
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v77.0 Model Registry</h1>
      <p className="text-sm text-slate-400">模型版本化 · 阶段过渡（dev/staging/prod/archived）· 工件存储 · 谱系 · 校验和</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('models: ' + registry.listModelNames().join(', '))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list models</button>
            <button onClick={() => {
              const out: string[] = []
              for (const name of registry.listModelNames()) {
                const versions = registry.listVersions(name)
                out.push(name + ': v' + versions.map(v => v.version + '(' + v.stage + ')').join(', v'))
              }
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">all versions</button>
            <button onClick={() => {
              const v = registry.registerVersion({ modelName: 'new_model_' + Date.now().toString(36), framework: 'onnx' })
              setOut('registered ' + v.modelName + ' v' + v.version)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">register new model</button>
          </div>
        </div>
      )}

      {tab === 'Versions' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(registry.getVersion('ctr_predictor', 1), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">get ctr v1</button>
            <button onClick={() => setOut(JSON.stringify(registry.getVersion('ctr_predictor', 2), null, 2))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">get ctr v2</button>
            <button onClick={() => setOut('v1 metrics: ' + JSON.stringify(registry.getVersion('ctr_predictor', 1)?.metrics))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">v1 metrics</button>
            <button onClick={() => setOut(JSON.stringify(registry.search({ tag: 'rec' }), null, 2))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">search tag=rec</button>
            <button onClick={() => setOut(JSON.stringify(registry.search({ framework: 'sklearn' }), null, 2))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">search framework=sklearn</button>
          </div>
        </div>
      )}

      {tab === 'Stage' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <select id="mr-stage" defaultValue="staging" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => {
              const target = (document.getElementById('mr-stage') as HTMLSelectElement).value as ModelStage
              try {
                const v = registry.transitionStage('ctr_predictor', 1, target, { by: 'demo', reason: 'manual' })
                setOut('moved ctr v1 -> ' + v.stage)
              } catch (e) { setOut('error: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">transition ctr v1</button>
            <button onClick={() => {
              const promoted = registry.promoteToProduction('ctr_predictor', 2, 'demo')
              setOut('promoted ctr v2 -> ' + promoted.stage)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">promote ctr v2</button>
            <button onClick={() => setOut('prod: ' + (registry.getProductionVersion('ctr_predictor')?.version ?? 'none'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">current production</button>
            <button onClick={() => {
              const v1cur = registry.getVersion('ctr_predictor', 1)
              if (!v1cur) { setOut('no ctr v1'); return }
              setOut('transitions for ctr v1: ' + registry.getTransitions(v1cur.id).map(t => t.fromStage + '->' + t.toStage).join(', '))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">show transitions</button>
          </div>
        </div>
      )}

      {tab === 'Artifacts' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const a = registry.addTextArtifact('ctr_predictor', 2, 'metadata', 'eval.json', JSON.stringify({ auc: 0.91, accuracy: 0.86 }))
              setOut('added artifact: ' + a.id + ' (' + a.size + ' bytes, ck=' + a.checksum + ')')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add eval.json to ctr v2</button>
            <button onClick={() => {
              const v2cur = registry.getVersion('ctr_predictor', 2)
              if (!v2cur) { setOut('no ctr v2'); return }
              setOut(v2cur.artifacts.map(a => a.type + ':' + a.filename + ' (' + a.size + 'B)').join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list ctr v2 artifacts</button>
            <button onClick={() => {
              const v1cur = registry.getVersion('ctr_predictor', 1)
              if (!v1cur) { setOut('no ctr v1'); return }
              setOut(v1cur.artifacts.map(a => a.type + ':' + a.filename + ' (' + a.size + 'B)').join('\n'))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">list ctr v1 artifacts</button>
          </div>
        </div>
      )}

      {tab === 'Lineage' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const lin = registry.getLineage('ctr_predictor')
              const out: string[] = []
              out.push('model: ' + lin.modelName)
              out.push('root: ' + lin.rootVersionId)
              out.push('versions:')
              for (const v of lin.versions) {
                out.push('  v' + v.version + ' [' + v.stage + '] artifacts=' + v.artifacts.length + ' parent=' + (v.parentVersionId ?? '-'))
              }
              out.push('transitions (' + lin.transitions.length + '):')
              for (const t of lin.transitions) {
                out.push('  ' + new Date(t.at).toISOString() + ' ' + t.fromStage + '->' + t.toStage + (t.reason ? ' (' + t.reason + ')' : ''))
              }
              out.push('production: ' + (lin.productionVersionId ?? 'none'))
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">lineage ctr_predictor</button>
            <button onClick={() => setOut(JSON.stringify(registry.getLineage('churn_classifier'), null, 2))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">lineage churn</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <button onClick={() => setOut(JSON.stringify(registry.stats(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">registry stats</button>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see model registry operations'}</pre>
    </div>
  )
}
