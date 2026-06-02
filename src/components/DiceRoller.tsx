import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Dices, Sparkles, Loader2, Plus, Trash2, RotateCw, Hash, Settings, Trophy, Shuffle } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Roll {
  id: string
  values: number[]
  total: number
  modifier: number
  expression: string
  at: number
}

const STORAGE_KEY = 'versa:dice'

function load(): Roll[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Roll[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function rollDie(sides: number) { return Math.floor(Math.random() * sides) + 1 }
function parseExpression(expr: string): { dice: { count: number; sides: number }[]; modifier: number } | null {
  const cleaned = expr.replace(/\s/g, '').toLowerCase()
  const match = cleaned.match(/^([\dd+\-]+)$/)
  if (!match) return null
  const parts = cleaned.split(/(?=[+\-])/)
  const dice: { count: number; sides: number }[] = []
  let modifier = 0
  for (const p of parts) {
    if (p.startsWith('+') || p.startsWith('-')) {
      const v = parseInt(p)
      if (isNaN(v)) return null
      modifier += v
    } else {
      const dm = p.match(/^(\d+)d(\d+)$/)
      if (!dm) return null
      const count = +dm[1]; const sides = +dm[2]
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null
      dice.push({ count, sides })
    }
  }
  return { dice, modifier }
}

export function DiceRoller() {
  const [history, setHistory] = useState<Roll[]>(load())
  const [expr, setExpr] = useState('1d20')
  const [lastRoll, setLastRoll] = useState<Roll | null>(null)
  const [rolling, setRolling] = useState(false)
  const [aiLuck, setAiLuck] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(history) }, [history])

  const quickRoll = (sides: number) => {
    const value = rollDie(sides)
    const r: Roll = { id: uid(), values: [value], total: value, modifier: 0, expression: `1d${sides}`, at: Date.now() }
    setLastRoll(r)
    setHistory([r, ...history].slice(0, 50))
  }

  const rollExpression = () => {
    const parsed = parseExpression(expr)
    if (!parsed) { toast('格式错误 (如 1d20+3)', 'error'); return }
    setRolling(true)
    setTimeout(() => {
      const allValues: number[] = []
      let total = 0
      parsed.dice.forEach((d) => {
        for (let i = 0; i < d.count; i++) {
          const v = rollDie(d.sides)
          allValues.push(v)
          total += v
        }
      })
      total += parsed.modifier
      const r: Roll = { id: uid(), values: allValues, total, modifier: parsed.modifier, expression: expr, at: Date.now() }
      setLastRoll(r)
      setHistory([r, ...history].slice(0, 50))
      setRolling(false)
    }, 800)
  }

  const remove = (id: string) => setHistory(history.filter((r) => r.id !== id))
  const clear = () => { setHistory([]); toast('已清空', 'info') }

  const runAI = async () => {
    if (!isAIEnabled() || !lastRoll) { toast('请先配置 AI Key 或掷骰', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`骰子结果 ${lastRoll.expression} = ${lastRoll.total}, 给一句 30-50 字的吉言`, '你是 Versa 占卜师, 有趣神秘, 中文')
      setAiLuck(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const stats = {
    rolls: history.length,
    max: history.length > 0 ? Math.max(...history.map((r) => r.total)) : 0,
    min: history.length > 0 ? Math.min(...history.map((r) => r.total)) : 0,
    avg: history.length > 0 ? Math.round(history.reduce((s, r) => s + r.total, 0) / history.length) : 0,
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Dices className="w-5 h-5" />
          <h2 className="text-lg font-bold">骰子模拟</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">D2-D1000 · 自定义表达式</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.rolls}</p>
            <p className="text-[9px] opacity-80">次数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.max}</p>
            <p className="text-[9px] opacity-80">最大</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.min}</p>
            <p className="text-[9px] opacity-80">最小</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.avg}</p>
            <p className="text-[9px] opacity-80">平均</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 p-6 border-2 border-amber-300 text-center">
        <motion.div animate={rolling ? { rotate: 360, scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.8 }} className="text-7xl mb-2">
          {lastRoll ? '🎲' : '🎯'}
        </motion.div>
        {lastRoll ? (
          <>
            <p className="text-4xl font-bold font-mono text-amber-700 dark:text-amber-300">{lastRoll.total}</p>
            <p className="text-[10px] text-ink-500 mt-1">{lastRoll.expression} = [{lastRoll.values.join(', ')}]{lastRoll.modifier !== 0 ? ` ${lastRoll.modifier > 0 ? '+' : ''}${lastRoll.modifier}` : ''}</p>
          </>
        ) : (
          <p className="text-2xl text-ink-500">点击下方掷骰</p>
        )}
      </div>

      <div className="flex gap-1.5">
        <input value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rollExpression()} placeholder="1d20+3" className="flex-1 px-3 h-10 rounded-lg bg-white/60 dark:bg-ink-900/30 border-2 border-amber-300 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500" />
        <button onClick={rollExpression} disabled={rolling} className="px-4 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold flex items-center gap-1">
          {rolling ? <RotateCw className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}掷
        </button>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 吉言
      </button>

      {aiLuck && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] italic text-amber-700 dark:text-amber-300">{aiLuck}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-bold mb-1.5">快速骰子</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[4, 6, 8, 10, 12, 20, 100].map((s) => (
            <button key={s} onClick={() => quickRoll(s)} className="h-10 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-xs font-bold flex items-center justify-center gap-1">
              D{s}
            </button>
          ))}
          <button onClick={() => quickRoll(2)} className="h-10 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-xs font-bold">D2</button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold flex-1">历史 ({history.length})</p>
        {history.length > 0 && <button onClick={clear} className="text-[10px] text-rose-500">清空</button>}
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {history.slice(0, 10).map((r) => (
          <div key={r.id} className="flex items-center gap-1.5 p-1.5 rounded bg-ink-50/30 dark:bg-ink-800/30 text-xs">
            <span className="font-mono text-ink-500 w-16 truncate text-[10px]">{r.expression}</span>
            <span className="font-bold">{r.total}</span>
            <span className="text-[10px] text-ink-400 truncate flex-1">[{r.values.join(',')}]</span>
            <button onClick={() => remove(r.id)} className="text-ink-400 hover:text-rose-500 text-[10px]">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
