/**
 * Versa · Workflow Engine (v28.0)
 *
 * DAG 工作流 + 事件总线 + Saga 补偿 + 调度 + 持久化：
 * - WorkflowDefinition (DAG: 节点 + 边 + 条件 + Saga 补偿)
 * - Step Types: action / condition / parallel / loop / subworkflow / delay
 * - Engine: 拓扑排序 → 状态机 (pending/running/success/failed/skipped)
 * - EventBus: 节点间 emit/on, 全局事件流
 * - Saga: 失败时按反序执行补偿
 * - Retry: per-step 指数退避
 * - Scheduler: cron 表达式 / 间隔 / 一次性
 * - Persistence: localStorage 序列化
 * - Metrics: per-workflow latency / 成功率 / 步骤耗时
 */

import { defaultRetry, computeBackoff, withRetry, type RetryConfig } from '../federation'

// ============== Types ==============

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled' | 'compensated'
export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'compensated'
export type StepKind = 'action' | 'condition' | 'parallel' | 'loop' | 'subworkflow' | 'delay' | 'emit' | 'listen'

export interface StepDefinition {
  id: string
  name: string
  kind: StepKind
  /** For action: handler id. For condition: expr. For parallel: child step ids. For loop: count/while. For subworkflow: workflow id. For delay: ms. For emit/listen: event name. */
  config: Record<string, unknown>
  /** Step ids this step depends on */
  dependsOn: string[]
  /** Optional retry */
  retry?: RetryConfig
  /** Optional timeout in ms */
  timeoutMs?: number
  /** Saga compensation handler id (for action) */
  compensate?: string
  /** Description */
  description?: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  version: string
  steps: StepDefinition[]
  /** Auto-cleanup after N ms (0 = never) */
  ttlMs?: number
  description?: string
}

export interface StepExecution {
  stepId: string
  status: StepStatus
  startedAt?: number
  finishedAt?: number
  durationMs?: number
  attempts: number
  output?: unknown
  error?: string
  compensatedAt?: number
}

export interface WorkflowExecution {
  id: string
  definitionId: string
  status: WorkflowStatus
  steps: StepExecution[]
  startedAt: number
  finishedAt?: number
  durationMs?: number
  context: Record<string, unknown>
  events: WorkflowEvent[]
  error?: string
}

export interface WorkflowEvent {
  ts: number
  type: 'step-start' | 'step-success' | 'step-failed' | 'step-retry' | 'step-skip' | 'workflow-start' | 'workflow-success' | 'workflow-failed' | 'workflow-cancel' | 'workflow-compensate' | 'emit' | 'log'
  stepId?: string
  message?: string
  data?: unknown
}

export type StepHandler = (ctx: WorkflowContext, step: StepDefinition) => Promise<unknown> | unknown
export type CompensateHandler = (ctx: WorkflowContext, step: StepDefinition, originalOutput: unknown) => Promise<void> | void
export type ConditionExpr = (ctx: WorkflowContext) => boolean | Promise<boolean>

export interface WorkflowContext {
  workflowId: string
  executionId: string
  input: Record<string, unknown>
  outputs: Record<string, unknown>  // stepId -> output
  vars: Record<string, unknown>      // arbitrary scratch
  log: (msg: string, data?: unknown) => void
  emit: (event: string, data?: unknown) => void
  cancel: () => void
}

export interface ScheduledJob {
  id: string
  name: string
  schedule: string  // cron expr
  workflowId: string
  input: Record<string, unknown>
  enabled: boolean
  lastRun?: number
  nextRun?: number
  runs: number
}

export interface WorkflowMetrics {
  totalStarted: number
  totalCompleted: number
  totalFailed: number
  totalCompensated: number
  totalCancelled: number
  avgDurationMs: number
  successRate: number
  byWorkflow: Record<string, { started: number; success: number; failed: number; avgMs: number }>
}

// ============== Handler Registry ==============

export class HandlerRegistry {
  private actions = new Map<string, StepHandler>()
  private compensates = new Map<string, CompensateHandler>()
  private conditions = new Map<string, ConditionExpr>()

