// Feature Pipeline: DAG-based orchestration of source → transform → sink nodes with scheduling, retries, lineage and run history.

export type NodeType = 'source' | 'transform' | 'sink' | 'filter' | 'join' | 'map' | 'branch'

export type NodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled'

export type Materialization = 'full' | 'incremental'

export type RunTrigger = 'manual' | 'schedule' | 'event' | 'backfill'

export type Handler = (input: unknown, config: Record<string, unknown>) => Promise<unknown> | unknown

export interface PipelineNode {
  id: string
  name: string
  type: NodeType
  config: Record<string, unknown>
  dependsOn: string[]
  handler?: string
  retries?: number
  timeoutMs?: number
  description?: string
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  nodes: PipelineNode[]
  schedule?: string
  materialization: Materialization
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface NodeRunState {
  nodeId: string
  status: NodeStatus
  startedAt?: number
  finishedAt?: number
  durationMs?: number
  attempts: number
  error?: string
  output?: unknown
  skippedReason?: string
}

export interface PipelineRun {
  id: string
  pipelineId: string
  trigger: RunTrigger
  status: NodeStatus
  startedAt: number
  finishedAt?: number
  durationMs?: number
  nodeStates: Record<string, NodeRunState>
  executionOrder: string[]
  asOf?: number
  error?: string
}

export interface PipelineStats {
  totalRuns: number
  successRuns: number
  failedRuns: number
  cancelledRuns: number
  successRate: number
  avgDurationMs: number
  lastRunAt?: number
  lastStatus?: NodeStatus
}

export interface ValidationIssue {
  nodeId?: string
  message: string
  severity: 'error' | 'warning'
}

let _pipelineCounter = 0
let _runCounter = 0
const newPipelineId = () => `pipe_${Date.now().toString(36)}_${(++_pipelineCounter).toString(36).padStart(2, '0')}`
const newRunId = () => `run_${Date.now().toString(36)}_${(++_runCounter).toString(36).padStart(3, '0')}`

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export class FeaturePipelineEngine {
  private pipelines = new Map<string, Pipeline>()
  private runs = new Map<string, PipelineRun[]>()
  private handlers = new Map<string, Handler>()
  private nodeOutputs = new Map<string, Map<string, unknown>>() // runId -> nodeId -> output

  // ---- Pipeline CRUD ----
  define(input: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'> & { name: string; id?: string }): Pipeline {
    const now = Date.now()
    const existing = input.id ? this.pipelines.get(input.id) : undefined
    const id = input.id ?? newPipelineId()
    const pipeline: Pipeline = {
      ...input,
      id,
      nodes: input.nodes.map(n => ({ ...n, dependsOn: [...n.dependsOn] })),
      tags: [...(input.tags ?? [])],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.pipelines.set(id, pipeline)
    return pipeline
  }

  get(id: string): Pipeline | undefined {
    return this.pipelines.get(id)
  }

  list(): Pipeline[] {
    return Array.from(this.pipelines.values())
  }

  delete(id: string): boolean {
    const ok = this.pipelines.delete(id)
    this.runs.delete(id)
    return ok
  }

  // ---- Handler registry ----
  registerHandler(name: string, fn: Handler): void {
    this.handlers.set(name, fn)
  }

  hasHandler(name: string): boolean {
    return this.handlers.has(name)
  }

  listHandlers(): string[] {
    return Array.from(this.handlers.keys())
  }

  // ---- Validation ----
  validate(p: Pipeline): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const nodeIds = new Set(p.nodes.map(n => n.id))
    for (const n of p.nodes) {
      for (const dep of n.dependsOn) {
        if (!nodeIds.has(dep)) {
          issues.push({ nodeId: n.id, message: `depends on missing node "${dep}"`, severity: 'error' })
        } else if (dep === n.id) {
          issues.push({ nodeId: n.id, message: 'node depends on itself', severity: 'error' })
        }
      }
      if (n.handler && !this.handlers.has(n.handler)) {
        issues.push({ nodeId: n.id, message: `handler "${n.handler}" is not registered`, severity: 'warning' })
      }
      if ((n.type === 'transform' || n.type === 'map' || n.type === 'filter' || n.type === 'sink') && !n.handler) {
        issues.push({ nodeId: n.id, message: `${n.type} node requires a handler`, severity: 'error' })
      }
    }
    for (const cycle of this.detectCycles(p)) {
      issues.push({ message: `cycle detected: ${cycle.join(' -> ')}`, severity: 'error' })
    }
    return issues
  }

  // ---- DAG operations ----
  detectCycles(p: Pipeline): string[][] {
    const adj = new Map<string, string[]>()
    for (const n of p.nodes) adj.set(n.id, [...n.dependsOn])
    const visited = new Set<string>()
    const stack = new Set<string>()
    const cycles: string[][] = []
    const dfs = (id: string, path: string[]): void => {
      if (stack.has(id)) {
        const idx = path.indexOf(id)
        if (idx >= 0) cycles.push([...path.slice(idx), id])
        return
      }
      if (visited.has(id)) return
      visited.add(id)
      stack.add(id)
      for (const dep of adj.get(id) ?? []) dfs(dep, [...path, id])
      stack.delete(id)
    }
    for (const n of p.nodes) dfs(n.id, [])
    return cycles
  }

  topologicalOrder(p: Pipeline): string[] {
    const inDeg = new Map<string, number>()
    const adj = new Map<string, string[]>() // id -> downstream ids
    for (const n of p.nodes) {
      inDeg.set(n.id, 0)
      adj.set(n.id, [])
    }
    for (const n of p.nodes) {
      for (const dep of n.dependsOn) {
        adj.get(dep)?.push(n.id)
        inDeg.set(n.id, (inDeg.get(n.id) ?? 0) + 1)
      }
    }
    const queue: string[] = []
    for (const [id, d] of inDeg) if (d === 0) queue.push(id)
    const order: string[] = []
    while (queue.length > 0) {
      const id = queue.shift()!
      order.push(id)
      for (const next of adj.get(id) ?? []) {
        const d = (inDeg.get(next) ?? 0) - 1
        inDeg.set(next, d)
        if (d === 0) queue.push(next)
      }
    }
    if (order.length !== p.nodes.length) throw new Error('cycle detected; cannot produce topological order')
    return order
  }

  downstream(p: Pipeline, nodeId: string): string[] {
    const adj = new Map<string, string[]>()
    for (const n of p.nodes) adj.set(n.id, [])
    for (const n of p.nodes) for (const dep of n.dependsOn) adj.get(dep)?.push(n.id)
    const out: string[] = []
    const seen = new Set<string>()
    const walk = (id: string): void => {
      if (seen.has(id)) return
      seen.add(id)
      for (const next of adj.get(id) ?? []) {
        out.push(next)
        walk(next)
      }
    }
    walk(nodeId)
    return out
  }

  upstream(p: Pipeline, nodeId: string): string[] {
    const reverse = new Map<string, string[]>()
    for (const n of p.nodes) reverse.set(n.id, [])
    for (const n of p.nodes) for (const dep of n.dependsOn) reverse.get(n.id)?.push(dep)
    const out: string[] = []
    const seen = new Set<string>()
    const walk = (id: string): void => {
      if (seen.has(id)) return
      seen.add(id)
      for (const prev of reverse.get(id) ?? []) {
        out.push(prev)
        walk(prev)
      }
    }
    walk(nodeId)
    return out
  }

  // ---- Run execution ----
  async run(pipelineId: string, opts: { trigger?: RunTrigger; asOf?: number; maxParallel?: number } = {}): Promise<PipelineRun> {
    const p = this.pipelines.get(pipelineId)
    if (!p) throw new Error(`pipeline ${pipelineId} not found`)
    const order = this.topologicalOrder(p)
    const run: PipelineRun = {
      id: newRunId(),
      pipelineId,
      trigger: opts.trigger ?? 'manual',
      status: 'running',
      startedAt: Date.now(),
      nodeStates: {},
      executionOrder: order,
      asOf: opts.asOf,
    }
    const outputs = new Map<string, unknown>()
    this.nodeOutputs.set(run.id, outputs)
    for (const n of p.nodes) {
      run.nodeStates[n.id] = { nodeId: n.id, status: 'pending', attempts: 0 }
    }
    const allRuns = this.runs.get(pipelineId) ?? []
    allRuns.push(run)
    this.runs.set(pipelineId, allRuns)

    const failed = new Set<string>()
    try {
      for (const id of order) {
        if (failed.size > 0) {
          run.nodeStates[id].status = 'skipped'
          run.nodeStates[id].skippedReason = 'upstream failure'
          continue
        }
        await this.runNode(run, p, id, outputs)
        if (run.nodeStates[id].status === 'failed') failed.add(id)
      }
      run.status = failed.size > 0 ? 'failed' : 'success'
    } catch (err) {
      run.status = 'failed'
      run.error = (err as Error).message
    } finally {
      run.finishedAt = Date.now()
      run.durationMs = run.finishedAt - run.startedAt
    }
    return run
  }

  private async runNode(run: PipelineRun, p: Pipeline, nodeId: string, outputs: Map<string, unknown>): Promise<void> {
    const node = p.nodes.find(n => n.id === nodeId)
    if (!node) return
    const state = run.nodeStates[nodeId]
    state.status = 'running'
    state.startedAt = Date.now()
    const retries = node.retries ?? 0
    let lastErr: unknown = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      state.attempts = attempt + 1
      try {
        const input = node.dependsOn.length === 0
          ? undefined
          : node.dependsOn.length === 1
            ? outputs.get(node.dependsOn[0])
            : Object.fromEntries(node.dependsOn.map(d => [d, outputs.get(d)]))
        const result = await this.invokeHandler(node, input)
        state.output = result
        state.status = 'success'
        outputs.set(nodeId, result)
        state.finishedAt = Date.now()
        state.durationMs = state.finishedAt - state.startedAt
        return
      } catch (err) {
        lastErr = err
        if (attempt < retries) await sleep(2 ** attempt * 5)
      }
    }
    state.status = 'failed'
    state.error = lastErr ? (lastErr as Error).message : 'unknown error'
    state.finishedAt = Date.now()
    state.durationMs = state.finishedAt - state.startedAt
  }

