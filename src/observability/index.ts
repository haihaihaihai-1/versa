/**
 * Versa · Observability / Distributed Tracing (v56.0)
 * - Span creation (root, child)
 * - Trace context propagation (traceId/spanId/parentSpanId)
 * - W3C trace-context header (traceparent)
 * - Baggage items
 * - Span events (timestamped notes)
 * - Span attributes (typed key-value)
 * - Span status (ok/error/unset)
 * - Span kind (client/server/producer/consumer/internal)
 * - Exception recording
 * - Span links
 * - Sampling decisions
 * - Span exporters (in-memory, JSON, console)
 * - Trace query & search
 * - Metrics (counters / histograms / gauges)
 * - Active context (current span)
 * - Tracer registry (named tracers)
 * - Time provider (injectable for tests)
 */
import { randomBytes } from 'crypto'

export type SpanKind = 'client' | 'server' | 'producer' | 'consumer' | 'internal'
export type SpanStatus = 'ok' | 'error' | 'unset'

export interface AttributeValue { type: 'string' | 'int' | 'float' | 'bool'; value: string | number | boolean }
export interface SpanEvent { name: string; timestamp: number; attributes?: Record<string, AttributeValue> }
export interface SpanLink { traceId: string; spanId: string; attributes?: Record<string, AttributeValue> }
export interface Span {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: SpanKind
  service: string
  startTime: number
  endTime?: number
  durationMs?: number
  status: SpanStatus
  statusMessage?: string
  attributes: Record<string, AttributeValue>
  events: SpanEvent[]
  links: SpanLink[]
  sampled: boolean
}

export interface BaggageItem { key: string; value: string }

export interface TraceContext {
  traceId: string
  spanId: string
  flags: number
  baggage: BaggageItem[]
}

export type ExporterFn = (spans: Span[]) => void | Promise<void>

export interface CounterMetric { name: string; type: 'counter'; value: number; labels: Record<string, string>; timestamp: number }
export interface GaugeMetric { name: string; type: 'gauge'; value: number; labels: Record<string, string>; timestamp: number }
export interface HistogramMetric { name: string; type: 'histogram'; buckets: number[]; counts: number[]; sum: number; count: number; labels: Record<string, string> }
export type Metric = CounterMetric | GaugeMetric | HistogramMetric

export interface ObservabilityMetrics {
  totalSpans: number
  totalTraces: number
  totalSampled: number
  totalErrors: number
  totalExports: number
  totalMetrics: number
  byKind: Record<SpanKind, number>
}

export class Tracer {
  private spans: Span[] = []
  private activeSpans = new Map<string, string>() // threadId → spanId
  private exporters: ExporterFn[] = []
  private metrics: Metric[] = []
  private obsMetrics: ObservabilityMetrics = { totalSpans: 0, totalTraces: 0, totalSampled: 0, totalErrors: 0, totalExports: 0, totalMetrics: 0, byKind: { client: 0, server: 0, producer: 0, consumer: 0, internal: 0 } }
  private now: () => number
  private sampleRate: number
  private serviceName: string

  constructor(opts: { serviceName: string; sampleRate?: number; now?: () => number } = { serviceName: 'unknown' }) {
    this.serviceName = opts.serviceName
    this.sampleRate = opts.sampleRate ?? 1.0
    this.now = opts.now ?? (() => Date.now())
  }

  // -------- ID generation --------
  private newId(bytes: number): string { return randomBytes(bytes).toString('hex') }
  newTraceId(): string { return this.newId(16) }
  newSpanId(): string { return this.newId(8) }

