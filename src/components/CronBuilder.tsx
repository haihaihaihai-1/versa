import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Clock, Sparkles, Loader2, Copy, Check, Calendar, Play, Pause, RotateCcw, Calendar as CalendarIcon, History } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:cron-history'

function load(): { id: string; expr: string; at: number }[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function saveHist(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const PRESETS = [
  { name: '每分钟', expr: '* * * * *' },
  { name: '每 5 分钟', expr: '*/5 * * * *' },
  { name: '每小时', expr: '0 * * * *' },
  { name: '每天 9 点', expr: '0 9 * * *' },
  { name: '每天 0 点', expr: '0 0 * * *' },
  { name: '工作日 9 点', expr: '0 9 * * 1-5' },
  { name: '周末 10 点', expr: '0 10 * * 6,0' },
  { name: '每月 1 号', expr: '0 0 1 * *' },
  { name: '每周一', expr: '0 0 * * 1' },
]

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return '无效的 Cron 表达式'
  const [m, h, dom, mo, dow] = parts
  const desc = (val: string, name: string) => {
    if (val === '*') return `每${name}`
    if (val.startsWith('*/')) return `每 ${val.slice(2)} ${name}`
    if (val.includes(',')) return `${name} ${val.split(',').join('、')}`
    if (val.includes('-')) return `${name} ${val.replace('-', '到 ')}`
    return `${name} ${val}`
  }
  return `${desc(m, '分')} ${desc(h, '时')} ${desc(dom, '日')} ${desc(mo, '月')} ${desc(dow, '周')}`
}

function getNextRuns(expr: string, count: number = 5): Date[] {
  try {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return []
    const results: Date[] = []
    const now = new Date()
    const d = new Date(now)
    d.setSeconds(0); d.setMilliseconds(0)
    d.setMinutes(d.getMinutes() + 1)
    let attempts = 0
    while (results.length < count && attempts < 10000) {
      attempts++
      const [m, h, dom, mo, dow] = parts
      const min = d.getMinutes()
      const hr = d.getHours()
      const day = d.getDate()
      const month = d.getMonth() + 1
      const dayOfWeek = d.getDay()
      const match = (val: string, num: number) => {
        if (val === '*') return true
        if (val.startsWith('*/')) return num % +val.slice(2) === 0
        if (val.includes(',')) return val.split(',').map(Number).includes(num)
        if (val.includes('-')) { const [a, b] = val.split('-').map(Number); return num >= a && num <= b }
        return +val === num
      }
      if (match(mo, month) && match(dom, day) && match(dow, dayOfWeek) && match(h, hr) && match(m, min)) {
        results.push(new Date(d))
      }
      d.setMinutes(d.getMinutes() + 1)
    }
    return results
  } catch { return [] }
}

export function CronBuilder() {
  const [expr, setExpr] = useState('0 9 * * 1-5')
  const [history, setHistory] = useState(load())
  const [copied, setCopied] = useState(false)
  const [aiHelp, setAiHelp] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { saveHist(history) }, [history])

  const next = getNextRuns(expr, 5)
  const desc = describeCron(expr)
  const parts = expr.trim().split(/\s+/)

  const save = () => {
    setHistory([{ id: 'c' + Date.now(), expr, at: Date.now() }, ...history].slice(0, 10))
    saveHist([{ id: 'c' + Date.now(), expr, at: Date.now() }, ...history].slice(0, 10))
    toast('已保存', 'success')
  }
  const copy = () => { navigator.clipboard?.writeText(expr); setCopied(true); setTimeout(() => setCopied(false), 1500); toast('已复制', 'success') }
  const remove = (id: string) => setHistory(history.filter((h) => h.id !== id))

  const setPart = (idx: number, val: string) => {
    const p = [...parts]
    p[idx] = val
    setExpr(p.join(' '))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`解释这个 Cron 表达式, 50-80 字: ${expr}`, '你是 Versa Cron 专家, 简洁专业, 中文')
      setAiHelp(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const PART_LABELS = ['分 (0-59)', '时 (0-23)', '日 (1-31)', '月 (1-12)', '周 (0-6)']

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5" />
          <h2 className="text-lg font-bold">Cron 生成器</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">可视化 · 下次运行 · AI 解释</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{next.length}</p>
            <p className="text-[10px] opacity-80">下次运行</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] opacity-80">已保存</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{PRESETS.length}</p>
            <p className="text-[10px] opacity-80">预设</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-violet-500 font-mono font-bold">[</span>
          {parts.map((p, i) => (
            <input
              key={i}
              value={p}
              onChange={(e) => setPart(i, e.target.value)}
              className={cn('flex-1 min-w-0 px-1 h-10 rounded-lg text-center text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-violet-500', p === '*' || !isNaN(+p) || p.startsWith('*/') ? 'bg-violet-50 dark:bg-violet-900/30' : 'bg-rose-50 dark:bg-rose-900/30')}
            />
          ))}
          <span className="text-violet-500 font-mono font-bold">]</span>
        </div>
        <div className="grid grid-cols-5 gap-1 text-[9px] text-ink-500 text-center">
          {PART_LABELS.map((l) => <span key={l}>{l}</span>)}
        </div>
        <p className="text-xs text-center font-semibold text-violet-500 bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2">{desc}</p>
      </div>

      <div className="flex gap-1.5">
        <button onClick={copy} className="flex-1 h-8 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}复制
        </button>
        <button onClick={save} className="flex-1 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">保存</button>
        <button onClick={runAI} disabled={loading} className="flex-1 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiHelp && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed">{aiHelp}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-bold mb-1.5">预设</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => setExpr(p.expr)} className="px-2 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold">
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />下次运行</p>
        {next.length === 0 ? (
          <p className="text-xs text-ink-500 text-center py-2">无匹配 (检查表达式)</p>
        ) : (
          <div className="space-y-1">
            {next.map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-ink-50/30 dark:bg-ink-800/30 text-xs">
                <span className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                <span className="font-mono">{d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-[10px] text-ink-500 ml-auto">{Math.round((d.getTime() - Date.now()) / 60000)} 分后</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
              <button onClick={() => setExpr(h.expr)} className="flex-1 text-left">
                <code className="text-xs font-mono">{h.expr}</code>
                <p className="text-[9px] text-ink-500">{describeCron(h.expr)}</p>
              </button>
              <button onClick={() => remove(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
