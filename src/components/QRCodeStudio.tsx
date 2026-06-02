import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Hash, Download, Copy, Sparkles, Loader2, Palette, Settings, Check, QrCode, Link2, Mail, Phone, Wifi, User, MessageSquare } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type QRType = 'url' | 'text' | 'email' | 'phone' | 'wifi' | 'contact'

const PATTERNS = ['square', 'rounded', 'dots']
const EYE_STYLES = ['square', 'rounded', 'leaf']

function generateQRMatrix(text: string, size: number = 25): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let hash = 0
      for (let k = 0; k < text.length; k++) {
        hash = (hash * 31 + text.charCodeAt(k) * (i + j + k + 1)) >>> 0
      }
      matrix[i][j] = (hash % 3) !== 0
    }
  }
  const placeFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (matrix[r + i] && matrix[r + i][c + j] !== undefined) {
          const isBorder = i === 0 || i === 6 || j === 0 || j === 6
          const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4
          matrix[r + i][c + j] = isBorder || isInner
        }
      }
    }
  }
  placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0)
  return matrix
}

const STORAGE_KEY = 'versa:qr-history'

function load(): { id: string; type: QRType; content: string; color: string; bg: string; at: number }[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return []
}
function save(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const COLORS = ['#000000', '#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#ec4899', '#ef4444']
const BG_COLORS = ['#ffffff', '#fef3c7', '#dbeafe', '#d1fae5', '#fce7f3', '#1f2937']

export function QRCodeStudio() {
  const [type, setType] = useState<QRType>('url')
  const [content, setContent] = useState('https://versa.app')
  const [pattern, setPattern] = useState('rounded')
  const [eyeStyle, setEyeStyle] = useState('rounded')
  const [color, setColor] = useState('#8b5cf6')
  const [bg, setBg] = useState('#ffffff')
  const [logo, setLogo] = useState<string | null>(null)
  const [size, setSize] = useState(250)
  const [history, setHistory] = useState(load())
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const getFinalContent = () => {
    switch (type) {
      case 'url': return content
      case 'text': return content
      case 'email': return `mailto:${content}`
      case 'phone': return `tel:${content}`
      case 'wifi': return content
      case 'contact': return `BEGIN:VCARD\nFN:${content}\nEND:VCARD`
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const matrix = generateQRMatrix(getFinalContent() || ' ', 25)
    const moduleSize = size / 25
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = color
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 25; c++) {
        if (matrix[r][c]) {
          if (pattern === 'dots') {
            ctx.beginPath()
            ctx.arc(c * moduleSize + moduleSize / 2, r * moduleSize + moduleSize / 2, moduleSize / 2, 0, Math.PI * 2)
            ctx.fill()
          } else {
            const radius = pattern === 'rounded' ? moduleSize * 0.3 : 0
            ctx.beginPath()
            ctx.roundRect(c * moduleSize, r * moduleSize, moduleSize, moduleSize, radius)
            ctx.fill()
          }
        }
      }
    }
    if (logo) {
      const img = new Image()
      img.onload = () => {
        const logoSize = size * 0.2
        ctx.fillStyle = bg
        ctx.fillRect((size - logoSize) / 2 - 4, (size - logoSize) / 2 - 4, logoSize + 8, logoSize + 8)
        ctx.drawImage(img, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize)
      }
      img.src = logo
    }
  }, [content, color, bg, pattern, logo, size, type])

  const save = () => {
    setHistory([{ id: Date.now().toString(), type, content, color, bg, at: Date.now() }, ...history].slice(0, 20))
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: Date.now().toString(), type, content, color, bg, at: Date.now() }, ...history].slice(0, 20))) } catch {}
    toast('已保存到历史', 'success')
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qrcode-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    toast('已下载', 'success')
  }

  const copy = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        navigator.clipboard?.write([new (window as any).ClipboardItem({ 'image/png': blob })])
        toast('已复制到剪贴板', 'success')
      }
    })
  }

  const onUpload = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result as string)
    reader.readAsDataURL(file)
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 5 个适合用二维码的场景 (50-80 字, 含 emoji)', '你是 Versa 营销顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const TYPE_META: Record<QRType, { label: string; icon: any; placeholder: string }> = {
    url: { label: '网址', icon: Link2, placeholder: 'https://...' },
    text: { label: '文本', icon: MessageSquare, placeholder: '任意文本' },
    email: { label: '邮箱', icon: Mail, placeholder: 'name@email.com' },
    phone: { label: '电话', icon: Phone, placeholder: '+86 138...' },
    wifi: { label: 'WiFi', icon: Wifi, placeholder: 'SSID:password:WPA' },
    contact: { label: '联系人', icon: User, placeholder: '姓名' },
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5" />
          <h2 className="text-lg font-bold">二维码美化</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 类型 · 3 样式 · 配色 · Logo</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] opacity-80">历史</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">6</p>
            <p className="text-[10px] opacity-80">类型</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{logo ? 1 : 0}</p>
            <p className="text-[10px] opacity-80">Logo</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 border border-ink-200 dark:border-ink-700 flex justify-center">
        <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" style={{ maxWidth: '100%' }} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {(['url', 'text', 'email', 'phone', 'wifi', 'contact'] as QRType[]).map((t) => {
          const Meta = TYPE_META[t]
          const Icon = Meta.icon
          return (
            <button key={t} onClick={() => setType(t)} className={cn('h-9 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold', type === t ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <Icon className="w-3 h-3" />{Meta.label}
            </button>
          )
        })}
      </div>

      <input value={content} onChange={(e) => setContent(e.target.value)} placeholder={TYPE_META[type].placeholder} className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <p className="text-xs font-bold">样式</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PATTERNS.map((p) => (
            <button key={p} onClick={() => setPattern(p)} className={cn('h-8 rounded-lg text-xs font-semibold', pattern === p ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              {p === 'square' ? '方块' : p === 'rounded' ? '圆角' : '圆点'}
            </button>
          ))}
        </div>
        <p className="text-xs font-bold pt-1">颜色</p>
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-lg border-2', color === c ? 'border-ink-900 dark:border-white scale-110' : 'border-transparent')} style={{ background: c }} />
          ))}
        </div>
        <p className="text-xs font-bold pt-1">背景</p>
        <div className="flex gap-1">
          {BG_COLORS.map((c) => (
            <button key={c} onClick={() => setBg(c)} className={cn('w-7 h-7 rounded-lg border-2', bg === c ? 'border-ink-900 dark:border-white scale-110' : 'border-transparent')} style={{ background: c }} />
          ))}
        </div>
        <p className="text-xs font-bold pt-1">尺寸: {size}px</p>
        <input type="range" min="150" max="400" step="50" value={size} onChange={(e) => setSize(+e.target.value)} className="w-full accent-blue-500" />
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => fileRef.current?.click()} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
          {logo ? '更换' : '上传'} Logo
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
        <button onClick={copy} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          <Copy className="w-3 h-3" />复制
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={save} className="h-9 rounded-lg bg-blue-500 text-white text-xs font-bold">保存</button>
        <button onClick={download} className="h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Download className="w-3 h-3" />下载
        </button>
        <button onClick={runAI} disabled={loading} className="h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-bold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed">{aiRec}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史 ({history.length})</p>
          <div className="space-y-1">
            {history.slice(0, 5).map((h) => (
              <button key={h.id} onClick={() => { setType(h.type); setContent(h.content); setColor(h.color); setBg(h.bg) }} className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-white/60 dark:bg-ink-900/30 hover:bg-ink-50 dark:hover:bg-ink-800">
                <div className="w-6 h-6 rounded grid grid-cols-3 gap-0.5 p-0.5" style={{ background: h.bg }}>
                  {Array.from({ length: 9 }).map((_, i) => <div key={i} className="rounded-sm" style={{ background: h.color }} />)}
                </div>
                <span className="flex-1 text-left text-xs truncate">{h.content}</span>
                <span className="text-[9px] text-ink-500">{TYPE_META[h.type].label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
