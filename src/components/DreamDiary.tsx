import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Plus, Trash2, Calendar, Smile, Frown, Meh, Tag, Sparkles, BookOpen, Search } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Dream {
  id: string
  date: string
  title: string
  content: string
  mood: 'happy' | 'sad' | 'scared' | 'confused' | 'peaceful'
  lucidity: 1 | 2 | 3 | 4 | 5
  vivid: 1 | 2 | 3 | 4 | 5
  recurring: boolean
  tags: string[]
  symbol: string
  interpretation: string
}

const MOOD_META = {
  happy: { label: '开心', icon: '😊', color: 'from-amber-400 to-yellow-400' },
  sad: { label: '悲伤', icon: '😢', color: 'from-blue-400 to-cyan-500' },
  scared: { label: '恐惧', icon: '😨', color: 'from-zinc-500 to-slate-600' },
  confused: { label: '迷茫', icon: '😕', color: 'from-violet-400 to-purple-500' },
  peaceful: { label: '平静', icon: '😌', color: 'from-emerald-400 to-teal-400' },
}

const SYMBOLS = [
  { symbol: '水', meaning: '情感、潜意识、净化' },
  { symbol: '火', meaning: '激情、愤怒、转变' },
  { symbol: '飞', meaning: '自由、逃避、抱负' },
  { symbol: '掉', meaning: '失控、不安全感' },
  { symbol: '追', meaning: '逃避、追求目标' },
  { symbol: '死', meaning: '结束、转变、新生' },
  { symbol: '家', meaning: '安全感、根源' },
  { symbol: '牙', meaning: '焦虑、形象、自尊' },
  { symbol: '蛇', meaning: '智慧、恐惧、转变' },
  { symbol: '猫', meaning: '女性、直觉、独立' },
  { symbol: '车', meaning: '掌控、方向、人生路' },
  { symbol: '路', meaning: '选择、人生方向' },
]

const STORAGE_KEY = 'versa:dream-diary-v1'

