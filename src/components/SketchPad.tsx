import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pen, Eraser, Trash2, Download, Palette, Undo, Redo, Sparkles, Loader2, Image as ImageIcon, Type, Square, Circle, X } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'text'
type Stroke = { id: string; tool: Tool; color: string; size: number; points: { x: number; y: number }[]; text?: string; x?: number; y?: number }

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
const SIZES = [2, 4, 8, 16, 24]

const STORAGE_KEY = 'versa:sketches'

function load(): { id: string; name: string; strokes: Stroke[]; createdAt: number; thumbnail?: string }[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return []
}
function save(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function SketchPad() {
  const [sketches, setSketches] = useState(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#8b5cf6')
  const [size, setSize] = useState(4)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [history, setHistory] = useState<Stroke[][]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [aiDesc, setAiDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const currentStroke = useRef<Stroke | null>(null)

  const active = sketches.find((s) => s.id === activeId) || sketches[0]

  useEffect(() => {
    if (active) {
      setStrokes(active.strokes)
      setHistory([active.strokes])
      setHistoryIdx(0)
    }
  }, [activeId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    strokes.forEach((s) => drawStroke(ctx, s))
  }, [strokes])

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (s.tool === 'text' && s.text) {
      ctx.fillStyle = s.color
      ctx.font = `${s.size * 4}px sans-serif`
      ctx.fillText(s.text, s.x || 0, s.y || 0)
      return
    }
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (s.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out'
    else ctx.globalCompositeOperation = 'source-over'

    if (s.points.length === 1) {
      ctx.beginPath()
      ctx.arc(s.points[0].x, s.points[0].y, s.size / 2, 0, Math.PI * 2)
      ctx.fillStyle = s.color
      ctx.fill()
      return
    }
    ctx.beginPath()
    ctx.moveTo(s.points[0].x, s.points[0].y)
    s.points.forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.stroke()
  }

  const pushHistory = (newStrokes: Stroke[]) => {
    const newHistory = history.slice(0, historyIdx + 1)
    newHistory.push(newStrokes)
    setHistory(newHistory)
    setHistoryIdx(newHistory.length - 1)
    setStrokes(newStrokes)
  }

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top
    const scaledX = (x / rect.width) * canvas.width
    const scaledY = (y / rect.height) * canvas.height

    if (tool === 'text') {
      setTextPos({ x: scaledX, y: scaledY })
      return
    }
    isDrawing.current = true
    currentStroke.current = { id: uid(), tool, color, size, points: [{ x: scaledX, y: scaledY }] }
  }

  const draw = (e: any) => {
    if (!isDrawing.current || !currentStroke.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top
    const scaledX = (x / rect.width) * canvas.width
    const scaledY = (y / rect.height) * canvas.height
    currentStroke.current.points.push({ x: scaledX, y: scaledY })
    setStrokes([...strokes, currentStroke.current])
  }

  const stopDrawing = () => {
    if (isDrawing.current && currentStroke.current) {
      pushHistory([...strokes, currentStroke.current])
    }
    isDrawing.current = false
    currentStroke.current = null
  }

  const addText = () => {
    if (!textInput.trim() || !textPos) return
    const newStroke: Stroke = { id: uid(), tool: 'text', color, size, points: [], text: textInput, x: textPos.x, y: textPos.y }
    pushHistory([...strokes, newStroke])
    setTextInput(''); setTextPos(null)
  }

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1)
      setStrokes(history[historyIdx - 1])
    }
  }
  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1)
      setStrokes(history[historyIdx + 1])
    }
  }

  const clear = () => { pushHistory([]) }
  const remove = (id: string) => setSketches(sketches.filter((s) => s.id !== id))

  const saveSketch = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL()
    const name = `草图 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
    const s = { id: uid(), name, strokes, createdAt: Date.now(), thumbnail: data }
    setSketches([s, ...sketches])
    setActiveId(s.id)
    toast('已保存', 'success')
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `sketch-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    toast('已下载', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`这是一幅手绘草图, 用 30-50 字简洁描述可能画的是什么`, '你是 Versa 视觉分析师, 简洁, 中文')
      setAiDesc(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Pen className="w-5 h-5" />
          <h2 className="text-lg font-bold">绘图板</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">画笔 · 橡皮 · 文字 · 撤销</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{sketches.length}</p>
            <p className="text-[10px] opacity-80">作品</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{strokes.length}</p>
            <p className="text-[10px] opacity-80">笔画</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{historyIdx + 1}/{history.length}</p>
            <p className="text-[10px] opacity-80">历史</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 border border-ink-200 dark:border-ink-700">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full aspect-[3/2] rounded-lg cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {([
          { k: 'pen' as const, i: Pen, l: '画笔' },
          { k: 'eraser' as const, i: Eraser, l: '橡皮' },
          { k: 'text' as const, i: Type, l: '文字' },
        ] as const).map((t) => (
          <button key={t.k} onClick={() => setTool(t.k)} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5', tool === t.k ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            <t.i className="w-3.5 h-3.5" />
            <span className="text-[9px] font-semibold">{t.l}</span>
          </button>
        ))}
        <button onClick={undo} disabled={historyIdx <= 0} className="h-9 rounded-lg bg-ink-100 dark:bg-ink-800 disabled:opacity-30 flex items-center justify-center"><Undo className="w-3.5 h-3.5" /></button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1} className="h-9 rounded-lg bg-ink-100 dark:bg-ink-800 disabled:opacity-30 flex items-center justify-center"><Redo className="w-3.5 h-3.5" /></button>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-lg border-2', color === c ? 'border-ink-900 dark:border-white scale-110' : 'border-transparent')} style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} className={cn('flex-1 h-7 rounded-lg', size === s ? 'bg-violet-500' : 'bg-ink-100 dark:bg-ink-800')}>
              <div className="w-1.5 h-1.5 rounded-full bg-current mx-auto" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
      </div>

      {textPos && (
        <div className="rounded-2xl bg-violet-50/40 dark:bg-violet-900/20 p-2 border border-violet-200/40 space-y-1.5">
          <p className="text-[10px] text-violet-700 dark:text-violet-300">📝 输入文字 ({Math.round(textPos.x)}, {Math.round(textPos.y)})</p>
          <div className="flex gap-1">
            <input value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addText()} placeholder="文字..." className="flex-1 px-2 h-7 rounded bg-white dark:bg-ink-900 text-xs" autoFocus />
            <button onClick={addText} className="px-2 h-7 rounded bg-violet-500 text-white text-xs">确定</button>
            <button onClick={() => { setTextPos(null); setTextInput('') }} className="px-2 h-7 rounded bg-ink-200 dark:bg-ink-800 text-xs">×</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        <button onClick={clear} className="h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" />清空</button>
        <button onClick={saveSketch} className="h-8 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><ImageIcon className="w-3 h-3" />保存</button>
        <button onClick={download} className="h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"><Download className="w-3 h-3" />下载</button>
        <button onClick={runAI} disabled={loading} className="h-8 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiDesc && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed">{aiDesc}</p>
        </div>
      )}

      {sketches.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">我的作品</p>
          <div className="grid grid-cols-3 gap-1.5">
            {sketches.slice(0, 6).map((s) => (
              <div key={s.id} onClick={() => setActiveId(s.id)} className={cn('rounded-lg overflow-hidden cursor-pointer border-2', activeId === s.id ? 'border-violet-500' : 'border-transparent')}>
                {s.thumbnail && <img src={s.thumbnail} alt={s.name} className="w-full aspect-video object-cover" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
