import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Languages, Plus, Trash2, Sparkles, Loader2, Search, Volume2, Star, MessageCircle, Coffee, ShoppingBag, MapPin, AlertCircle, Plane, Utensils, Camera } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Phrase {
  id: string
  lang: string
  flag: string
  original: string
  translation: string
  pronunciation: string
  category: 'greeting' | 'food' | 'shop' | 'direction' | 'emergency' | 'travel' | 'sight' | 'other'
  favorite: boolean
}

const STORAGE_KEY = 'versa:phrases-v1'

function load(): Phrase[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Phrase[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Phrase[] {
  return [
    { id: '1', lang: '日语', flag: '🇯🇵', original: 'こんにちは', translation: '你好', pronunciation: 'Kon-ni-chi-wa', category: 'greeting', favorite: true },
    { id: '2', lang: '日语', flag: '🇯🇵', original: 'ありがとうございます', translation: '谢谢', pronunciation: 'A-ri-ga-tou go-za-i-ma-su', category: 'other', favorite: true },
    { id: '3', lang: '日语', flag: '🇯🇵', original: 'いくらですか?', translation: '多少钱?', pronunciation: 'I-ku-ra de-su-ka', category: 'shop', favorite: false },
    { id: '4', lang: '日语', flag: '🇯🇵', original: '駅はどこですか?', translation: '车站在哪里?', pronunciation: 'E-ki wa do-ko de-su-ka', category: 'direction', favorite: false },
    { id: '5', lang: '日语', flag: '🇯🇵', original: '助けてください', translation: '请帮帮我', pronunciation: 'Ta-su-ke-te ku-da-sa-i', category: 'emergency', favorite: true },
    { id: '6', lang: '韩语', flag: '🇰🇷', original: '안녕하세요', translation: '你好', pronunciation: 'An-nyeong-ha-se-yo', category: 'greeting', favorite: true },
    { id: '7', lang: '英语', flag: '🇺🇸', original: 'Excuse me', translation: '打扰一下', pronunciation: 'Ex-cuse me', category: 'other', favorite: false },
    { id: '8', lang: '英语', flag: '🇺🇸', original: 'How much?', translation: '多少钱?', pronunciation: 'How much?', category: 'shop', favorite: true },
  ]
}

const CAT_META = {
  greeting: { label: '问候', icon: MessageCircle, color: 'from-amber-500 to-orange-500' },
  food: { label: '餐饮', icon: Utensils, color: 'from-rose-500 to-pink-500' },
  shop: { label: '购物', icon: ShoppingBag, color: 'from-pink-500 to-fuchsia-500' },
  direction: { label: '问路', icon: MapPin, color: 'from-blue-500 to-cyan-500' },
  emergency: { label: '紧急', icon: AlertCircle, color: 'from-red-500 to-rose-600' },
  travel: { label: '交通', icon: Plane, color: 'from-violet-500 to-purple-500' },
  sight: { label: '景点', icon: Camera, color: 'from-emerald-500 to-teal-500' },
  other: { label: '其他', icon: Coffee, color: 'from-ink-500 to-ink-600' },
} as const

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 660
    g.gain.setValueAtTime(0.08, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    o.start(); o.stop(ctx.currentTime + 0.15)
  } catch {}
}

export function LanguagePhrases() {
  const [items, setItems] = useState<Phrase[]>(load())
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<Phrase['category'] | 'all' | 'fav'>('all')
  const [filterLang, setFilterLang] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState('日语')
  const [flag, setFlag] = useState('🇯🇵')
  const [original, setOriginal] = useState('')
  const [translation, setTranslation] = useState('')
  const [pronunciation, setPronunciation] = useState('')
  const [cat, setCat] = useState<Phrase['category']>('greeting')

  useEffect(() => { save(items) }, [items])

  const langs = Array.from(new Set(items.map((i) => i.lang)))
  const langEmoji: { [k: string]: string } = { 日语: '🇯🇵', 韩语: '🇰🇷', 英语: '🇺🇸', 法语: '🇫🇷', 德语: '🇩🇪', 西班牙语: '🇪🇸', 泰语: '🇹🇭', 越南语: '🇻🇳' }

  const filtered = items.filter((i) => {
    if (filterCat === 'fav' && !i.favorite) return false
    if (filterCat !== 'all' && filterCat !== 'fav' && i.category !== filterCat) return false
    if (filterLang !== 'all' && i.lang !== filterLang) return false
    if (search && !i.original.includes(search) && !i.translation.includes(search)) return false
    return true
  })

  const add = () => {
    if (!original.trim() || !translation.trim()) { toast('请填写', 'error'); return }
    const p: Phrase = { id: uid(), lang, flag: langEmoji[lang] || flag, original, translation, pronunciation, category: cat, favorite: false }
    setItems([p, ...items])
    setOriginal(''); setTranslation(''); setPronunciation('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const toggleFav = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, favorite: !i.favorite } : i))
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))
  const speak = (text: string) => {
    playBeep()
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'; u.rate = 0.8
        window.speechSynthesis.speak(u)
      }
    } catch {}
    toast('🔊', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`生成 5 个旅行日语常用短语, 格式: "原文 | 翻译 | 假名/罗马音" 每行 1 个, 不要编号`, '你是 Versa 旅行翻译, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-5 h-5" />
          <h2 className="text-lg font-bold">旅行短语</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多语言 · 分类速查 · 收藏常用</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{items.length}</p>
            <p className="text-[9px] opacity-80">短语</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{langs.length}</p>
            <p className="text-[9px] opacity-80">语言</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{items.filter((i) => i.favorite).length}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Object.keys(CAT_META).length}</p>
            <p className="text-[9px] opacity-80">类别</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索短语..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
        </div>
        <button onClick={() => setAdding(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </button>
      </div>

      {aiTip && (
        <div className="bg-pink-50/40 dark:bg-pink-900/20 rounded-xl p-2 border border-pink-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'fav', ...Object.keys(CAT_META)] as const).map((c) => (
          <button key={c} onClick={() => setFilterCat(c as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-s-shrink-0 whitespace-nowrap', filterCat === c ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {c === 'all' ? '全部' : c === 'fav' ? '⭐ 收藏' : CAT_META[c as Phrase['category']].label}
          </button>
        ))}
      </div>

      {langs.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setFilterLang('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filterLang === 'all' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部语言</button>
          {langs.map((l) => (
            <button key={l} onClick={() => setFilterLang(l)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filterLang === l ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{langEmoji[l] || '🌐'} {l}</button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Languages className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有短语</p>
          </div>
        ) : filtered.map((p) => {
          const M = CAT_META[p.category]
          return (
            <motion.div key={p.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white', M.color)}>
                  <M.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-base">{p.flag}</span>
                    <p className="text-sm font-bold truncate">{p.original}</p>
                  </div>
                  <p className="text-[10px] text-ink-500">{p.translation}</p>
                  {p.pronunciation && <p className="text-[9px] text-pink-500 italic">[{p.pronunciation}]</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => speak(p.original)} className="w-7 h-7 rounded bg-pink-500 text-white flex items-center justify-center">
                    <Volume2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => toggleFav(p.id)} className={cn('w-7 h-7 rounded flex items-center justify-center', p.favorite ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    <Star className={cn('w-3 h-3', p.favorite && 'fill-current')} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加短语</h3>
            <input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="语言" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="原文" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="翻译" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="发音/拼音 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                const M = CAT_META[k]
                return (
                  <button key={k} onClick={() => setCat(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', cat === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <M.icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] mt-0.5">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
