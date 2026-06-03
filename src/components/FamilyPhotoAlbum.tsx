import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Plus, Trash2, Sparkles, Loader2, Heart, Tag, Calendar, MapPin, User, Star, ChevronRight } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Photo {
  id: string
  url: string
  title: string
  uploader: string
  tagged: string[]
  date: string
  location: string
  favorite: number
  description: string
  cover: boolean
}

const STORAGE_KEY = 'versa:fam-album-v1'

function load(): Photo[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Photo[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Photo[] {
  return [
    { id: '1', url: 'https://picsum.photos/seed/fam1/800/600', title: '春节家庭聚会', uploader: '爸爸', tagged: ['全家', '奶奶', '小宝'], date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0], location: '家里', favorite: 5, description: '难得的全家福', cover: true },
    { id: '2', url: 'https://picsum.photos/seed/fam2/800/600', title: '小宝生日派对', uploader: '妈妈', tagged: ['小宝', '全家'], date: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0], location: '家', favorite: 8, description: '小宝 6 岁了!', cover: true },
    { id: '3', url: 'https://picsum.photos/seed/fam3/800/600', title: '海边度假', uploader: '爸爸', tagged: ['全家'], date: new Date(Date.now() - 86400000 * 60).toISOString().split('T')[0], location: '三亚', favorite: 3, description: '阳光沙滩', cover: true },
  ]
}

export function FamilyPhotoAlbum() {
  const [photos, setPhotos] = useState<Photo[]>(load())
  const [members, setMembers] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(photos[0]?.id || null)
  const [filter, setFilter] = useState<'all' | 'fav' | 'recent'>('all')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [uploader, setUploader] = useState('')
  const [tagged, setTagged] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    save(photos)
    try {
      const fam = JSON.parse(localStorage.getItem('versa:family-v1') || '[]')
      setMembers(Array.from(new Set(fam.map((m: any) => m.name))))
    } catch {}
  }, [photos])

  const total = photos.length
  const totalFavs = photos.reduce((s, p) => s + p.favorite, 0)
  const allTags = Array.from(new Set(photos.flatMap((p) => p.tagged)))
  const active = photos.find((p) => p.id === activeId)

  const filtered = photos.filter((p) => {
    if (filter === 'fav') return p.favorite > 0
    if (filter === 'recent') {
      const week = 7 * 86400000
      return Date.now() - new Date(p.date).getTime() < week
    }
    return true
  })

  const add = () => {
    if (!url.trim() || !title.trim()) { toast('请填写', 'error'); return }
    const p: Photo = { id: uid(), url, title, uploader, tagged, date: new Date().toISOString().split('T')[0], location, favorite: 0, description, cover: false }
    setPhotos([p, ...photos])
    setActiveId(p.id)
    setUrl(''); setTitle(''); setLocation(''); setDescription(''); setTagged([])
    setAdding(false)
    toast('已上传', 'success')
  }

  const remove = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id))
    if (activeId === id) setActiveId(photos[0]?.id || null)
  }

  const like = (id: string) => setPhotos(photos.map((p) => p.id === id ? { ...p, favorite: p.favorite + 1 } : p))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭相册 ${total} 张照片, 标签: ${allTags.slice(0, 5).join('、')}. 写一段 60 字内温馨家庭回忆, 中文`, '你是 Versa 家庭作家, 温馨, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭相册</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">图片标签 · 人物标记 · 收藏</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">照片</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{totalFavs}</p>
            <p className="text-[9px] opacity-80">喜欢</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{allTags.length}</p>
            <p className="text-[9px] opacity-80">标签</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{new Set(photos.map((p) => p.uploader)).size}</p>
            <p className="text-[9px] opacity-80">上传者</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />上传照片
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-pink-50/40 dark:bg-pink-900/20 rounded-xl p-2 border border-pink-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'recent', 'fav'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'recent' ? '🕒 最近' : '❤️ 收藏'}
          </button>
        ))}
      </div>

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-48">
            <img src={active.url} alt={active.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <p className="text-base font-bold">{active.title}</p>
              <p className="text-[10px] opacity-90 flex items-center gap-1.5 mt-0.5">
                <User className="w-3 h-3" />{active.uploader}
                <span>·</span>
                <Calendar className="w-3 h-3" />{active.date}
                {active.location && <><span>·</span><MapPin className="w-3 h-3" />{active.location}</>}
              </p>
            </div>
            <button onClick={() => like(active.id)} className="absolute top-2 right-12 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Heart className={cn('w-4 h-4', active.favorite > 0 && 'fill-rose-500 text-rose-500')} />
            </button>
            <button onClick={() => remove(active.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-xs">×</button>
          </div>
          {active.description && <p className="p-2 text-[10px] text-ink-500">💭 {active.description}</p>}
          {active.tagged.length > 0 && (
            <div className="px-2 pb-2 flex flex-wrap gap-1">
              {active.tagged.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[9px] font-semibold">
                  👤 {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {filtered.filter((p) => p.id !== activeId).map((p) => (
          <motion.div key={p.id} whileHover={{ y: -1 }} onClick={() => setActiveId(p.id)} className="rounded-xl overflow-hidden bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
            <div className="relative aspect-square">
              <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-1 left-1 right-1 text-white text-[10px] font-bold truncate">{p.title}</p>
              {p.favorite > 0 && <Heart className="absolute top-1 right-1 w-3 h-3 fill-rose-500 text-rose-500" />}
            </div>
          </motion.div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">上传照片</h3>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="图片 URL" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            {url && <img src={url} alt="preview" className="w-full h-32 rounded-lg object-cover" />}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={uploader} onChange={(e) => setUploader(e.target.value)} placeholder="上传者" list="members" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <datalist id="members">{members.map((m) => <option key={m} value={m} />)}</datalist>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地点" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">标记人物</p>
              <div className="flex flex-wrap gap-1">
                {members.map((m) => (
                  <button key={m} onClick={() => setTagged(tagged.includes(m) ? tagged.filter((x) => x !== m) : [...tagged, m])} className={cn('px-2 h-7 rounded-full text-[10px] font-semibold', tagged.includes(m) ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold">上传</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
