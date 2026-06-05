/**
 * Versa · Job Queue / Background Tasks (v32.0)
 *
 * 分布式任务队列（BullMQ 风格，纯内存实现）：
 * - JobRegistry (per queue 注册任务处理器)
 * - JobQueue (priority / delay / repeat / unique)
 * - Worker (并发/抢占/超时/stuck 检测)
 * - Scheduler (cron 触发 repeatable jobs)
 * - RetryPolicy (exponential/linear/fixed)
 * - DlqManager (dead letter)
 * - JobEvents (created/progress/completed/failed/retrying)
 * - RateLimiter (per queue 限流)
 * - ConcurrencyLimiter
 * - JobMetrics
 * - DashboardSnapshot
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type JobStatus = 'waiting' | 'delayed' | 'active' | 'completed' | 'failed' | 'delayed_retry' | 'cancelled'
export type BackoffStrategy = 'exponential' | 'linear' | 'fixed' | 'fibonacci'

export interface JobOptions {
  priority?: number       // lower = higher priority
  delay?: number          // ms
  attempts?: number       // max retry attempts (default 1)
  backoff?: BackoffStrategy
  backoffDelay?: number   // base delay
  timeout?: number        // ms
  uniqueKey?: string      // dedupe
  repeatEvery?: number    // ms (repeating job)
  tags?: string[]
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
}

export interface Job<T = unknown, R = unknown> {
  id: string
  queue: string
  name: string
  data: T
  status: JobStatus
  attemptsMade: number
  attemptsMax: number
  priority: number
  delay: number
  backoff: BackoffStrategy
  backoffDelay: number
  timeout: number
  uniqueKey?: string
  repeatEvery?: number
  tags: string[]
  createdAt: number
  enqueuedAt: number
  startedAt?: number
  completedAt?: number
  failedAt?: number
  progress: number  // 0-100
  result?: R
  error?: string
  stack?: string
  workerId?: string
  /** History of attempts */
  history: Array<{ attempt: number; startedAt: number; finishedAt?: number; error?: string }>
  parentId?: string  // for chains
}

export interface JobHandler<T = unknown, R = unknown> {
  (job: Job<T, R>, update: (progress: number) => void): Promise<R> | R
}

export interface Worker {
  id: string
  queue: string
  concurrency: number
  active: number
  processed: number
  failed: number
  startedAt: number
  lastHeartbeat: number
  stopRequested: boolean
}

export interface QueueMetrics {
  queue: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  delayedRetry: number
  cancelled: number
  total: number
  throughput: number  // jobs/min
  avgDurationMs: number
  successRate: number
}

export interface JobEvent {
  type: 'created' | 'progress' | 'completed' | 'failed' | 'retry' | 'cancelled' | 'stalled' | 'removed'
  jobId: string
  queue: string
  ts: number
  detail?: string
}

// ============== Job Registry ==============

export class JobRegistry {
  private handlers = new Map<string, Map<string, JobHandler>>()

  register<T = unknown>(queueName: string, jobName: string, handler: JobHandler<T>): void {
    let q = this.handlers.get(queueName)
    if (!q) { q = new Map(); this.handlers.set(queueName, q) }
    q.set(jobName, handler as JobHandler)
  }

  get(queueName: string, jobName: string): JobHandler | undefined {
    return this.handlers.get(queueName)?.get(jobName)
  }

  list(queueName: string): string[] {
    return [...(this.handlers.get(queueName)?.keys() ?? [])]
  }

  clear(): void { this.handlers.clear() }
}

export const jobRegistry = new JobRegistry()

// ============== Job Queue ==============

const DEFAULT_OPTIONS: Required<Pick<JobOptions, 'priority' | 'delay' | 'attempts' | 'backoff' | 'backoffDelay' | 'timeout'>> = {
  priority: 5,
  delay: 0,
  attempts: 1,
  backoff: 'exponential',
  backoffDelay: 1000,
  timeout: 30000,
}

export function backoffMs(strategy: BackoffStrategy, attempt: number, base: number): number {
  switch (strategy) {
    case 'exponential': return base * Math.pow(2, attempt - 1)
    case 'linear': return base * attempt
    case 'fixed': return base
    case 'fibonacci': {
      const fib = (n: number): number => n < 2 ? n : fib(n - 1) + fib(n - 2)
      return base * fib(attempt)
    }
  }
}

export class JobQueueSystem {
  readonly name: string
  private jobs = new Map<string, Job>()
  private waiting: Job[] = []   // priority-sorted
  private active = new Map<string, Job>()
  private completed: Job[] = []
  private failed: Job[] = []
  private delayed: Job[] = []
  private dlq: Job[] = []
  private eventLog: JobEvent[] = []
  private workers: Worker[] = []
  private throughputWindow: number[] = []  // ts of completed jobs
  private rateLimits = new Map<string, { window: number; max: number; calls: number[] }>()
  private stuckCheckInterval: ReturnType<typeof setInterval> | null = null
  private repeatJobs = new Map<string, { job: Job; interval: ReturnType<typeof setInterval> }>()
  private uniqueKeyIndex = new Map<string, string>()  // uniqueKey -> jobId

