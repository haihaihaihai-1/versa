import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitCompare, Sparkles, Loader2, Send, Zap, DollarSign, Star, Check, TrendingUp } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface ModelResult {
  model: string
  response: string
  duration: number
  tokens: number
  cost: number
  quality: number
  loaded: boolean
}

interface CompareRecord {
  id: string
  prompt: string
  results: ModelResult[]
  date: string
  winner: string
}

const STORAGE_KEY = 'versa:ai-compare-v1'

const MODELS = [
  { id: 'mimo-2.5', name: 'MiMo 2.5', emoji: '🐯', cost: 0.001, quality: 4, speed: 'fast' as const },
  { id: 'gpt-4', name: 'GPT-4', emoji: '🧠', cost: 0.03, quality: 5, speed: 'medium' as const },
  { id: 'claude-3', name: 'Claude 3', emoji: '🌸', cost: 0.015, quality: 5, speed: 'fast' as const },
  { id: 'gemini', name: 'Gemini Pro', emoji: '💎', cost: 0.001, quality: 4, speed: 'fast' as const },
  { id: 'llama-3', name: 'Llama 3', emoji: '🦙', cost: 0.0005, quality: 3, speed: 'fast' as const },
]

function load(): CompareRecord[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: CompareRecord[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function ModelCompare() {
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState<string[]>(['mimo-2.5', 'gpt-4', 'claude-3'])
  const [results, setResults] = useState<ModelResult[]>([])
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<CompareRecord[]>(load())
  const [system, setSystem] = useState('你是 Versa AI 助手, 简洁实用, 中文')

  useEffect(() => { save(history) }, [history])

  const toggleModel = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id])
  }

  const run = async () => {
    if (!prompt.trim() || !isAIEnabled()) { toast('请先配置 AI', 'error'); return }
    setRunning(true)
    const initial = selected.map((id) => {
      const m = MODELS.find((x) => x.id === id)!
      return { model: id, response: '', duration: 0, tokens: 0, cost: 0, quality: m.quality, loaded: false }
    })
    setResults(initial)
    const completed: ModelResult[] = []
    for (let i = 0; i < selected.length; i++) {
      const id = selected[i]
      const m = MODELS.find((x) => x.id === id)!
      const start = Date.now()
      try {
        const response = await aiComplete(prompt, system, { model: id })
        const dur = (Date.now() - start) / 1000
        const tokens = Math.ceil((prompt.length + response.length) / 4)
        const cost = tokens * m.cost / 1000
        const result: ModelResult = { model: id, response, duration: dur, tokens, cost, quality: m.quality, loaded: true }
        completed.push(result)
        setResults((prev) => prev.map((r) => r.model === id ? result : r))
      } catch (e: any) {
        const result: ModelResult = { model: id, response: '错误: ' + (e.message || '失败'), duration: 0, tokens: 0, cost: 0, quality: 0, loaded: true }
        completed.push(result)
        setResults((prev) => prev.map((r) => r.model === id ? result : r))
      }
    }
    if (completed.length > 0) {
      const winner = completed.reduce((b, r) => r.quality > b.quality ? r : b, completed[0])
      setHistory([{ id: String(Date.now()), prompt, results: completed, date: new Date().toISOString(), winner: winner.model }, ...history].slice(0, 20))
    }
    setRunning(false)
  }

  const clearHistory = () => { setHistory([]); toast('已清空', 'success') }

  const presets = [
    { name: '创意写作', prompt: '写一段关于深秋的短文, 200 字, 文艺风格' },
    { name: '代码解释', prompt: '用 Python 写一个快速排序算法, 注释每行' },
    { name: '产品分析', prompt: '分析 Versa App 的核心竞争力, 100 字' },
  ]

  const bestSpeed = results.length > 0 ? results.reduce((a, b) => a.duration < b.duration ? a : b) : null
  const bestCost = results.length > 0 ? results.reduce((a, b) => a.cost < b.cost ? a : b) : null
  const bestQuality = results.length > 0 ? results.reduce((a, b) => a.quality > b.quality ? a : b) : null

  const runLabel = running
    ? '运行中...'
    : '同时运行 ' + selected.length + ' 个模型'

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <GitCompare className="w-5 h-5" />
          <h2 className="text-lg font-bold">模型对比</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 模型 · 速度/质量/成本对比</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{selected.length}</p>
            <p className="text-[9px] opacity-80">已选</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{results.length}</p>
            <p className="text-[9px] opacity-80">已测</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{history.length}</p>
            <p className="text-[9px] opacity-80">历史</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{MODELS.length}</p>
            <p className="text-[9px] opacity-80">总数</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">选择模型</p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              disabled={running}
              className={cn(
                'p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2 disabled:opacity-50',
                selected.includes(m.id)
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                  : 'bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60'
              )}
            >
              <span className="text-lg">{m.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{m.name}</p>
                <p className={cn('text-[9px]', selected.includes(m.id) ? 'opacity-90' : 'text-ink-500')}>
                  {'$' + m.cost + '/1k'} · {m.speed} · ⭐{m.quality}
                </p>
              </div>
              {selected.includes(m.id) && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">输入提示词</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入要测试的提示词..."
          className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none min-h-[80px]"
        />
        <div className="flex gap-1.5 mt-1.5">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => setPrompt(p.prompt)}
              disabled={running}
              className="px-2 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px] disabled:opacity-50"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={run}
        disabled={running || !prompt.trim() || selected.length === 0}
        className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50"
      >
        {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        <span>{runLabel}</span>
      </button>

      {results.length > 0 && (
        <div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {bestSpeed && (
              <div className="rounded-xl bg-emerald-50/40 dark:bg-emerald-900/20 p-2 text-center">
                <Zap className="w-3 h-3 text-emerald-500 mx-auto" />
                <p className="text-[10px] font-bold mt-0.5">最快</p>
                <p className="text-[9px] text-ink-500">
                  {MODELS.find((m) => m.id === bestSpeed.model)?.name} {bestSpeed.duration.toFixed(1)}s
                </p>
              </div>
            )}
            {bestQuality && (
              <div className="rounded-xl bg-amber-50/40 dark:bg-amber-900/20 p-2 text-center">
                <Star className="w-3 h-3 text-amber-500 mx-auto" />
                <p className="text-[10px] font-bold mt-0.5">最佳</p>
                <p className="text-[9px] text-ink-500">
                  {MODELS.find((m) => m.id === bestQuality.model)?.name} ⭐{bestQuality.quality}
                </p>
              </div>
            )}
            {bestCost && (
              <div className="rounded-xl bg-cyan-50/40 dark:bg-cyan-900/20 p-2 text-center">
                <DollarSign className="w-3 h-3 text-cyan-500 mx-auto" />
                <p className="text-[10px] font-bold mt-0.5">最省</p>
                <p className="text-[9px] text-ink-500">
                  {MODELS.find((m) => m.id === bestCost.model)?.name} ${'$' + bestCost.cost.toFixed(4)}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {results.map((r) => {
              const m = MODELS.find((x) => x.id === r.model)
              if (!m) return null
              return (
                <div key={r.model} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xl">{m.emoji}</span>
                    <p className="text-sm font-bold flex-1">{m.name}</p>
                    {!r.loaded && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>
                  {r.loaded && (
                    <>
                      <div className="flex items-center gap-1.5 text-[9px] text-ink-500 mb-1 flex-wrap">
                        <span>⏱️ {r.duration.toFixed(1)}s</span>
                        <span>· 🪙 {r.tokens}</span>
                        <span>· 💰 {`$${r.cost.toFixed(4)}`}</span>
                        <span>· ⭐{r.quality}/5</span>
                      </div>
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{r.response}</p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold">历史</p>
            <button onClick={clearHistory} className="text-[10px] text-rose-500">清空</button>
          </div>
          <div className="space-y-1">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="text-[10px] p-1.5 rounded bg-ink-50 dark:bg-ink-800/50">
                <p className="font-semibold truncate">{h.prompt}</p>
                <p className="text-ink-500">
                  赢家: {MODELS.find((m) => m.id === h.winner)?.name || h.winner} · {new Date(h.date).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
