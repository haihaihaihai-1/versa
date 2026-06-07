import { describe, it, expect, beforeEach } from 'vitest'
import { ExperimentTracker, resetExperimentTracker } from '../index'

let t: ExperimentTracker

beforeEach(() => {
  resetExperimentTracker()
  t = new ExperimentTracker()
})

describe('ExperimentTracker', () => {
  it('starts a run with auto id', () => {
    const r = t.startRun({ name: 'exp-1' })
    expect(r.id).toMatch(/run-/)
    expect(r.status).toBe('running')
  })

  it('starts run with explicit id', () => {
    const r = t.startRun({ id: 'r-42', name: 'x' })
    expect(r.id).toBe('r-42')
  })

  it('rejects duplicate id', () => {
    t.startRun({ id: 'r', name: 'x' })
    expect(() => t.startRun({ id: 'r', name: 'y' })).toThrow()
  })

  it('getRun retrieves', () => {
    t.startRun({ id: 'a', name: 'x' })
    expect(t.getRun('a')).toBeDefined()
  })

  it('setParams merges', () => {
    t.startRun({ id: 'a', name: 'x', params: { lr: 0.01 } })
    t.setParams('a', { batch: 32 })
    expect(t.getRun('a')?.params.batch).toBe(32)
  })

  it('logMetric stores metric', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.logMetric('a', 'loss', 0.5)
    expect(t.getRun('a')?.metrics.loss).toBe(0.5)
  })

  it('logMetric with step uses suffix key', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.logMetric('a', 'loss', 0.5, 1)
    expect(t.getRun('a')?.metrics['loss@1']).toBe(0.5)
  })

  it('setMetrics merges', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.setMetrics('a', { acc: 0.9, loss: 0.1 })
    expect(t.getRun('a')?.metrics.acc).toBe(0.9)
  })

  it('addTag is idempotent', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.addTag('a', 'prod')
    t.addTag('a', 'prod')
    expect(t.getRun('a')?.tags).toEqual(['prod'])
  })

  it('removeTag', () => {
    t.startRun({ id: 'a', name: 'x', tags: ['a', 'b'] })
    t.removeTag('a', 'a')
    expect(t.getRun('a')?.tags).toEqual(['b'])
  })

  it('addArtifact stores path', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.addArtifact('a', 'model.pkl')
    expect(t.getRun('a')?.artifacts).toEqual(['model.pkl'])
  })

  it('setNotes', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.setNotes('a', 'best result')
    expect(t.getRun('a')?.notes).toBe('best result')
  })

  it('finishRun sets status and finishedAt', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.finishRun('a', 'completed')
    expect(t.getRun('a')?.status).toBe('completed')
    expect(t.getRun('a')?.finishedAt).toBeDefined()
  })

  it('finishRun default is completed', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.finishRun('a')
    expect(t.getRun('a')?.status).toBe('completed')
  })

  it('deleteRun returns true on success', () => {
    t.startRun({ id: 'a', name: 'x' })
    expect(t.deleteRun('a')).toBe(true)
    expect(t.hasRun('a')).toBe(false)
  })

  it('deleteRun returns false for missing', () => {
    expect(t.deleteRun('nope')).toBe(false)
  })

  it('listRuns filters by status', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.startRun({ id: 'b', name: 'y' })
    t.finishRun('a', 'completed')
    const completed = t.listRuns({ status: 'completed' })
    expect(completed).toHaveLength(1)
  })

  it('listRuns filters by tag', () => {
    t.startRun({ id: 'a', name: 'x', tags: ['prod'] })
    t.startRun({ id: 'b', name: 'y' })
    const prod = t.listRuns({ tag: 'prod' })
    expect(prod).toHaveLength(1)
  })

  it('listRuns filters by name pattern', () => {
    t.startRun({ id: 'a', name: 'exp-mlp' })
    t.startRun({ id: 'b', name: 'exp-rf' })
    const r = t.listRuns({ namePattern: 'mlp' })
    expect(r).toHaveLength(1)
  })

  it('listRuns filters by minMetric', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.logMetric('a', 'acc', 0.8)
    t.finishRun('a', 'completed')
    t.startRun({ id: 'b', name: 'y' })
    t.logMetric('b', 'acc', 0.9)
    t.finishRun('b', 'completed')
    const r = t.listRuns({ minMetric: { key: 'acc', value: 0.85 } })
    expect(r).toHaveLength(1)
    expect(r[0]!.id).toBe('b')
  })

  it('listRuns filters by time range', () => {
    const before = Date.now()
    t.startRun({ id: 'a', name: 'x' })
    t.finishRun('a', 'completed')
    const r = t.listRuns({ startedAfter: before })
    expect(r).toHaveLength(1)
  })

  it('listRuns returns sorted by startedAt desc', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.startRun({ id: 'b', name: 'y' })
    const r = t.listRuns()
    expect(r[0]!.id).toBe('b')
  })

  it('bestRun picks max', () => {
    t.startRun({ id: 'a', name: 'x' }); t.logMetric('a', 'acc', 0.7); t.finishRun('a')
    t.startRun({ id: 'b', name: 'y' }); t.logMetric('b', 'acc', 0.9); t.finishRun('b')
    const r = t.bestRun('acc', 'max')
    expect(r!.id).toBe('b')
  })

  it('bestRun picks min', () => {
    t.startRun({ id: 'a', name: 'x' }); t.logMetric('a', 'loss', 0.7); t.finishRun('a')
    t.startRun({ id: 'b', name: 'y' }); t.logMetric('b', 'loss', 0.1); t.finishRun('b')
    const r = t.bestRun('loss', 'min')
    expect(r!.id).toBe('b')
  })

  it('bestRun returns null when no completed', () => {
    t.startRun({ id: 'a', name: 'x' })
    expect(t.bestRun('acc')).toBeNull()
  })

  it('compare builds table', () => {
    t.startRun({ id: 'a', name: 'x' }); t.logMetric('a', 'acc', 0.8); t.logMetric('a', 'loss', 0.2); t.finishRun('a')
    t.startRun({ id: 'b', name: 'y' }); t.logMetric('b', 'acc', 0.9); t.finishRun('b')
    const c = t.compare(['a', 'b'], ['acc', 'loss'])
    expect(c.table).toHaveLength(2)
    expect(c.table[0]!.values.a).toBe(0.8)
    expect(c.table[1]!.values.b).toBeNull()
  })

  it('countByStatus', () => {
    t.startRun({ id: 'a', name: 'x' }); t.finishRun('a', 'completed')
    t.startRun({ id: 'b', name: 'y' }); t.finishRun('b', 'failed')
    t.startRun({ id: 'c', name: 'z' })
    const c = t.countByStatus()
    expect(c.completed).toBe(1)
    expect(c.failed).toBe(1)
    expect(c.running).toBe(1)
  })

  it('totalRuns and uptime', () => {
    t.startRun({ id: 'a', name: 'x' })
    expect(t.totalRuns()).toBe(1)
    expect(t.uptimeMs()).toBeGreaterThanOrEqual(0)
  })

  it('rejects run when maxRuns reached', () => {
    const tt = new ExperimentTracker({ maxRuns: 1 })
    tt.startRun({ id: 'a', name: 'x' })
    expect(() => tt.startRun({ id: 'b', name: 'y' })).toThrow()
  })

  it('parent and gitCommit are stored', () => {
    t.startRun({ id: 'a', name: 'x' })
    t.startRun({ id: 'b', name: 'y', parent: 'a', gitCommit: 'abc123' })
    expect(t.getRun('b')?.parent).toBe('a')
    expect(t.getRun('b')?.gitCommit).toBe('abc123')
  })

  it('getExperimentTracker singleton', async () => {
    const { getExperimentTracker } = await import('../index')
    const a = getExperimentTracker()
    const b = getExperimentTracker()
    expect(a).toBe(b)
  })
})
