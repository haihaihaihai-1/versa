/**
 * Versa · ML Pipeline UI (v22.0)
 * - 数据集管理
 * - 训练可视化
 * - 模型注册表
 * - A/B 测试
 */
import { useEffect, useState, useMemo } from 'react'
import { Database, Brain, GitBranch, Beaker, Sparkles, Play, Plus, Check, X } from 'lucide-react'
import { Card, CardBody, CardHeader, Tabs, Button, Input, Badge, Alert, HStack, Spacer } from '../design-system/components'
import {
  parseCSV, parseJSONL, splitDataset,
  modelRegistry, abTesting, featureStore,
  trainModel,
  evaluateClassification, evaluateRegression,
  type Dataset, type DatasetRow, type ModelVersion, type TrainingConfig, type TrainingResult, type ABExperiment,
} from './index'
import { cn } from '../lib/utils'

function Sparkline({ data, color = 'violet', height = 40 }: { data: number[]; color?: 'violet' | 'amber' | 'emerald' | 'rose'; height?: number }) {
  if (data.length === 0) return <div className="h-10" />
  const w = 240
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const colors = { violet: '#8b5cf6', amber: '#f59e0b', emerald: '#10b981', rose: '#ef4444' }
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={colors[color]} strokeWidth="1.5" />
    </svg>
  )
}

export function MLPipelinePage() {
  const [tab, setTab] = useState<'overview' | 'dataset' | 'training' | 'models' | 'ab'>('overview')
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-violet-500" /> ML 训练流水线 <span className="text-sm font-normal text-ink-500">v22.0</span>
        </h1>
        <p className="text-sm text-ink-500 mt-1">数据集 · 训练 · 模型注册表 · A/B 测试</p>
      </header>

      <nav className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'overview', label: <><Sparkles className="w-3.5 h-3.5" /> 概览</> },
            { value: 'dataset', label: <><Database className="w-3.5 h-3.5" /> 数据集</> },
            { value: 'training', label: <><Play className="w-3.5 h-3.5" /> 训练</> },
            { value: 'models', label: <><GitBranch className="w-3.5 h-3.5" /> 模型</> },
            { value: 'ab', label: <><Beaker className="w-3.5 h-3.5" /> A/B</> },
          ]}
          variant="underline"
        />
      </nav>

      {tab === 'overview' && <Overview />}
      {tab === 'dataset' && <DatasetPanel />}
      {tab === 'training' && <TrainingPanel />}
      {tab === 'models' && <ModelRegistryPanel />}
      {tab === 'ab' && <ABTestPanel />}
    </div>
  )
}

