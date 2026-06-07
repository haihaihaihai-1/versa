import { useState } from 'react'
import { RecommendationEngine, type Item, type UserFeatures, type ScoredItem, type RecommendationResponse, type UserSignal } from './index'
import { ModelRegistry } from '../modelreg'

const TABS = ['Setup', 'Items', 'Recommend', 'Signals', 'A/B', 'Stats'] as const
type Tab = typeof TABS[number]

const seedItems = (e: RecommendationEngine) => {
  const items: Item[] = [
    { id: 'p1', title: 'AI Handbook', category: 'tech', tags: ['ai'], embedding: [0.9, 0.1, 0.0], popularity: 100 },
    { id: 'p2', title: 'Web Dev 101', category: 'tech', tags: ['web'], embedding: [0.1, 0.9, 0.0], popularity: 80 },
    { id: 'p3', title: 'Cooking Italian', category: 'food', tags: ['cooking'], embedding: [0.0, 0.1, 0.9], popularity: 60 },
    { id: 'p4', title: 'Travel Japan', category: 'travel', tags: ['japan'], embedding: [0.0, 0.0, 0.9], popularity: 40 },
    { id: 'p5', title: 'Deep Learning', category: 'tech', tags: ['ai', 'dl'], embedding: [0.85, 0.2, 0.0], popularity: 200 },
    { id: 'p6', title: 'Gardening', category: 'home', tags: ['plants'], embedding: [0.0, 0.1, 0.8], popularity: 30 },
    { id: 'p7', title: 'Yoga', category: 'health', tags: ['fitness'], embedding: [0.1, 0.0, 0.7], popularity: 50 },
    { id: 'p8', title: 'Photography', category: 'tech', tags: ['photo'], embedding: [0.3, 0.6, 0.1], popularity: 70 },
  ]
  e.addItems(items)
}

const buildEngine = (): { registry: ModelRegistry; engine: RecommendationEngine } => {
  const registry = new ModelRegistry()
  registry.registerVersion({ modelName: 'ranker', framework: 'pytorch' })
  const engine = new RecommendationEngine(registry, { topK: 5, candidatePoolSize: 10 })
  seedItems(engine)
  return { registry, engine }
}

const formatResp = (r: RecommendationResponse): string => {
  const lines: string[] = []
  lines.push('request: ' + r.requestId)
  lines.push('strategy: ' + r.strategy)
  lines.push('candidates: ' + r.candidateCount)
  lines.push('latency: ' + r.latencyMs + 'ms')
  lines.push('cached: ' + r.cached)
  lines.push('top ' + r.recommendations.length + ':')
  for (const rec of r.recommendations) {
    lines.push('  ' + rec.itemId + ' score=' + rec.score.toFixed(3) + ' sources=[' + rec.sources.join(',') + '] reasons=[' + rec.reasons.join('; ') + ']')
  }
  return lines.join('\n')
}