  registerAction(id: string, h: StepHandler): void { this.actions.set(id, h) }
  registerCompensate(id: string, h: CompensateHandler): void { this.compensates.set(id, h) }
  registerCondition(id: string, e: ConditionExpr): void { this.conditions.set(id, e) }

  getAction(id: string): StepHandler | undefined { return this.actions.get(id) }
  getCompensate(id: string): CompensateHandler | undefined { return this.compensates.get(id) }
  getCondition(id: string): ConditionExpr | undefined { return this.conditions.get(id) }

  listActions(): string[] { return [...this.actions.keys()] }
  listCompensates(): string[] { return [...this.compensates.keys()] }
  listConditions(): string[] { return [...this.conditions.keys()] }

  clear(): void { this.actions.clear(); this.compensates.clear(); this.conditions.clear() }
}

export const handlers = new HandlerRegistry()

// ============== Definition Registry ==============

export class DefinitionRegistry {
  private defs = new Map<string, WorkflowDefinition>()

  register(def: WorkflowDefinition): void {
    this.validate(def)
    this.defs.set(def.id, def)
  }
  get(id: string): WorkflowDefinition | undefined { return this.defs.get(id) }
  list(): WorkflowDefinition[] { return [...this.defs.values()] }
  remove(id: string): boolean { return this.defs.delete(id) }
  size(): number { return this.defs.size }
  clear(): void { this.defs.clear() }

  private validate(def: WorkflowDefinition): void {
    const ids = new Set(def.steps.map(s => s.id))
    if (ids.size !== def.steps.length) throw new Error('Duplicate step ids in workflow ' + def.id)
    for (const s of def.steps) {
      for (const dep of s.dependsOn) {
        if (!ids.has(dep)) throw new Error(`Step ${s.id} depends on unknown step ${dep}`)
      }
    }
    if (hasCycle(def.steps)) throw new Error(`Workflow ${def.id} has a cycle`)
  }
}

function hasCycle(steps: StepDefinition[]): boolean {
  const adj = new Map<string, string[]>()
  for (const s of steps) adj.set(s.id, s.dependsOn)
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  for (const s of steps) color.set(s.id, WHITE)
  const dfs = (id: string): boolean => {
    color.set(id, GRAY)
    for (const d of adj.get(id) ?? []) {
      const c = color.get(d) ?? WHITE
      if (c === GRAY) return true
      if (c === WHITE && dfs(d)) return true
    }
    color.set(id, BLACK)
    return false
  }
  for (const s of steps) if ((color.get(s.id) ?? WHITE) === WHITE) if (dfs(s.id)) return true
  return false
}

export const definitions = new DefinitionRegistry()

// ============== EventBus ==============

export class WorkflowEventBus {
  private listeners = new Map<string, Set<(e: WorkflowEvent) => void>>()
  private history: WorkflowEvent[] = []
  private maxHistory = 1000

  on(event: string, fn: (e: WorkflowEvent) => void): () => void {
    let s = this.listeners.get(event)
    if (!s) { s = new Set(); this.listeners.set(event, s) }
    s.add(fn)
    return () => s!.delete(fn)
  }

  emit(event: string, payload?: Omit<WorkflowEvent, 'ts' | 'type'>): void {
    const e: WorkflowEvent = { ts: Date.now(), type: 'emit', message: event, ...payload }
    this.record(e)
    for (const fn of this.listeners.get(event) ?? []) try { fn(e) } catch { /* ignore */ }
    for (const fn of this.listeners.get('*') ?? []) try { fn(e) } catch { /* ignore */ }
  }

  history_(filter?: { type?: string; since?: number; limit?: number }): WorkflowEvent[] {
    let arr = this.history
    if (filter?.type) arr = arr.filter(e => e.type === filter.type || e.message === filter.type)
    if (filter?.since) arr = arr.filter(e => e.ts >= filter.since!)
    if (filter?.limit) arr = arr.slice(-filter.limit)
    return arr
  }

  clear(): void { this.listeners.clear(); this.history = [] }
  size(): number { return this.history.length }

  private record(e: WorkflowEvent): void {
    this.history.push(e)
    if (this.history.length > this.maxHistory) this.history.shift()
  }
}

