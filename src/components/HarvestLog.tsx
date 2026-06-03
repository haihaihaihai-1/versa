import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Apple, Plus, Trash2, Calendar, Sparkles, ChefHat, Award, TrendingUp, Sun, Leaf, Star, DollarSign } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Harvest {
  id: string
  name: string
  emoji: string
  category: 'vegetable' | 'fruit' | 'herb' | 'flower' | 'grain'
  date: string
  amount: number
  unit: 'g' | 'kg' | 'piece' | 'bundle'
  quality: 1 | 2 | 3 | 4 | 5
  costSaved: number
  storageMethod: 'fresh' | 'refrigerate' | 'freeze' | 'preserve' | 'dry'
  sharedWith: number
  recipeNote: string
}

const STORAGE_KEY = 'versa:harvest-v1'

function load(): Harvest[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Harvest[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Harvest[] {
  return [
    { id: '1', name: '番茄', emoji: '🍅', category: 'vegetable', date: '2026-05-15', amount: 2.5, unit: 'kg', quality: 5, costSaved: 25, storageMethod: 'fresh', sharedWith: 2, recipeNote: '番茄炒蛋、糖拌番茄' },
    { id: '2', name: '罗勒', emoji: '🌿', category: 'herb', date: '2026-05-20', amount: 50, unit: 'g', quality: 4, costSaved: 8, storageMethod: 'refrigerate', sharedWith: 0, recipeNote: '青酱意面' },
    { id: '3', name: '草莓', emoji: '🍓', category: 'fruit', date: '2026-05-25', amount: 1.2, unit: 'kg', quality: 5, costSaved: 60, storageMethod: 'refrigerate', sharedWith: 3, recipeNote: '草莓酱、奶昔' },
    { id: '4', name: '黄瓜', emoji: '🥒', category: 'vegetable', date: '2026-06-01', amount: 1.5, unit: 'kg', quality: 4, costSaved: 12, storageMethod: 'refrigerate', sharedWith: 1, recipeNote: '凉拌黄瓜' },
  ]
}

const CATEGORY_LABELS: Record<Harvest['category'], string> = {
  vegetable: '蔬菜', fruit: '水果', herb: '香草', flower: '花卉', grain: '谷物',
}

const STORAGE_LABELS = {
  fresh: '🌿 鲜食', refrigerate: '❄️ 冷藏', freeze: '🧊 冷冻', preserve: '🥫 腌制', dry: '☀️ 晾干',
}

const RECIPE_SUGG: Record<Harvest['category'], string[]> = {
  vegetable: ['清炒', '蔬菜沙拉', '炖汤', '酱菜', '烧烤'],
  fruit: ['果酱', '果汁', '水果派', '酸奶', '沙拉'],
  herb: ['青酱', '香料', '泡茶', '配菜', '烘焙'],
  flower: ['花茶', '糖渍', '干燥', '精油', '泡澡'],
  grain: ['米饭', '面包', '粥', '谷物棒', '麦片'],
}

const QUALITY_LABELS = ['', '需改进', '一般', '良好', '优秀', '完美']

export function HarvestLog() {
  const [list, setList] = useState<Harvest[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<'list' | 'stats' | 'season'>('list')
  const [draft, setDraft] = useState<Omit<Harvest, 'id'>>({ name: '', emoji: '🥬', category: 'vegetable', date: new Date().toISOString().slice(0, 10), amount: 0, unit: 'kg', quality: 4, costSaved: 0, storageMethod: 'fresh', sharedWith: 0, recipeNote: '' })

  useEffect(() => { save(list) }, [list])

  const stats = useMemo(() => {
    const total = list.length
    const totalAmount = list.reduce((s, h) => s + (h.unit === 'g' ? h.amount / 1000 : h.unit === 'piece' || h.unit === 'bundle' ? h.amount : h.amount), 0)
    const totalSaved = list.reduce((s, h) => s + h.costSaved, 0)
    const avgQuality = list.length > 0 ? list.reduce((s, h) => s + h.quality, 0) / list.length : 0
    const shared = list.reduce((s, h) => s + h.sharedWith, 0)
    const byCategory = list.reduce((acc, h) => { acc[h.category] = (acc[h.category] || 0) + h.amount; return acc }, {} as Record<string, number>)
    return { total, totalAmount, totalSaved, avgQuality, shared, byCategory }
  }, [list])

  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    list.forEach((h) => { const m = h.date.slice(0, 7); map.set(m, (map.get(m) || 0) + h.amount) })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
  }, [list])

  const add = () => {
    if (!draft.name || draft.amount <= 0) { toast('请填写名称和数量', 'error'); return }
    setList([{ id: uid(), ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, name: '', amount: 0, costSaved: 0, recipeNote: '' })
    toast('已记录收获', 'success')
  }
  const del = (id: string) => { setList(list.filter((h) => h.id !== id)); toast('已删除', 'success') }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Apple className="w-5 h-5" />
          <h2 className="text-lg font-bold">收获记录</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">产量 · 节省 · 分享 · 5 储存法</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.total}</p><p className="text-[9px] opacity-80">收获</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.totalAmount.toFixed(1)}</p><p className="text-[9px] opacity-80">kg</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">¥{stats.totalSaved}</p><p className="text-[9px] opacity-80">省</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold flex items-center justify-center gap-0.5"><Star className="w-3 h-3" />{stats.avgQuality.toFixed(1)}</p><p className="text-[9px] opacity-80">质量</p></div>
        </div>
      </div>

      <div className="flex gap-1">
        {(['list', 'stats', 'season'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn('flex-1 h-7 rounded-lg text-[10px] font-semibold', view === v ? 'bg-rose-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {v === 'list' ? '记录' : v === 'stats' ? '统计' : '季节'}
          </button>
        ))}
      </div>

      {view === 'stats' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 space-y-2">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-rose-500" />分类统计</div>
          {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
            const max = Math.max(...Object.values(stats.byCategory))
            return (
              <div key={cat} className="space-y-0.5">
                <div className="flex justify-between text-[10px]"><span>{CATEGORY_LABELS[cat as Harvest['category']]}</span><span className="font-mono">{amt.toFixed(1)}{list.find((h) => h.category === cat)?.unit || 'g'}</span></div>
                <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${(amt / max) * 100}%` }} className="h-full bg-gradient-to-r from-rose-500 to-pink-500" /></div>
              </div>
            )
          })}
          {Object.keys(stats.byCategory).length === 0 && <p className="text-[10px] text-ink-400 text-center py-2">暂无数据</p>}
          <div className="pt-1 border-t border-ink-200/40 grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-1.5 rounded-lg bg-rose-50/40 dark:bg-rose-900/10"><p className="text-ink-500">分享</p><p className="font-bold text-rose-600">{stats.shared} 人次</p></div>
            <div className="p-1.5 rounded-lg bg-rose-50/40 dark:bg-rose-900/10"><p className="text-ink-500">节省总额</p><p className="font-bold text-rose-600">¥{stats.totalSaved}</p></div>
          </div>
        </div>
      )}

      {view === 'season' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 space-y-2">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-rose-500" />6 月份产量</div>
          {monthly.length > 0 ? (
            <div className="space-y-1">
              {monthly.map(([m, amt]) => {
                const max = Math.max(...monthly.map((x) => x[1]))
                return (
                  <div key={m} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]"><span>{m}</span><span className="font-mono">{amt.toFixed(1)}</span></div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${(amt / max) * 100}%` }} className="h-full bg-gradient-to-r from-amber-500 to-rose-500" /></div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-[10px] text-ink-400 text-center py-2">暂无数据</p>}
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '记录收获'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="收获物" className="col-span-2 h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="🥬" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 text-center" />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(CATEGORY_LABELS) as Harvest['category'][]).map((c) => (
              <button key={c} onClick={() => setDraft({ ...draft, category: c })} className={cn('h-7 rounded-lg text-[10px] font-semibold', draft.category === c ? 'bg-rose-500 text-white' : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">日期</div>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">数量</div>
              <input type="number" step="0.1" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">单位</div>
              <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as any })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                <option value="g">g</option><option value="kg">kg</option><option value="piece">个</option><option value="bundle">把</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-0.5"><span className="font-semibold text-ink-600">质量</span><span className="text-rose-600">{QUALITY_LABELS[draft.quality]}</span></div>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((q) => (
                <button key={q} onClick={() => setDraft({ ...draft, quality: q as any })} className={cn('h-8 rounded-lg flex items-center justify-center', draft.quality === q ? 'bg-rose-500 text-white' : 'bg-ink-50 dark:bg-ink-800')}>
                  <Star className={cn('w-3.5 h-3.5', draft.quality >= q && 'fill-current')} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">节省 ¥</div>
              <input type="number" value={draft.costSaved} onChange={(e) => setDraft({ ...draft, costSaved: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">分享人数</div>
              <input type="number" value={draft.sharedWith} onChange={(e) => setDraft({ ...draft, sharedWith: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-ink-600 mb-0.5">储存方法</div>
            <div className="grid grid-cols-5 gap-1">
              {(Object.keys(STORAGE_LABELS) as Harvest['storageMethod'][]).map((s) => (
                <button key={s} onClick={() => setDraft({ ...draft, storageMethod: s })} className={cn('h-8 rounded-lg text-[10px] font-semibold', draft.storageMethod === s ? 'bg-rose-500 text-white' : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                  {STORAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <input value={draft.recipeNote} onChange={(e) => setDraft({ ...draft, recipeNote: e.target.value })} placeholder="食谱笔记 (如番茄炒蛋)" className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={add} className="w-full h-9 rounded-lg bg-rose-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-1.5">
          {list.map((h) => (
            <div key={h.id} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl">{h.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-800 dark:text-ink-200 truncate">{h.name}</p>
                  <p className="text-[10px] text-ink-500">{h.date} · {CATEGORY_LABELS[h.category]}</p>
                </div>
                <button onClick={() => del(h.id)} className="w-7 h-7 rounded text-ink-300 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] mt-1">
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">产量</p>
                  <p className="font-mono font-bold">{h.amount}{h.unit}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">质量</p>
                  <p className="font-bold text-amber-500 flex items-center justify-center gap-0.5"><Star className="w-2.5 h-2.5 fill-current" />{h.quality}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">节省</p>
                  <p className="font-mono font-bold text-emerald-600">¥{h.costSaved}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">分享</p>
                  <p className="font-mono font-bold">{h.sharedWith}人</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mt-1">
                <span>{STORAGE_LABELS[h.storageMethod]}</span>
              </div>
              {h.recipeNote && <p className="text-[10px] text-ink-500 mt-1 flex items-start gap-0.5"><ChefHat className="w-2.5 h-2.5 mt-0.5" />{h.recipeNote}</p>}
              <div className="flex flex-wrap gap-0.5 mt-1">
                {RECIPE_SUGG[h.category].slice(0, 3).map((r) => <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100/40 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">{r}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Apple className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无收获记录</p>
        </div>
      )}
    </div>
  )
}
