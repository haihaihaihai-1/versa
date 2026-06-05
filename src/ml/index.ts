/**
 * Versa · ML 训练流水线 (v22.0)
 *
 * 能力:
 * - 数据集管理 (CSV/JSONL 解析, 切分 train/val/test)
 * - 模型注册表 (versioning, lineage, 评估指标)
 * - 训练任务 (synthetic steps, metrics 记录)
 * - A/B 测试 (流量切分, 指标对比)
 * - 模型部署 (canary 策略)
 * - 评估指标 (accuracy/F1/precision/recall/MSE/MAE)
 */

export type TaskType = 'classification' | 'regression' | 'ranking' | 'generation' | 'embedding'

// ============== Dataset ==============

export interface DatasetRow {
  id: string
  features: Record<string, any>
  label?: any
  weight?: number
  group?: string
}

export interface Dataset {
  id: string
  name: string
  task: TaskType
  rows: DatasetRow[]
  features: string[]
  createdAt: number
  metadata?: Record<string, any>
}

export function parseCSV(text: string, labelCol = 'label'): Dataset {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV must have header + at least 1 row')
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows: DatasetRow[] = lines.slice(1).map((line, i) => {
    const cells = line.split(',')
    const features: Record<string, any> = {}
    let label: any = undefined
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j]
      const v = cells[j]?.trim() ?? ''
      if (h === labelCol) {
        const num = Number(v)
        label = isNaN(num) ? v : num
      } else {
        features[h] = isNaN(Number(v)) || v === '' ? v : Number(v)
      }
    }
    return { id: 'r_' + i, features, label }
  })
  return {
    id: 'ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: 'imported-' + Date.now(),
    task: 'classification',
    rows,
    features: headers.filter((h) => h !== labelCol),
    createdAt: Date.now(),
  }
}

export function parseJSONL(text: string): Dataset {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const rows: DatasetRow[] = lines.map((line, i) => {
    const obj = JSON.parse(line)
    const { label, ...features } = obj
    return { id: 'r_' + i, features, label }
  })
  const features = rows[0] ? Object.keys(rows[0].features) : []
  return {
    id: 'ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: 'jsonl-' + Date.now(),
    task: 'classification',
    rows,
    features,
    createdAt: Date.now(),
  }
}

