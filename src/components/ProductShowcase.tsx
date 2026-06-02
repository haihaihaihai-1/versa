import { useState, useEffect } from 'react'
import { motion, Reorder } from 'framer-motion'
import { LayoutGrid, Plus, Trash2, GripVertical, Eye, Save, Download, Upload, Monitor, Smartphone, Type, Image as ImageIcon, Heart, ShoppingBag, Sparkles, Loader2 } from 'lucide-react'
import { products } from '../data/products'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type BlockType = 'banner' | 'product' | 'category' | 'title' | 'text' | 'video' | 'divider' | 'spacer'

interface Block {
  id: string
  type: BlockType
  content: string
  productId?: string
  size: 'sm' | 'md' | 'lg'
  bg?: string
}

const STORAGE_KEY = 'versa:showcase'

interface Showcase {
  name: string
  blocks: Block[]
  published: boolean
  views: number
}

function load(): Showcase {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return {
    name: '我的精选橱窗',
    blocks: [
      { id: uid(), type: 'banner', content: '618 精选好物', size: 'lg' },
      { id: uid(), type: 'title', content: '人气 TOP 5', size: 'md' },
      { id: uid(), type: 'product', content: 'p1', productId: 'p1', size: 'md' },
      { id: uid(), type: 'product', content: 'p2', productId: 'p2', size: 'md' },
      { id: uid(), type: 'divider', content: '', size: 'sm' },
      { id: uid(), type: 'text', content: '全部包邮 · 7 天无理由', size: 'sm' },
    ],
    published: false, views: 0,
  }
}
function save(d: Showcase) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  banner: { label: '横幅', icon: ImageIcon, color: 'bg-violet-500', emoji: '🖼️' },
  product: { label: '商品', icon: ShoppingBag, color: 'bg-emerald-500', emoji: '🛍️' },
  category: { label: '类目', icon: LayoutGrid, color: 'bg-blue-500', emoji: '📂' },
  title: { label: '标题', icon: Type, color: 'bg-rose-500', emoji: '📌' },
  text: { label: '文本', icon: Type, color: 'bg-ink-500', emoji: '📝' },
  video: { label: '视频', icon: Monitor, color: 'bg-amber-500', emoji: '🎬' },
  divider: { label: '分割线', icon: LayoutGrid, color: 'bg-ink-400', emoji: '➖' },
  spacer: { label: '间距', icon: LayoutGrid, color: 'bg-ink-300', emoji: '⬜' },
} as const

