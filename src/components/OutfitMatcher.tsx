import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shirt, Sparkles, Loader2, Check, X, RefreshCw, Heart, ShoppingBag } from 'lucide-react'
import { products } from '../data/products'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface OutfitItem {
  id: string
  productId: string
  category: 'top' | 'bottom' | 'shoes' | 'accessory'
  reason: string
}

const STORAGE_KEY = 'versa:outfits'
const SCENARIOS = ['日常通勤', '约会', '运动健身', '商务会议', '周末出游', '派对']

const CATEGORY_LABEL = {
  top: '上装', bottom: '下装', shoes: '鞋履', accessory: '配饰',
} as const

const CATEGORY_COLOR = {
  top: 'from-rose-500 to-pink-500',
  bottom: 'from-blue-500 to-indigo-500',
  shoes: 'from-amber-500 to-orange-500',
  accessory: 'from-violet-500 to-purple-500',
} as const

const SEED_OUTFITS: { id: string; name: string; scenario: string; items: OutfitItem[] }[] = [
  { id: 'o1', name: '夏日清新风', scenario: '日常通勤', items: [
    { id: 'i1', productId: 'p3', category: 'top', reason: '清爽白色 T 恤' },
    { id: 'i2', productId: 'p5', category: 'bottom', reason: '直筒牛仔裤' },
    { id: 'i3', productId: 'p8', category: 'shoes', reason: '白色运动鞋' },
  ]},
  { id: 'o2', name: '商务精英', scenario: '商务会议', items: [
    { id: 'i4', productId: 'p6', category: 'top', reason: '修身西装外套' },
    { id: 'i5', productId: 'p7', category: 'bottom', reason: '西裤' },
    { id: 'i6', productId: 'p9', category: 'shoes', reason: '牛津皮鞋' },
  ]},
]

type Outfit = { id: string; name: string; scenario: string; items: OutfitItem[] }

function load(): Outfit[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED_OUTFITS }
function save(d: Outfit[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function OutfitMatcher() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [generating, setGenerating] = useState(false)

  useEffect(() => { setOutfits(load()) }, [])

  const generate = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setGenerating(true)
    try {
      const productList = products.slice(0, 10).map((p) => `${p.name} (id: ${p.id})`).join('; ')
      const result = await aiComplete(
        `从商品: ${productList} 中为「${scenario}」场景挑 4 件搭配 (上装/下装/鞋履/配饰, 任意一可同)。返回 JSON: [{"category":"top","productId":"p3","reason":"清爽白T"},{"category":"bottom","productId":"p5","reason":"直筒牛仔裤"},{"category":"shoes","productId":"p8","reason":"白色运动鞋"}]`,
        '你是 Versa 搭配师, 严格返回 JSON 数组, 中文'
      )
      const json = result.match(/\[[\s\S]*\]/)?.[0]
      if (json) {
        const items: OutfitItem[] = JSON.parse(json)
        if (items.length >= 3) {
          const outfit = { id: 'o' + Date.now(), name: scenario + '风格', scenario, items }
          const next = [outfit, ...outfits]
          setOutfits(next)
          save(next)
          toast('搭配已生成', 'success')
        } else { toast('AI 返回格式有误', 'error') }
      } else { toast('AI 返回格式有误', 'error') }
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setGenerating(false) }
  }

  const getProduct = (id: string) => products.find((p) => p.id === id)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Shirt className="w-5 h-5" />
          <h2 className="text-lg font-bold">AI 搭配</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">一键生成场景化穿搭</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', scenario === s ? 'bg-white text-rose-500' : 'bg-white/20 text-white')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={generating} className="w-full h-10 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold flex items-center justify-center gap-1.5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? 'AI 正在为你搭配...' : `生成「${scenario}」搭配`}
      </button>

      <div className="space-y-3">
        {outfits.map((o) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold">{o.name}</p>
                <p className="text-[10px] text-ink-500">{o.scenario} · {o.items.length} 件单品</p>
              </div>
              <button className="text-ink-400 hover:text-rose-500"><Heart className="w-3.5 h-3.5" /></button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {o.items.map((item) => {
                const p = getProduct(item.productId)
                return (
                  <div key={item.id} className="space-y-1">
                    <div className={cn('aspect-square rounded-xl overflow-hidden bg-gradient-to-br', CATEGORY_COLOR[item.category])}>
                      {p ? (
                        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">{CATEGORY_LABEL[item.category][0]}</div>
                      )}
                    </div>
                    <p className="text-[9px] text-center text-ink-500 leading-tight">{CATEGORY_LABEL[item.category]}</p>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-ink-600 dark:text-ink-400 mt-2 leading-relaxed">
              <Sparkles className="inline w-3 h-3 text-rose-500 mr-1" />
              {o.items[0].reason} + {o.items.find((i) => i.category === 'bottom')?.reason || '...'}, 整体协调有型
            </p>

            <div className="flex gap-1.5 mt-2">
              <Link to="/shop" className="flex-1 h-7 rounded-lg bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                <ShoppingBag className="w-3 h-3" />查看单品
              </Link>
              <button className="h-7 px-2 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-0.5">
                <RefreshCw className="w-3 h-3" />换一批
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