function Overview() {
  return (
    <div className="space-y-4">
      <Alert kind="info" title="ML 流水线">
        完整的端到端 ML 能力:数据集管理 → 训练 → 模型注册 → 评估 → A/B 测试。
        所有计算均在浏览器端完成,无需后端。
      </Alert>
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { title: '数据集', icon: Database, items: ['CSV/JSONL 解析', 'train/val/test 切分', '可重现随机种子'] },
          { title: '训练', icon: Play, items: ['SGD/Adam/AdamW', '早停机制', 'Loss 曲线记录'] },
          { title: '评估', icon: GitBranch, items: ['Accuracy/F1/Precision/Recall', 'MSE/MAE/R²', '模型对比'] },
          { title: '模型注册', icon: GitBranch, items: ['版本管理', 'Lineage 追踪', 'Tags/Status'] },
          { title: 'A/B 测试', icon: Beaker, items: ['权重流量切分', '指标统计', 'z-test 显著性'] },
          { title: 'Feature Store', icon: Sparkles, items: ['在线 KV 存储', 'TTL 过期', '批量读取'] },
        ].map((c) => (
          <Card key={c.title}>
            <CardBody>
              <HStack>
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <c.icon className="w-4 h-4 text-violet-500" />
                </div>
                <div className="font-semibold">{c.title}</div>
              </HStack>
              <ul className="mt-3 space-y-1 text-xs text-ink-500">
                {c.items.map((it) => <li key={it}>• {it}</li>)}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

function DatasetPanel() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [csvText, setCsvText] = useState('')
  const [splits, setSplits] = useState<ReturnType<typeof splitDataset> | null>(null)

  const onLoadSample = () => {
    const sample = `feature_a,feature_b,label
0.5,1.2,1
0.1,0.3,0
0.8,1.5,1
0.2,0.4,0
0.9,1.8,1
0.3,0.5,0
0.7,1.4,1
0.4,0.6,0
0.6,1.0,1
0.0,0.2,0
0.5,1.1,1
0.2,0.4,0`
    setCsvText(sample)
  }

  const onParse = () => {
    try {
      const ds = parseCSV(csvText, 'label')
      setDataset(ds)
      setSplits(splitDataset(ds))
    } catch (e: any) {
      alert('解析失败: ' + e.message)
    }
  }

  const onParseJSONL = () => {
    const text = csvText
    try {
      const ds = parseJSONL(text)
      setDataset(ds)
      setSplits(splitDataset(ds))
    } catch (e: any) {
      alert('JSONL 解析失败: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2"><Database className="w-4 h-4" /> 数据导入</h3>
        </CardHeader>
        <CardBody>
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={onLoadSample}>加载示例</Button>
            <Button size="sm" onClick={onParse}>解析 CSV</Button>
            <Button size="sm" variant="ghost" onClick={onParseJSONL}>解析 JSONL</Button>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="粘贴 CSV (首行表头, 含 label 列) 或 JSONL…"
            className="w-full h-40 px-3 py-2 rounded-xl bg-ink-50 dark:bg-ink-800/30 font-mono text-xs outline-none"
          />
        </CardBody>
      </Card>

      {dataset && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">数据集概览</h3>
          </CardHeader>
          <CardBody>
            <HStack className="flex-wrap gap-3 text-sm">
              <span><b>{dataset.rows.length}</b> 行</span>
              <span><b>{dataset.features.length}</b> 特征 ({dataset.features.join(', ')})</span>
              <Badge tone="primary">{dataset.task}</Badge>
              {splits && (
                <>
                  <Badge tone="info">train: {splits.train.length}</Badge>
                  <Badge tone="warning">val: {splits.val.length}</Badge>
                  <Badge tone="success">test: {splits.test.length}</Badge>
                </>
              )}
            </HStack>

            {splits && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-ink-500">
                    <tr>
                      <th className="p-1 text-left">ID</th>
                      {dataset.features.map((f) => <th key={f} className="p-1 text-left">{f}</th>)}
                      <th className="p-1 text-left">label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.train.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-t border-ink-100 dark:border-ink-800/50">
                        <td className="p-1 font-mono">{r.id}</td>
                        {dataset.features.map((f) => <td key={f} className="p-1 font-mono">{r.features[f]}</td>)}
                        <td className="p-1"><Badge tone={r.label ? 'success' : 'neutral'}>{String(r.label)}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function TrainingPanel() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TrainingResult | null>(null)
  const [config, setConfig] = useState<TrainingConfig>({
    epochs: 30,
    batchSize: 32,
    learningRate: 0.001,
    optimizer: 'adam',
    earlyStoppingPatience: 5,
  })

  const start = async () => {
    setRunning(true)
    setResult(null)
    // 用示例数据
    const ds = parseCSV('feature_a,feature_b,label\n0.5,1.2,1\n0.1,0.3,0\n0.8,1.5,1\n0.2,0.4,0\n0.9,1.8,1\n0.3,0.5,0\n0.7,1.4,1\n0.4,0.6,0\n0.6,1.0,1\n0.0,0.2,0\n0.5,1.1,1\n0.2,0.4,0\n0.7,1.3,1\n0.1,0.3,0\n0.8,1.6,1\n0.3,0.5,0\n0.6,1.2,1\n0.4,0.6,0\n0.9,1.7,1\n0.0,0.2,0', 'label')
    const splits = splitDataset(ds, { train: 0.7, val: 0.15, test: 0.15 })
    const r = await trainModel(config, splits.train, splits.val, 'demo-classifier')
    setResult(r)
    setRunning(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2"><Play className="w-4 h-4" /> 训练配置</h3>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-ink-500">Epochs</label>
              <Input type="number" value={config.epochs} onChange={(e) => setConfig({ ...config, epochs: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-ink-500">Batch Size</label>
              <Input type="number" value={config.batchSize} onChange={(e) => setConfig({ ...config, batchSize: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-ink-500">Learning Rate</label>
              <Input type="number" step="0.0001" value={config.learningRate} onChange={(e) => setConfig({ ...config, learningRate: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-ink-500">Optimizer</label>
              <select
                value={config.optimizer}
                onChange={(e) => setConfig({ ...config, optimizer: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-sm"
              >
                <option value="sgd">SGD</option>
                <option value="adam">Adam</option>
                <option value="adamw">AdamW</option>
                <option value="rmsprop">RMSProp</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-500">Early Stop Patience</label>
              <Input type="number" value={config.earlyStoppingPatience || 0} onChange={(e) => setConfig({ ...config, earlyStoppingPatience: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={start} loading={running} disabled={running}>
            {running ? '训练中…' : '开始训练'}
          </Button>
        </CardBody>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">训练结果</h3>
          </CardHeader>
          <CardBody>
            <HStack className="flex-wrap gap-3 text-sm mb-3">
              <Badge tone="success">Best Epoch: {result.bestEpoch}</Badge>
              <Badge tone="info">Best Metric: {result.bestMetric.toFixed(4)}</Badge>
              <Badge tone="warning">Duration: {result.durationMs}ms</Badge>
              <Badge tone="neutral">Steps: {result.steps.length}</Badge>
            </HStack>
            <div className="text-xs text-ink-500 mb-1">Loss 曲线</div>
            <Sparkline data={result.steps.map((s) => s.loss)} color="violet" height={60} />
            <div className="text-xs text-ink-500 mt-2 mb-1">Val Loss</div>
            <Sparkline data={result.steps.map((s) => s.valLoss || 0)} color="amber" height={60} />
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function ModelRegistryPanel() {
  const [models, setModels] = useState<ModelVersion[]>(modelRegistry.list())
  const [diff, setDiff] = useState<{ a: ModelVersion; b: ModelVersion; metrics: Record<string, [number, number, number]> } | null>(null)

  useEffect(() => {
    return modelRegistry.subscribe(() => setModels(modelRegistry.list()))
  }, [])

  const addDemo = () => {
    modelRegistry.register({
      name: 'demo-classifier',
      version: '1.0.' + Date.now(),
      task: 'classification',
      metrics: { accuracy: 0.85 + Math.random() * 0.1, f1: 0.83 + Math.random() * 0.1, precision: 0.84, recall: 0.82 },
      params: { lr: 0.001, epochs: 30 },
      tags: ['production', 'baseline'],
    })
  }

  const onCompare = (a: ModelVersion, b: ModelVersion) => {
    const d = modelRegistry.diff(a.id, b.id)
    setDiff({ a, b, metrics: d.metrics })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <HStack>
            <h3 className="font-semibold flex items-center gap-2"><GitBranch className="w-4 h-4" /> 模型注册表</h3>
            <Spacer />
            <Button size="sm" onClick={addDemo}>注册演示</Button>
          </HStack>
        </CardHeader>
        <CardBody>
          {models.length === 0 ? (
            <p className="text-sm text-ink-500">暂无模型,点击 "注册演示" 创建</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500">
                  <tr>
                    <th className="p-2 text-left">名称</th>
                    <th className="p-2 text-left">版本</th>
                    <th className="p-2 text-left">状态</th>
                    <th className="p-2 text-right">Accuracy</th>
                    <th className="p-2 text-right">F1</th>
                    <th className="p-2 text-left">Tags</th>
                    <th className="p-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id} className="border-t border-ink-100 dark:border-ink-800/50">
                      <td className="p-2 font-mono text-xs">{m.name}</td>
                      <td className="p-2 font-mono text-xs">{m.version}</td>
                      <td className="p-2">
                        <Badge tone={m.status === 'ready' ? 'success' : m.status === 'training' ? 'warning' : 'neutral'}>{m.status}</Badge>
                      </td>
                      <td className="p-2 text-right font-mono">{(m.metrics.accuracy ?? 0).toFixed(4)}</td>
                      <td className="p-2 text-right font-mono">{(m.metrics.f1 ?? 0).toFixed(4)}</td>
                      <td className="p-2">
                        {m.tags.map((t) => <Badge key={t} tone="info" className="mr-1">{t}</Badge>)}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => {
                            const others = models.filter((x) => x.id !== m.id)
                            if (others.length > 0) onCompare(m, others[0])
                          }}
                          className="text-xs text-violet-500 hover:underline"
                        >
                          对比
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {diff && (
        <Card>
          <CardHeader><h3 className="font-semibold">对比 {diff.a.version} vs {diff.b.version}</h3></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500">
                <tr><th className="p-2 text-left">指标</th><th className="p-2 text-right">A</th><th className="p-2 text-right">B</th><th className="p-2 text-right">Δ</th></tr>
              </thead>
              <tbody>
                {Object.entries(diff.metrics).map(([k, [a, b, d]]) => (
                  <tr key={k} className="border-t border-ink-100 dark:border-ink-800/50">
                    <td className="p-2 font-mono">{k}</td>
                    <td className="p-2 text-right font-mono">{a.toFixed(4)}</td>
                    <td className="p-2 text-right font-mono">{b.toFixed(4)}</td>
                    <td className={cn('p-2 text-right font-mono', d > 0 ? 'text-emerald-500' : d < 0 ? 'text-rose-500' : '')}>
                      {d > 0 ? '+' : ''}{d.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function ABTestPanel() {
  const [exps, setExps] = useState<ABExperiment[]>(abTesting.list())
  const [selected, setSelected] = useState<ABExperiment | null>(null)

  useEffect(() => {
    return abTesting.subscribe(() => setExps(abTesting.list()))
  }, [])

  const createDemo = () => {
    const exp = abTesting.create({
      name: 'A/B Test ' + (exps.length + 1),
      variants: [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ],
    })
    setSelected(exp)
  }

  const record = (variant: string) => {
    if (!selected) return
    abTesting.record(selected.id, variant, Math.random() * 0.4 + 0.5)
  }

  const recordMany = () => {
    if (!selected) return
    for (let i = 0; i < 30; i++) {
      const v = abTesting.pickVariant(selected.id)
      if (v) abTesting.record(selected.id, v, Math.random() * (v === 'treatment' ? 0.45 : 0.35) + 0.5)
    }
  }

  const compare = () => {
    if (!selected) return null
    return abTesting.compare(selected.id, 'control', 'treatment')
  }

  const c = compare()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <HStack>
            <h3 className="font-semibold flex items-center gap-2"><Beaker className="w-4 h-4" /> A/B 实验</h3>
            <Spacer />
            <Button size="sm" onClick={createDemo}>新建实验</Button>
          </HStack>
        </CardHeader>
        <CardBody>
          {exps.length === 0 ? (
            <p className="text-sm text-ink-500">暂无实验</p>
          ) : (
            <div className="space-y-2">
              {exps.map((e) => (
                <div key={e.id} onClick={() => setSelected(e)} className={cn('p-3 rounded-xl border cursor-pointer transition-colors', selected?.id === e.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-ink-200/50 dark:border-ink-700/50')}>
                  <HStack>
                    <div className="font-semibold text-sm">{e.name}</div>
                    <Badge tone={e.status === 'running' ? 'success' : 'neutral'}>{e.status}</Badge>
                    <Spacer />
                    <div className="text-xs text-ink-500">{Object.values(e.metrics).reduce((s, a) => s + a.length, 0)} 样本</div>
                  </HStack>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{selected.name}</h3>
          </CardHeader>
          <CardBody>
            <HStack className="flex-wrap gap-2 mb-3">
              <Button size="sm" onClick={recordMany}>记录 30 个样本</Button>
              <Button size="sm" variant="outline" onClick={() => record('control')}>+ control</Button>
              <Button size="sm" variant="outline" onClick={() => record('treatment')}>+ treatment</Button>
              {c && (
                <Badge tone={c.significant ? 'success' : 'neutral'}>
                  {c.significant ? '显著' : '不显著'} (Δ={c.diff.toFixed(4)})
                </Badge>
              )}
            </HStack>

            {Object.entries(selected.metrics).map(([v, arr]) => (
              <div key={v} className="mt-2">
                <HStack>
                  <div className="text-sm font-semibold">{v}</div>
                  <Badge>{arr.length} 样本</Badge>
                  {arr.length > 0 && <div className="text-xs text-ink-500">avg: {(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(4)}</div>}
                </HStack>
                {arr.length > 0 && <Sparkline data={arr} color={v === 'control' ? 'amber' : 'violet'} height={40} />}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