function load(): Dream[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Dream[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Dream[] {
  return [
    { id: '1', date: '2026-05-30', title: '在云端飞翔', content: '梦见自己在云层之间自由飞翔, 俯瞰城市, 感觉很轻盈很自由。', mood: 'happy', lucidity: 3, vivid: 4, recurring: false, tags: ['飞翔', '自由', '云'], symbol: '飞', interpretation: '代表对自由的渴望, 当前生活可能感到束缚, 内心的解脱愿望。' },
    { id: '2', date: '2026-05-25', title: '迷路的森林', content: '在一片黑暗的森林中迷路, 听到奇怪的声音, 想找到出口但一直走不出去。', mood: 'scared', lucidity: 2, vivid: 5, recurring: true, tags: ['迷路', '森林', '恐惧'], symbol: '路', interpretation: '可能反映现实中的迷茫感, 寻找方向和答案的迫切需求。' },
    { id: '3', date: '2026-05-20', title: '童年的家', content: '回到儿时住过的老房子, 一切都是那么熟悉, 妈妈在厨房做饭。', mood: 'peaceful', lucidity: 1, vivid: 3, recurring: false, tags: ['家', '童年', '怀旧'], symbol: '家', interpretation: '对安全感和归属感的渴求, 也可能反映对过去时光的怀念。' },
  ]
}

export function DreamDiary() {
  const [list, setList] = useState<Dream[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [filterMood, setFilterMood] = useState<'all' | keyof typeof MOOD_META>('all')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Omit<Dream, 'id'>>({ date: new Date().toISOString().slice(0, 10), title: '', content: '', mood: 'happy', lucidity: 1, vivid: 1, recurring: false, tags: [], symbol: '水', interpretation: '' })

  useEffect(() => { save(list) }, [list])

  const filtered = useMemo(() => {
    return list.filter((d) => {
      if (filterMood !== 'all' && d.mood !== filterMood) return false
      if (search) {
        const s = search.toLowerCase()
        if (!d.title.toLowerCase().includes(s) && !d.content.toLowerCase().includes(s) && !d.tags.some((t) => t.toLowerCase().includes(s))) return false
      }
      return true
    })
  }, [list, filterMood, search])

  const stats = useMemo(() => {
    const total = list.length
    const recurring = list.filter((d) => d.recurring).length
    const avgVivid = total > 0 ? list.reduce((s, d) => s + d.vivid, 0) / total : 0
    const avgLucid = total > 0 ? list.reduce((s, d) => s + d.lucidity, 0) / total : 0
    const moodCounts = Object.keys(MOOD_META).map((m) => ({ mood: m, count: list.filter((d) => d.mood === m).length }))
    const topMood = moodCounts.sort((a, b) => b.count - a.count)[0]
    return { total, recurring, avgVivid, avgLucid, topMood }
  }, [list])

  const add = () => {
    if (!draft.title || !draft.content) { toast('请填写标题和内容', 'error'); return }
    setList([{ id: uid(), ...draft, tags: draft.tags.filter(Boolean) }, ...list])
    setShowForm(false)
    setDraft({ ...draft, title: '', content: '', interpretation: '' })
    toast('已记录', 'success')
  }
  const del = (id: string) => { setList(list.filter((d) => d.id !== id)); toast('已删除', 'success') }
  const toggleRecurring = (id: string) => setList(list.map((d) => d.id === id ? { ...d, recurring: !d.recurring } : d))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Moon className="w-5 h-5" />
          <h2 className="text-lg font-bold">梦境日记</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">记录 · 情绪 · 清晰度 · 符号解读</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.total}</p><p className="text-[9px] opacity-80">梦</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.recurring}</p><p className="text-[9px] opacity-80">反复</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.avgVivid.toFixed(1)}</p><p className="text-[9px] opacity-80">清晰度</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.topMood?.count || 0}</p><p className="text-[9px] opacity-80">{stats.topMood ? MOOD_META[stats.topMood.mood as keyof typeof MOOD_META].icon : '-'}</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '记录新梦'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="梦的标题" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          </div>
          <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="详细描述梦境..." rows={3} className="w-full p-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 resize-none" />
          <div>
            <div className="text-[10px] font-semibold text-ink-600 mb-1">情绪</div>
            <div className="grid grid-cols-5 gap-1">
              {(Object.keys(MOOD_META) as (keyof typeof MOOD_META)[]).map((m) => (
                <button key={m} onClick={() => setDraft({ ...draft, mood: m })} className={cn('h-9 rounded-lg flex flex-col items-center justify-center text-[10px]', draft.mood === m ? `bg-gradient-to-br ${MOOD_META[m].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                  <span className="text-base">{MOOD_META[m].icon}</span>
                  {MOOD_META[m].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-1">清晰度 (1-5)</div>
              <input type="range" min="1" max="5" value={draft.vivid} onChange={(e) => setDraft({ ...draft, vivid: Number(e.target.value) as any })} className="w-full accent-indigo-500" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-1">清醒度 (1-5)</div>
              <input type="range" min="1" max="5" value={draft.lucidity} onChange={(e) => setDraft({ ...draft, lucidity: Number(e.target.value) as any })} className="w-full accent-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
              {SYMBOLS.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.meaning.split('、')[0]}</option>)}
            </select>
            <label className="flex items-center justify-center gap-1.5 text-xs bg-ink-50 dark:bg-ink-800 rounded-lg">
              <input type="checkbox" checked={draft.recurring} onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })} className="accent-indigo-500" />反复出现的梦
            </label>
          </div>
          <input value={draft.interpretation} onChange={(e) => setDraft({ ...draft, interpretation: e.target.value })} placeholder="你的解读 (可选)" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={add} className="w-full h-9 rounded-lg bg-indigo-500 text-white text-xs font-semibold">保存梦境</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索梦境..." className="w-full h-9 pl-8 pr-3 text-xs bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', ...Object.keys(MOOD_META)] as const).map((m) => (
          <button key={m} onClick={() => setFilterMood(m as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1', filterMood === m ? 'bg-indigo-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {m === 'all' ? '全部' : <><span>{MOOD_META[m as keyof typeof MOOD_META].icon}</span>{MOOD_META[m as keyof typeof MOOD_META].label}</>}
          </button>
        ))}
      </div>

      <AnimatePresence>
        <div className="space-y-1.5">
          {filtered.map((d) => {
            const meta = MOOD_META[d.mood]
            return (
              <motion.div key={d.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink-800 dark:text-ink-200 truncate">{d.title}</p>
                    <p className="text-[10px] text-ink-500 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{d.date} {d.recurring && '· 🔁 反复'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleRecurring(d.id)} className={cn('w-5 h-5 rounded text-[10px]', d.recurring ? 'bg-amber-400 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>🔁</button>
                    <button onClick={() => del(d.id)} className="text-ink-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <p className="text-[11px] text-ink-700 dark:text-ink-300 leading-relaxed mb-1">{d.content}</p>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 mb-1">
                  <span>清晰度 {'★'.repeat(d.vivid)}{'☆'.repeat(5 - d.vivid)}</span>
                  <span>清醒 {'★'.repeat(d.lucidity)}{'☆'.repeat(5 - d.lucidity)}</span>
                </div>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mb-1">
                    {d.tags.map((t) => (
                      <span key={t} className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Tag className="w-2 h-2" />{t}</span>
                    ))}
                  </div>
                )}
                {d.interpretation && (
                  <div className="p-1.5 rounded bg-indigo-50/40 dark:bg-indigo-900/10 text-[10px] text-ink-600 dark:text-ink-400 mt-1">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />解读:</span> {d.interpretation}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Moon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无梦境记录</p>
        </div>
      )}
    </div>
  )
}
