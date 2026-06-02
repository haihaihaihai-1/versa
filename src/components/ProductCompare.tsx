import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, Plus, X, Check, Star, Loader2, Award } from 'lucide-react'
import { products } from '../data/products'
import { cn, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:product-compare'

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function save(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}

export function ProductCompare() {
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<typeof products>([])
  const [pickOpen, setPickOpen] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSelected(load())
  }, [])

  useEffect(() => { save(selected) }, [selected])

  useEffect(() => {
    if (search) {
      setSearchResults(products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())).slice(0, 6))
    } else {
      setSearchResults([])
    }
  }, [search])

  const add = (id: string) => {
    if (selected.length >= 4) { toast('最多比较 4 个商品', 'error'); return }
    if (!selected.includes(id)) setSelected([...selected, id])
    setSearch('')
  }

  const remove = (id: string) => {
    setSelected(selected.filter((s) => s !== id))
  }

  const compareItems = selected.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products
  const best = compareItems.length > 0 ? compareItems.reduce((b, p) => p.rating > b.rating ? p : b) : null
  const cheapest = compareItems.length > 0 ? compareItems.reduce((c, p) => p.price < c.price ? p : c) : null

  const analyze = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    if (compareItems.length < 2) { toast('至少选 2 个商品', 'error'); return }
    setLoading(true)
    setAnalysis('')
    try {
      const result = await aiComplete(
        `请对比以下 ${compareItems.length} 个商品, 给出推荐 (按场景分, 100-200 字):\n${compareItems.map((p) => `- ${p.name} ¥${p.price} 评分 ${p.rating}`).join('\n')}`,
        '你是 Versa 比价助手, 客观比较商品, 中文回答'
      )
      setAnalysis(result)
    } catch (e: any) {
      toast(e?.message || '分析失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const SPEC_ROWS = [
    { key: 'price', label: '价格', format: (v: any) => `¥${v}` },
    { key: 'originalPrice', label: '原价', format: (v: any) => v ? `¥${v}` : '-' },
    { key: 'brand', label: '品牌', format: (v: any) => v },
    { key: 'category', label: '分类', format: (v: any) => v },
    { key: 'rating', label: '评分', format: (v: any) => `★ ${v}` },
    { key: 'reviewCount', label: '评价数', format: (v: any) => v.toLocaleString() },
    { key: 'stock', label: '库存', format: (v: any) => v },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-nova-500" />商品对比
          <span className="text-xs text-ink-500 font-normal">{selected.length}/4</span>
        </h2>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="text-xs text-ink-500 hover:text-rose-500">清空</button>
        )}
      </div>

      {selected.length < 4 && (
        <button
          onClick={() => setPickOpen(true)}
          className="w-full h-10 rounded-xl border-2 border-dashed border-nova-300 text-nova-500 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-nova-50 dark:hover:bg-nova-900/20"
        >
          <Plus className="w-4 h-4" />添加商品
        </button>
      )}

      {compareItems.length === 0 ? (
        <div className="text-center py-12 text-ink-500 bg-white/60 dark:bg-ink-900/30 rounded-2xl">
          <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>添加 2-4 个商品开始对比</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs text-ink-500">对比项</th>
                  {compareItems.map((p) => (
                    <th key={p.id} className="p-2 min-w-32">
                      <div className="relative">
                        <button onClick={() => remove(p.id)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                        <Link to={`/shop/product/${p.id}`}>
                          <img src={p.images?.[0]} alt={p.name} className="w-16 h-16 mx-auto rounded-lg object-cover" />
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SPEC_ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="p-2 text-xs text-ink-500">{row.label}</td>
                    {compareItems.map((p) => {
                      const value = (p as any)[row.key]
                      const isBest = row.key === 'price' ? p.id === cheapest?.id : row.key === 'rating' ? p.id === best?.id : false
                      return (
                        <td key={p.id} className={cn('p-2 text-center', isBest && 'bg-emerald-50 dark:bg-emerald-900/20 font-bold text-emerald-600')}>
                          {row.format(value)}
                          {isBest && <Award className="inline w-3 h-3 ml-1" />}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="border-t border-ink-100 dark:border-ink-800">
                  <td className="p-2 text-xs text-ink-500">标签</td>
                  {compareItems.map((p) => (
                    <td key={p.id} className="p-2">
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {p.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">{t}</span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {compareItems.length >= 2 && (
            <div className="bg-gradient-to-r from-nova-50 to-pink-50 dark:from-nova-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-nova-200/40">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-nova-500" />
                <span className="text-xs font-semibold">AI 对比分析</span>
              </div>
              {!analysis ? (
                <button onClick={analyze} disabled={loading} className="w-full h-9 rounded-lg bg-gradient-to-r from-nova-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-1">
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />分析中…</> : 'AI 推荐最佳选择'}
                </button>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
              )}
            </div>
          )}
        </>
      )}

      {pickOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setPickOpen(false)}>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">添加商品到对比</h3>
              <button onClick={() => setPickOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              placeholder="搜索商品..."
              className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
            />
            <div className="space-y-1.5">
              {searchResults.map((p) => {
                const inList = selected.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => !inList && add(p.id)}
                    disabled={inList}
                    className={cn('w-full flex items-center gap-2 p-2 rounded-lg text-left', inList ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-ink-50 dark:hover:bg-ink-800')}
                  >
                    <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                      <p className="text-xs text-rose-500 font-bold">¥{p.price}</p>
                    </div>
                    {inList && <Check className="w-4 h-4 text-emerald-500" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
