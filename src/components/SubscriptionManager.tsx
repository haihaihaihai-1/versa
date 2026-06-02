import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Sparkles, Loader2, Plus, Trash2, X, ChevronLeft, ChevronRight, RotateCcw, Bell, AlertCircle } from 'lucide-react'
import { cn, uid, formatCurrency, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Subscription {
  id: string
  name: string
  emoji: string
  amount: number
  currency: 'CNY' | 'USD'
  cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly'
  category: 'entertainment' | 'productivity' | 'fitness' | 'cloud' | 'news' | 'other'
  startDate: string
  nextDate: string
  notifyDays: number
  color: string
  active: boolean
  note: string
}

const STORAGE_KEY = 'versa:subscriptions'

function load(): Subscription[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 's1', name: 'Netflix', emoji: '🎬', amount: 110, currency: 'CNY', cycle: 'monthly', category: 'entertainment', startDate: '2024-06-01', nextDate: '2026-07-01', notifyDays: 3, color: '#e50914', active: true, note: '高级套餐' },
  { id: 's2', name: 'Spotify', emoji: '🎵', amount: 15, currency: 'USD', cycle: 'monthly', category: 'entertainment', startDate: '2023-12-01', nextDate: '2026-07-15', notifyDays: 5, color: '#1db954', active: true, note: '' },
  { id: 's3', name: 'iCloud+', emoji: '☁️', amount: 21, currency: 'CNY', cycle: 'monthly', category: 'cloud', startDate: '2023-03-01', nextDate: '2026-07-08', notifyDays: 3, color: '#0071e3', active: true, note: '200GB' },
  { id: 's4', name: 'ChatGPT Plus', emoji: '🤖', amount: 20, currency: 'USD', cycle: 'monthly', category: 'productivity', startDate: '2024-01-01', nextDate: '2026-07-22', notifyDays: 7, color: '#10a37f', active: true, note: 'AI 工具' },
  { id: 's5', name: '健身房', emoji: '🏋️', amount: 299, currency: 'CNY', cycle: 'monthly', category: 'fitness', startDate: '2024-01-01', nextDate: '2026-07-01', notifyDays: 5, color: '#f97316', active: true, note: '月卡' },
  { id: 's6', name: '财新通', emoji: '📰', amount: 498, currency: 'CNY', cycle: 'yearly', category: 'news', startDate: '2025-12-01', nextDate: '2026-12-01', notifyDays: 14, color: '#dc2626', active: true, note: '年付' },
] }
function save(d: Subscription[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CYCLE_META = {
  monthly: { label: '月付', days: 30 },
  quarterly: { label: '季付', days: 90 },
  yearly: { label: '年付', days: 365 },
  weekly: { label: '周付', days: 7 },
} as const

const CAT_COLOR = {
  entertainment: 'from-rose-500 to-pink-500',
  productivity: 'from-violet-500 to-purple-500',
  fitness: 'from-orange-500 to-rose-500',
  cloud: 'from-cyan-500 to-blue-500',
  news: 'from-amber-500 to-orange-500',
  other: 'from-ink-500 to-slate-500',
} as const

function monthlyAmount(s: Subscription): number {
  const monthly = s.cycle === 'yearly' ? s.amount / 12 : s.cycle === 'quarterly' ? s.amount / 3 : s.cycle === 'weekly' ? s.amount * 4.33 : s.amount
  return s.currency === 'USD' ? monthly * 7.2 : monthly
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export function SubscriptionManager() {
  const [subs, setSubs] = useState<Subscription[]>(load())
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring'>('all')
  const [adding, setAdding] = useState(false)
  const [aiAudit, setAiAudit] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCycle, setNewCycle] = useState<Subscription['cycle']>('monthly')
  const [newCategory, setNewCategory] = useState<Subscription['category']>('entertainment')
  const [newEmoji, setNewEmoji] = useState('📦')
  const [newDate, setNewDate] = useState('')

  useEffect(() => { save(subs) }, [subs])

  const monthlyTotal = subs.filter((s) => s.active).reduce((sum, s) => sum + monthlyAmount(s), 0)
  const yearlyTotal = monthlyTotal * 12
  const activeCount = subs.filter((s) => s.active).length
  const expiringCount = subs.filter((s) => s.active && daysUntil(s.nextDate) <= 7).length

  const filtered = (() => {
    let out = subs
    if (filter === 'active') out = out.filter((s) => s.active)
    else if (filter === 'expiring') out = out.filter((s) => s.active && daysUntil(s.nextDate) <= 14)
    return out.sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate))
  })()

  const toggleActive = (id: string) => setSubs(subs.map((s) => s.id === id ? { ...s, active: !s.active } : s))
  const remove = (id: string) => setSubs(subs.filter((s) => s.id !== id))
  const updateDate = (id: string, date: string) => setSubs(subs.map((s) => s.id === id ? { ...s, nextDate: date } : s))

  const add = () => {
    if (!newName.trim() || !newAmount || !newDate) { toast('请填写完整', 'error'); return }
    const s: Subscription = { id: uid(), name: newName, emoji: newEmoji, amount: +newAmount, currency: 'CNY', cycle: newCycle, category: newCategory, startDate: newDate, nextDate: newDate, notifyDays: 3, color: '#8b5cf6', active: true, note: '' }
    setSubs([s, ...subs])
    setNewName(''); setNewAmount(''); setNewDate('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const list = subs.map((s) => `${s.name}: ¥${monthlyAmount(s).toFixed(0)}/月`).join(', ')
      const result = await aiComplete(`为用户的订阅列表生成 1 段 60-100 字的优化建议: ${list}`, '你是 Versa 财务顾问, 简洁实用, 中文')
      setAiAudit(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-bold">订阅管理</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">续费提醒 · 周期统计 · 优化建议</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{activeCount}</p>
            <p className="text-[9px] opacity-80">活跃</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{monthlyTotal.toFixed(0)}</p>
            <p className="text-[9px] opacity-80">月均</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{yearlyTotal.toFixed(0)}</p>
            <p className="text-[9px] opacity-80">年支</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{expiringCount}</p>
            <p className="text-[9px] opacity-80">快续</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加订阅
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 审计
        </button>
      </div>

      {aiAudit && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiAudit}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'active', 'expiring'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'active' ? '✓ 活跃' : '⚠ 7天内'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有订阅</p>
          </div>
        ) : filtered.map((s) => {
          const monthly = monthlyAmount(s)
          const days = daysUntil(s.nextDate)
          const soon = days <= 7 && s.active
          return (
            <div key={s.id} className={cn('rounded-2xl p-3 border', soon ? 'bg-amber-50/40 dark:bg-amber-900/20 border-amber-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br flex-shrink-0', CAT_COLOR[s.category])}>
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{s.name}</p>
                  <p className="text-[10px] text-ink-500">{CYCLE_META[s.cycle].label} · ¥{s.amount}{s.currency === 'USD' ? '/$' : ''} · 月均 ¥{monthly.toFixed(0)}</p>
                </div>
                <div className="text-right">
                  {s.active && soon && <p className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" />{days}天</p>}
                  {!s.active && <p className="text-[10px] text-ink-400">已停</p>}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-ink-500">下次:</span>
                <input type="date" value={s.nextDate} onChange={(e) => updateDate(s.id, e.target.value)} className="px-1 h-6 rounded bg-ink-50 dark:bg-ink-800 text-[10px]" />
                <span className="text-[10px] text-ink-500 ml-1">提前</span>
                <input type="number" value={s.notifyDays} onChange={(e) => setSubs(subs.map((x) => x.id === s.id ? { ...x, notifyDays: +e.target.value } : x))} className="w-10 h-6 rounded bg-ink-50 dark:bg-ink-800 text-[10px] text-center" />
                <span className="text-[10px] text-ink-500">天提醒</span>
                <button onClick={() => toggleActive(s.id)} className={cn('ml-auto px-2 h-6 rounded text-[10px] font-semibold', s.active ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {s.active ? '✓' : '○'}
                </button>
                <button onClick={() => remove(s.id)} className="w-6 h-6 rounded text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加订阅</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="服务名" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="金额" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <select value={newCycle} onChange={(e) => setNewCycle(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm">
                {(Object.keys(CYCLE_META) as Array<keyof typeof CYCLE_META>).map((k) => <option key={k} value={k}>{CYCLE_META[k].label}</option>)}
              </select>
            </div>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm">
              <option value="entertainment">娱乐</option>
              <option value="productivity">效率</option>
              <option value="fitness">健身</option>
              <option value="cloud">云服务</option>
              <option value="news">新闻</option>
              <option value="other">其他</option>
            </select>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