export const eventBus = new WorkflowEventBus()

// ============== Metrics ==============

class WorkflowMetricsCollector {
  private counters = new Map<string, number>()
  private histograms = new Map<string, number[]>()
  inc(name: string, n = 1): void { this.counters.set(name, (this.counters.get(name) ?? 0) + n) }
  observe(name: string, v: number): void {
    const arr = this.histograms.get(name) ?? []
    arr.push(v)
    if (arr.length > 2000) arr.shift()
    this.histograms.set(name, arr)
  }
  snapshot(): WorkflowMetrics {
    const started = this.counters.get('started') ?? 0
    const completed = this.counters.get('completed') ?? 0
    const failed = this.counters.get('compensated') ?? 0
    const cancelled = this.counters.get('cancelled') ?? 0
    const allDur: number[] = []
    for (const [k, arr] of this.histograms) {
      if (k.startsWith('duration.')) allDur.push(...arr)
    }
    const byWorkflow: WorkflowMetrics['byWorkflow'] = {}
    for (const [k, v] of this.counters) {
      const m = /^started\.(.+)$/.exec(k)
      if (m) {
        const wid = m[1]!
        const succ = this.counters.get(`completed.${wid}`) ?? 0
        const fail = this.counters.get(`failed.${wid}`) ?? 0
        const durs = this.histograms.get(`duration.${wid}`) ?? []
        const avg = durs.length === 0 ? 0 : durs.reduce((s, x) => s + x, 0) / durs.length
        byWorkflow[wid] = { started: v, success: succ, failed: fail, avgMs: avg }
      }
    }
    return {
      totalStarted: started, totalCompleted: completed, totalFailed: failed, totalCompensated: failed, totalCancelled: cancelled,
      avgDurationMs: allDur.length === 0 ? 0 : allDur.reduce((s, x) => s + x, 0) / allDur.length,
      successRate: started === 0 ? 0 : completed / started,
      byWorkflow,
    }
  }
  reset(): void { this.counters.clear(); this.histograms.clear() }
}

// ============== Engine ==============

export class WorkflowEngine {
  private executions = new Map<string, WorkflowExecution>()
  private metrics = new WorkflowMetricsCollector()
  private cancelTokens = new Map<string, { cancelled: boolean }>()

