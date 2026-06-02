import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { GitCompare, Sparkles, Loader2, Plus, Trash2, ArrowLeftRight, Copy, Check, ChevronUp, ChevronDown, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

function diff(a: string, b: string): { op: 'equal' | 'add' | 'remove'; text: string }[] {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const m = aLines.length, n = bLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aLines[i - 1] === bLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: { op: 'equal' | 'add' | 'remove'; text: string }[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (aLines[i - 1] === bLines[j - 1]) { result.unshift({ op: 'equal', text: aLines[i - 1] }); i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { result.unshift({ op: 'remove', text: aLines[i - 1] }); i-- }
    else { result.unshift({ op: 'add', text: bLines[j - 1] }); j-- }
  }
  while (i > 0) { result.unshift({ op: 'remove', text: aLines[i - 1] }); i-- }
  while (j > 0) { result.unshift({ op: 'add', text: bLines[j - 1] }); j-- }
  return result
}

const SAMPLES = [
  { name: 'JSON 对比', a: '{"name": "Versa",\n  "version": "1.0",\n  "tags": ["social"]}', b: '{"name": "Versa",\n  "version": "2.0",\n  "tags": ["social", "shopping"],\n  "author": "team"}' },
  { name: '配置', a: 'port=3000\nhost=localhost\ndebug=false', b: 'port=8080\nhost=0.0.0.0\ndebug=true\nlog=verbose' },
]

const STORAGE_KEY = 'versa:diff-history'

function load(): { id: string; name: string; a: string; b: string; at: number }[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function DiffViewer() {
  const [textA, setTextA] = useState(SAMPLES[0].a)
  const [textB, setTextB] = useState(SAMPLES[0].b)
  const [history, setHistory] = useState(load())
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { save(history) }, [history])

  const d = diff(textA, textB)
  const stats = {
    equal: d.filter((x) => x.op === 'equal').length,
    add: d.filter((x) => x.op === 'add').length,
    remove: d.filter((x) => x.op === 'remove').length,
  }

  const swap = () => { const t = textA; setTextA(textB); setTextB(t) }

  const savePair = () => {
    setHistory([{ id: 'd' + Date.now(), name: name || '对比 ' + (history.length + 1), a: textA, b: textB, at: Date.now() }, ...history].slice(0, 10))
    save([{ id: 'd' + Date.now(), name: name || '对比 ' + (history.length + 1), a: textA, b: textB, at: Date.now() }, ...history].slice(0, 10))
    toast('已保存', 'success')
  }
  const loadPair = (id: string) => { const h = history.find((x) => x.id === id); if (h) { setTextA(h.a); setTextB(h.b) } }
  const removePair = (id: string) => setHistory(history.filter((h) => h.id !== id))

  const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); toast('已复制', 'success') }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const changes = d.filter((x) => x.op !== 'equal').map((x) => (x.op === 'add' ? '+ ' : '- ') + x.text).join('\n')
      const result = await aiComplete(`分析以下文本差异, 1 段 60-100 字总结: \n${changes}`, '你是 Versa 代码审查员, 简洁专业, 中文')
      setAiSummary(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const filtered = showOnlyDiffs ? d.filter((x) => x.op !== 'equal') : d

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <GitCompare className="w-5 h-5" />
          <h2 className="text-lg font-bold">文本对比</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">LCS 算法 · 高亮差异 · AI 总结</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{d.length}</p>
            <p className="text-[10px] opacity-80">总行</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold text-emerald-300">+{stats.add}</p>
            <p className="text-[9px] opacity-80">新增</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold text-rose-300">-{stats.remove}</p>
            <p className="text-[9px] opacity-80">删除</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{stats.equal}</p>
            <p className="text-[9px] opacity-80">相同</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="对比名称" className="flex-1 px-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm" />
        <button onClick={savePair} className="px-3 h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold">保存</button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {SAMPLES.map((s) => (
          <button key={s.name} onClick={() => { setTextA(s.a); setTextB(s.b) }} className="px-2 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold">{s.name}</button>
        ))}
        <button onClick={swap} className="px-2 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold flex items-center justify-center gap-0.5">
          <ArrowLeftRight className="w-3 h-3" />交换
        </button>
        <button onClick={runAI} disabled={loading} className="px-2 h-7 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-semibold flex items-center justify-center gap-0.5">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
        <input type="checkbox" checked={showOnlyDiffs} onChange={(e) => setShowOnlyDiffs(e.target.checked)} className="w-3.5 h-3.5" />
        只显示差异
      </label>

      {aiSummary && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed">{aiSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-rose-500">A (旧)</p>
            <button onClick={() => copy(textA)} className="text-[9px] text-ink-400">{copied ? '✓' : '复制'}</button>
          </div>
          <textarea value={textA} onChange={(e) => setTextA(e.target.value)} rows={10} className="w-full px-2 py-1.5 rounded-lg bg-rose-50/40 dark:bg-ink-900/30 text-xs font-mono outline-none resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-emerald-500">B (新)</p>
            <button onClick={() => copy(textB)} className="text-[9px] text-ink-400">{copied ? '✓' : '复制'}</button>
          </div>
          <textarea value={textB} onChange={(e) => setTextB(e.target.value)} rows={10} className="w-full px-2 py-1.5 rounded-lg bg-emerald-50/40 dark:bg-ink-900/30 text-xs font-mono outline-none resize-none" />
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 max-h-60 overflow-y-auto">
        <p className="text-xs font-bold mb-1.5">差异视图</p>
        {filtered.map((line, i) => (
          <div key={i} className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded', line.op === 'add' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : line.op === 'remove' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'text-ink-500')}>
            <span className="inline-block w-3 text-center">{line.op === 'add' ? '+' : line.op === 'remove' ? '-' : ' '}</span>
            {line.text || ' '}
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
              <button onClick={() => loadPair(h.id)} className="flex-1 text-left">
                <p className="text-xs font-semibold truncate">{h.name}</p>
                <p className="text-[10px] text-ink-500">{new Date(h.at).toLocaleString('zh-CN')}</p>
              </button>
              <button onClick={() => removePair(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