export default function RecommendPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [{ engine }] = useState(buildEngine)
  const [out, setOut] = useState('')
  const [userId, setUserId] = useState('u1')
  const [interests, setInterests] = useState('tech,food')
  const [recentViews, setRecentViews] = useState('p1,p5')
  const [topK, setTopK] = useState('5')
  const [strategy, setStrategy] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [exclude, setExclude] = useState('')

  const runRecommend = (over: Partial<Parameters<RecommendationEngine['recommend']>[0]> = {}): RecommendationResponse | null => {
    const user: UserFeatures = {
      userId,
      age: 30,
      country: 'US',
      interests: interests.split(',').map(s => s.trim()).filter(Boolean),
      recentViews: recentViews.split(',').map(s => s.trim()).filter(Boolean),
    }
    const filters = {
      category: filterCat.trim() || undefined,
      exclude: exclude.split(',').map(s => s.trim()).filter(Boolean),
    }
    try {
      return engine.recommend({
        requestId: 'req-' + Math.random().toString(36).slice(2, 6),
        user,
        topK: topK.trim() === '' ? undefined : parseInt(topK, 10),
        strategy: strategy.trim() || undefined,
        filters: (filters.category || (filters.exclude && filters.exclude.length > 0)) ? filters : undefined,
        ...over,
      })
    } catch (e) {
      setOut('error: ' + (e as Error).message)
      return null
    }
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v80.0 Recommendation Engine</h1>
      <p className="text-sm text-slate-400">多信号召回 · 向量相似 · 热度 · 分类 · 共现 · 历史 · A/B · 指标</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('items: ' + engine.countItems() + '\n' + engine.listItems().map(i => '  ' + i.id + ' ' + i.title + ' [' + i.category + '] pop=' + (i.popularity ?? 0)).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list items</button>
            <button onClick={() => {
              const newItem: Item = { id: 'p' + Date.now().toString(36), title: 'New Arrival ' + Date.now().toString(36).slice(-3), category: 'tech', tags: [], embedding: [Math.random(), Math.random(), Math.random()], popularity: 10 }
              engine.addItem(newItem)
              setOut('added: ' + newItem.id + ' (total=' + engine.countItems() + ')')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">add random item</button>
            <button onClick={() => {
              const before = engine.countItems()
              engine.removeItem('p1')
              setOut('removed p1 (was ' + before + ', now ' + engine.countItems() + ')')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">remove p1</button>
            <button onClick={() => {
              const cfg = engine.config
              setOut('topK=' + cfg.topK + '\ncandidatePool=' + cfg.candidatePoolSize + '\nweights: ' + JSON.stringify(cfg.weights) + '\nflags: vec=' + cfg.enableVector + ' pop=' + cfg.enablePopularity + ' cat=' + cfg.enableCategoryMatch + ' co=' + cfg.enableCoOccurrence + ' hist=' + cfg.enableUserHistory)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">config</button>
          </div>
        </div>
      )}

      {tab === 'Items' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const tech = engine.listItems().filter(i => i.category === 'tech')
              setOut('tech items (' + tech.length + '):\n' + tech.map(i => '  ' + i.id + ' ' + i.title + ' pop=' + (i.popularity ?? 0) + ' emb=[' + (i.embedding ?? []).map(x => x.toFixed(2)).join(',') + ']').join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">filter by category</button>
            <button onClick={() => setOut('popularity sorted:\n' + engine.listItems().sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).map(i => '  ' + i.id + ' pop=' + (i.popularity ?? 0)).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">sort by popularity</button>
            <button onClick={() => setOut('item ids: ' + engine.listItems().map(i => i.id).join(', '))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">all ids</button>
          </div>
        </div>
      )}

      {tab === 'Recommend' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">user id<input value={userId} onChange={e => setUserId(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">top k<input value={topK} onChange={e => setTopK(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">interests (csv)<input value={interests} onChange={e => setInterests(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">recent views (csv)<input value={recentViews} onChange={e => setRecentViews(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">strategy (blank=auto)<input value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">filter category<input value={filterCat} onChange={e => setFilterCat(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400 col-span-2">exclude ids (csv)<input value={exclude} onChange={e => setExclude(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { const r = runRecommend(); if (r) setOut(formatResp(r)) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">recommend</button>
            <button onClick={() => {
              const res: RecommendationResponse[] = []
              for (let i = 0; i < 10; i++) {
                const r = runRecommend({ requestId: 'b-' + i })
                if (r) res.push(r)
              }
              setOut('batch 10 results:\n' + res.map(r => '  ' + r.requestId + ' strategy=' + r.strategy + ' top1=' + (r.recommendations[0]?.itemId ?? '-')).join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">batch x10</button>
            <button onClick={() => {
              const r = runRecommend({ requestId: 'cat-test', user: { userId, interests: ['tech'] } })
              if (r) setOut('tech-only filter:\n' + formatResp(r))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">force tech interest</button>
            <button onClick={() => { engine.clearCache(); setOut('cache cleared, size=' + engine.cacheSize()) }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">clear cache</button>
          </div>
        </div>
      )}

      {tab === 'Signals' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const signals: UserSignal[] = [
                { userId: 'u1', itemId: 'p1', type: 'view', at: 1 },
                { userId: 'u1', itemId: 'p5', type: 'view', at: 2 },
                { userId: 'u1', itemId: 'p2', type: 'view', at: 3 },
                { userId: 'u1', itemId: 'p5', type: 'purchase', at: 4 },
                { userId: 'u2', itemId: 'p1', type: 'view', at: 5 },
                { userId: 'u2', itemId: 'p5', type: 'view', at: 6 },
                { userId: 'u2', itemId: 'p8', type: 'view', at: 7 },
              ]
              engine.addSignals(signals)
              engine.rebuildCoOccurrence()
              setOut('added ' + signals.length + ' signals, co-occurrence rebuilt')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">seed co-occurrence</button>
            <button onClick={() => {
              const r = runRecommend({ requestId: 'co', user: { userId: 'u1', recentViews: ['p1'] } })
              if (r) setOut('with co-occurrence:\n' + formatResp(r))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">recommend w/ co</button>
            <button onClick={() => {
              const r = runRecommend({ requestId: 'hist', user: { userId: 'u1', recentViews: ['p1', 'p5'] } })
              if (r) setOut('with history:\n' + formatResp(r))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">recommend w/ history</button>
            <button onClick={() => {
              const sigs: UserSignal[] = []
              for (let i = 0; i < 50; i++) {
                const id = ['p1', 'p2', 'p5', 'p8'][Math.floor(Math.random() * 4)]
                const types: UserSignal['type'][] = ['view', 'click', 'purchase']
                sigs.push({ userId: 'u' + (i % 5), itemId: id, type: types[i % 3], at: i })
              }
              engine.addSignals(sigs)
              setOut('bulk added ' + sigs.length + ' signals')
            }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">bulk signals (50)</button>
          </div>
        </div>
      )}

      {tab === 'A/B' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              engine.setAbRules([
                { name: 'hybrid', weight: 1 },
                { name: 'vector-only', weight: 1 },
                { name: 'popularity-only', weight: 1 },
              ])
              const counts: Record<string, number> = {}
              for (let i = 0; i < 90; i++) {
                const r = runRecommend({ requestId: 'ab-' + i })
                if (r) counts[r.strategy] = (counts[r.strategy] ?? 0) + 1
              }
              setOut('3-way A/B over 90 requests:\n' + Object.entries(counts).map(([k, v]) => '  ' + k + ': ' + v).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">3-way A/B</button>
            <button onClick={() => {
              engine.setAbRules([{ name: 'vector-only', weight: 1 }])
              setOut('forced 100% vector-only')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">100% vector-only</button>
            <button onClick={() => {
              engine.setAbRules([])
              setOut('cleared A/B, falling back to config default (hybrid)')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">clear A/B</button>
            <button onClick={() => setOut('current rules: ' + JSON.stringify(engine.getAbRules()))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">show rules</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const s = engine.stats_view()
              setOut('total requests: ' + s.totalRequests + '\ncache hits: ' + s.cacheHits + ' (rate ' + (s.hitRate * 100).toFixed(1) + '%)\nmisses: ' + s.cacheMisses + '\navg topK: ' + s.avgTopK.toFixed(1) + '\navg latency: ' + s.avgLatencyMs.toFixed(2) + 'ms\ndiversity: ' + s.diversityScore.toFixed(3))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">overall</button>
            <button onClick={() => setOut('by strategy:\n' + Object.entries(engine.stats_view().byStrategy).map(([k, v]) => '  ' + k + ': ' + v).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">by strategy</button>
            <button onClick={() => {
              const exposure = engine.stats_view().itemExposure
              const sorted = Object.entries(exposure).sort((a, b) => b[1] - a[1])
              setOut('item exposure (top 5):\n' + sorted.slice(0, 5).map(([k, v]) => '  ' + k + ': ' + v).join('\n') + (sorted.length > 5 ? '\n... (' + (sorted.length - 5) + ' more)' : ''))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">item exposure</button>
            <button onClick={() => {
              const u1 = engine.recommend({ requestId: 'recall', user: { userId: 'u1', recentViews: ['p1', 'p5'] }, topK: 3 })
              const recall = engine.estimateRecall(['p1', 'p5', 'p8'], u1.recommendations)
              setOut('recall@3 vs ground truth [p1,p5,p8]: ' + (recall * 100).toFixed(1) + '%\npredicted: ' + u1.recommendations.map((r: ScoredItem) => r.itemId).join(', '))
            }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">recall estimate</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see recommendation operations'}</pre>
    </div>
  )
}