  async execute(defId: string, input: Record<string, unknown> = {}, opts: { executionId?: string } = {}): Promise<WorkflowExecution> {
    const def = definitions.get(defId)
    if (!def) throw new Error(`Unknown workflow ${defId}`)
    const execId = opts.executionId ?? `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const exec: WorkflowExecution = {
      id: execId,
      definitionId: defId,
      status: 'pending',
      steps: def.steps.map(s => ({ stepId: s.id, status: 'pending', attempts: 0 })),
      startedAt: Date.now(),
      context: { ...input },
      events: [],
    }
    this.executions.set(execId, exec)
    const cancel = { cancelled: false }
    this.cancelTokens.set(execId, cancel)

    this.metrics.inc('started')
    this.metrics.inc(`started.${defId}`)
    this.recordEvent(exec, { type: 'workflow-start' })

    exec.status = 'running'
    try {
      await this.runSteps(def, exec, input, cancel)
      if (cancel.cancelled) {
        exec.status = 'cancelled'
        this.recordEvent(exec, { type: 'workflow-cancel' })
        this.metrics.inc('cancelled')
      } else {
        exec.status = 'success'
        exec.finishedAt = Date.now()
        exec.durationMs = exec.finishedAt - exec.startedAt
        this.recordEvent(exec, { type: 'workflow-success' })
        this.metrics.inc('completed')
        this.metrics.inc(`completed.${defId}`)
        this.metrics.observe(`duration.${defId}`, exec.durationMs)
      }
    } catch (e) {
      // Saga: run compensations in reverse
      await this.compensate(def, exec, input, cancel)
      exec.status = 'compensated'
      exec.finishedAt = Date.now()
      exec.durationMs = exec.finishedAt - exec.startedAt
      exec.error = e instanceof Error ? e.message : String(e)
      this.recordEvent(exec, { type: 'workflow-compensate', message: exec.error })
      this.metrics.inc('compensated')
      this.metrics.inc(`failed.${defId}`)
    }
    this.cancelTokens.delete(execId)
    return exec
  }

  get(execId: string): WorkflowExecution | undefined { return this.executions.get(execId) }
  list(): WorkflowExecution[] { return [...this.executions.values()] }
  cancel(execId: string): void {
    const token = this.cancelTokens.get(execId)
    if (token) token.cancelled = true
  }
  size(): number { return this.executions.size }
  clear(): void { this.executions.clear(); this.metrics.reset() }

  metrics_(): WorkflowMetrics { return this.metrics.snapshot() }

  private async runSteps(def: WorkflowDefinition, exec: WorkflowExecution, input: Record<string, unknown>, cancel: { cancelled: boolean }): Promise<void> {
    const order = topoSort(def.steps)
    const ctx: WorkflowContext = {
      workflowId: def.id,
      executionId: exec.id,
      input,
      outputs: {},
      vars: { ...input },
      log: (msg, data) => this.recordEvent(exec, { type: 'log', message: msg, data }),
      emit: (event, data) => eventBus.emit(event, { stepId: undefined, data }),
      cancel: () => { cancel.cancelled = true },
    }
    let firstError: unknown = undefined
    for (const step of order) {
      if (cancel.cancelled) {
        this.markStep(exec, step.id, 'cancelled')
        continue
      }
      // Check dependencies
      const failed = step.dependsOn.some(d => exec.steps.find(s => s.stepId === d)?.status === 'failed')
      const skipped = step.dependsOn.some(d => exec.steps.find(s => s.stepId === d)?.status === 'skipped')
      if (failed || skipped) {
        this.markStep(exec, step.id, 'skipped')
        this.recordEvent(exec, { type: 'step-skip', stepId: step.id, message: failed ? 'dep failed' : 'dep skipped' })
        continue
      }
      // Run the step
      try {
        const output = await this.runStep(step, ctx, exec)
        ctx.outputs[step.id] = output
        this.markStep(exec, step.id, 'success', output)
        this.recordEvent(exec, { type: 'step-success', stepId: step.id })
      } catch (e) {
        this.markStep(exec, step.id, 'failed', undefined, e instanceof Error ? e.message : String(e))
        this.recordEvent(exec, { type: 'step-failed', stepId: step.id, message: e instanceof Error ? e.message : String(e) })
        if (firstError === undefined) firstError = e
      }
    }
    if (firstError !== undefined) throw firstError
  }

  private async runStep(step: StepDefinition, ctx: WorkflowContext, exec: WorkflowExecution): Promise<unknown> {
    this.markStep(exec, step.id, 'running')
    this.recordEvent(exec, { type: 'step-start', stepId: step.id })
    const se = exec.steps.find(s => s.stepId === step.id)!

    const run = async (): Promise<unknown> => {
      switch (step.kind) {
        case 'action': {
          const h = handlers.getAction(String(step.config.handler))
          if (!h) throw new Error(`No handler registered: ${step.config.handler}`)
          return await h(ctx, step)
        }
        case 'condition': {
          const e = handlers.getCondition(String(step.config.expr))
          if (!e) throw new Error(`No condition registered: ${step.config.expr}`)
          const result = await e(ctx)
          if (!result) throw new Error(`Condition ${step.config.expr} returned false`)
          return result
        }
        case 'delay': {
          const ms = Number(step.config.ms ?? 100)
          await new Promise(r => setTimeout(r, ms))
          return { slept: ms }
        }
        case 'emit': {
          eventBus.emit(String(step.config.event), { stepId: step.id, data: step.config.data })
          return { emitted: step.config.event }
        }
        case 'parallel': {
          const childIds = (step.config.children as string[]) ?? []
          return Promise.all(childIds.map(async cid => {
            const child = definitions.get(ctx.workflowId)?.steps.find(s => s.id === cid)
            if (!child) return undefined
            return await this.runStep(child, ctx, exec)
          }))
        }
        case 'loop': {
          const count = Number(step.config.count ?? 1)
          const out: unknown[] = []
          for (let i = 0; i < count; i++) {
            ctx.vars['__loop_iter__'] = i
            const h = handlers.getAction(String(step.config.handler))
            if (h) out.push(await h(ctx, step))
          }
          return out
        }
        case 'subworkflow': {
          const engine = this
          return await engine.execute(String(step.config.workflow), ctx.vars)
        }
        case 'listen': {
          return new Promise(resolve => {
            const event = String(step.config.event)
            const timeout = step.timeoutMs ?? 5000
            const off = eventBus.on(event, () => { off(); resolve({ listened: event }) })
            setTimeout(() => { off(); resolve({ listened: event, timedOut: true }) }, timeout)
          })
        }
        default:
          throw new Error(`Unknown step kind: ${step.kind}`)
      }
    }

    const cfg = step.retry ?? defaultRetry
    const runWithCount = async (_attempt: number): Promise<unknown> => {
      se.attempts++
      return await run()
    }
    if (step.timeoutMs) {
      return await Promise.race([
        withRetry(runWithCount, cfg),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Step ${step.id} timed out`)), step.timeoutMs)),
      ])
    }
    return await withRetry(runWithCount, cfg)
  }

  private async compensate(def: WorkflowDefinition, exec: WorkflowExecution, _input: Record<string, unknown>, cancel: { cancelled: boolean }): Promise<void> {
    const order = topoSort(def.steps)
    const compensated = order.filter(s => exec.steps.find(x => x.stepId === s.id)?.status === 'success').reverse()
    for (const step of compensated) {
      if (cancel.cancelled) break
      const se = exec.steps.find(s => s.stepId === step.id)!
      if (!step.compensate) continue
      const h = handlers.getCompensate(step.compensate)
      if (!h) continue
      try {
        await h({ workflowId: def.id, executionId: exec.id, input: {}, outputs: {}, vars: {}, log: () => {}, emit: () => {}, cancel: () => {} } as WorkflowContext, step, se.output)
        se.status = 'compensated'
        se.compensatedAt = Date.now()
      } catch { /* swallow */ }
    }
  }

  private markStep(exec: WorkflowExecution, stepId: string, status: StepStatus, output?: unknown, error?: string): void {
    const se = exec.steps.find(s => s.stepId === stepId)
    if (!se) return
    se.status = status
    if (status === 'running') { se.startedAt = Date.now() }
    if (status === 'success' || status === 'failed' || status === 'skipped' || status === 'cancelled') {
      se.finishedAt = Date.now()
      if (se.startedAt) se.durationMs = se.finishedAt - se.startedAt
    }
    if (output !== undefined) se.output = output
    if (error) se.error = error
  }

  private recordEvent(exec: WorkflowExecution, e: Omit<WorkflowEvent, 'ts'>): void {
    const evt = { ...e, ts: Date.now() }
    exec.events.push(evt)
    if (exec.events.length > 500) exec.events.shift()
  }
}

