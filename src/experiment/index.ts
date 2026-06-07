// Experiment Tracking: runs, params, metrics, tags, comparison.

export type RunId = string
export type RunStatus = 'running' | 'completed' | 'failed' | 'killed'
export type ParamValue = string | number | boolean

export interface Run {
  id: RunId
  name: string
  params: Record<string, ParamValue>
  metrics: Record<string, number>
  tags: string[]
  artifacts: string[]
  status: RunStatus
  startedAt: number
  finishedAt?: number
  notes: string
  parent?: RunId
  gitCommit?: string
}

export interface RunFilter {
  status?: RunStatus
  tag?: string
  namePattern?: string
  minMetric?: { key: string; value: number }
  startedAfter?: number
  startedBefore?: number
}

export interface ExperimentConfig {
  maxRuns: number
  enableArtifacts: boolean
  enableNotes: boolean
}

const DEFAULT_CONFIG: ExperimentConfig = {
  maxRuns: 10000,
  enableArtifacts: true,
  enableNotes: true,
}

export class ExperimentTracker {
  readonly config: ExperimentConfig
  private runs: Map<RunId, Run> = new Map()
  private byTag: Map<string, Set<RunId>> = new Map()
  private byStatus: Map<RunStatus, Set<RunId>> = new Map()
  private startedAt = Date.now()

  constructor(config: Partial<ExperimentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private index(run: Run): void {
    if (!this.byStatus.has(run.status)) this.byStatus.set(run.status, new Set())
    this.byStatus.get(run.status)!.add(run.id)
    for (const t of run.tags) {
      if (!this.byTag.has(t)) this.byTag.set(t, new Set())
      this.byTag.get(t)!.add(run.id)
    }
  }

  private deindex(run: Run): void {
    this.byStatus.get(run.status)?.delete(run.id)
    for (const t of run.tags) this.byTag.get(t)?.delete(run.id)
  }

  startRun(input: { id?: RunId; name: string; params?: Record<string, ParamValue>; tags?: string[]; parent?: RunId; gitCommit?: string }): Run {
    if (this.runs.size >= this.config.maxRuns) throw new Error('maxRuns reached')
    const id = input.id ?? `run-${this.runs.size + 1}-${Date.now()}`
    if (this.runs.has(id)) throw new Error('run exists: ' + id)
    const run: Run = {
      id,
      name: input.name,
      params: { ...(input.params ?? {}) },
      metrics: {},
      tags: [...(input.tags ?? [])],
      artifacts: [],
      status: 'running',
      startedAt: Date.now(),
      notes: '',
      parent: input.parent,
      gitCommit: input.gitCommit,
    }
    this.runs.set(id, run)
    this.index(run)
    return run
  }

  getRun(id: RunId): Run | undefined {
    return this.runs.get(id)
  }

  hasRun(id: RunId): boolean {
    return this.runs.has(id)
  }

  setParams(id: RunId, params: Record<string, ParamValue>): Run {
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    r.params = { ...r.params, ...params }
    return r
  }

  logMetric(id: RunId, key: string, value: number, step?: number): Run {
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    const k = step !== undefined ? `${key}@${step}` : key
    r.metrics[k] = value
    return r
  }

  setMetrics(id: RunId, metrics: Record<string, number>): Run {
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    r.metrics = { ...r.metrics, ...metrics }
    return r
  }

  addTag(id: RunId, tag: string): Run {
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    if (!r.tags.includes(tag)) {
      r.tags.push(tag)
      if (!this.byTag.has(tag)) this.byTag.set(tag, new Set())
      this.byTag.get(tag)!.add(id)
    }
    return r
  }

  removeTag(id: RunId, tag: string): Run {
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    r.tags = r.tags.filter(t => t !== tag)
    this.byTag.get(tag)?.delete(id)
    return r
  }

  addArtifact(id: RunId, artifact: string): Run {
    if (!this.config.enableArtifacts) throw new Error('artifacts disabled')
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    if (!r.artifacts.includes(artifact)) r.artifacts.push(artifact)
    return r
  }

  setNotes(id: RunId, notes: string): Run {
    if (!this.config.enableNotes) throw new Error('notes disabled')
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    r.notes = notes
    return r
  }

  finishRun(id: RunId, status: 'completed' | 'failed' | 'killed' = 'completed'): Run {
    const r = this.runs.get(id)
    if (!r) throw new Error('run not found: ' + id)
    this.deindex(r)
    r.status = status
    r.finishedAt = Date.now()
    this.index(r)
    return r
  }

  deleteRun(id: RunId): boolean {
    const r = this.runs.get(id)
    if (!r) return false
    this.deindex(r)
    this.runs.delete(id)
    return true
  }

  listRuns(filter?: RunFilter): Run[] {
    let out = [...this.runs.values()]
    if (filter) {
      if (filter.status) out = out.filter(r => r.status === filter.status)
      if (filter.tag) out = out.filter(r => r.tags.includes(filter.tag!))
      if (filter.namePattern) {
        const re = new RegExp(filter.namePattern)
        out = out.filter(r => re.test(r.name))
      }
      if (filter.minMetric) out = out.filter(r => (r.metrics[filter.minMetric!.key] ?? -Infinity) >= filter.minMetric!.value)
      if (filter.startedAfter) out = out.filter(r => r.startedAt >= filter.startedAfter!)
      if (filter.startedBefore) out = out.filter(r => r.startedAt <= filter.startedBefore!)
    }
    return out.sort((a, b) => b.startedAt - a.startedAt || b.id.localeCompare(a.id))
  }

  bestRun(metricKey: string, direction: 'max' | 'min' = 'max'): Run | null {
    const completed = this.listRuns({ status: 'completed' })
    if (completed.length === 0) return null
    return completed.reduce((best, r) => {
      const v = r.metrics[metricKey]
      if (v === undefined) return best
      if (!best) return r
      const bv = best.metrics[metricKey]
      if (bv === undefined) return r
      return direction === 'max' ? (v > bv ? r : best) : (v < bv ? r : best)
    }, null as Run | null)
  }

  compare(runIds: RunId[], metricKeys: string[]): { ids: RunId[]; table: { metric: string; values: Record<RunId, number | null> }[] } {
    const table: { metric: string; values: Record<RunId, number | null> }[] = []
    for (const m of metricKeys) {
      const values: Record<RunId, number | null> = {}
      for (const id of runIds) {
        const r = this.runs.get(id)
        values[id] = r ? (r.metrics[m] ?? null) : null
      }
      table.push({ metric: m, values })
    }
    return { ids: runIds, table }
  }

  countByStatus(): Record<RunStatus, number> {
    const out: Record<RunStatus, number> = { running: 0, completed: 0, failed: 0, killed: 0 }
    for (const r of this.runs.values()) out[r.status] += 1
    return out
  }

  totalRuns(): number {
    return this.runs.size
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt
  }
}

let _tracker: ExperimentTracker | null = null
export const getExperimentTracker = (config?: Partial<ExperimentConfig>): ExperimentTracker => {
  if (!_tracker) _tracker = new ExperimentTracker(config)
  return _tracker
}
export const resetExperimentTracker = (): void => { _tracker = null }
