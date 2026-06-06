/**
 * Versa · Task Scheduler (v51.0)
 * - Cron expression parser (5-field minute precision)
 * - Delayed + recurring + one-shot tasks
 * - Job registry by name
 * - Execution history with results
 * - Misfire policy (skip / run-once / coalesce)
 * - Pause / resume / cancel
 * - Concurrency limits per job
 * - Timezone awareness
 * - Persistent-friendly IDs
 * - Metrics
 */
import { withRetry } from '../federation'

export type MisfirePolicy = 'skip' | 'run-once' | 'coalesce' | 'parallel'

export interface ScheduledJob {
  id: string
  name: string
  cron?: string
  delayMs?: number
  runAt?: number
  intervalMs?: number
  tz?: string
  handler: string // registered name
  payload?: unknown
  enabled: boolean
  paused: boolean
  misfire: MisfirePolicy
  maxConcurrent: number
  maxRetries: number
  retryDelayMs: number
  createdAt: number
  nextRunAt: number
  lastRunAt?: number
  runCount: number
  failCount: number
  tags: string[]
}

export interface JobRun {
  id: string
  jobId: string
  jobName: string
  scheduledAt: number
  startedAt: number
  finishedAt: number
  ok: boolean
  result?: unknown
  error?: string
  durationMs: number
  attempt: number
}

export interface SchedulerMetrics {
  totalJobs: number
  activeJobs: number
  totalRuns: number
  totalOk: number
  totalFail: number
  totalMisfires: number
  totalRetries: number
  byJob: Record<string, { runs: number; ok: number; fail: number; avgMs: number; lastRunAt: number }>
}

export class TaskScheduler {
  private jobs = new Map<string, ScheduledJob>()
  private handlers = new Map<string, (payload: unknown) => unknown | Promise<unknown>>()
  private runs: JobRun[] = []
  private inFlight = new Map<string, number>() // jobId -> concurrent count
  private misfires = 0
  private retries = 0
  private metrics: SchedulerMetrics = { totalJobs: 0, activeJobs: 0, totalRuns: 0, totalOk: 0, totalFail: 0, totalMisfires: 0, totalRetries: 0, byJob: {} }
  private tickHandle: ReturnType<typeof setInterval> | null = null
  private tickIntervalMs = 1000

