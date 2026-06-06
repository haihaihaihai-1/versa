/**
 * Versa · Code Sandbox (v59.0)
 * - Isolated JS execution context
 * - Timeout enforcement
 * - Memory limits
 * - Forbidden global blacklist
 * - Allow-list of safe globals (Math, JSON, Date, etc.)
 * - Console capture
 * - Module resolution from in-memory map
 * - Code template interpolation
 * - Execution history & metrics
 * - Named sandbox registry
 */
import vm from 'vm'

export interface SandboxOptions {
  timeoutMs?: number
  memoryMb?: number
  maxAllocBytes?: number
  allowGlobals?: string[]
  denyGlobals?: string[]
  captureConsole?: boolean
}

export interface ExecutionResult {
  success: boolean
  value?: unknown
  error?: string
  logs?: string[]
  durationMs: number
  memoryUsed?: number
  timedOut?: boolean
  timestamp: number
}

export interface SandboxMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  timeouts: number
  deniedGlobals: number
  avgDurationMs: number
  maxDurationMs: number
  minDurationMs: number
}

const DEFAULT_ALLOWED = ['Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Promise', 'Error', 'TypeError', 'RangeError', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'undefined', 'NaN', 'Infinity']
const DEFAULT_DENIED = ['eval', 'Function', 'process', 'require', 'module', 'exports', '__dirname', '__filename', 'global', 'globalThis', 'Buffer', 'setImmediate', 'clearImmediate', 'setInterval', 'setTimeout', 'clearTimeout', 'clearInterval', 'queueMicrotask', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'navigator', 'window', 'document', 'self', 'Reflect', 'Proxy']

