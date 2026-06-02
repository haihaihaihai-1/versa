import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Type, Pen, Camera, Hash, Sparkles, Loader2, Tag, Trash2, Lock, X, Send, Inbox, Check } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Capture {
  id: string
  type: 'text' | 'voice' | 'sketch' | 'photo' | 'link'
  content: string
  transcript?: string
  tags: string[]
  category: 'idea' | 'todo' | 'note' | 'quote'
  pinned: boolean
  archived: boolean
  at: number
}

const STORAGE_KEY = 'versa:captures'

function load(): Capture[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'c1', type: 'voice', content: 'recording-1', transcript: '明天记得买牛奶和面包, 顺便取快递', tags: ['购物'], category: 'todo', pinned: true, archived: false, at: Date.now() - 3600000 },
    { id: 'c2', type: 'text', content: '突然想到一个好点子: 做一个 AI 帮你整理灵感的小应用', tags: ['灵感', 'AI'], category: 'idea', pinned: false, archived: false, at: Date.now() - 7200000 },
    { id: 'c3', type: 'link', content: 'https://react.dev', tags: ['学习', '前端'], category: 'note', pinned: false, archived: false, at: Date.now() - 86400000 },
  ]
}
function save(d: Capture[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  idea: { label: '灵感', color: 'bg-violet-500', emoji: '💡' },
  todo: { label: '待办', color: 'bg-rose-500', emoji: '✅' },
  note: { label: '笔记', color: 'bg-blue-500', emoji: '📝' },
  quote: { label: '语录', color: 'bg-amber-500', emoji: '💬' },
} as const

export function QuickCapture() {
  const [items, setItems] = useState<Capture[]>(load())
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [category, setCategory] = useState<Capture['category']>('note')
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const [filter, setFilter] = useState<'all' | 'pinned' | 'archived' | Capture['category']>('all')
  const [aiTag, setAiTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [sketching, setSketching] = useState(false)
  const [sketchData, setSketchData] = useState<string>('')
  const recRef = useRef<number | undefined>(undefined)
  const sketchRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)

  useEffect(() => { save(items) }, [items])

  useEffect(() => {
    if (recording) {
      recRef.current = window.setInterval(() => setRecTime((t) => t + 1), 1000)
    } else if (recRef.current) {
      window.clearInterval(recRef.current)
    }
    return () => { if (recRef.current) window.clearInterval(recRef.current) }
  }, [recording])

  const startRecording = () => {
    setRecording(true)
    setRecTime(0)
  }
  const stopRecording = async () => {
    setRecording(false)
    const transcript = `[语音转写] ${text || '这是一段语音备忘的模拟转写内容'}`
    if (isAIEnabled() && !text) {
      try {
        const r = await aiComplete('把这段语音转成简短文本 (用第一人称, 30 字内)', '你是 Versa 语音转写, 简洁')
        addCapture('voice', r, category, ['语音'])
      } catch {
        addCapture('voice', transcript, category, ['语音'])
      }
    } else {
      addCapture('voice', text || transcript, category, ['语音'])
    }
    setText('')
  }

  const addCapture = (type: Capture['type'], content: string, cat: Capture['category'], tags: string[] = []) => {
    const c: Capture = { id: uid(), type, content, tags, category: cat, pinned: false, archived: false, at: Date.now() }
    setItems([c, ...items])
    toast('已保存', 'success')
  }

  const addText = () => {
    if (!text.trim()) { toast('请输入内容', 'error'); return }
    addCapture('text', text, category)
    setText('')
  }

  const addLink = () => {
    if (!link.trim()) { toast('请输入链接', 'error'); return }
    addCapture('link', link, 'note', ['链接'])
    setLink('')
  }

  const togglePin = (id: string) => setItems((is) => is.map((i) => i.id === id ? { ...i, pinned: !i.pinned } : i))
  const archive = (id: string) => setItems((is) => is.map((i) => i.id === id ? { ...i, archived: !i.archived } : i))
  const remove = (id: string) => setItems((is) => is.filter((i) => i.id !== id))

  const startSketch = () => {
    setSketching(true)
    setTimeout(() => {
      const canvas = sketchRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
    }, 0)
  }

  const saveSketch = () => {
    if (!sketchRef.current) return
    const data = sketchRef.current.toDataURL()
    addCapture('sketch', data, 'idea', ['涂鸦'])
    setSketching(false)
    setSketchData(data)
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 5 个快速记录灵感的小习惯 (50-80 字)', '你是 Versa 效率教练, 简洁实用, 中文')
      setAiTag(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const filtered = (() => {
    let out = items
    if (filter === 'pinned') out = out.filter((i) => i.pinned)
    else if (filter === 'archived') out = out.filter((i) => i.archived)
    else if (filter !== 'all') out = out.filter((i) => i.category === filter && !i.archived)
    else out = out.filter((i) => !i.archived)
    return out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at)
  })()

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const todayCount = items.filter((i) => new Date(i.at).toDateString() === new Date(today).toDateString()).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Inbox className="w-5 h-5" />
          <h2 className="text-lg font-bold">快速捕获</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">文字 · 语音 · 涂鸦 · 链接 · 标签</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{items.length}</p>
            <p className="text-[10px] opacity-80">总计</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{todayCount}</p>
            <p className="text-[10px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{items.filter((i) => i.pinned).length}</p>
            <p className="text-[10px] opacity-80">置顶</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex gap-1">
          {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
            <button key={k} onClick={() => setCategory(k)} className={cn('flex-1 h-7 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-0.5', category === k ? `${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              {CAT_META[k].emoji}{CAT_META[k].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addText()} placeholder="记下想法..." className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          <button onClick={addText} className="px-3 h-9 rounded-lg bg-violet-500 text-white text-xs font-semibold">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-1.5">
          {!recording ? (
            <button onClick={startRecording} className="flex-1 h-9 rounded-lg bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              <Mic className="w-3.5 h-3.5" />语音备忘
            </button>
          ) : (
            <button onClick={stopRecording} className="flex-1 h-9 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-1">
              <Square className="w-3.5 h-3.5" />停止 ({recTime}s)
            </button>
          )}
          <button onClick={startSketch} className="px-3 h-9 rounded-lg bg-amber-500 text-white text-xs font-semibold flex items-center gap-1">
            <Pen className="w-3.5 h-3.5" />涂鸦
          </button>
        </div>
        <div className="flex gap-1.5">
          <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLink()} placeholder="https://..." className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
          <button onClick={addLink} className="px-3 h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold">+</button>
        </div>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-8 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 灵感建议
      </button>

      {aiTag && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed text-violet-700 dark:text-violet-300">💡 {aiTag}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'pinned', 'archived', 'idea', 'todo', 'note'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'pinned' ? '📌 置顶' : f === 'archived' ? '🗄️ 归档' : `${CAT_META[f as keyof typeof CAT_META]?.emoji} ${CAT_META[f as keyof typeof CAT_META]?.label}`}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有记录</p>
          </div>
        ) : filtered.map((i) => {
          const CatMeta = CAT_META[i.category]
          return (
            <div key={i.id} className={cn('p-2.5 rounded-xl border', i.archived ? 'bg-ink-50/30 dark:bg-ink-900/10 border-ink-200/30 opacity-60' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-start gap-2">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0', CatMeta.color)}>
                  {i.type === 'voice' ? <Mic className="w-3 h-3" /> : i.type === 'sketch' ? <Pen className="w-3 h-3" /> : i.type === 'photo' ? <Camera className="w-3 h-3" /> : i.type === 'link' ? <Hash className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  {i.type === 'sketch' ? (
                    <img src={i.content} alt="sketch" className="w-full h-20 object-cover rounded-lg mb-1" />
                  ) : (
                    <p className={cn('text-xs', i.type === 'link' && 'text-blue-500 underline truncate')}>{i.content}</p>
                  )}
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {i.tags.map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                    <span className="text-[9px] text-ink-400 ml-auto">{formatTimeAgo(new Date(i.at).toISOString())}</span>
                  </div>
                </div>
                <button onClick={() => togglePin(i.id)} className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs', i.pinned ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>📌</button>
                <button onClick={() => archive(i.id)} className={cn('w-6 h-6 rounded-lg flex items-center justify-center', i.archived ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {i.archived ? <Check className="w-3 h-3" /> : <span className="text-[10px]">🗄️</span>}
                </button>
                <button onClick={() => remove(i.id)} className="w-6 h-6 rounded-lg bg-ink-100 dark:bg-ink-800 text-rose-500 flex items-center justify-center">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {sketching && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setSketching(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold">涂鸦</h3>
              <canvas
                ref={sketchRef}
                width={360}
                height={300}
                className="w-full border border-ink-200 dark:border-ink-700 rounded-lg cursor-crosshair"
                onMouseDown={() => { isDrawingRef.current = true }}
                onMouseUp={() => { isDrawingRef.current = false }}
                onMouseMove={(e) => {
                  if (!isDrawingRef.current) return
                  const canvas = sketchRef.current
                  if (!canvas) return
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const rect = canvas.getBoundingClientRect()
                  ctx.fillStyle = '#8b5cf6'
                  ctx.beginPath()
                  ctx.arc((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height), 3, 0, Math.PI * 2)
                  ctx.fill()
                }}
                onTouchStart={() => { isDrawingRef.current = true }}
                onTouchEnd={() => { isDrawingRef.current = false }}
                onTouchMove={(e) => {
                  if (!isDrawingRef.current) return
                  const canvas = sketchRef.current
                  if (!canvas) return
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  const t = e.touches[0]
                  const rect = canvas.getBoundingClientRect()
                  ctx.fillStyle = '#8b5cf6'
                  ctx.beginPath()
                  ctx.arc((t.clientX - rect.left) * (canvas.width / rect.width), (t.clientY - rect.top) * (canvas.height / rect.height), 3, 0, Math.PI * 2)
                  ctx.fill()
                }}
              />
              <div className="flex gap-1.5">
                <button onClick={() => setSketching(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm">取消</button>
                <button onClick={saveSketch} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-sm font-semibold">保存</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