function topoSort(steps: StepDefinition[]): StepDefinition[] {
  const byId = new Map(steps.map(s => [s.id, s]))
  const visited = new Set<string>()
  const onStack = new Set<string>()
  const result: StepDefinition[] = []
  const visit = (id: string): void => {
    if (visited.has(id)) return
    if (onStack.has(id)) throw new Error(`Cycle at ${id}`)
    onStack.add(id)
    const step = byId.get(id)
    if (step) for (const d of step.dependsOn) visit(d)
    onStack.delete(id)
    visited.add(id)
    result.push(byId.get(id)!)
  }
  for (const s of steps) visit(s.id)
  return result
}

export const engine = new WorkflowEngine()

// ============== Scheduler ==============

export interface ScheduleSpec {
  type: 'cron' | 'interval' | 'once'
  /** cron: standard 5-field. interval: ms. once: ISO date or ms timestamp. */
  expr: string | number
}

export class Scheduler {
  private jobs = new Map<string, ScheduledJob & { timer?: ReturnType<typeof setTimeout | typeof setInterval> }>()

  schedule(name: string, workflowId: string, spec: ScheduleSpec, input: Record<string, unknown> = {}): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const job: ScheduledJob & { timer?: ReturnType<typeof setTimeout | typeof setInterval> } = {
      id, name, workflowId, input, schedule: String(spec.expr), enabled: true, runs: 0,
    }
    if (spec.type === 'interval') {
      const ms = Number(spec.expr)
      job.nextRun = Date.now() + ms
      job.timer = setInterval(() => this.runJob(id), ms)
    } else if (spec.type === 'once') {
      const when = Number(spec.expr)
      const delay = Math.max(0, when - Date.now())
      job.nextRun = when
      job.timer = setTimeout(() => { this.runJob(id); this.remove(id) }, delay)
    } else { // cron — basic support: every minute/hour
      job.nextRun = nextCronFire(String(spec.expr))
      const tick = (): void => {
        this.runJob(id)
        job.nextRun = nextCronFire(String(spec.expr))
        job.timer = setTimeout(tick, Math.max(1000, job.nextRun! - Date.now()))
      }
      job.timer = setTimeout(tick, Math.max(1000, job.nextRun! - Date.now()))
    }
    this.jobs.set(id, job)
    return id
  }

  list(): ScheduledJob[] {
    return [...this.jobs.values()].map(j => ({
      id: j.id, name: j.name, schedule: j.schedule, workflowId: j.workflowId,
      input: j.input, enabled: j.enabled, lastRun: j.lastRun, nextRun: j.nextRun, runs: j.runs,
    }))
  }
  get(id: string): ScheduledJob | undefined {
    const j = this.jobs.get(id); if (!j) return undefined
    return { id: j.id, name: j.name, schedule: j.schedule, workflowId: j.workflowId, input: j.input, enabled: j.enabled, lastRun: j.lastRun, nextRun: j.nextRun, runs: j.runs }
  }
  remove(id: string): boolean {
    const j = this.jobs.get(id)
    if (!j) return false
    if (j.timer) clearTimeout(j.timer as ReturnType<typeof setTimeout>)
    if (j.timer) clearInterval(j.timer as ReturnType<typeof setInterval>)
    return this.jobs.delete(id)
  }
  enable(id: string, enabled: boolean): void { const j = this.jobs.get(id); if (j) j.enabled = enabled }
  size(): number { return this.jobs.size }
  clear(): void { for (const id of [...this.jobs.keys()]) this.remove(id) }

  private async runJob(id: string): Promise<void> {
    const j = this.jobs.get(id); if (!j || !j.enabled) return
    j.lastRun = Date.now()
    j.runs++
    try { await engine.execute(j.workflowId, j.input) } catch { /* saga handled */ }
  }
}