export function ProductShowcase() {
  const [showcase, setShowcase] = useState<Showcase>(load())
  const [view, setView] = useState<'mobile' | 'desktop'>('mobile')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [aiSuggest, setAiSuggest] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(showcase) }, [showcase])

  const addBlock = (type: BlockType) => {
    const block: Block = { id: uid(), type, content: type === 'title' ? '新标题' : type === 'text' ? '说明文字' : type === 'divider' ? '' : type === 'spacer' ? '' : '', size: 'md' }
    if (type === 'product' && products[0]) block.productId = products[0].id
    setShowcase({ ...showcase, blocks: [...showcase.blocks, block] })
  }

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setShowcase({ ...showcase, blocks: showcase.blocks.map((b) => b.id === id ? { ...b, ...patch } : b) })
  }

  const removeBlock = (id: string) => {
    setShowcase({ ...showcase, blocks: showcase.blocks.filter((b) => b.id !== id) })
  }

  const publish = () => {
    setShowcase({ ...showcase, published: !showcase.published, views: showcase.published ? showcase.views : showcase.views + Math.floor(Math.random() * 200) })
    toast(showcase.published ? '已取消发布' : '已发布', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为商品橱窗推荐 5 个最佳内容布局顺序 (50-80 字), 适合 618 大促', '你是 Versa 橱窗设计师, 简洁专业, 中文')
      setAiSuggest(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const autoArrange = () => {
    const order: BlockType[] = ['banner', 'title', 'product', 'product', 'product', 'divider', 'text']
    const sorted = order.map((t) => showcase.blocks.find((b) => b.type === t)).filter(Boolean) as Block[]
    setShowcase({ ...showcase, blocks: sorted })
    toast('已自动排序', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="w-5 h-5" />
          <h2 className="text-lg font-bold">商品橱窗编辑</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">可视化拖拽 · 实时预览</p>
        <input
          value={showcase.name}
          onChange={(e) => setShowcase({ ...showcase, name: e.target.value })}
          className="w-full px-3 h-9 rounded-lg bg-white/15 backdrop-blur text-sm placeholder-white/60 outline-none focus:bg-white/25"
          placeholder="橱窗名称"
        />
      </div>

      <div className="flex gap-1.5">
        <button onClick={autoArrange} className="flex-1 h-8 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />智能排序
        </button>
        <button onClick={publish} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1', showcase.published ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
          {showcase.published ? '✓ 已发布' : '发布'}
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiSuggest && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 建议</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiSuggest}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
          const Meta = TYPE_META[k]
          return (
            <button key={k} onClick={() => addBlock(k)} className="px-2 h-8 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-[10px] font-semibold flex items-center gap-1 flex-shrink-0">
              <span>{Meta.emoji}</span>{Meta.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 mb-1">
        <button onClick={() => setView('mobile')} className={cn('px-2.5 h-7 rounded-lg text-[10px] font-semibold flex items-center gap-1', view === 'mobile' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          <Smartphone className="w-3 h-3" />手机
        </button>
        <button onClick={() => setView('desktop')} className={cn('px-2.5 h-7 rounded-lg text-[10px] font-semibold flex items-center gap-1', view === 'desktop' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          <Monitor className="w-3 h-3" />桌面
        </button>
        <span className="text-[10px] text-ink-500 ml-auto">{showcase.blocks.length} 块 · {showcase.views} 浏览</span>
      </div>

      <div className={cn('mx-auto rounded-2xl border-2 border-dashed border-ink-300 dark:border-ink-700 overflow-hidden', view === 'mobile' ? 'max-w-sm' : 'max-w-2xl')}>
        <Reorder.Group axis="y" values={showcase.blocks} onReorder={(newOrder) => setShowcase({ ...showcase, blocks: newOrder })} className="bg-white dark:bg-ink-900">
          {showcase.blocks.map((b) => {
            const Meta = TYPE_META[b.type]
            const product = b.type === 'product' && b.productId ? products.find((p) => p.id === b.productId) : null
            return (
              <Reorder.Item key={b.id} value={b} className="border-b border-ink-200/40 dark:border-ink-800/40 group">
                <div className="flex items-center gap-1.5 p-1.5 bg-ink-50/50 dark:bg-ink-800/30 opacity-0 group-hover:opacity-100 transition">
                  <GripVertical className="w-3 h-3 text-ink-400" />
                  <span className="text-[10px] font-mono text-ink-500 flex-1">{Meta.label}</span>
                  <button onClick={() => setEditingId(editingId === b.id ? null : b.id)} className="text-[10px] text-violet-500 font-bold">编辑</button>
                  <button onClick={() => removeBlock(b.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                </div>
                <div className={cn('p-3', b.size === 'lg' ? 'min-h-[120px]' : b.size === 'sm' ? 'min-h-[40px]' : 'min-h-[80px]')}>
                  {b.type === 'banner' && (
                    <div className="rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 p-6 text-white text-center">
                      <p className="text-xl font-bold">{b.content || '横幅标题'}</p>
                    </div>
                  )}
                  {b.type === 'title' && <p className={cn('font-bold', b.size === 'lg' ? 'text-2xl' : b.size === 'sm' ? 'text-sm' : 'text-lg')}>{b.content || '标题'}</p>}
                  {b.type === 'text' && <p className={cn('text-ink-600 dark:text-ink-400', b.size === 'lg' ? 'text-base' : b.size === 'sm' ? 'text-[10px]' : 'text-sm')}>{b.content || '文本'}</p>}
                  {b.type === 'divider' && <div className="h-px bg-ink-200 dark:bg-ink-700" />}
                  {b.type === 'spacer' && <div className="bg-ink-100/30 dark:bg-ink-800/30 rounded" style={{ height: 40 }} />}
                  {b.type === 'product' && product && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-ink-50/30 dark:bg-ink-800/20">
                      <img src={product.images?.[0]} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{product.name}</p>
                        <p className="text-base font-bold text-rose-500">¥{product.price}</p>
                      </div>
                    </div>
                  )}
                  {b.type === 'category' && <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center text-blue-600 dark:text-blue-400 text-sm font-bold">{b.content || '类目名'}</div>}
                  {b.type === 'video' && <div className="aspect-video rounded-xl bg-ink-200 dark:bg-ink-800 flex items-center justify-center text-ink-500"><Monitor className="w-8 h-8" /></div>}
                </div>
                {editingId === b.id && (
                  <div className="p-2 bg-ink-50/50 dark:bg-ink-800/30 space-y-1.5">
                    {b.type !== 'divider' && b.type !== 'spacer' && b.type !== 'video' && (
                      <input value={b.content} onChange={(e) => updateBlock(b.id, { content: e.target.value })} placeholder="内容" className="w-full px-2 h-7 rounded bg-white dark:bg-ink-900 text-xs outline-none" />
                    )}
                    {b.type === 'product' && (
                      <select value={b.productId} onChange={(e) => updateBlock(b.id, { productId: e.target.value })} className="w-full px-2 h-7 rounded bg-white dark:bg-ink-900 text-xs outline-none">
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    <div className="flex gap-1">
                      {(['sm', 'md', 'lg'] as const).map((s) => (
                        <button key={s} onClick={() => updateBlock(b.id, { size: s })} className={cn('flex-1 h-6 text-[10px] font-semibold rounded', b.size === s ? 'bg-violet-500 text-white' : 'bg-white dark:bg-ink-900')}>{s.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                )}
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      </div>
    </div>
  )
}
