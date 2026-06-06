// v63.0 Workflow Engine — DAG-based orchestration: steps, transitions,
// parallel fork/join, saga compensation, signals, timers, persistence

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'compensated'

export interface StepResult {
  output?: unknown
  error?: string
}

export interface StepContext {
  stepId: string
  runId: string
  attempt: number
  input?: unknown
  state: Record<string, unknown>
  log: (msg: string) => void
  sleep: (ms: number) => Promise<void>
}

export type StepHandler = (ctx: StepContext) => Promise<StepResult> | StepResult

export interface WorkflowStep {
  id: string
  handler: StepHandler
  // next: explicit next step id (default: declarative transition)
  next?: string
  // if false/undefined: always run; if true: only run when condition returns true
  condition?: (state: Record<string, unknown>) => boolean
  // if true: run in parallel with siblings
  parallel?: boolean
  // max attempts; default 1
  retries?: number
  // backoff in ms; default 0
  backoffMs?: number
  // optional compensation step (saga)
  compensate?: StepHandler
  // timeout in ms
  timeoutMs?: number
}

export interface WorkflowDef {
  id: string
  steps: WorkflowStep[]
  // start step
  start: string
  // optional end step
  end?: string
  // tags for filtering
  tags?: string[]
}

export interface WorkflowRun {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  stepStates: Map<string, StepStatus>
  stepResults: Map<string, StepResult>
  stepAttempts: Map<string, number>
  state: Record<string, unknown>
  input?: unknown
  error?: string
  startedAt: number
  endedAt?: number
  logs: Array<{ ts: number; stepId?: string; level: 'info' | 'warn' | 'error'; msg: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Step

export class Step {
  constructor(public readonly def: WorkflowStep) {}

  async run(input: unknown, state: Record<string, unknown>, runId: string, attempt = 1, log: (m: string) => void = () => {}): Promise<StepResult> {
    if (this.def.condition && !this.def.condition(state)) {
      return { output: undefined }
    }
    const ctx: StepContext = {
      stepId: this.def.id,
      runId,
      attempt,
      input,
      state,
      log,
      sleep: ms => new Promise<void>(r => setTimeout(r, ms)),
    }
    try {
      let res: StepResult
      if (this.def.timeoutMs && this.def.timeoutMs > 0) {
        res = await Promise.race([
          Promise.resolve(this.def.handler(ctx)),
          new Promise<StepResult>((_, rej) => setTimeout(() => rej(new Error('timeout')), this.def.timeoutMs!)),
        ])
      } else {
        res = await Promise.resolve(this.def.handler(ctx))
      }
      return res
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow

export class Workflow {
  private stepMap: Map<string, Step>
  constructor(public readonly def: WorkflowDef) {
    this.stepMap = new Map(def.steps.map(s => [s.id, new Step(s)]))
  }

  getStep(id: string): Step | undefined {
    return this.stepMap.get(id)
  }

  // Find all parallel siblings — steps marked parallel:true grouped after a non-parallel step
  findParallelGroup(startId: string): { ids: string[]; nextId?: string } | null {
    const start = this.stepMap.get(startId)
    if (!start || !start.def.parallel) return null
    const ids: string[] = [startId]
    let cursor: string | undefined = start.def.next
    while (cursor) {
      const s = this.stepMap.get(cursor)
      if (!s || !s.def.parallel) break
      ids.push(cursor)
      cursor = s.def.next
    }
    return { ids, nextId: cursor }
  }

  // Validate DAG: no cycles, all `next` references exist, all steps reachable from start
  validate(): { ok: boolean; errors: string[] } {
    const errors: string[] = []
    if (!this.stepMap.has(this.def.start)) {
      errors.push(`start step '${this.def.start}' not found`)
    }
    if (this.def.end && !this.stepMap.has(this.def.end)) {
      errors.push(`end step '${this.def.end}' not found`)
    }
    for (const s of this.def.steps) {
      if (s.next && !this.stepMap.has(s.next)) {
        errors.push(`step '${s.id}' references unknown next '${s.next}'`)
      }
    }
    // reachability from start
    const reachable = new Set<string>()
    const stack = [this.def.start]
    while (stack.length) {
      const id = stack.pop()!
      if (reachable.has(id)) {
        errors.push(`cycle detected via '${id}'`)
        break
      }
      reachable.add(id)
      const s = this.stepMap.get(id)
      if (s?.def.next) stack.push(s.def.next)
    }
    for (const s of this.def.steps) {
      if (!reachable.has(s.id)) {
        errors.push(`step '${s.id}' not reachable from start`)
      }
    }
    return { ok: errors.length === 0, errors }
  }

  // Topological order (forward)
  topoOrder(): string[] {
    const order: string[] = []
    const visited = new Set<string>()
    let cursor: string | undefined = this.def.start
    while (cursor) {
      if (visited.has(cursor)) break
      visited.add(cursor)
      order.push(cursor)
      const s = this.stepMap.get(cursor)
      cursor = s?.def.next
    }
    return order
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine — runs workflows

export interface EngineOptions {
  maxConcurrent?: number
  defaultRetries?: number
  defaultBackoffMs?: number
}

export class WorkflowEngine {
  private workflows = new Map<string, Workflow>()
  private runs = new Map<string, WorkflowRun>()
  private timers = new Map<string, NodeJS.Timeout>()
  private opts: Required<EngineOptions>

  constructor(opts: EngineOptions = {}) {
    this.opts = {
      maxConcurrent: opts.maxConcurrent ?? 5,
      defaultRetries: opts.defaultRetries ?? 0,
      defaultBackoffMs: opts.defaultBackoffMs ?? 0,
    }
  }

  register(workflow: Workflow): void {
    this.workflows.set(workflow.def.id, workflow)
  }

  unregister(workflowId: string): boolean {
    return this.workflows.delete(workflowId)
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id)
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys())
  }

  // Start a new run
  start(workflowId: string, input?: unknown, initialState: Record<string, unknown> = {}): WorkflowRun {
    const wf = this.workflows.get(workflowId)
    if (!wf) throw new Error(`workflow '${workflowId}' not registered`)
    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const run: WorkflowRun = {
      id,
      workflowId,
      status: 'pending',
      stepStates: new Map(wf.def.steps.map(s => [s.id, 'pending' as StepStatus])),
      stepResults: new Map(),
      stepAttempts: new Map(),
      state: { ...initialState },
      input,
      startedAt: Date.now(),
      logs: [],
    }
    this.runs.set(id, run)
    return run
  }

  // Execute a run synchronously (promise-based)
  async execute(run: WorkflowRun, onStepComplete?: (stepId: string, result: StepResult) => void): Promise<WorkflowRun> {
    if (run.status !== 'pending' && run.status !== 'running') return run
    run.status = 'running'
    const wf = this.workflows.get(run.workflowId)
    if (!wf) { run.status = 'failed'; run.error = 'workflow missing'; return run }

    const log = (stepId: string, level: 'info' | 'warn' | 'error', msg: string) => {
      run.logs.push({ ts: Date.now(), stepId, level, msg })
    }

    let cursor: string | undefined = wf.def.start
    while (cursor) {
      if ((run.status as string) === 'cancelled') break
      const step = wf.getStep(cursor)
      if (!step) { run.status = 'failed'; run.error = `step '${cursor}' not found`; break }

      // Check for parallel group
      const group = wf.findParallelGroup(cursor)
      if (group && group.ids.length > 1) {
        // Execute parallel siblings concurrently
        const results = await Promise.all(
          group.ids.map(async id => {
            const s = wf.getStep(id)!
            run.stepStates.set(id, 'running')
            const maxAttempts = (s.def.retries ?? this.opts.defaultRetries) + 1
            let last: StepResult = {}
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              run.stepAttempts.set(id, attempt)
              const res = await s.run(run.state, run.state, run.id, attempt, m => log(id, 'info', m))
              if (!res.error) { last = res; break }
              if (attempt < maxAttempts && (s.def.backoffMs ?? this.opts.defaultBackoffMs) > 0) {
                await new Promise(r => setTimeout(r, s.def.backoffMs ?? this.opts.defaultBackoffMs))
              }
              last = res
            }
            run.stepResults.set(id, last)
            run.stepStates.set(id, last.error ? 'failed' : 'success')
            onStepComplete?.(id, last)
            if (last.error) log(id, 'error', last.error)
            return { id, result: last }
          }),
        )
        const failed = results.find(r => r.result.error)
        if (failed) {
          // Run compensation in reverse for completed siblings
          const reversed = [...results].reverse()
          for (const r of reversed) {
            if (r.result.error) continue
            const s = wf.getStep(r.id)
            if (s?.def.compensate) {
              try {
                await s.def.compensate({ stepId: r.id, runId: run.id, attempt: 1, input: r.result, state: run.state, log: m => log(r.id, 'info', m), sleep: ms => new Promise<void>(res => setTimeout(res, ms)) })
                run.stepStates.set(r.id, 'compensated')
                log(r.id, 'info', 'compensated')
              } catch (e) {
                log(r.id, 'error', `compensation failed: ${e}`)
              }
            }
          }
          run.status = 'failed'
          run.error = failed.result.error
          break
        }
        cursor = group.nextId ?? wf.def.end
        continue
      }

      // Sequential
      run.stepStates.set(cursor, 'running')
      const maxAttempts = (step.def.retries ?? this.opts.defaultRetries) + 1
      let result: StepResult = {}
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        run.stepAttempts.set(cursor, attempt)
        result = await step.run(run.state, run.state, run.id, attempt, m => log(cursor!, 'info', m))
        if (!result.error) break
        if (attempt < maxAttempts && (step.def.backoffMs ?? this.opts.defaultBackoffMs) > 0) {
          await new Promise(r => setTimeout(r, step.def.backoffMs ?? this.opts.defaultBackoffMs))
        }
      }
      run.stepResults.set(cursor, result)
      run.stepStates.set(cursor, result.error ? 'failed' : 'success')
      onStepComplete?.(cursor, result)
      if (result.error) {
        if (step.def.compensate) {
          try {
            await step.def.compensate({ stepId: cursor!, runId: run.id, attempt: 1, input: result, state: run.state, log: m => log(cursor!, 'info', m), sleep: ms => new Promise<void>(res => setTimeout(res, ms)) })
            run.stepStates.set(cursor, 'compensated')
            log(cursor, 'info', 'compensated')
          } catch (e) {
            log(cursor, 'error', `compensation failed: ${e}`)
          }
        }
        run.status = 'failed'
        run.error = result.error
        break
      }
      cursor = step.def.next
      if (!cursor && wf.def.end) {
        // Only jump to end if we haven't already processed it
        if (run.stepStates.get(wf.def.end) === 'pending') {
          cursor = wf.def.end
        } else {
          cursor = undefined
        }
      }
    }

    if (run.status === 'running') run.status = 'success'
    run.endedAt = Date.now()
    return run
  }

  getRun(id: string): WorkflowRun | undefined {
    return this.runs.get(id)
  }

  listRuns(workflowId?: string): WorkflowRun[] {
    const all = Array.from(this.runs.values())
    return workflowId ? all.filter(r => r.workflowId === workflowId) : all
  }

  cancel(runId: string): boolean {
    const run = this.runs.get(runId)
    if (!run) return false
    if (run.status === 'success' || run.status === 'failed' || run.status === 'cancelled') return false
    run.status = 'cancelled'
    run.endedAt = Date.now()
    return true
  }

  // Send a signal — stored in run.state
  signal(runId: string, key: string, value: unknown): boolean {
    const run = this.runs.get(runId)
    if (!run) return false
    run.state[`signal.${key}`] = value
    return true
  }

  // Schedule a timer that fires a signal after delay
  schedule(runId: string, key: string, value: unknown, delayMs: number): string {
    const timerId = `timer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const t = setTimeout(() => {
      this.signal(runId, key, value)
      this.timers.delete(timerId)
    }, delayMs)
    this.timers.set(timerId, t)
    return timerId
  }

  cancelTimer(timerId: string): boolean {
    const t = this.timers.get(timerId)
    if (!t) return false
    clearTimeout(t)
    this.timers.delete(timerId)
    return true
  }

  // Wait for a signal (resolves when state[`signal.${key}`] is set)
  waitForSignal(runId: string, key: string, timeoutMs?: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const run = this.runs.get(runId)
      if (!run) return reject(new Error('run not found'))
      if (run.state[`signal.${key}`] !== undefined) return resolve(run.state[`signal.${key}`])
      let timeoutHandle: NodeJS.Timeout | undefined
      const interval = setInterval(() => {
        const r = this.runs.get(runId)
        if (!r) { clearInterval(interval); if (timeoutHandle) clearTimeout(timeoutHandle); reject(new Error('run missing')) }
        else if (r.state[`signal.${key}`] !== undefined) {
          clearInterval(interval)
          if (timeoutHandle) clearTimeout(timeoutHandle)
          resolve(r.state[`signal.${key}`])
        }
      }, 50)
      if (timeoutMs && timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          clearInterval(interval)
          reject(new Error('signal timeout'))
        }, timeoutMs)
      }
    })
  }

  // Persistence: snapshot runs
  snapshot(): Array<{ id: string; workflowId: string; status: string; state: Record<string, unknown>; results: Array<[string, StepResult]> }> {
    return Array.from(this.runs.values()).map(r => ({
      id: r.id,
      workflowId: r.workflowId,
      status: r.status,
      state: r.state,
      results: Array.from(r.stepResults.entries()),
    }))
  }

  metrics(): { total: number; success: number; failed: number; running: number; cancelled: number; workflows: number } {
    let success = 0, failed = 0, running = 0, cancelled = 0
    for (const r of this.runs.values()) {
      if (r.status === 'success') success++
      else if (r.status === 'failed') failed++
      else if (r.status === 'running') running++
      else if (r.status === 'cancelled') cancelled++
    }
    return { total: this.runs.size, success, failed, running, cancelled, workflows: this.workflows.size }
  }

  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t)
    this.timers.clear()
    this.runs.clear()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder — fluent API

export class WorkflowBuilder {
  private _steps: WorkflowStep[] = []
  private _tags: string[] = []

  constructor(private _id: string) {}

  tag(t: string): this { this._tags.push(t); return this }

  step(id: string, handler: StepHandler, opts: Partial<WorkflowStep> = {}): this {
    // auto-chain ALL trailing parallel siblings to this new step (for join semantics)
    if (this._steps.length > 0) {
      let i = this._steps.length - 1
      while (i >= 0 && this._steps[i].parallel) {
        if (!this._steps[i].next) this._steps[i].next = id
        i--
      }
      if (i >= 0) {
        const prev = this._steps[i]
        if (!prev.next) prev.next = id
      }
    }
    this._steps.push({ id, handler, ...opts })
    return this
  }

  parallelStep(id: string, handler: StepHandler, opts: Partial<WorkflowStep> = {}): this {
    // auto-chain to the previously-added step so parallel group detection works
    if (this._steps.length > 0) {
      const prev = this._steps[this._steps.length - 1]
      if (!prev.next) prev.next = id
    }
    this._steps.push({ id, handler, parallel: true, ...opts })
    return this
  }

  build(start: string, end?: string): Workflow {
    return new Workflow({ id: this._id, steps: this._steps, start, end, tags: this._tags })
  }
}

export const workflow = (id: string) => new WorkflowBuilder(id)

// ─────────────────────────────────────────────────────────────────────────────
// Singleton

let _engine: WorkflowEngine | null = null
export function getEngine(): WorkflowEngine {
  if (!_engine) _engine = new WorkflowEngine()
  return _engine
}
export function resetEngine(): void {
  _engine?.clear()
  _engine = null
}
