import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Sparkles, Loader2, Plus, Download, Share2, Type, Smile, Hash, Star, Copy, Check } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

const TEMPLATES = [
  { id: 't1', name: '经典白字', top: '经典', style: 'classic-white', emoji: '✨' },
  { id: 't2', name: '黑底彩字', top: '高对比', style: 'dark-color', emoji: '🖤' },
  { id: 't3', name: '渐变爆款', top: '爆款', style: 'gradient', emoji: '🌈' },
  { id: 't4', name: '古风', top: '古风', style: 'chinese', emoji: '🏮' },
  { id: 't5', name: '极简', top: '极简', style: 'minimal', emoji: '◽' },
  { id: 't6', name: '动漫', top: '动漫', style: 'anime', emoji: '🌸' },
]

const STYLES: Record<string, { bg: string; color: string; font: string; border?: string }> = {
  'classic-white': { bg: 'bg-white', color: 'text-ink-900', font: 'font-bold' },
  'dark-color': { bg: 'bg-slate-900', color: 'text-amber-400', font: 'font-black' },
  'gradient': { bg: 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500', color: 'text-white', font: 'font-black' },
  'chinese': { bg: 'bg-gradient-to-br from-red-700 to-amber-600', color: 'text-amber-100', font: 'font-serif' },
  'minimal': { bg: 'bg-ink-100', color: 'text-ink-900', font: 'font-light' },
  'anime': { bg: 'bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-300', color: 'text-pink-900', font: 'font-black' },
}

interface Meme {
  id: string
  template: string
  top: string
  bottom: string
  image?: string
  at: number
  favorite: boolean
}

const STORAGE_KEY = 'versa:memes'

function load(): Meme[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Meme[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function MemeGenerator() {
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [top, setTop] = useState('当你打开 Versa')
  const [bottom, setBottom] = useState('发现 8 大新功能')
  const [memes, setMemes] = useState<Meme[]>(load())
  const [aiSuggest, setAiSuggest] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => { save(memes) }, [memes])

  const addMeme = () => {
    const m: Meme = { id: uid(), template: template.id, top, bottom, image: imageUrl || undefined, at: Date.now(), favorite: false }
    setMemes([m, ...memes])
    toast('已生成', 'success')
  }

  const remove = (id: string) => setMemes(memes.filter((m) => m.id !== id))
  const toggleFav = (id: string) => setMemes(memes.map((m) => m.id === id ? { ...m, favorite: !m.favorite } : m))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 个当下热门的中文表情包文案 (各 2 句, 上下格式, 50-80 字)', '你是 Versa 表情包文案, 幽默有梗, 中文')
      setAiSuggest(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const copyText = () => {
    navigator.clipboard?.writeText(`${top}\n${bottom}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast('已复制文案', 'success')
  }

  const download = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 500; canvas.height = 500
    const ctx = canvas.getContext('2d')!
    const style = STYLES[template.style]
    if (style.bg.startsWith('bg-gradient')) {
      const grad = ctx.createLinearGradient(0, 0, 500, 500)
      if (template.style === 'gradient') {
        grad.addColorStop(0, '#ec4899'); grad.addColorStop(0.5, '#ef4444'); grad.addColorStop(1, '#eab308')
      } else if (template.style === 'chinese') {
        grad.addColorStop(0, '#b91c1c'); grad.addColorStop(1, '#d97706')
      } else {
        grad.addColorStop(0, '#fbcfe8'); grad.addColorStop(0.5, '#d8b4fe'); grad.addColorStop(1, '#a5b4fc')
      }
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = style.bg === 'bg-white' ? '#fff' : style.bg === 'bg-slate-900' ? '#0f172a' : style.bg === 'bg-ink-100' ? '#f3f4f6' : '#fff'
    }
    ctx.fillRect(0, 0, 500, 500)
    if (imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.globalAlpha = 0.4
        ctx.drawImage(img, 0, 0, 500, 500)
        ctx.globalAlpha = 1
        drawText()
      }
      img.src = imageUrl
    } else {
      drawText()
    }
    function drawText() {
      const colorMap: Record<string, string> = { 'text-ink-900': '#0a0a0a', 'text-amber-400': '#fbbf24', 'text-white': '#fff', 'text-amber-100': '#fef3c7', 'text-pink-900': '#831843' }
      ctx.fillStyle = colorMap[style.color] || '#000'
      ctx.font = `bold 36px sans-serif`
      ctx.textAlign = 'center'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 4
      ctx.strokeText(top, 250, 100)
      ctx.fillText(top, 250, 100)
      ctx.strokeText(bottom, 250, 450)
      ctx.fillText(bottom, 250, 450)
      const link = document.createElement('a')
      link.download = `meme-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast('已下载', 'success')
    }
  }

  const StylePreview = () => {
    const style = STYLES[template.style]
    return (
      <div className={cn('aspect-square w-full rounded-2xl flex flex-col items-center justify-between p-4', style.bg, style.color, style.font)}>
        <p className="text-base sm:text-xl text-center break-words" style={{ WebkitTextStroke: style.bg.includes('white') || style.bg.includes('ink-100') ? '0' : '1px rgba(0,0,0,0.4)' }}>{top || '顶部文字'}</p>
        {imageUrl && <img src={imageUrl} alt="" className="max-h-32 max-w-full rounded object-cover opacity-70" />}
        <p className="text-base sm:text-xl text-center break-words" style={{ WebkitTextStroke: style.bg.includes('white') || style.bg.includes('ink-100') ? '0' : '1px rgba(0,0,0,0.4)' }}>{bottom || '底部文字'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Smile className="w-5 h-5" />
          <h2 className="text-lg font-bold">表情包生成</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 模板 · 文字 · AI 文案</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{memes.length}</p>
            <p className="text-[10px] opacity-80">已生成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{TEMPLATES.length}</p>
            <p className="text-[10px] opacity-80">模板</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{memes.filter((m) => m.favorite).length}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 border border-ink-200">
        <StylePreview />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => setTemplate(t)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center gap-0.5', template.id === t.id ? `bg-gradient-to-br ${STYLES[t.style].bg.replace('bg-', 'from-').split(' ')[0]} text-white ring-2 ring-rose-500` : 'bg-ink-100 dark:bg-ink-800')}>
            <span className="text-base">{t.emoji}</span>
            <span className="text-[9px] font-semibold">{t.name}</span>
          </button>
        ))}
      </div>

      <input value={top} onChange={(e) => setTop(e.target.value)} placeholder="顶部文字" className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      <input value={bottom} onChange={(e) => setBottom(e.target.value)} placeholder="底部文字" className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="背景图 URL (可选)" className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 文案
        </button>
        <button onClick={copyText} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}复制
        </button>
      </div>

      {aiSuggest && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiSuggest}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={addMeme} className="h-10 rounded-lg bg-rose-500 text-white text-sm font-bold flex items-center justify-center gap-1">
          <Plus className="w-4 h-4" />保存到画廊
        </button>
        <button onClick={download} className="h-10 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-1">
          <Download className="w-4 h-4" />下载图片
        </button>
      </div>

      {memes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">我的表情包</p>
          <div className="grid grid-cols-2 gap-1.5">
            {memes.slice(0, 6).map((m) => {
              const t = TEMPLATES.find((x) => x.id === m.template)!
              const s = STYLES[t.style]
              return (
                <div key={m.id} className={cn('rounded-2xl p-3 aspect-square flex flex-col items-center justify-between', s.bg, s.color, s.font)}>
                  <p className="text-xs text-center line-clamp-2">{m.top}</p>
                  <p className="text-xs text-center line-clamp-2">{m.bottom}</p>
                  <div className="flex gap-0.5 w-full">
                    <button onClick={() => toggleFav(m.id)} className="flex-1 h-5 rounded bg-white/30 text-[8px]">{m.favorite ? '⭐' : '☆'}</button>
                    <button onClick={() => remove(m.id)} className="flex-1 h-5 rounded bg-white/30 text-[8px]">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
