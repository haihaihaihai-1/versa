import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Type, Music, Sticker, Smile, Pen, Hash, BarChart3, Loader2, Download, X, Sparkles, Image as ImageIcon, Send } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type Layer = { id: string; type: 'text' | 'sticker' | 'drawing' | 'poll'; x: number; y: number; rotation: number; scale: number; data: any; color: string; size: number }

interface Story {
  id: string
  bg: string
  layers: Layer[]
  createdAt: number
}

const BG_GRADIENTS = [
  'from-violet-500 via-purple-500 to-pink-500',
  'from-rose-500 via-red-500 to-amber-500',
  'from-cyan-500 via-blue-500 to-indigo-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-orange-500 via-rose-500 to-pink-500',
  'from-slate-800 via-slate-700 to-slate-900',
]

const STICKERS = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😇', '🤔', '😴', '🤯', '🥹', '😋', '🤤', '😈', '👻', '❤️', '💖', '✨', '🌟', '💫', '🔥', '💯', '🎉', '🎊', '🌈', '☀️', '🌙', '💎', '👑']

const STORAGE_KEY = 'versa:stories'

function load(): Story[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Story[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function StoryEditor() {
  const [bg, setBg] = useState(0)
  const [layers, setLayers] = useState<Layer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(24)
  const [stories, setStories] = useState<Story[]>(load())
  const [drawing, setDrawing] = useState(false)
  const [pollQ, setPollQ] = useState('')
  const [pollOpts, setPollOpts] = useState(['', ''])
  const [aiIdea, setAiIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const addText = () => {
    if (!textInput.trim()) return
    const l: Layer = { id: uid(), type: 'text', x: 50, y: 50, rotation: 0, scale: 1, data: textInput, color: textColor, size: textSize }
    setLayers([...layers, l])
    setTextInput('')
    setSelectedId(l.id)
  }

  const addSticker = (emoji: string) => {
    const l: Layer = { id: uid(), type: 'sticker', x: 50, y: 50, rotation: 0, scale: 1, data: emoji, color: '#fff', size: 48 }
    setLayers([...layers, l])
    setSelectedId(l.id)
  }

  const addPoll = () => {
    const valid = pollOpts.filter((o) => o.trim())
    if (!pollQ.trim() || valid.length < 2) { toast('请填写问题 + 至少 2 选项', 'error'); return }
    const l: Layer = { id: uid(), type: 'poll', x: 50, y: 50, rotation: 0, scale: 1, data: { q: pollQ, opts: valid }, color: '#fff', size: 18 }
    setLayers([...layers, l])
    setPollQ(''); setPollOpts(['', ''])
    setSelectedId(l.id)
  }

  const moveLayer = (id: string, dx: number, dy: number) => {
    setLayers(layers.map((l) => l.id === id ? { ...l, x: Math.max(0, Math.min(100, l.x + dx)), y: Math.max(0, Math.min(100, l.y + dy)) } : l))
  }

  const removeLayer = (id: string) => {
    setLayers(layers.filter((l) => l.id !== id))
    setSelectedId(null)
  }

  const updateLayer = (id: string, patch: Partial<Layer>) => {
    setLayers(layers.map((l) => l.id === id ? { ...l, ...patch } : l))
  }

  const publish = () => {
    if (layers.length === 0) { toast('请添加内容', 'error'); return }
    const s: Story = { id: uid(), bg: BG_GRADIENTS[bg], layers, createdAt: Date.now() }
    const next = [s, ...stories]
    setStories(next)
    save(next)
    setLayers([])
    toast('故事已发布 (24h 可见)', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为 Versa 24h 故事推荐 3 个创意主题 (50-80 字, 含 emoji 贴纸建议)', '你是 Versa 创意策划, 活泼有创意, 中文')
      setAiIdea(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const selected = layers.find((l) => l.id === selectedId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">24h 故事</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">贴纸 · 涂鸦 · 投票 · AI 创意</p>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-8 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 创意
        </button>
        <button onClick={publish} className="flex-1 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Send className="w-3 h-3" />发布
        </button>
      </div>

      {aiIdea && (
        <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-fuchsia-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-fuchsia-500"><Sparkles className="w-3.5 h-3.5" />AI 创意</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiIdea}</p>
        </div>
      )}

      <div ref={canvasRef} className={cn('relative aspect-[9/16] max-w-sm mx-auto rounded-3xl overflow-hidden bg-gradient-to-br shadow-2xl', BG_GRADIENTS[bg])}>
        <div className="absolute inset-0 bg-black/10" />
        {layers.map((l) => (
          <motion.div
            key={l.id}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const rect = canvasRef.current?.getBoundingClientRect()
              if (rect) {
                const newX = Math.max(0, Math.min(100, (info.point.x - rect.left) / rect.width * 100))
                const newY = Math.max(0, Math.min(100, (info.point.y - rect.top) / rect.height * 100))
                updateLayer(l.id, { x: newX, y: newY })
              }
            }}
            onClick={() => setSelectedId(l.id)}
            whileTap={{ scale: 1.05 }}
            className={cn('absolute select-none cursor-move', selectedId === l.id && 'ring-2 ring-white')}
            style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {l.type === 'text' && <p className="font-bold whitespace-nowrap drop-shadow-lg" style={{ color: l.color, fontSize: l.size }}>{l.data}</p>}
            {l.type === 'sticker' && <span className="text-5xl drop-shadow-lg" style={{ fontSize: l.size }}>{l.data}</span>}
            {l.type === 'poll' && (
              <div className="bg-white/95 rounded-2xl p-3 min-w-[200px]">
                <p className="text-ink-900 font-bold text-sm mb-1.5">{l.data.q}</p>
                {l.data.opts.map((o: string, i: number) => (
                  <div key={i} className="mb-1 px-2 py-1 rounded-lg bg-ink-100 text-ink-700 text-xs">{o}</div>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        <div className="absolute top-2 left-2 right-2 flex items-center gap-1.5 text-white text-[10px]">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur" />
          <span>我</span>
          <span>刚刚</span>
        </div>

        {selected && (
          <button onClick={() => removeLayer(selected.id)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-bold mb-1.5">背景</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {BG_GRADIENTS.map((g, i) => (
            <button key={i} onClick={() => setBg(i)} className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex-shrink-0', g, bg === i && 'ring-2 ring-white')} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <p className="text-xs font-bold flex items-center gap-1.5"><Type className="w-3.5 h-3.5" />文字</p>
        <div className="flex gap-1.5">
          <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addText()} placeholder="输入文字" className="flex-1 px-2 h-7 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer" />
          <button onClick={addText} className="px-3 h-7 rounded-lg bg-fuchsia-500 text-white text-xs">添加</button>
        </div>
        <input type="range" min="14" max="48" value={textSize} onChange={(e) => setTextSize(+e.target.value)} className="w-full accent-fuchsia-500" />
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Smile className="w-3.5 h-3.5" />贴纸 (30)</p>
        <div className="grid grid-cols-10 gap-1">
          {STICKERS.map((e) => (
            <button key={e} onClick={() => addSticker(e)} className="aspect-square text-lg hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 rounded">{e}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <p className="text-xs font-bold flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />投票</p>
        <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="问题" className="w-full px-2 h-7 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
        {pollOpts.map((o, i) => (
          <input key={i} value={o} onChange={(e) => setPollOpts(pollOpts.map((p, j) => j === i ? e.target.value : p))} placeholder={`选项 ${i + 1}`} className="w-full px-2 h-7 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
        ))}
        <div className="flex gap-1">
          <button onClick={() => setPollOpts([...pollOpts, ''])} className="flex-1 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">+ 选项</button>
          <button onClick={addPoll} className="flex-1 h-7 rounded-lg bg-fuchsia-500 text-white text-xs font-semibold">添加投票</button>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-ink-900 border-t border-ink-200 dark:border-ink-800 p-3 space-y-2 safe-area-bottom">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-500">已选: {selected.type}</span>
              <button onClick={() => setSelectedId(null)} className="ml-auto text-[10px] text-ink-500">完成</button>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => moveLayer(selected.id, -2, 0)} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800">←</button>
              <button onClick={() => moveLayer(selected.id, 2, 0)} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800">→</button>
              <button onClick={() => moveLayer(selected.id, 0, -2)} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800">↑</button>
              <button onClick={() => moveLayer(selected.id, 0, 2)} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800">↓</button>
              <button onClick={() => updateLayer(selected.id, { scale: Math.max(0.5, selected.scale - 0.1) })} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">-</button>
              <input type="range" min="0.5" max="2" step="0.1" value={selected.scale} onChange={(e) => updateLayer(selected.id, { scale: +e.target.value })} className="flex-1 accent-fuchsia-500" />
              <button onClick={() => updateLayer(selected.id, { scale: Math.min(2, selected.scale + 0.1) })} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">+</button>
              <button onClick={() => updateLayer(selected.id, { rotation: selected.rotation - 15 })} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">↺</button>
              <button onClick={() => updateLayer(selected.id, { rotation: selected.rotation + 15 })} className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">↻</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
