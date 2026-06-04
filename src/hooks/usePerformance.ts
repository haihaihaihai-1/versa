/**
 * Versa · 性能监控 (v12.0)
 * 监控 Core Web Vitals: FCP / LCP / CLS / INP
 * 上报到 console + 自定义 endpoint (可扩展)
 */
import { useEffect, useState } from 'react'

export interface PerfMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FID'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

const STORAGE_KEY = 'versa:perf:metrics'

function loadMetrics(): PerfMetric[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMetric(m: PerfMetric) {
  try {
    const list = loadMetrics()
    list.push(m)
    if (list.length > 100) list.shift()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

function rate(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'FCP': return value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor'
    case 'LCP': return value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor'
    case 'CLS': return value < 0.1 ? 'good' : value < 0.25 ? 'needs-improvement' : 'poor'
    case 'INP': return value < 200 ? 'good' : value < 500 ? 'needs-improvement' : 'poor'
    case 'TTFB': return value < 800 ? 'good' : value < 1800 ? 'needs-improvement' : 'poor'
    case 'FID': return value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor'
    default: return 'good'
  }
}

let observers: PerformanceObserver[] = []

function installObservers() {
  if (typeof window === 'undefined') return
  if (!('PerformanceObserver' in window)) return

  try {
    // FCP & LCP
    const paintObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = entry.name === 'first-contentful-paint' ? 'FCP' : null
        if (name) {
          const m: PerfMetric = { name, value: entry.startTime, rating: rate(name, entry.startTime), timestamp: Date.now() }
          saveMetric(m)
        }
      }
    })
    paintObs.observe({ type: 'paint', buffered: true })
    observers.push(paintObs)
  } catch {}

  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as any
      if (last) {
        const m: PerfMetric = { name: 'LCP', value: last.startTime, rating: rate('LCP', last.startTime), timestamp: Date.now() }
        saveMetric(m)
      }
    })
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true })
    observers.push(lcpObs)
  } catch {}

  try {
    let clsValue = 0
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) clsValue += entry.value
      }
      const m: PerfMetric = { name: 'CLS', value: clsValue, rating: rate('CLS', clsValue), timestamp: Date.now() }
      saveMetric(m)
    })
    clsObs.observe({ type: 'layout-shift', buffered: true })
    observers.push(clsObs)
  } catch {}

  try {
    const inpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        const value = entry.processingStart - entry.startTime
        const m: PerfMetric = { name: 'INP', value, rating: rate('INP', value), timestamp: Date.now() }
        saveMetric(m)
      }
    })
    inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any)
    observers.push(inpObs)
  } catch {}

  // TTFB
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart
      const m: PerfMetric = { name: 'TTFB', value: ttfb, rating: rate('TTFB', ttfb), timestamp: Date.now() }
      saveMetric(m)
    }
  } catch {}
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerfMetric[]>(loadMetrics)

  useEffect(() => {
    installObservers()
    const id = setInterval(() => setMetrics(loadMetrics()), 5000)
    return () => {
      clearInterval(id)
      observers.forEach((o) => o.disconnect())
      observers = []
    }
  }, [])

  const summary = (() => {
    const out: Record<string, PerfMetric> = {}
    for (const m of metrics) {
      const existing = out[m.name]
      if (!existing || m.timestamp > existing.timestamp) out[m.name] = m
    }
    return out
  })()

  return { metrics, summary }
}

export function getMetricsSnapshot() {
  const all = loadMetrics()
  const summary: Record<string, PerfMetric> = {}
  for (const m of all) {
    const existing = summary[m.name]
    if (!existing || m.timestamp > existing.timestamp) summary[m.name] = m
  }
  return summary
}

export function clearMetrics() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}