export function splitDataset(
  ds: Dataset,
  ratios = { train: 0.7, val: 0.15, test: 0.15 },
  seed = 42
): { train: DatasetRow[]; val: DatasetRow[]; test: DatasetRow[] } {
  if (Math.abs(ratios.train + ratios.val + ratios.test - 1) > 1e-6) {
    throw new Error('Ratios must sum to 1')
  }
  // Deterministic shuffle
  const rng = mulberry32(seed)
  const shuffled = [...ds.rows].sort(() => rng() - 0.5)
  const n = shuffled.length
  const nTrain = Math.floor(n * ratios.train)
  const nVal = Math.floor(n * ratios.val)
  return {
    train: shuffled.slice(0, nTrain),
    val: shuffled.slice(nTrain, nTrain + nVal),
    test: shuffled.slice(nTrain + nVal),
  }
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ============== Model Registry ==============

export interface ModelVersion {
  id: string
  name: string
  version: string
  task: TaskType
  parentId?: string
  metrics: Record<string, number>
  params: Record<string, any>
  datasetId?: string
  createdAt: number
  status: 'training' | 'ready' | 'archived' | 'failed'
  tags: string[]
}

class ModelRegistry {
  private models: Map<string, ModelVersion> = new Map()
  private listeners: Set<() => void> = new Set()
  private seq = 0

  register(input: Omit<ModelVersion, 'id' | 'createdAt' | 'status'> & Partial<Pick<ModelVersion, 'status'>>): ModelVersion {
    const m: ModelVersion = {
      ...input,
      id: 'mod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      createdAt: Date.now() * 1000 + (this.seq++ % 1000),  // 单调递增,即使同 ms 也分先后
      status: input.status || 'ready',
    }
    this.models.set(m.id, m)
    this.notify()
    return m
  }

  get(id: string): ModelVersion | undefined { return this.models.get(id) }

  list(filter?: { name?: string; task?: TaskType; tag?: string }): ModelVersion[] {
    let r = Array.from(this.models.values())
    if (filter?.name) r = r.filter((m) => m.name === filter.name)
    if (filter?.task) r = r.filter((m) => m.task === filter.task)
    if (filter?.tag) r = r.filter((m) => m.tags.includes(filter.tag!))
    return r.sort((a, b) => b.createdAt - a.createdAt)
  }

  update(id: string, patch: Partial<ModelVersion>): ModelVersion | undefined {
    const m = this.models.get(id)
    if (!m) return undefined
    Object.assign(m, patch)
    this.notify()
    return m
  }

  archive(id: string) { this.update(id, { status: 'archived' }) }

  /** 找某模型的最新 ready 版本 */
  latest(name: string, task?: TaskType): ModelVersion | undefined {
    const cands = this.list({ name, task }).filter((m) => m.status === 'ready')
    return cands[0]
  }

  /** 比较两个版本 */
  diff(a: string, b: string): { metrics: Record<string, [number, number, number]> } {
    const ma = this.models.get(a)
    const mb = this.models.get(b)
    if (!ma || !mb) throw new Error('Model not found')
    const metrics: Record<string, [number, number, number]> = {}
    const allKeys = new Set([...Object.keys(ma.metrics), ...Object.keys(mb.metrics)])
    for (const k of allKeys) {
      const va = ma.metrics[k] ?? 0
      const vb = mb.metrics[k] ?? 0
      metrics[k] = [va, vb, vb - va]
    }
    return { metrics }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private notify() { this.listeners.forEach((fn) => fn()) }
}

export const modelRegistry = new ModelRegistry()

// ============== Training ==============

export interface TrainingStep {
  epoch: number
  loss: number
  valLoss?: number
  metric?: number
  ts: number
}

export interface TrainingConfig {
  epochs: number
  batchSize: number
  learningRate: number
  optimizer: 'sgd' | 'adam' | 'adamw' | 'rmsprop'
  earlyStoppingPatience?: number
  seed?: number
}

export interface TrainingResult {
  modelId: string
  steps: TrainingStep[]
  bestEpoch: number
  bestMetric: number
  durationMs: number
}

/** 模拟训练 (synthetic) */
export async function trainModel(
  config: TrainingConfig,
  trainRows: DatasetRow[],
  valRows: DatasetRow[],
  baseName = 'model'
): Promise<TrainingResult> {
  const start = Date.now()
  const steps: TrainingStep[] = []
  let bestLoss = Infinity
  let bestEpoch = 0
  let bestMetric = 0
  let patience = 0

  // 注册训练中
  const model = modelRegistry.register({
    name: baseName,
    version: '0.' + Date.now(),
    task: 'classification',
    metrics: {},
    params: { ...config },
    status: 'training',
    tags: ['training'],
  })

  const rng = mulberry32(config.seed || 42)
  for (let epoch = 1; epoch <= config.epochs; epoch++) {
    await new Promise((r) => setTimeout(r, 5))  // 模拟一步训练

    // 合成 loss 曲线 (指数衰减 + 噪声)
    const baseLoss = 1.0 * Math.exp(-epoch / (config.epochs * 0.4))
    const noise = (rng() - 0.5) * 0.1
    const loss = Math.max(0.01, baseLoss + noise)
    const valLoss = loss + (rng() - 0.5) * 0.05
    const metric = 1 - loss + (rng() - 0.5) * 0.02

    steps.push({ epoch, loss, valLoss, metric, ts: Date.now() })

    if (valLoss < bestLoss) {
      bestLoss = valLoss
      bestEpoch = epoch
      bestMetric = metric
      patience = 0
    } else {
      patience++
      if (config.earlyStoppingPatience && patience >= config.earlyStoppingPatience) {
        break
      }
    }
  }

  const final = { accuracy: bestMetric, val_loss: bestLoss, epochs_trained: steps.length }
  modelRegistry.update(model.id, { status: 'ready', metrics: final })

  return {
    modelId: model.id,
    steps,
    bestEpoch,
    bestMetric,
    durationMs: Date.now() - start,
  }
}

// ============== Evaluation ==============

export function evaluateClassification(predictions: any[], labels: any[]): Record<string, number> {
  if (predictions.length !== labels.length) throw new Error('Length mismatch')
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (let i = 0; i < predictions.length; i++) {
    const p = predictions[i]
    const l = labels[i]
    if (p === l && l === 1) tp++
    else if (p === 1 && l === 0) fp++
    else if (p === 0 && l === 1) fn++
    else if (p === l && l === 0) tn++
  }
  const accuracy = (tp + tn) / predictions.length
  const precision = tp / (tp + fp) || 0
  const recall = tp / (tp + fn) || 0
  const f1 = 2 * (precision * recall) / (precision + recall) || 0
  return { accuracy, precision, recall, f1, support: predictions.length }
}

export function evaluateRegression(predictions: number[], labels: number[]): Record<string, number> {
  if (predictions.length !== labels.length) throw new Error('Length mismatch')
  let sumSq = 0, sumAbs = 0, sum = 0
  for (let i = 0; i < predictions.length; i++) {
    const diff = predictions[i] - labels[i]
    sumSq += diff * diff
    sumAbs += Math.abs(diff)
    sum += labels[i]
  }
  const n = predictions.length
  const mean = sum / n
  let ssTot = 0
  for (let i = 0; i < labels.length; i++) ssTot += (labels[i] - mean) ** 2
  return {
    mse: sumSq / n,
    rmse: Math.sqrt(sumSq / n),
    mae: sumAbs / n,
    r2: 1 - sumSq / ssTot,
  }
}

// ============== A/B Test ==============

export interface ABExperiment {
  id: string
  name: string
  variants: { name: string; weight: number; modelId?: string }[]
  metrics: Record<string, number[]>  // 累积指标
  startedAt: number
  status: 'running' | 'concluded'
}

class ABTesting {
  private experiments: Map<string, ABExperiment> = new Map()
  private listeners: Set<() => void> = new Set()

  create(input: Omit<ABExperiment, 'id' | 'metrics' | 'startedAt' | 'status'>): ABExperiment {
    const exp: ABExperiment = {
      ...input,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      metrics: Object.fromEntries(input.variants.map((v) => [v.name, []])),
      startedAt: Date.now(),
      status: 'running',
    }
    this.experiments.set(exp.id, exp)
    this.notify()
    return exp
  }

  get(id: string) { return this.experiments.get(id) }
  list() { return Array.from(this.experiments.values()) }

  /** 根据权重选择变体 */
  pickVariant(expId: string, random = Math.random()): string | undefined {
    const exp = this.experiments.get(expId)
    if (!exp) return undefined
    const total = exp.variants.reduce((s, v) => s + v.weight, 0)
    let r = random * total
    for (const v of exp.variants) {
      r -= v.weight
      if (r <= 0) return v.name
    }
    return exp.variants[exp.variants.length - 1]?.name
  }

  record(expId: string, variant: string, value: number) {
    const exp = this.experiments.get(expId)
    if (!exp) return
    if (!exp.metrics[variant]) exp.metrics[variant] = []
    exp.metrics[variant].push(value)
    this.notify()
  }

  conclude(id: string) {
    const exp = this.experiments.get(id)
    if (exp) exp.status = 'concluded'
    this.notify()
  }

  /** 简单 z-test for two proportions */
  compare(expId: string, variantA: string, variantB: string): { a: number; b: number; diff: number; pValue: number; significant: boolean } | null {
    const exp = this.experiments.get(expId)
    if (!exp) return null
    const a = exp.metrics[variantA] ?? []
    const b = exp.metrics[variantB] ?? []
    if (a.length < 2 || b.length < 2) return null
    const meanA = a.reduce((s, x) => s + x, 0) / a.length
    const meanB = b.reduce((s, x) => s + x, 0) / b.length
    const varA = a.reduce((s, x) => s + (x - meanA) ** 2, 0) / (a.length - 1)
    const varB = b.reduce((s, x) => s + (x - meanB) ** 2, 0) / (b.length - 1)
    const se = Math.sqrt(varA / a.length + varB / b.length)
    const z = se > 0 ? (meanB - meanA) / se : 0
    // 简化: |z| > 1.96 视为显著 (p < 0.05)
    return { a: meanA, b: meanB, diff: meanB - meanA, pValue: 0, significant: Math.abs(z) > 1.96 }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private notify() { this.listeners.forEach((fn) => fn()) }
}

export const abTesting = new ABTesting()

// ============== Feature Store ==============

export interface Feature {
  name: string
  value: any
  ts: number
  ttl?: number
}

class FeatureStore {
  private store: Map<string, Feature> = new Map()

  set(name: string, value: any, ttl?: number) {
    this.store.set(name, { name, value, ts: Date.now(), ttl })
  }

  get(name: string): any | undefined {
    const f = this.store.get(name)
    if (!f) return undefined
    if (f.ttl && Date.now() - f.ts > f.ttl) {
      this.store.delete(name)
      return undefined
    }
    return f.value
  }

  has(name: string) { return this.get(name) !== undefined }
  delete(name: string) { this.store.delete(name) }
  list() { return Array.from(this.store.values()) }
  size() { return this.store.size }
  clear() { this.store.clear() }
}

export const featureStore = new FeatureStore()