  constructor(name: string) {
    this.name = name
  }

  // ----- Producer -----
  enqueue<T = unknown, R = unknown>(name: string, data: T, options: JobOptions = {}): Job<T, R> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    if (opts.uniqueKey) {
      const existing = this.uniqueKeyIndex.get(opts.uniqueKey)
      if (existing) return this.jobs.get(existing) as Job<T, R>
    }
    const job: Job<T, R> = {
      id: `job-${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      queue: this.name,
      name,
      data,
      status: opts.delay > 0 ? 'delayed' : 'waiting',
      attemptsMade: 0,
      attemptsMax: opts.attempts ?? 1,
      priority: opts.priority ?? 5,
      delay: opts.delay ?? 0,
      backoff: opts.backoff ?? 'exponential',
      backoffDelay: opts.backoffDelay ?? 1000,
      timeout: opts.timeout ?? 30000,
      uniqueKey: opts.uniqueKey,
      repeatEvery: opts.repeatEvery,
      tags: opts.tags ?? [],
      createdAt: Date.now(),
      enqueuedAt: Date.now(),
      progress: 0,
      history: [],
    }
    this.jobs.set(job.id, job as unknown as Job)
    if (opts.uniqueKey) this.uniqueKeyIndex.set(opts.uniqueKey, job.id)
    this.emit({ type: 'created', jobId: job.id, queue: this.name, ts: Date.now() })
    if (job.status === 'delayed') this.delayed.push(job as unknown as Job)
    else this.addToWaiting(job as unknown as Job)
    if (opts.repeatEvery) this.startRepeat(job as unknown as Job)
    return job
  }

  private addToWaiting(job: Job): void {
    this.waiting.push(job)
    this.waiting.sort((a, b) => a.priority - b.priority)
  }

  private startRepeat(template: Job): void {
    const handle = setInterval(() => {
      if (!template.repeatEvery) return
      this.enqueue(template.name, template.data, { ...template, repeatEvery: undefined })
    }, template.repeatEvery)
    this.repeatJobs.set(template.id, { job: template, interval: handle })
  }

  // ----- Worker management -----
  registerWorker(workerId: string, concurrency = 1): Worker {
    const w: Worker = {
      id: workerId, queue: this.name, concurrency,
      active: 0, processed: 0, failed: 0,
      startedAt: Date.now(), lastHeartbeat: Date.now(), stopRequested: false,
    }
    this.workers.push(w)
    return w
  }

  // ----- Consumer loop -----
  async tick(worker: Worker): Promise<Job | null> {
    if (worker.stopRequested) return null
    if (worker.active >= worker.concurrency) return null
    this.promoteDelayed()
    if (this.waiting.length === 0) return null
    const job = this.waiting.shift()!
    if (!this.checkRateLimit(job.name)) {
      // requeue at front
      this.waiting.unshift(job)
      return null
    }
    job.status = 'active'
    job.startedAt = Date.now()
    job.workerId = worker.id
    job.attemptsMade++
    job.history.push({ attempt: job.attemptsMade, startedAt: Date.now() })
    this.active.set(job.id, job)
    worker.active++
    worker.lastHeartbeat = Date.now()
    return job
  }

  async processJob(job: Job, worker: Worker): Promise<void> {
    const handler = jobRegistry.get(this.name, job.name)
    if (!handler) {
      job.status = 'failed'
      job.error = `No handler for ${job.name}`
      this.finalize(job, worker, false)
      return
    }
    const update = (progress: number) => {
      job.progress = Math.max(0, Math.min(100, progress))
      this.emit({ type: 'progress', jobId: job.id, queue: this.name, ts: Date.now(), detail: `${progress}%` })
    }
    try {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null
      const timeoutPromise = job.timeout > 0 ? new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Job ${job.id} timed out after ${job.timeout}ms`)), job.timeout)
      }) : null
      const work = (async () => handler(job, update))()
      const result = timeoutPromise ? await Promise.race([work, timeoutPromise]) : await work
      if (timeoutHandle) clearTimeout(timeoutHandle)
      job.result = result as unknown
      job.status = 'completed'
      job.completedAt = Date.now()
      job.progress = 100
      this.emit({ type: 'completed', jobId: job.id, queue: this.name, ts: Date.now() })
      this.throughputWindow.push(Date.now())
      this.finalize(job, worker, true)
    } catch (e) {
      job.error = e instanceof Error ? e.message : String(e)
      job.stack = e instanceof Error ? e.stack : undefined
      job.status = 'failed'
      job.failedAt = Date.now()
      this.emit({ type: 'failed', jobId: job.id, queue: this.name, ts: Date.now(), detail: job.error })
      if (job.attemptsMade < job.attemptsMax) {
        const delay = backoffMs(job.backoff, job.attemptsMade, job.backoffDelay)
        job.status = 'delayed_retry'
        job.delay = delay
        this.delayed.push(job)
        this.emit({ type: 'retry', jobId: job.id, queue: this.name, ts: Date.now(), detail: `retry in ${delay}ms` })
      }
      this.finalize(job, worker, false)
    }
  }

  private finalize(job: Job, worker: Worker, success: boolean): void {
    const h = job.history[job.history.length - 1]
    if (h) h.finishedAt = Date.now()
    if (h && !success) h.error = job.error
    this.active.delete(job.id)
    worker.active = Math.max(0, worker.active - 1)
    if (success) {
      worker.processed++
      this.completed.push(job)
    } else {
      worker.failed++
      this.failed.push(job)
      if (job.attemptsMade >= job.attemptsMax) this.dlq.push(job)
    }
    if (job.status !== 'delayed_retry') {
      // keep in completed/failed for inspection
    }
  }

  // ----- Promotion: delayed -> waiting -----
  promoteDelayed(): void {
    const now = Date.now()
    const ready: Job[] = []
    const stay: Job[] = []
    for (const j of this.delayed) {
      if (j.enqueuedAt + j.delay <= now) ready.push(j)
      else stay.push(j)
    }
    this.delayed = stay
    for (const j of ready) {
      j.status = 'waiting'
      j.delay = 0
      this.addToWaiting(j)
    }
  }

  // ----- Stuck detection -----
  startStuckCheck(intervalMs = 10000, thresholdMs = 60000): void {
    if (this.stuckCheckInterval) return
    this.stuckCheckInterval = setInterval(() => {
      const now = Date.now()
      for (const j of this.active.values()) {
        if (j.startedAt && now - j.startedAt > thresholdMs) {
          this.emit({ type: 'stalled', jobId: j.id, queue: this.name, ts: now, detail: `${now - j.startedAt}ms` })
        }
      }
    }, intervalMs)
  }

  stopStuckCheck(): void {
    if (this.stuckCheckInterval) clearInterval(this.stuckCheckInterval)
    this.stuckCheckInterval = null
  }

  // ----- Rate Limiter -----
  setRateLimit(jobName: string, max: number, windowMs: number): void {
    this.rateLimits.set(jobName, { max, window: windowMs, calls: [] })
  }

  private checkRateLimit(jobName: string): boolean {
    const r = this.rateLimits.get(jobName)
    if (!r) return true
    const now = Date.now()
    r.calls = r.calls.filter(t => t > now - r.window)
    if (r.calls.length >= r.max) return false
    r.calls.push(now)
    return true
  }

  // ----- Management -----
  cancel(jobId: string): boolean {
    const j = this.jobs.get(jobId)
    if (!j) return false
    if (j.status === 'active') return false  // can't cancel running
    j.status = 'cancelled'
    this.waiting = this.waiting.filter(x => x.id !== jobId)
    this.delayed = this.delayed.filter(x => x.id !== jobId)
    this.emit({ type: 'cancelled', jobId, queue: this.name, ts: Date.now() })
    return true
  }

  remove(jobId: string): boolean {
    const j = this.jobs.get(jobId)
    if (!j) return false
    if (j.status === 'active') return false
    if (j.uniqueKey) this.uniqueKeyIndex.delete(j.uniqueKey)
    this.jobs.delete(jobId)
    this.waiting = this.waiting.filter(x => x.id !== jobId)
    this.delayed = this.delayed.filter(x => x.id !== jobId)
    this.completed = this.completed.filter(x => x.id !== jobId)
    this.failed = this.failed.filter(x => x.id !== jobId)
    this.emit({ type: 'removed', jobId, queue: this.name, ts: Date.now() })
    return true
  }

  retry(jobId: string): boolean {
    const j = this.jobs.get(jobId)
    if (!j) return false
    if (j.status !== 'failed' && j.status !== 'cancelled') return false
    j.status = 'waiting'
    j.attemptsMade = 0
    j.error = undefined
    j.progress = 0
    this.addToWaiting(j)
    return true
  }

  // ----- Queries -----
  get(jobId: string): Job | undefined { return this.jobs.get(jobId) }
  list(filter?: { status?: JobStatus; name?: string }): Job[] {
    let arr = [...this.jobs.values()]
    if (filter?.status) arr = arr.filter(j => j.status === filter.status)
    if (filter?.name) arr = arr.filter(j => j.name === filter.name)
    return arr
  }
  waiting_(name?: string): Job[] { return name ? this.waiting.filter(j => j.name === name) : [...this.waiting] }
  delayed_(name?: string): Job[] { return name ? this.delayed.filter(j => j.name === name) : [...this.delayed] }
  active_(name?: string): Job[] { return name ? [...this.active.values()].filter(j => j.name === name) : [...this.active.values()] }
  completed_(name?: string): Job[] { return name ? this.completed.filter(j => j.name === name) : [...this.completed] }
  failed_(name?: string): Job[] { return name ? this.failed.filter(j => j.name === name) : [...this.failed] }
  dlqList(): Job[] { return [...this.dlq] }
  events(filter?: { jobId?: string; type?: JobEvent['type'] }): JobEvent[] {
    let arr = [...this.eventLog]
    if (filter?.jobId) arr = arr.filter(e => e.jobId === filter.jobId)
    if (filter?.type) arr = arr.filter(e => e.type === filter.type)
    return arr
  }
  workersList(): Worker[] { return [...this.workers] }
  workerStop(workerId: string): void {
    const w = this.workers.find(x => x.id === workerId)
    if (w) w.stopRequested = true
  }

  // ----- Metrics -----
  metrics(): QueueMetrics {
    const total = this.jobs.size
    const waiting = this.waiting.length
    const active = this.active.size
    const completed = this.completed.length
    const failed = this.failed.length
    const delayed = this.delayed.filter(j => j.status === 'delayed').length
    const delayedRetry = this.delayed.filter(j => j.status === 'delayed_retry').length
    const cancelled = [...this.jobs.values()].filter(j => j.status === 'cancelled').length
    const now = Date.now()
    this.throughputWindow = this.throughputWindow.filter(t => t > now - 60000)
    const durations = this.completed.filter(j => j.startedAt && j.completedAt).map(j => j.completedAt! - j.startedAt!)
    const avgDur = durations.length === 0 ? 0 : durations.reduce((s, n) => s + n, 0) / durations.length
    return {
      queue: this.name,
      waiting, active, completed, failed, delayed, delayedRetry, cancelled,
      total,
      throughput: this.throughputWindow.length,
      avgDurationMs: avgDur,
      successRate: (completed + failed) === 0 ? 0 : completed / (completed + failed),
    }
  }

  clearAll(): void {
    for (const r of this.repeatJobs.values()) clearInterval(r.interval)
    this.repeatJobs.clear()
    this.jobs.clear()
    this.waiting = []
    this.active.clear()
    this.completed = []
    this.failed = []
    this.delayed = []
    this.dlq = []
    this.eventLog = []
    this.workers = []
    this.throughputWindow = []
    this.rateLimits.clear()
    this.uniqueKeyIndex.clear()
  }

  private emit(e: JobEvent): void {
    this.eventLog.push(e)
    if (this.eventLog.length > 5000) this.eventLog.shift()
  }
}

