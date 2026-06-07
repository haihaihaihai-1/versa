import { useState } from 'react'
import { Tuner, type SearchSpace, type TrialResult } from './index'

type Tab = 'tune' | 'best' | 'trials'

const defaultSpace: SearchSpace = {
  lr: { type: 'float', min: 0.0001, max: 0.1 },
  batch: { type: 'int', min: 8, max: 64, step: 8 },
  opt: { type: 'categorical', values: ['sgd', 'adam', 'rmsprop'] },
}

export const TunePage = () => {
  const [tab, setTab] = useState<Tab>('tune')
  const [out, setOut] = useState<string>('')
  const [trials, setTrials] = useState<TrialResult[]>([])
  const [best, setBest] = useState<TrialResult | null>(null)
  const [maxTrials, setMaxTrials] = useState('20')
  const [sampler, setSampler] = useState<'random' | 'grid' | 'bayesian'>('random')
  const [direction, setDirection] = useState<'maximize' | 'minimize'>('maximize')
  const [earlyStop, setEarlyStop] = useState('5')

  const runTune = async () => {
    const t = new Tuner(defaultSpace, {
      sampler,
      maxTrials: Number(maxTrials),
      seed: Date.now() % 100000,
      direction,
      earlyStoppingRounds: Number(earlyStop) || undefined,
    })
    const r = await t.tune(async p => {
      const lr = Number(p.lr)
      const target = 0.05
      const bonus = p.opt === 'adam' ? 0.02 : 0
      return direction === 'maximize' ? -Math.abs(lr - target) + bonus : Math.abs(lr - target) - bonus
    })
    setTrials(r.trials)
    setBest(r.best)
    setOut(JSON.stringify({ best: r.best }, null, 2))
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Hyperparameter Tuning v87.0</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['tune', 'best', 'trials'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} data-active={tab === t} style={{ padding: '4px 12px' }}>{t}</button>
        ))}
      </div>
      {tab === 'tune' && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>maxTrials: <input value={maxTrials} onChange={e => setMaxTrials(e.target.value)} style={{ width: 60 }} /></label>
            <label>sampler: <select value={sampler} onChange={e => setSampler(e.target.value as 'random' | 'grid' | 'bayesian')}>
              <option value="random">random</option>
              <option value="grid">grid</option>
              <option value="bayesian">bayesian</option>
            </select></label>
            <label>direction: <select value={direction} onChange={e => setDirection(e.target.value as 'maximize' | 'minimize')}>
              <option value="maximize">maximize</option>
              <option value="minimize">minimize</option>
            </select></label>
            <label>earlyStop: <input value={earlyStop} onChange={e => setEarlyStop(e.target.value)} style={{ width: 40 }} /></label>
            <button onClick={runTune}>Run Tuning</button>
          </div>
        </div>
      )}
      {tab === 'best' && (
        <div>
          {best ? <pre style={{ background: '#111', color: '#cfc', padding: 12 }}>{JSON.stringify({ id: best.id, params: best.params, score: best.score, status: best.status }, null, 2)}</pre> : <p>No trial run yet.</p>}
        </div>
      )}
      {tab === 'trials' && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{ textAlign: 'left' }}>id</th><th>params</th><th>score</th><th>status</th><th>duration</th></tr>
            </thead>
            <tbody>
              {trials.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td><code style={{ fontSize: 11 }}>{JSON.stringify(t.params)}</code></td>
                  <td>{t.score.toFixed(4)}</td>
                  <td>{t.status}</td>
                  <td>{t.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 16, maxHeight: 300, overflow: 'auto' }}>{out}</pre>
    </div>
  )
}
