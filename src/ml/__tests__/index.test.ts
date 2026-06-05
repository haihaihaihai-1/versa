// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseCSV, parseJSONL, splitDataset,
  modelRegistry, abTesting, featureStore,
  trainModel, evaluateClassification, evaluateRegression,
  type Dataset,
} from '../index'

beforeEach(() => {
  // 清理
  featureStore.clear()
  for (const m of modelRegistry.list()) modelRegistry.update(m.id, { status: 'archived' })
  for (const e of abTesting.list()) abTesting.conclude(e.id)
})

const SAMPLE_CSV = `feature_a,feature_b,label
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

const SAMPLE_JSONL = `{"feature_a":0.5,"feature_b":1.2,"label":1}
{"feature_a":0.1,"feature_b":0.3,"label":0}
{"feature_a":0.8,"feature_b":1.5,"label":1}`

describe('parseCSV', () => {
  it('解析基础 CSV', () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    expect(ds.rows.length).toBe(12)
    expect(ds.features).toEqual(['feature_a', 'feature_b'])
    expect(ds.rows[0].label).toBe(1)
    expect(ds.rows[1].label).toBe(0)
  })

  it('数值自动转换', () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    expect(typeof ds.rows[0].features.feature_a).toBe('number')
  })

  it('空 CSV 抛错', () => {
    expect(() => parseCSV('a,b\n', 'label')).toThrow()
  })

  it('自定义 label 列', () => {
    const csv = 'x,y,target\n1,2,1\n3,4,0'
    const ds = parseCSV(csv, 'target')
    expect(ds.rows[0].label).toBe(1)
    expect(ds.features).toEqual(['x', 'y'])
  })
})

describe('parseJSONL', () => {
  it('解析 JSONL', () => {
    const ds = parseJSONL(SAMPLE_JSONL)
    expect(ds.rows.length).toBe(3)
    expect(ds.rows[0].label).toBe(1)
  })

  it('坏 JSON 抛错', () => {
    expect(() => parseJSONL('not json\n{')).toThrow()
  })
})

describe('splitDataset', () => {
  it('默认 70/15/15 切分', () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    const s = splitDataset(ds)
    expect(s.train.length).toBeGreaterThan(0)
    expect(s.val.length).toBeGreaterThan(0)
    expect(s.test.length).toBeGreaterThan(0)
    expect(s.train.length + s.val.length + s.test.length).toBe(ds.rows.length)
  })

  it('可重现 (同 seed)', () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    const a = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 }, 42)
    const b = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 }, 42)
    expect(a.train.map((r) => r.id)).toEqual(b.train.map((r) => r.id))
  })

  it('不同 seed 顺序不同', () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    const a = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 }, 1)
    const b = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 }, 99)
    expect(a.train[0]?.id).not.toBe(b.train[0]?.id)
  })

  it('比例不为 1 抛错', () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    expect(() => splitDataset(ds, { train: 0.5, val: 0.5, test: 0.5 })).toThrow()
  })
})

describe('evaluateClassification', () => {
  it('完美预测', () => {
    const r = evaluateClassification([1, 0, 1, 0], [1, 0, 1, 0])
    expect(r.accuracy).toBe(1)
    expect(r.f1).toBe(1)
  })

  it('一半正确', () => {
    const r = evaluateClassification([1, 0, 0, 1], [1, 0, 1, 0])
    expect(r.accuracy).toBe(0.5)
  })

  it('全部正预测', () => {
    const r = evaluateClassification([1, 1, 1, 1], [1, 0, 1, 0])
    expect(r.accuracy).toBe(0.5)
  })

  it('长度不匹配抛错', () => {
    expect(() => evaluateClassification([1, 0], [1])).toThrow()
  })
})

describe('evaluateRegression', () => {
  it('完美预测 → R² = 1', () => {
    const r = evaluateRegression([1, 2, 3], [1, 2, 3])
    expect(r.r2).toBeCloseTo(1, 5)
    expect(r.mse).toBe(0)
  })

  it('MSE 计算', () => {
    const r = evaluateRegression([1, 2], [2, 4])
    expect(r.mse).toBe((1 + 4) / 2)
    expect(r.mae).toBe((1 + 2) / 2)
  })
})

describe('modelRegistry', () => {
  it('register + list', () => {
    const m = modelRegistry.register({
      name: 'test', version: '1.0', task: 'classification',
      metrics: { accuracy: 0.9 }, params: {}, tags: [],
    })
    expect(m.id).toBeTruthy()
    expect(modelRegistry.list().length).toBeGreaterThan(0)
  })

  it('list 过滤 name', () => {
    modelRegistry.register({ name: 'a', version: '1', task: 'classification', metrics: {}, params: {}, tags: [] })
    modelRegistry.register({ name: 'b', version: '1', task: 'classification', metrics: {}, params: {}, tags: [] })
    expect(modelRegistry.list({ name: 'a' }).every((m) => m.name === 'a')).toBe(true)
  })

  it('list 过滤 tag', () => {
    modelRegistry.register({ name: 'x', version: '1', task: 'classification', metrics: {}, params: {}, tags: ['prod'] })
    modelRegistry.register({ name: 'y', version: '1', task: 'classification', metrics: {}, params: {}, tags: ['dev'] })
    expect(modelRegistry.list({ tag: 'prod' }).every((m) => m.tags.includes('prod'))).toBe(true)
  })

  it('update', () => {
    const m = modelRegistry.register({ name: 'u', version: '1', task: 'classification', metrics: {}, params: {}, tags: [] })
    modelRegistry.update(m.id, { status: 'archived' })
    expect(modelRegistry.get(m.id)!.status).toBe('archived')
  })

  it('latest', () => {
    const a = modelRegistry.register({ name: 'll', version: '1', task: 'classification', metrics: {}, params: {}, tags: [] })
    const b = modelRegistry.register({ name: 'll', version: '2', task: 'classification', metrics: {}, params: {}, tags: [] })
    expect(modelRegistry.latest('ll')!.id).toBe(b.id)
    expect(a.id).not.toBe(b.id)
  })

  it('diff', () => {
    const a = modelRegistry.register({ name: 'd', version: '1', task: 'classification', metrics: { accuracy: 0.8, f1: 0.7 }, params: {}, tags: [] })
    const b = modelRegistry.register({ name: 'd', version: '2', task: 'classification', metrics: { accuracy: 0.9, f1: 0.8 }, params: {}, tags: [] })
    const r = modelRegistry.diff(a.id, b.id)
    expect(r.metrics.accuracy[2]).toBeCloseTo(0.1, 5)
    expect(r.metrics.f1[2]).toBeCloseTo(0.1, 5)
  })
})

describe('trainModel', () => {
  it('跑完指定 epochs', async () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    const s = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 })
    const r = await trainModel({ epochs: 5, batchSize: 4, learningRate: 0.001, optimizer: 'adam' }, s.train, s.val, 'test')
    expect(r.steps.length).toBe(5)
    expect(r.modelId).toBeTruthy()
    expect(r.bestEpoch).toBeGreaterThan(0)
  })

  it('早停', async () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    const s = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 })
    const r = await trainModel({ epochs: 50, batchSize: 4, learningRate: 0.001, optimizer: 'adam', earlyStoppingPatience: 3 }, s.train, s.val, 'early-stop')
    expect(r.steps.length).toBeLessThan(50)
  })

  it('loss 单调下降趋势', async () => {
    const ds = parseCSV(SAMPLE_CSV, 'label')
    const s = splitDataset(ds, { train: 0.5, val: 0.3, test: 0.2 })
    const r = await trainModel({ epochs: 20, batchSize: 4, learningRate: 0.001, optimizer: 'adam' }, s.train, s.val, 'monotonic')
    const first5 = r.steps.slice(0, 5).reduce((s, x) => s + x.loss, 0) / 5
    const last5 = r.steps.slice(-5).reduce((s, x) => s + x.loss, 0) / 5
    expect(last5).toBeLessThan(first5)
  })
})

describe('abTesting', () => {
  it('create + list', () => {
    const e = abTesting.create({
      name: 'exp1',
      variants: [
        { name: 'a', weight: 1 },
        { name: 'b', weight: 1 },
      ],
    })
    expect(e.id).toBeTruthy()
    expect(abTesting.list().length).toBeGreaterThan(0)
  })

  it('pickVariant 按权重', () => {
    const e = abTesting.create({
      name: 'weighted',
      variants: [
        { name: 'a', weight: 100 },
        { name: 'b', weight: 1 },
      ],
    })
    let aCount = 0
    for (let i = 0; i < 100; i++) {
      if (abTesting.pickVariant(e.id) === 'a') aCount++
    }
    expect(aCount).toBeGreaterThan(80)
  })

  it('record + compare', () => {
    const e = abTesting.create({
      name: 'cmp',
      variants: [
        { name: 'a', weight: 1 },
        { name: 'b', weight: 1 },
      ],
    })
    for (let i = 0; i < 30; i++) abTesting.record(e.id, 'a', 0.5)
    for (let i = 0; i < 30; i++) abTesting.record(e.id, 'b', 0.7)
    const c = abTesting.compare(e.id, 'a', 'b')
    expect(c).not.toBeNull()
    expect(c!.diff).toBeCloseTo(0.2, 5)
    expect(c!.significant).toBe(true)
  })

  it('conclude', () => {
    const e = abTesting.create({
      name: 'c',
      variants: [{ name: 'a', weight: 1 }],
    })
    abTesting.conclude(e.id)
    expect(abTesting.get(e.id)!.status).toBe('concluded')
  })
})

describe('featureStore', () => {
  it('set + get', () => {
    featureStore.set('a', 42)
    expect(featureStore.get('a')).toBe(42)
  })

  it('TTL 过期', async () => {
    featureStore.set('b', 'x', 50)
    expect(featureStore.get('b')).toBe('x')
    await new Promise((r) => setTimeout(r, 80))
    expect(featureStore.get('b')).toBeUndefined()
  })

  it('has / delete', () => {
    featureStore.set('c', 1)
    expect(featureStore.has('c')).toBe(true)
    featureStore.delete('c')
    expect(featureStore.has('c')).toBe(false)
  })

  it('size + clear', () => {
    featureStore.set('x', 1)
    featureStore.set('y', 2)
    expect(featureStore.size()).toBe(2)
    featureStore.clear()
    expect(featureStore.size()).toBe(0)
  })
})
