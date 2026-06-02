import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, Trash2, Tag, Sparkles, Loader2, Volume2, Download, Search, Filter, Clock, X } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface VoiceMemo {
  id: string
  title: string
  transcript: string
  duration: number
  tags: string[]
  category: 'idea' | 'todo' | 'note' | 'meeting' | 'reminder'
  at: number
  favorite: boolean
  archived: boolean
  analyzed: boolean
}

const STORAGE_KEY = 'versa:voice-memos'

function load(): VoiceMemo[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'v1', title: '产品点子', transcript: '今天想到一个点子: 做一个 AI 帮你整理语音备忘录的应用, 自动分类, 自动提取待办, 还可以搜索', duration: 42, tags: ['产品', 'AI'], category: 'idea', at: Date.now() - 86400000, favorite: true, archived: false, analyzed: true },
    { id: 'v2', title: '会议记录', transcript: 'Q3 计划会: 1. 上线 v30 大版本 2. 用户量增长目标 30% 3. 重点优化推荐算法', duration: 128, tags: ['会议', '工作'], category: 'meeting', at: Date.now() - 86400000 * 3, favorite: false, archived: false, analyzed: true },
  ]
}
function save(d: VoiceMemo[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  idea: { label: '灵感', emoji: '💡', color: 'bg-violet-500' },
  todo: { label: '待办', emoji: '✅', color: 'bg-rose-500' },
  note: { label: '笔记', emoji: '📝', color: 'bg-blue-500' },
  meeting: { label: '会议', emoji: '👥', color: 'bg-amber-500' },
  reminder: { label: '提醒', emoji: '⏰', color: 'bg-emerald-500' },
}

const SAMPLE_PHRASES = ['今天想做的事...', '突然想到...', '提醒自己...', '记录一下会议...', '明天记得...', '好主意来了...']

export function VoiceMemoStudio() {
  const [memos, setMemos] = useState<VoiceMemo[]>(load())
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorite' | 'archived' | keyof typeof CAT_META>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualText, setManualText] = useState('')
  const [manualCat, setManualCat] = useState<keyof typeof CAT_META>('note')
  const [showManual, setShowManual] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(memos) }, [memos])

  useEffect(() => {
    if (recording) {
      intervalRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [recording])

  const startRecording = () => { setRecording(true); setDuration(0) }
  const stopRecording = async () => {
    setRecording(false)
    const transcript = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)] + ' ' +
      ['买牛奶面包', '回复老板的邮件', '去图书馆还书', '练 30 分钟瑜伽', '完成季度报告'][Math.floor(Math.random() * 5)] + ' ' +
      ['顺便取快递', '还有预约医生', '记得买猫粮', '下午开会', '晚上做饭'][Math.floor(Math.random() * 5)]

    let finalTranscript = transcript
    if (isAIEnabled() && Math.random() > 0.5) {
      try {
        finalTranscript = await aiComplete(`把这段语音润色成自然的备忘录文本 (50-80 字, 第一人称): ${transcript}`, '你是 Versa 语音转写助手, 简洁流畅, 中文')
      } catch {}
    }

    const m: VoiceMemo = { id: uid(), title: `录音 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`, transcript: finalTranscript, duration, tags: [], category: 'note', at: Date.now(), favorite: false, archived: false, analyzed: false }
    setMemos([m, ...memos])
    toast(`录音已保存 (${Math.floor(duration / 60)}分${duration % 60}秒)`, 'success')
  }

  const addManual = () => {
    if (!manualText.trim()) { toast('请输入文本', 'error'); return }
    const m: VoiceMemo = { id: uid(), title: manualTitle || '新备忘录', transcript: manualText, duration: 0, tags: [], category: manualCat, at: Date.now(), favorite: false, archived: false, analyzed: false }
    setMemos([m, ...memos])
    setManualTitle(''); setManualText(''); setShowManual(false)
    toast('已添加', 'success')
  }

  const toggleFav = (id: string) => setMemos(memos.map((m) => m.id === id ? { ...m, favorite: !m.favorite } : m))
  const toggleArchive = (id: string) => setMemos(memos.map((m) => m.id === id ? { ...m, archived: !m.archived } : m))
  const remove = (id: string) => setMemos(memos.filter((m) => m.id !== id))

  const filtered = (() => {
    let out = memos
    if (filter === 'favorite') out = out.filter((m) => m.favorite && !m.archived)
    else if (filter === 'archived') out = out.filter((m) => m.archived)
    else if (filter !== 'all') out = out.filter((m) => m.category === filter && !m.archived)
    else out = out.filter((m) => !m.archived)
    if (search) out = out.filter((m) => m.title.includes(search) || m.transcript.includes(search) || m.tags.some((t) => t.includes(search)))
    return out
  })()

  const totalDuration = memos.reduce((s, m) => s + m.duration, 0)
  const totalCount = memos.length
  const analyzedCount = memos.filter((m) => m.analyzed).length

  const runAI = async (m: VoiceMemo) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setActiveId(m.id)
    setLoading(true)
    try {
      const result = await aiComplete(`分析这段语音备忘录, 提取 3-5 个关键点 (50-80 字): ${m.transcript}`, '你是 Versa 语音分析师, 简洁专业, 中文')
      setAiAnalysis(result)
      setMemos(memos.map((x) => x.id === m.id ? { ...x, analyzed: true } : x))
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const active = memos.find((m) => m.id === activeId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-5 h-5" />
          <h2 className="text-lg font-bold">语音备忘录</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">录音 · 转写 · AI 提取</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalCount}</p>
            <p className="text-[10px] opacity-80">条数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(totalDuration / 60)}m</p>
            <p className="text-[10px] opacity-80">总时长</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{analyzedCount}</p>
            <p className="text-[10px] opacity-80">已分析</p>
          </div>
        </div>
      </div>

      <div className={cn('rounded-2xl p-4 text-white bg-gradient-to-br', recording ? 'from-rose-500 to-red-500' : 'from-slate-700 to-slate-900')}>
        <div className="flex items-center gap-3">
          <button onClick={recording ? stopRecording : startRecording} className={cn('w-16 h-16 rounded-full flex items-center justify-center', recording ? 'bg-white text-rose-500' : 'bg-rose-500 text-white')}>
            {recording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>
          <div className="flex-1">
            <p className="text-3xl font-bold font-mono">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
            <p className="text-xs opacity-80">{recording ? '🔴 录音中... 说话吧' : '点击开始录音'}</p>
          </div>
          <button onClick={() => setShowManual(true)} className="px-3 h-9 rounded-full bg-white/20 backdrop-blur text-xs font-semibold flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />转文字
          </button>
        </div>
        {recording && (
          <div className="flex items-end gap-0.5 h-8 mt-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex-1 bg-white/40 rounded-full" style={{ height: `${20 + Math.random() * 80}%`, animation: `pulse ${0.5 + Math.random()}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'favorite', 'archived', ...Object.keys(CAT_META)] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'favorite' ? '⭐' : f === 'archived' ? '🗄️' : `${CAT_META[f as keyof typeof CAT_META].emoji} ${CAT_META[f as keyof typeof CAT_META].label}`}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Mic className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有语音备忘录</p>
          </div>
        ) : filtered.map((m) => {
          const Cat = CAT_META[m.category]
          return (
            <motion.div key={m.id} whileHover={{ y: -1 }} onClick={() => setActiveId(m.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-start gap-2">
                <button onClick={(e) => { e.stopPropagation(); setPlayingId(playingId === m.id ? null : m.id) }} className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0', Cat.color)}>
                  {playingId === m.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    {m.favorite && <span className="text-[10px]">⭐</span>}
                  </div>
                  <p className="text-[10px] text-ink-500 line-clamp-2">{m.transcript}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className="text-[9px] text-ink-500 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{Math.floor(m.duration / 60)}:{(m.duration % 60).toString().padStart(2, '0')}</span>
                    {m.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                    <span className="text-[9px] text-ink-400 ml-auto">{formatTimeAgo(new Date(m.at).toISOString())}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFav(m.id) }} className="text-amber-500">
                  <span className="text-sm">{m.favorite ? '⭐' : '☆'}</span>
                </button>
              </div>
              {playingId === m.id && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '40%' }} className="h-full bg-gradient-to-r from-rose-500 to-pink-500" />
                  </div>
                  <span className="text-[10px] text-ink-500">0:08 / 0:42</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start gap-2">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0', CAT_META[active.category].color)}>
                <span className="text-lg">{CAT_META[active.category].emoji}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold">{active.title}</h3>
                <p className="text-xs text-ink-500">{formatTimeAgo(new Date(active.at).toISOString())} · {Math.floor(active.duration / 60)}:{(active.duration % 60).toString().padStart(2, '0')}</p>
              </div>
              <button onClick={() => setActiveId(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm leading-relaxed p-3 rounded-lg bg-ink-50 dark:bg-ink-800">{active.transcript}</p>
            <button onClick={() => runAI(active)} disabled={loading} className="w-full h-8 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}{active.analyzed ? '重新' : ''}AI 关键点
            </button>
            {aiAnalysis && activeId === active.id && (
              <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded p-2 border border-rose-200/40">
                <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
              </div>
            )}
            <div className="flex gap-1.5">
              <button onClick={() => toggleFav(active.id)} className={cn('flex-1 h-8 rounded text-xs font-bold', active.favorite ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{active.favorite ? '⭐ 已收藏' : '☆ 收藏'}</button>
              <button onClick={() => toggleArchive(active.id)} className="flex-1 h-8 rounded bg-ink-100 dark:bg-ink-800 text-xs font-bold">归档</button>
              <button onClick={() => remove(active.id)} className="h-8 px-3 rounded bg-rose-500 text-white text-xs">删除</button>
            </div>
          </motion.div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setShowManual(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">文字转备忘录</h3>
            <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="标题 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="粘贴或输入文字..." rows={5} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
                <button key={k} onClick={() => setManualCat(k)} className={cn('h-9 rounded text-xs font-semibold', manualCat === k ? `${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                  {CAT_META[k].emoji}{CAT_META[k].label}
                </button>
              ))}
            </div>
            <button onClick={addManual} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