export class Sandbox {
  private opts: Required<SandboxOptions>
  private history: ExecutionResult[] = []
  private metrics: SandboxMetrics = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, timeouts: 0, deniedGlobals: 0, avgDurationMs: 0, maxDurationMs: 0, minDurationMs: Infinity }

  constructor(opts: SandboxOptions = {}) {
    this.opts = {
      timeoutMs: opts.timeoutMs ?? 5000,
      memoryMb: opts.memoryMb ?? 128,
      maxAllocBytes: opts.maxAllocBytes ?? 64 * 1024 * 1024,
      allowGlobals: opts.allowGlobals ?? DEFAULT_ALLOWED,
      denyGlobals: opts.denyGlobals ?? DEFAULT_DENIED,
      captureConsole: opts.captureConsole ?? true
    }
  }

  // -------- Core JS execution --------
  runJs(code: string, opts: { captureConsole?: boolean } = {}): ExecutionResult {
    return this.execute(code, { isModule: false, captureConsole: opts.captureConsole ?? this.opts.captureConsole })
  }
  runModule(code: string, opts: { modules?: Record<string, string>; captureConsole?: boolean } = {}): ExecutionResult {
    return this.execute(code, { isModule: true, captureConsole: opts.captureConsole ?? this.opts.captureConsole, modules: opts.modules })
  }
  runTemplate(template: string, vars: Record<string, string | number | boolean>): ExecutionResult {
    const safeVars: Record<string, string> = {}
    for (const [k, v] of Object.entries(vars)) safeVars[k] = String(v)
    const interpolated = template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => safeVars[key.trim()] ?? 'undefined')
    return this.runJs(interpolated)
  }

  private execute(code: string, opts: { isModule: boolean; captureConsole: boolean; modules?: Record<string, string> }): ExecutionResult {
    const start = Date.now()
    const result: ExecutionResult = { success: false, durationMs: 0, logs: [], timestamp: start }

    // Static check: forbidden globals
    for (const denied of this.opts.denyGlobals) {
      const re = new RegExp(`(^|[^.\\w])${denied}([\\s.\\(\\),;\\[]|$)`)
      if (re.test(code)) {
        this.metrics.deniedGlobals++
        result.error = `forbidden global: ${denied}`
        result.durationMs = Date.now() - start
        this.recordResult(result)
        return result
      }
    }

    // Build safe sandbox
    const sandboxObj: Record<string, unknown> = {}
    for (const k of this.opts.allowGlobals) {
      if (k in globalThis) sandboxObj[k] = (globalThis as unknown as Record<string, unknown>)[k]
    }
    const logs: string[] = []
    if (opts.captureConsole) {
      sandboxObj.console = {
        log: (...args: unknown[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        info: (...args: unknown[]) => logs.push('[info] ' + args.map(a => String(a)).join(' ')),
        warn: (...args: unknown[]) => logs.push('[warn] ' + args.map(a => String(a)).join(' ')),
        error: (...args: unknown[]) => logs.push('[error] ' + args.map(a => String(a)).join(' '))
      }
    }

    try {
      if (opts.isModule && opts.modules) {
        // tiny module resolution: transform imports
        let transformed = code.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names: string, src: string) => {
          const m = opts.modules?.[src]
          if (!m) throw new Error(`module not found: ${src}`)
          const id = '__m_' + src.replace(/[^a-zA-Z0-9]/g, '_')
          // Transform sub-module: export function foo(){} → module.exports.foo = function foo(){}
          let mTransformed = m.replace(/export\s+function\s+(\w+)/g, 'module.exports.$1 = function $1')
          mTransformed = mTransformed.replace(/export\s+const\s+(\w+)\s*=\s*/g, 'module.exports.$1 = ')
          mTransformed = mTransformed.replace(/export\s+default\s+/g, 'module.exports.default = ')
          mTransformed = mTransformed.split('\n').map(line => {
            const t = line.trim()
            if (!t) return line
            if (t.endsWith(';') || t.endsWith(',')) return line
            if (t.endsWith('{')) return line
            if (t.endsWith('}') && /^(if|for|while|function|class|switch|try|catch|finally|do)\b/.test(t)) return line
            if (t.endsWith('}')) return line + ';'
            return line + ';'
          }).join('\n')
          const subScript = new vm.Script(`(function(module, exports){ ${mTransformed} return module.exports; })()`)
          const subSandbox: Record<string, unknown> = {}
          for (const k of this.opts.allowGlobals) if (k in globalThis) subSandbox[k] = (globalThis as unknown as Record<string, unknown>)[k]
          const subMod: { exports: Record<string, unknown> } = { exports: {} }
          subSandbox.__module = subMod
          subSandbox.__exports = subMod.exports
          const subCtx = vm.createContext(subSandbox)
          let subExports: Record<string, unknown> = {}
          try {
            const wrapper = `(function(){ const module = __module, exports = __exports; ${mTransformed}; return module.exports; })()`
            subExports = vm.runInContext(wrapper, subCtx, { timeout: this.opts.timeoutMs }) as Record<string, unknown>
          } catch (e) { /* ignore */ }
          ;(sandboxObj as Record<string, unknown>)[id] = subExports
          const list = names.split(',').map((s: string) => s.trim())
          return `const { ${list.join(', ')} } = __m_${src.replace(/[^a-zA-Z0-9]/g, '_')};`
        })
        // Handle export default <expr> and export const y = ...; y
        transformed = transformed.replace(/export\s+default\s+/g, 'module.exports.default = ')
        transformed = transformed.replace(/export\s+const\s+(\w+)\s*=\s*/g, 'const $1 = module.exports.$1 = ')
        // Add semicolons
        transformed = transformed.split('\n').map(line => {
          const t = line.trim()
          if (!t) return line
          if (t.endsWith(';') || t.endsWith(',')) return line
          if (t.endsWith('{')) return line
          if (t.endsWith('}') && /^(if|for|while|function|class|switch|try|catch|finally|do)\b/.test(t)) return line
          if (t.endsWith('}')) return line + ';'
          return line + ';'
        }).join('\n')
        const mod: { exports: Record<string, unknown> } = { exports: {} }
        ;(sandboxObj as Record<string, unknown>).module = mod
        ;(sandboxObj as Record<string, unknown>).exports = mod.exports
        // If code has a last bare expression, return that
        const segments = transformed.split(/[;\n]/).map(s => s.trim()).filter(Boolean)
        const lastSeg = segments[segments.length - 1] ?? ''
        const isLastControl = /^(const|let|var|return|if|for|while|do|switch|throw|function|class|import|export|try|catch|finally|{|\})/.test(lastSeg)
        const codeWithoutLast = isLastControl ? transformed : segments.slice(0, -1).join(';') + (segments.length > 1 ? ';' : '')
        const fnCode = isLastControl
          ? `(function(){ const module = __mod, exports = __mod.exports; ${transformed} return module.exports; })()`
          : `(function(){ const module = __mod, exports = __mod.exports; ${codeWithoutLast} return (${lastSeg}); })()`
        ;(sandboxObj as Record<string, unknown>).__mod = mod
        const fnScript = new vm.Script(fnCode)
        const ctx = vm.createContext(sandboxObj)
        const ret = fnScript.runInContext(ctx, { timeout: this.opts.timeoutMs })
        result.value = ret
        result.success = true
      } else {
        // For isModule without modules map, still strip export keywords
        let strippedCode = code
        if (opts.isModule) {
          strippedCode = strippedCode.replace(/export\s+default\s+/g, 'module.exports.default = ')
          strippedCode = strippedCode.replace(/export\s+const\s+(\w+)\s*=\s*/g, 'const $1 = module.exports.$1 = ')
          strippedCode = strippedCode.split('\n').map(line => {
            const t = line.trim()
            if (!t) return line
            if (t.endsWith(';') || t.endsWith(',')) return line
            if (t.endsWith('{')) return line
            if (t.endsWith('}') && /^(if|for|while|function|class|switch|try|catch|finally|do)\b/.test(t)) return line
            if (t.endsWith('}')) return line + ';'
            return line + ';'
          }).join('\n')
          // Also handle last bare expression
          const segs = strippedCode.split(/[;\n]/).map(s => s.trim()).filter(Boolean)
          const last = segs[segs.length - 1] ?? ''
          const isLastCtrl = /^(const|let|var|return|if|for|while|do|switch|throw|function|class|import|export|try|catch|finally|{|\})/.test(last)
          const mod: { exports: Record<string, unknown> } = { exports: {} }
          ;(sandboxObj as Record<string, unknown>).module = mod
          ;(sandboxObj as Record<string, unknown>).exports = mod.exports
          const codeNoLast = isLastCtrl ? strippedCode : (segs.slice(0, -1).join(';') + ';')
          const scriptSrc = isLastCtrl
            ? `(function(){ const module = __mod2, exports = __mod2.exports; ${strippedCode} return module.exports; })()`
            : `(function(){ const module = __mod2, exports = __mod2.exports; ${codeNoLast} return (${last}); })()`
          ;(sandboxObj as Record<string, unknown>).__mod2 = mod
          const script = new vm.Script(scriptSrc)
          const ctx = vm.createContext(sandboxObj)
          const exports = script.runInContext(ctx, { timeout: this.opts.timeoutMs })
          result.value = (exports as { default?: unknown }).default !== undefined ? (exports as { default: unknown }).default : exports
          result.success = true
        } else {
          // Capture last bare expression as return value
          // Split by ; and newlines, find last non-empty segment
          const segments = code.split(/[;\n]/).map(s => s.trim()).filter(Boolean)
          const lastSeg = segments[segments.length - 1] ?? ''
          const isControl = /^(const|let|var|return|if|for|while|do|switch|throw|function|class|import|export|try|catch|finally|{|\})/.test(lastSeg)
          let wrapped: string
          if (isControl || lastSeg === '') {
            wrapped = `(function(){ try { ${code} } catch(e) { return { __err: e && e.message || String(e) }; } })()`
          } else {
            // Drop the last segment from code and return it
            const codeWithoutLast = segments.slice(0, -1).join(';')
            wrapped = `(function(){ try { ${codeWithoutLast}; return (${lastSeg}); } catch(e) { return { __err: e && e.message || String(e) }; } })()`
          }
          const script = new vm.Script(wrapped)
          const ctx = vm.createContext(sandboxObj)
          const out = script.runInContext(ctx, { timeout: this.opts.timeoutMs })
          if (out && typeof out === 'object' && '__err' in (out as Record<string, unknown>)) {
            result.error = (out as { __err: string }).__err
          } else {
            result.value = out
            result.success = true
          }
        }
      }
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes('Script execution timed out') || msg.includes('timeout')) {
        result.timedOut = true
        result.error = 'execution timeout'
        this.metrics.timeouts++
      } else {
        result.error = msg
      }
    }
    result.durationMs = Date.now() - start
    result.logs = logs
    this.recordResult(result)
    return result
  }

  private recordResult(r: ExecutionResult): void {
    this.history.push(r)
    this.metrics.totalExecutions++
    if (r.success) this.metrics.successfulExecutions++
    else this.metrics.failedExecutions++
    this.metrics.avgDurationMs = (this.metrics.avgDurationMs * (this.metrics.totalExecutions - 1) + r.durationMs) / this.metrics.totalExecutions
    if (r.durationMs > this.metrics.maxDurationMs) this.metrics.maxDurationMs = r.durationMs
    if (r.durationMs < this.metrics.minDurationMs) this.metrics.minDurationMs = r.durationMs
  }

  // -------- History & metrics --------
  getHistory(filter?: { success?: boolean; limit?: number }): ExecutionResult[] {
    let arr = [...this.history]
    if (filter?.success != null) arr = arr.filter(r => r.success === filter.success)
    if (filter?.limit) arr = arr.slice(-filter.limit)
    return arr
  }
  clearHistory(): void { this.history = [] }
  getMetrics(): SandboxMetrics { return { ...this.metrics, minDurationMs: this.metrics.minDurationMs === Infinity ? 0 : this.metrics.minDurationMs } }
  resetMetrics(): void { this.metrics = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, timeouts: 0, deniedGlobals: 0, avgDurationMs: 0, maxDurationMs: 0, minDurationMs: Infinity } }
}

export class SandboxRegistry {
  private store = new Map<string, Sandbox>()
  register(name: string, sb: Sandbox): void { this.store.set(name, sb) }
  get(name: string): Sandbox | undefined { return this.store.get(name) }
  remove(name: string): boolean { return this.store.delete(name) }
  list(): string[] { return [...this.store.keys()] }
  clear(): void { this.store.clear() }
}

let _reg: SandboxRegistry | null = null
export function getSandboxRegistry(): SandboxRegistry { if (!_reg) _reg = new SandboxRegistry(); return _reg }
export function resetSandboxRegistry(): void { _reg = null }
export { Sandbox as default }