// ============== Multi-Queue Manager ==============

export class QueueManager {
  private queues = new Map<string, JobQueueSystem>()

  create(name: string): JobQueueSystem {
    let q = this.queues.get(name)
    if (q) return q
    q = new JobQueueSystem(name)
    this.queues.set(name, q)
    return q
  }
  get(name: string): JobQueueSystem | undefined { return this.queues.get(name) }
  all(): JobQueueSystem[] { return [...this.queues.values()] }
  names(): string[] { return [...this.queues.keys()] }
  remove(name: string): boolean { return this.queues.delete(name) }
  clear(): void { this.queues.clear() }

  /** Dashboard snapshot across all queues */
  snapshot(): { queues: QueueMetrics[]; events: JobEvent[]; totalJobs: number; totalActive: number } {
    const queues = this.all().map(q => q.metrics())
    const events = this.all().flatMap(q => q.events().slice(-20))
    const totalJobs = queues.reduce((s, m) => s + m.total, 0)
    const totalActive = queues.reduce((s, m) => s + m.active, 0)
    return { queues, events, totalJobs, totalActive }
  }
}

export const queues = new QueueManager()

// ============== Persistence ==============

const STORAGE_KEY = 'versa.queue.v1'

export function persistQueues(): number {
  if (typeof localStorage === 'undefined') return 0
  const data = {
    jobs: queues.all().flatMap(q => q.list().map(j => ({ ...j }))),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data.jobs.length
  } catch { return 0 }
}

export function loadQueues(): { jobs: number } {
  if (typeof localStorage === 'undefined') return { jobs: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { jobs: 0 }
    const data = JSON.parse(raw)
    return { jobs: data.jobs?.length ?? 0 }
  } catch { return { jobs: 0 } }
}

export { withRetry, defaultRetry, computeBackoff }
