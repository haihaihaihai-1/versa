import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Sandbox, getSandboxRegistry, resetSandboxRegistry } from '../index'

describe('Sandbox - JS execution', () => {
  let sb: Sandbox
  beforeEach(() => { sb = new Sandbox({ timeoutMs: 1000, memoryMb: 32 }) })

  it('runs simple expression', () => {
    const r = sb.runJs('1 + 2')
    expect(r.success).toBe(true)
    expect(r.value).toBe(3)
  })
  it('returns last expression', () => {
    const r = sb.runJs('const x = 10; x * 2')
    expect(r.value).toBe(20)
  })
  it('catches throw', () => {
    const r = sb.runJs('throw new Error("boom")')
    expect(r.success).toBe(false)
    expect(r.error).toContain('boom')
  })
  it('isolates globals', () => {
    const r1 = sb.runJs('globalThis.__TEST = 1')
    const r2 = sb.runJs('globalThis.__TEST')
    expect(r2.value).toBeUndefined()
  })
  it('captures console.log', () => {
    const r = sb.runJs('console.log("hi"); 42', { captureConsole: true })
    expect(r.logs?.some(l => l.includes('hi'))).toBe(true)
  })
  it('measures duration', () => {
    const r = sb.runJs('let s=0; for(let i=0;i<1000000;i++)s+=i; s')
    expect(r.value).toBe(499999500000)
    expect(r.durationMs).toBeGreaterThanOrEqual(0)
  })
  it('rejects forbidden global', () => {
    const r = sb.runJs('eval("1")')
    expect(r.success).toBe(false)
  })
  it('rejects forbidden global process', () => {
    const r = sb.runJs('process.exit(0)')
    expect(r.success).toBe(false)
  })
  it('rejects forbidden global Function', () => {
    const r = sb.runJs('new Function("return 1")()')
    expect(r.success).toBe(false)
  })
  it('rejects infinite loop on timeout', () => {
    const sb2 = new Sandbox({ timeoutMs: 100 })
    const r = sb2.runJs('while(true){}')
    expect(r.success).toBe(false)
    expect(r.error).toContain('timeout')
  })
})

describe('Sandbox - memory limits', () => {
  it('reports memory usage', () => {
    const sb = new Sandbox()
    const r = sb.runJs('const arr=[]; for(let i=0;i<100;i++)arr.push({i}); arr.length')
    expect(r.value).toBe(100)
  })
  it('respects maxAllocBytes option without error', () => {
    const sb = new Sandbox({ maxAllocBytes: 1024 })
    const r = sb.runJs('1 + 1')
    expect(r.success).toBe(true)
  })
})

describe('Sandbox - exports & modules', () => {
  it('runs module with exports', () => {
    const sb = new Sandbox()
    const r = sb.runModule('export const x = 5; export default x * 2')
    expect(r.value).toBe(10)
  })
  it('runs module with imports', () => {
    const sb = new Sandbox()
    const r = sb.runModule('import { foo } from "./lib.js"; foo()', { modules: { './lib.js': 'export function foo(){return 7}' } })
    expect(r.value).toBe(7)
  })
})

describe('Sandbox - whitelist / blacklist', () => {
  it('respects extra allowed globals', () => {
    const sb = new Sandbox({ allowGlobals: ['Math'] })
    const r = sb.runJs('Math.sqrt(16)')
    expect(r.value).toBe(4)
  })
  it('blocks user-defined forbidden', () => {
    const sb = new Sandbox({ denyGlobals: ['fetch'] })
    const r = sb.runJs('fetch("http://x")')
    expect(r.success).toBe(false)
  })
})

describe('Sandbox - code templates', () => {
  it('runs template with interpolation', () => {
    const sb = new Sandbox()
    const r = sb.runTemplate('return {{x}} * 2', { x: 21 })
    expect(r.value).toBe(42)
  })
  it('rejects unsafe template code', () => {
    const sb = new Sandbox()
    const r = sb.runTemplate('{{code}}', { code: 'process.exit(0)' })
    expect(r.success).toBe(false)
  })
})

describe('Sandbox - history & registry', () => {
  it('keeps execution history', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.runJs('2'); sb.runJs('3')
    expect(sb.getHistory()).toHaveLength(3)
  })
  it('filters history by success', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.runJs('throw 1')
    expect(sb.getHistory({ success: true })).toHaveLength(1)
  })
  it('clears history', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.clearHistory()
    expect(sb.getHistory()).toHaveLength(0)
  })
})

describe('Sandbox - metrics', () => {
  it('totalExecutions', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.runJs('2')
    expect(sb.getMetrics().totalExecutions).toBe(2)
  })
  it('successfulExecutions', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.runJs('throw 1')
    expect(sb.getMetrics().successfulExecutions).toBe(1)
  })
  it('failedExecutions', () => {
    const sb = new Sandbox()
    sb.runJs('throw 1'); sb.runJs('throw 1')
    expect(sb.getMetrics().failedExecutions).toBe(2)
  })
  it('timeouts', () => {
    const sb = new Sandbox({ timeoutMs: 50 })
    sb.runJs('while(true){}')
    expect(sb.getMetrics().timeouts).toBe(1)
  })
  it('avgDurationMs', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.runJs('2')
    expect(sb.getMetrics().avgDurationMs).toBeGreaterThanOrEqual(0)
  })
  it('resetMetrics', () => {
    const sb = new Sandbox()
    sb.runJs('1'); sb.resetMetrics()
    expect(sb.getMetrics().totalExecutions).toBe(0)
  })
})

describe('Sandbox - registry', () => {
  afterEach(() => resetSandboxRegistry())
  it('singleton registry', () => {
    expect(getSandboxRegistry()).toBe(getSandboxRegistry())
  })
  it('registers named sandboxes', () => {
    const r = getSandboxRegistry()
    r.register('worker-1', new Sandbox())
    expect(r.list()).toHaveLength(1)
  })
  it('gets by name', () => {
    const r = getSandboxRegistry()
    const sb = new Sandbox()
    r.register('w', sb)
    expect(r.get('w')).toBe(sb)
  })
  it('removes by name', () => {
    const r = getSandboxRegistry()
    r.register('w', new Sandbox())
    r.remove('w')
    expect(r.get('w')).toBeUndefined()
  })
  it('clears all', () => {
    const r = getSandboxRegistry()
    r.register('a', new Sandbox()); r.register('b', new Sandbox())
    r.clear()
    expect(r.list()).toHaveLength(0)
  })
})