  // -------- W3C trace-context --------
  encodeTraceparent(ctx: { traceId: string; spanId: string; flags?: number }): string { return `00-${ctx.traceId}-${ctx.spanId}-${(ctx.flags ?? 0).toString(16).padStart(2, '0')}` }
  decodeTraceparent(s: string): TraceContext | null {
    const m = s.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/)
    if (!m) return null
    return { traceId: m[1]!, spanId: m[2]!, flags: parseInt(m[3]!, 16), baggage: [] }
  }
  encodeBaggage(items: BaggageItem[]): string { return items.map(b => `${encodeURIComponent(b.key)}=${encodeURIComponent(b.value)}`).join(',') }
  decodeBaggage(s: string): BaggageItem[] {
    if (!s) return []
    return s.split(',').filter(Boolean).map(p => {
      const [k, v] = p.split('=')
      return { key: decodeURIComponent(k!), value: decodeURIComponent(v ?? '') }
    })
  }

  // -------- Span creation --------
  startSpan(name: string, opts: { kind?: SpanKind; parent?: TraceContext; attributes?: Record<string, AttributeValue>; links?: SpanLink[]; threadId?: string; startTime?: number } = {}): Span {
    const traceId = opts.parent?.traceId ?? this.newTraceId()
    const spanId = this.newSpanId()
    const sampled = Math.random() < this.sampleRate
    const span: Span = {
      traceId, spanId, parentSpanId: opts.parent?.spanId, name, kind: opts.kind ?? 'internal', service: this.serviceName,
      startTime: opts.startTime ?? this.now(), status: 'unset', attributes: opts.attributes ?? {}, events: [], links: opts.links ?? [], sampled
    }
    if (sampled) { this.spans.push(span); this.obsMetrics.totalSpans++; this.obsMetrics.byKind[span.kind]++ }
    if (opts.threadId) this.activeSpans.set(opts.threadId, spanId)
    // propagate baggage
    if (opts.parent?.baggage) span.attributes['baggage.count'] = { type: 'int', value: opts.parent.baggage.length }
    return span
  }
  endSpan(span: Span, opts: { status?: SpanStatus; statusMessage?: string; endTime?: number } = {}): void {
    if (span.endTime) return
    span.endTime = opts.endTime ?? this.now()
    span.durationMs = span.endTime - span.startTime
    span.status = opts.status ?? 'ok'
    if (opts.statusMessage) span.statusMessage = opts.statusMessage
    if (span.status === 'error') this.obsMetrics.totalErrors++
    if (span.sampled) this.obsMetrics.totalSampled++
  }

  // -------- Span context --------
  getActiveSpan(threadId: string): Span | undefined { const sid = this.activeSpans.get(threadId); if (!sid) return undefined; return this.spans.find(s => s.spanId === sid) }
  setActiveSpan(span: Span, threadId: string): void { this.activeSpans.set(threadId, span.spanId) }
  clearActive(threadId: string): void { this.activeSpans.delete(threadId) }

  // -------- Helpers --------
  addEvent(span: Span, name: string, attributes?: Record<string, AttributeValue>): void { span.events.push({ name, timestamp: this.now(), attributes }) }
  setAttribute(span: Span, key: string, value: string | number | boolean): void {
    const t = typeof value === 'string' ? 'string' : typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : 'bool'
    span.attributes[key] = { type: t, value }
  }
  recordException(span: Span, err: Error | string, attributes?: Record<string, AttributeValue>): void {
    const message = typeof err === 'string' ? err : err.message
    const stack = typeof err === 'string' ? undefined : err.stack
    this.addEvent(span, 'exception', { ...attributes, 'exception.message': { type: 'string', value: message }, 'exception.stacktrace': { type: 'string', value: stack ?? '' } })
    span.status = 'error'
    span.statusMessage = message
  }
  addLink(span: Span, link: SpanLink): void { span.links.push(link) }

  // -------- Tracer API (auto-finish) --------
  withSpan<T>(name: string, fn: (span: Span) => T | Promise<T>, opts: { kind?: SpanKind; parent?: TraceContext; threadId?: string; attributes?: Record<string, AttributeValue> } = {}): T | Promise<T> {
    const span = this.startSpan(name, opts)
    try {
      const r = fn(span)
      if (r instanceof Promise) {
        return r.then(v => { this.endSpan(span, { status: 'ok' }); return v }).catch((e: Error) => { this.recordException(span, e); this.endSpan(span, { status: 'error' }); throw e })
      } else { this.endSpan(span, { status: 'ok' }); return r }
    } catch (e) { this.recordException(span, e as Error); this.endSpan(span, { status: 'error' }); throw e }
  }

  // -------- Exporters --------
  addExporter(fn: ExporterFn): void { this.exporters.push(fn) }
  async exportAll(): Promise<void> {
    const sampled = this.spans.filter(s => s.sampled)
    for (const e of this.exporters) await e(sampled)
    this.obsMetrics.totalExports++
  }
  clearSpans(): void { this.spans = [] }

  // -------- Query --------
  getSpans(traceId?: string): Span[] { return traceId ? this.spans.filter(s => s.traceId === traceId) : [...this.spans] }
  getTrace(traceId: string): Span[] { return this.spans.filter(s => s.traceId === traceId).sort((a, b) => a.startTime - b.startTime) }
  getTraceRoot(traceId: string): Span | undefined { return this.getTrace(traceId).find(s => !s.parentSpanId) }
  findByName(name: string): Span[] { return this.spans.filter(s => s.name === name) }
  findByService(service: string): Span[] { return this.spans.filter(s => s.service === service) }
  findByStatus(status: SpanStatus): Span[] { return this.spans.filter(s => s.status === status) }
  findByAttribute(key: string, value: string | number | boolean): Span[] { return this.spans.filter(s => s.attributes[key]?.value === value) }
  getStats(traceId: string): { count: number; totalMs: number; errors: number; spansByKind: Record<SpanKind, number> } {
    const spans = this.getTrace(traceId)
    const byKind: Record<SpanKind, number> = { client: 0, server: 0, producer: 0, consumer: 0, internal: 0 }
    let totalMs = 0, errors = 0
    for (const s of spans) { byKind[s.kind]++; if (s.durationMs) totalMs += s.durationMs; if (s.status === 'error') errors++ }
    return { count: spans.length, totalMs, errors, spansByKind: byKind }
  }

  // -------- Metrics --------
  counter(name: string, value = 1, labels: Record<string, string> = {}): void { this.metrics.push({ name, type: 'counter', value, labels, timestamp: this.now() }); this.obsMetrics.totalMetrics++ }
  gauge(name: string, value: number, labels: Record<string, string> = {}): void { this.metrics.push({ name, type: 'gauge', value, labels, timestamp: this.now() }); this.obsMetrics.totalMetrics++ }
  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    let existing = this.metrics.find(m => m.type === 'histogram' && m.name === name && JSON.stringify(m.labels) === JSON.stringify(labels)) as HistogramMetric | undefined
    if (!existing) { existing = { name, type: 'histogram', buckets, counts: new Array(buckets.length + 1).fill(0), sum: 0, count: 0, labels }; this.metrics.push(existing) }
    existing.sum += value
    existing.count++
    let placed = false
    for (let i = 0; i < buckets.length; i++) if (value <= buckets[i]!) { existing.counts[i]!++; placed = true; break }
    if (!placed) existing.counts[buckets.length]!++
    this.obsMetrics.totalMetrics++
  }
  getMetrics(filter?: { name?: string; type?: Metric['type'] }): Metric[] { let arr = [...this.metrics]; if (filter?.name) arr = arr.filter(m => m.name === filter.name); if (filter?.type) arr = arr.filter(m => m.type === filter.type); return arr }
  getCounter(name: string): number { return this.metrics.filter(m => m.type === 'counter' && m.name === name).reduce((s, m) => s + (m as CounterMetric).value, 0) }
  getGauge(name: string): number | undefined { const m = this.metrics.find(x => x.type === 'gauge' && x.name === name); return m ? (m as GaugeMetric).value : undefined }

  // -------- Observability metrics --------
  getObservabilityMetrics(): ObservabilityMetrics {
    this.obsMetrics.totalTraces = new Set(this.spans.map(s => s.traceId)).size
    return JSON.parse(JSON.stringify(this.obsMetrics))
  }
  resetMetrics(): void { this.obsMetrics = { totalSpans: 0, totalTraces: 0, totalSampled: 0, totalErrors: 0, totalExports: 0, totalMetrics: 0, byKind: { client: 0, server: 0, producer: 0, consumer: 0, internal: 0 } } }
}

class TracerRegistry {
  private tracers = new Map<string, Tracer>()
  register(name: string, tracer: Tracer): void { this.tracers.set(name, tracer) }
  get(name: string): Tracer | undefined { return this.tracers.get(name) }
  list(): string[] { return [...this.tracers.keys()] }
  remove(name: string): boolean { return this.tracers.delete(name) }
  clear(): void { this.tracers.clear() }
}

let _registry: TracerRegistry | null = null
export function getTracerRegistry(): TracerRegistry { if (!_registry) _registry = new TracerRegistry(); return _registry }
export function resetTracerRegistry(): void { _registry = null }

let _defaultTracer: Tracer | null = null
export function getTracer(serviceName = 'default'): Tracer { if (!_defaultTracer) _defaultTracer = new Tracer({ serviceName }); return _defaultTracer }
export function resetTracer(): void { _defaultTracer = null }

export { Tracer as default, TracerRegistry }