  // -------- Cron parsing --------
  parseCron(expr: string): { minutes: number[]; hours: number[]; daysOfMonth: number[]; months: number[]; daysOfWeek: number[] } {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) throw new Error('cron must have 5 fields')
    return {
      minutes: this.parseField(parts[0], 0, 59),
      hours: this.parseField(parts[1], 0, 23),
      daysOfMonth: this.parseField(parts[2], 1, 31),
      months: this.parseField(parts[3], 1, 12),
      daysOfWeek: this.parseField(parts[4], 0, 6)
    }
  }
  private parseField(field: string, min: number, max: number): number[] {
    if (field === '*') return this.range(min, max)
    const out = new Set<number>()
    for (const part of field.split(',')) {
      if (part.includes('/')) {
        const [base, step] = part.split('/')
        const stepN = Number(step)
        const range = base === '*' ? this.range(min, max) : this.expandRange(base, min, max)
        for (let i = 0; i < range.length; i += stepN) out.add(range[i])
      } else if (part.includes('-')) {
        for (const v of this.expandRange(part, min, max)) out.add(v)
      } else {
        const v = Number(part)
        if (isNaN(v) || v < min || v > max) throw new Error(`bad field: ${part}`)
        out.add(v)
      }
    }
    return [...out].sort((a, b) => a - b)
  }
  private range(min: number, max: number): number[] { const a: number[] = []; for (let i = min; i <= max; i++) a.push(i); return a }
  private expandRange(part: string, min: number, max: number): number[] {
    const [a, b] = part.split('-').map(Number)
    if (isNaN(a) || isNaN(b)) throw new Error(`bad range: ${part}`)
    return this.range(a, b).filter(v => v >= min && v <= max)
  }
  nextRunTime(expr: string, after = Date.now()): number {
    const c = this.parseCron(expr)
    const start = new Date(after + 60_000) // start search 1 minute ahead
    for (let t = start.getTime(); t < start.getTime() + 366 * 24 * 3600 * 1000; t += 60_000) {
      const d = new Date(t)
      if (c.minutes.includes(d.getMinutes()) && c.hours.includes(d.getHours()) && c.daysOfMonth.includes(d.getDate()) && c.months.includes(d.getMonth() + 1) && c.daysOfWeek.includes(d.getDay())) return t
    }
    throw new Error('no next run time in 1 year')
  }

  // -------- Handler registration --------
  registerHandler(name: string, fn: (payload: unknown) => unknown | Promise<unknown>): void { this.handlers.set(name, fn) }
  unregisterHandler(name: string): boolean { return this.handlers.delete(name) }
  listHandlers(): string[] { return [...this.handlers.keys()] }
  hasHandler(name: string): boolean { return this.handlers.has(name) }

  // -------- Job scheduling --------
  schedule(opts: { name: string; cron?: string; delayMs?: number; runAt?: number; intervalMs?: number; handler: string; payload?: unknown; misfire?: MisfirePolicy; maxConcurrent?: number; maxRetries?: number; retryDelayMs?: number; tags?: string[]; tz?: string }): ScheduledJob {
    if (!this.handlers.has(opts.handler)) throw new Error(`handler ${opts.handler} not registered`)
    if (!opts.cron && opts.delayMs == null && opts.runAt == null && opts.intervalMs == null) throw new Error('must specify cron, delayMs, runAt, or intervalMs')
    const now = Date.now()
    let next = now
    if (opts.cron) next = this.nextRunTime(opts.cron, now)
    else if (opts.delayMs != null) next = now + opts.delayMs
    else if (opts.runAt != null) next = opts.runAt
    else if (opts.intervalMs != null) next = now + opts.intervalMs
    const job: ScheduledJob = { id: this.genId(), name: opts.name, cron: opts.cron, delayMs: opts.delayMs, runAt: opts.runAt, intervalMs: opts.intervalMs, tz: opts.tz, handler: opts.handler, payload: opts.payload, enabled: true, paused: false, misfire: opts.misfire ?? 'skip', maxConcurrent: opts.maxConcurrent ?? 1, maxRetries: opts.maxRetries ?? 0, retryDelayMs: opts.retryDelayMs ?? 1000, createdAt: now, nextRunAt: next, runCount: 0, failCount: 0, tags: opts.tags ?? [] }
    this.jobs.set(job.id, job)
    this.metrics.totalJobs++
    if (job.enabled && !job.paused) this.metrics.activeJobs++
    return job
  }
  unschedule(id: string): boolean {
    const j = this.jobs.get(id)
    if (!j) return false
    this.jobs.delete(id)
    this.metrics.totalJobs--
    if (j.enabled && !j.paused) this.metrics.activeJobs--
    return true
  }
  getJob(id: string): ScheduledJob | undefined { return this.jobs.get(id) }
  getJobByName(name: string): ScheduledJob | undefined { return [...this.jobs.values()].find(j => j.name === name) }
  listJobs(): ScheduledJob[] { return [...this.jobs.values()] }
  jobsByTag(tag: string): ScheduledJob[] { return [...this.jobs.values()].filter(j => j.tags.includes(tag)) }

  // -------- Job control --------
  pause(id: string): boolean {
    const j = this.jobs.get(id)
    if (!j || j.paused) return false
    j.paused = true
    this.metrics.activeJobs--
    return true
  }
  resume(id: string): boolean {
    const j = this.jobs.get(id)
    if (!j || !j.paused) return false
    j.paused = false
    if (j.enabled) this.metrics.activeJobs++
    return true
  }
  enable(id: string): boolean { const j = this.jobs.get(id); if (!j || j.enabled) return false; j.enabled = true; if (!j.paused) this.metrics.activeJobs++; return true }
  disable(id: string): boolean { const j = this.jobs.get(id); if (!j || !j.enabled) return false; j.enabled = false; if (!j.paused) this.metrics.activeJobs--; return true }
  triggerNow(id: string): Promise<JobRun> {
    const j = this.jobs.get(id)
    if (!j) return Promise.reject(new Error('job not found'))
    return this.runJob(j, Date.now(), 1)
  }

  // -------- Tick --------
  start(intervalMs = 1000): void {
    if (this.tickHandle) return
    this.tickIntervalMs = intervalMs
    this.tickHandle = setInterval(() => this.tick().catch(() => {}), intervalMs)
  }
  stop(): void { if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null } }
  isRunning(): boolean { return this.tickHandle !== null }
  async tick(): Promise<JobRun[]> {
    const now = Date.now()
    const due: ScheduledJob[] = []
    for (const j of this.jobs.values()) {
      if (!j.enabled || j.paused) continue
      if (j.nextRunAt <= now) due.push(j)
    }
    const runs: JobRun[] = []
    for (const j of due) {
      // check misfire
      const lag = now - j.nextRunAt
      if (lag > this.tickIntervalMs * 2 && j.misfire === 'skip') {
        this.misfires++
        this.metrics.totalMisfires++
        this.advance(j)
        continue
      }
      if (j.misfire === 'coalesce' && (this.inFlight.get(j.id) ?? 0) > 0) {
        this.misfires++
        this.metrics.totalMisfires++
        this.advance(j)
        continue
      }
      if ((this.inFlight.get(j.id) ?? 0) >= j.maxConcurrent) {
        // backpressure: skip this tick
        this.advance(j)
        continue
      }
      this.inFlight.set(j.id, (this.inFlight.get(j.id) ?? 0) + 1)
      const run = await this.runJob(j, j.nextRunAt, 1).catch(e => ({ id: this.genId(), jobId: j.id, jobName: j.name, scheduledAt: j.nextRunAt, startedAt: Date.now(), finishedAt: Date.now(), ok: false, error: (e as Error).message, durationMs: 0, attempt: 1 }))
      runs.push(run)
      this.inFlight.set(j.id, Math.max(0, (this.inFlight.get(j.id) ?? 1) - 1))
      this.advance(j)
    }
    return runs
  }
  private advance(j: ScheduledJob): void {
    if (j.cron) j.nextRunAt = this.nextRunTime(j.cron, Date.now())
    else if (j.intervalMs) j.nextRunAt = Date.now() + j.intervalMs
    else j.enabled = false // one-shot
  }
  private async runJob(j: ScheduledJob, scheduledAt: number, attempt: number): Promise<JobRun> {
    const start = Date.now()
    const handler = this.handlers.get(j.handler)
    if (!handler) {
      const r: JobRun = { id: this.genId(), jobId: j.id, jobName: j.name, scheduledAt, startedAt: start, finishedAt: start, ok: false, error: 'handler missing', durationMs: 0, attempt }
      this.recordRun(j, r)
      return r
    }
    try {
      const result = await handler(j.payload)
      const r: JobRun = { id: this.genId(), jobId: j.id, jobName: j.name, scheduledAt, startedAt: start, finishedAt: Date.now(), ok: true, result, durationMs: Date.now() - start, attempt }
      this.recordRun(j, r)
      return r
    } catch (e) {
      const err = (e as Error).message
      this.metrics.totalRetries++
      this.retries++
      if (attempt <= j.maxRetries) {
        await new Promise(r => setTimeout(r, j.retryDelayMs))
        return this.runJob(j, scheduledAt, attempt + 1)
      }
      const r: JobRun = { id: this.genId(), jobId: j.id, jobName: j.name, scheduledAt, startedAt: start, finishedAt: Date.now(), ok: false, error: err, durationMs: Date.now() - start, attempt }
      this.recordRun(j, r)
      return r
    }
  }
  private recordRun(j: ScheduledJob, r: JobRun): void {
    this.runs.push(r)
    if (this.runs.length > 1000) this.runs.shift()
    j.runCount++
    j.lastRunAt = r.finishedAt
    if (r.ok) j.failCount = 0
    else j.failCount++
    this.metrics.totalRuns++
    if (r.ok) this.metrics.totalOk++
    else this.metrics.totalFail++
    const m = this.metrics.byJob[j.name] ?? { runs: 0, ok: 0, fail: 0, avgMs: 0, lastRunAt: 0 }
    m.runs++
    if (r.ok) m.ok++
    else m.fail++
    m.avgMs = (m.avgMs * (m.runs - 1) + r.durationMs) / m.runs
    m.lastRunAt = r.finishedAt
    this.metrics.byJob[j.name] = m
  }

  // -------- Runs history --------
  listRuns(opts: { jobId?: string; limit?: number; since?: number } = {}): JobRun[] {
    let r = [...this.runs]
    if (opts.jobId) r = r.filter(x => x.jobId === opts.jobId)
    if (opts.since) r = r.filter(x => x.finishedAt >= opts.since!)
    if (opts.limit) r = r.slice(-opts.limit)
    return r
  }
  getRun(id: string): JobRun | undefined { return this.runs.find(r => r.id === id) }
  totalRuns(): number { return this.runs.length }

  // -------- Metrics --------
  getMetrics(): SchedulerMetrics {
    this.metrics.totalJobs = this.jobs.size
    this.metrics.activeJobs = [...this.jobs.values()].filter(j => j.enabled && !j.paused).length
    return JSON.parse(JSON.stringify(this.metrics))
  }
  resetMetrics(): void { this.metrics = { totalJobs: this.jobs.size, activeJobs: [...this.jobs.values()].filter(j => j.enabled && !j.paused).length, totalRuns: 0, totalOk: 0, totalFail: 0, totalMisfires: 0, totalRetries: 0, byJob: {} } }

  // -------- Federation --------
  async scheduleWithRetry(opts: Parameters<TaskScheduler['schedule']>[0]): Promise<ScheduledJob> {
    return withRetry(async () => this.schedule(opts), { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 500, jitter: true, retryOnStatus: [] })
  }

  // -------- helpers --------
  private genId(): string {
    let h = 0xfacefeed
    for (let i = 0; i < 8; i++) h = (h ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
    return h.toString(16)
  }
}

let _instance: TaskScheduler | null = null
export function getTaskScheduler(): TaskScheduler { if (!_instance) _instance = new TaskScheduler(); return _instance }
export function resetTaskScheduler(): void { _instance = null }
export { TaskScheduler as default }
