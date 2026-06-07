import { useState } from 'react'
import { getFeatureImportance, type ImportanceScore, type ShapValue, type FeatureVector } from './index'

const sample: FeatureVector[] = [
  { x: 1, y: 2, z: 0 },
  { x: 2, y: 3, z: 1 },
  { x: 3, y: 4, z: 0 },
  { x: 4, y: 5, z: 1 },
  { x: 5, y: 6, z: 0 },
  { x: 6, y: 7, z: 1 },
  { x: 7, y: 8, z: 0 },
  { x: 8, y: 9, z: 1 },
]
const model = (v: FeatureVector): number => 2 * (v.x as number) + 0.1 * (v.y as number) - 0.5 * (v.z as number)

const fi = getFeatureImportance()

type Tab = 'importance' | 'shap' | 'pdp' | 'report'

export const FeatimpPage = () => {
  const [tab, setTab] = useState<Tab>('importance')
  const [out, setOut] = useState<string>('')
  const [imp, setImp] = useState<ImportanceScore[]>([])
  const [shap, setShap] = useState<ShapValue[]>([])
  const [pdpData, setPdpData] = useState<Record<string, { x: number; y: number }[]>>({})
  const [instance, setInstance] = useState<FeatureVector>({ x: 5, y: 5, z: 0 })

  const runImportance = () => {
    const r = fi.permutationImportance(model, sample)
    setImp(r)
    setOut(JSON.stringify(r, null, 2))
  }

  const runShap = () => {
    const r = fi.shapValues(model, instance, sample)
    setShap(r)
    setOut(JSON.stringify(r, null, 2))
  }

  const runPdp = (feat: string) => {
    const r = fi.partialDependence(model, sample, feat, { gridSize: 10 })
    setPdpData({ ...pdpData, [feat]: r })
    setOut(JSON.stringify(r, null, 2))
  }

  const runReport = () => {
    const r = fi.report(model, sample, instance)
    setOut(JSON.stringify({ importance: r.importance, shap: r.shap, pdpKeys: Object.keys(r.pdp) }, null, 2))
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Feature Importance v90.0</h2>
      <p style={{ color: '#666' }}>Permutation importance · SHAP-lite · Partial Dependence</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['importance', 'shap', 'pdp', 'report'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} data-active={tab === t} style={{ padding: '4px 12px' }}>{t}</button>
        ))}
      </div>
      {tab === 'importance' && (
        <div>
          <button onClick={runImportance}>Run Permutation Importance</button>
          {imp.length > 0 && (
            <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
              <thead><tr><th>rank</th><th>feature</th><th>importance</th><th>std</th></tr></thead>
              <tbody>
                {imp.map(s => (
                  <tr key={s.feature}><td>{s.rank}</td><td>{s.feature}</td><td>{s.importance.toFixed(4)}</td><td>{s.std?.toFixed(4)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'shap' && (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label>x: <input type="number" value={instance.x as number} onChange={e => setInstance({ ...instance, x: Number(e.target.value) })} /></label>
            <label>y: <input type="number" value={instance.y as number} onChange={e => setInstance({ ...instance, y: Number(e.target.value) })} /></label>
            <label>z: <input type="number" value={instance.z as number} onChange={e => setInstance({ ...instance, z: Number(e.target.value) })} /></label>
            <button onClick={runShap}>Compute SHAP</button>
          </div>
          {shap.length > 0 && (
            <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
              <thead><tr><th>feature</th><th>value</th><th>base</th><th>contribution</th></tr></thead>
              <tbody>
                {shap.map(s => (
                  <tr key={s.feature}><td>{s.feature}</td><td>{s.value}</td><td>{s.baseValue.toFixed(3)}</td><td>{s.contribution.toFixed(3)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'pdp' && (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['x', 'y', 'z'].map(f => (
              <button key={f} onClick={() => runPdp(f)}>PDP for {f}</button>
            ))}
          </div>
          {Object.keys(pdpData).length > 0 && (
            <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
              <thead><tr><th>feature</th><th>x</th><th>y</th></tr></thead>
              <tbody>
                {Object.entries(pdpData).map(([f, pts]) => pts.map((p, i) => (
                  <tr key={`${f}-${i}`}><td>{f}</td><td>{p.x.toFixed(3)}</td><td>{p.y.toFixed(3)}</td></tr>
                )))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'report' && (
        <div>
          <button onClick={runReport}>Run Full Report</button>
        </div>
      )}
      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 16, maxHeight: 300, overflow: 'auto' }}>{out}</pre>
    </div>
  )
}