export const scheduler = new Scheduler()

/** Very small cron parser: only `* * * * *` (every minute) and `M * * * *` (every hour at M). */
export function nextCronFire(expr: string, now = Date.now()): number {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return now + 60_000
  const [m, h] = parts
  const d = new Date(now)
  if (m === '*' && h === '*') {
    d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1); return d.getTime()
  }
  if (h === '*' && /^\d+$/.test(m!)) {
    d.setSeconds(0, 0)
    const target = parseInt(m!, 10)
    if (d.getMinutes() >= target) d.setHours(d.getHours() + 1)
    d.setMinutes(target)
    return d.getTime()
  }
  return now + 3_600_000
}

// ============== Persistence ==============

const STORAGE_KEY = 'versa.workflow.v1'

export function persistExecutions(engine: WorkflowEngine): number {
  if (typeof localStorage === 'undefined') return 0
  const data = engine.list()
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data.length } catch { return 0 }
}

export function loadExecutions(): WorkflowExecution[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WorkflowExecution[]
  } catch { return [] }
}

// ============== High-level helpers ==============

export function summarizeWorkflow() {
  return {
    definitions: definitions.size(),
    handlers: handlers.listActions().length + handlers.listCompensates().length + handlers.listConditions().length,
    executions: engine.size(),
    scheduled: scheduler.size(),
    eventHistory: eventBus.size(),
    metrics: engine.metrics_(),
  }
}

export { computeBackoff, withRetry, defaultRetry }
export type { RetryConfig }