  private async invokeHandler(node: PipelineNode, input: unknown): Promise<unknown> {
    if (!node.handler) {
      if (node.type === 'source' || node.type === 'branch') return input
      throw new Error(`node ${node.id} has no handler`)
    }
    const fn = this.handlers.get(node.handler)
    if (!fn) throw new Error(`handler ${node.handler} not registered`)
    return await fn(input, node.config)
  }

  // ---- Run history ----
  listRuns(pipelineId: string, limit?: number): PipelineRun[] {
    const all = this.runs.get(pipelineId) ?? []
    return typeof limit === 'number' ? all.slice(-limit) : [...all]
  }

  getRun(pipelineId: string, runId: string): PipelineRun | undefined {
    return (this.runs.get(pipelineId) ?? []).find(r => r.id === runId)
  }

  // ---- Stats ----
  stats(pipelineId: string): PipelineStats {
    const all = this.runs.get(pipelineId) ?? []
    const success = all.filter(r => r.status === 'success').length
    const failed = all.filter(r => r.status === 'failed').length
    const cancelled = all.filter(r => r.status === 'cancelled').length
    const durations = all.filter(r => typeof r.durationMs === 'number').map(r => r.durationMs!)
    const avg = durations.length === 0 ? 0 : durations.reduce((a, b) => a + b, 0) / durations.length
    const last = all[all.length - 1]
    return {
      totalRuns: all.length,
      successRuns: success,
      failedRuns: failed,
      cancelledRuns: cancelled,
      successRate: all.length === 0 ? 0 : success / all.length,
      avgDurationMs: Math.round(avg),
      lastRunAt: last?.startedAt,
      lastStatus: last?.status,
    }
  }

  // ---- Utility ----
  clear(): void {
    this.pipelines.clear()
    this.runs.clear()
    this.handlers.clear()
    this.nodeOutputs.clear()
  }
}

let _engineSingleton: FeaturePipelineEngine | null = null
export function getFeaturePipeline(): FeaturePipelineEngine {
  if (!_engineSingleton) _engineSingleton = new FeaturePipelineEngine()
  return _engineSingleton
}
export function resetFeaturePipeline(): void {
  if (_engineSingleton) _engineSingleton.clear()
  _engineSingleton = null
}
