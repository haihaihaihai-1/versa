import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, Sparkles, Loader2, TrendingUp, TrendingDown, Filter, Eye, Star, Clock, Tag, AlertCircle, BarChart3 } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  category: 'market' | 'stock' | 'crypto' | 'macro' | 'policy' | 'company' | 'global'
  symbols: string[]
  sentiment: 'bullish' | 'bearish' | 'neutral'
  importance: 1 | 2 | 3 | 4 | 5
  date: string
  read: boolean
  starred: boolean
}

const STORAGE_KEY = 'versa:marketnews-v1'

function load(): NewsItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: NewsItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): NewsItem[] {
  return [
    { id: 'n1', title: '美联储释放鸽派信号 9 月或降息 25 基点', summary: '鲍威尔在 Jackson Hole 讲话中暗示通胀已接近目标, 劳动力市场出现放缓迹象, 市场对 9 月降息预期升温至 85%.', source: '华尔街见闻', category: 'macro', symbols: ['SPX', 'DXY'], sentiment: 'bullish', importance: 5, date: new Date(Date.now() - 3600000 * 2).toISOString(), read: false, starred: true },
    { id: 'n2', title: '英伟达 Q2 财报超预期 数据中心营收同比增 154%', summary: 'AI 算力需求持续强劲, 公司给出乐观 Q3 指引, 盘后股价涨 6%.', source: '彭博社', category: 'stock', symbols: ['NVDA'], sentiment: 'bullish', importance: 5, date: new Date(Date.now() - 3600000 * 5).toISOString(), read: false, starred: true },
    { id: 'n3', title: '比特币突破 7 万美元 创年内新高', summary: 'ETF 资金持续流入, 机构需求强劲, 加密市场总市值突破 2.5 万亿美元.', source: 'CoinDesk', category: 'crypto', symbols: ['BTC'], sentiment: 'bullish', importance: 4, date: new Date(Date.now() - 3600000 * 8).toISOString(), read: false, starred: false },
    { id: 'n4', title: '中国 8 月 PMI 回落至 49.1 制造业景气度承压', summary: '新订单指数下滑, 价格指数下降, 政策面或加码稳增长措施.', source: '财新', category: 'macro', symbols: ['CNH', '000300'], sentiment: 'bearish', importance: 4, date: new Date(Date.now() - 3600000 * 12).toISOString(), read: true, starred: false },
    { id: 'n5', title: '苹果 iPhone 16 全系采用 A18 芯片 端侧 AI 能力大幅提升', summary: 'Apple Intelligence 全面铺开, 硬件升级或刺激换机周期, 投行上调目标价至 250 美元.', source: '路透社', category: 'company', symbols: ['AAPL'], sentiment: 'bullish', importance: 4, date: new Date(Date.now() - 3600000 * 18).toISOString(), read: true, starred: false },
    { id: 'n6', title: 'OPEC+ 延长减产至年底 油价短期获支撑', summary: '沙特自愿减产 100 万桶/日, 布伦特原油站上 85 美元/桶.', source: '金十数据', category: 'global', symbols: ['CL'], sentiment: 'bullish', importance: 3, date: new Date(Date.now() - 3600000 * 24).toISOString(), read: true, starred: false },
    { id: 'n7', title: '特斯拉 Robotaxi 发布临近 投行看好万亿市值空间', summary: '10 月发布会或揭晓无人驾驶出租车产品, 马斯克称其将改变出行方式.', source: 'Seeking Alpha', category: 'stock', symbols: ['TSLA'], sentiment: 'bullish', importance: 3, date: new Date(Date.now() - 3600000 * 30).toISOString(), read: true, starred: false },
    { id: 'n8', title: '证监会推出市场稳定政策 A 股迎来增量资金', summary: '中长期资金入市方案落地, 保险/社保/年金等长线资金有望加速布局.', source: '上海证券报', category: 'policy', symbols: ['000300', '000905'], sentiment: 'bullish', importance: 4, date: new Date(Date.now() - 3600000 * 36).toISOString(), read: true, starred: false },
  ]
}

const CAT_META = {
  market: { label: '市场', color: 'from-blue-500 to-cyan-500' },
  stock: { label: '个股', color: 'from-emerald-500 to-teal-500' },
  crypto: { label: '加密', color: 'from-orange-500 to-amber-500' },
  macro: { label: '宏观', color: 'from-violet-500 to-purple-500' },
  policy: { label: '政策', color: 'from-rose-500 to-pink-500' },
  company: { label: '公司', color: 'from-cyan-500 to-teal-500' },
  global: { label: '全球', color: 'from-amber-500 to-orange-500' },
} as const

const SENTIMENT_META = {
  bullish: { label: '利好', icon: TrendingUp, color: 'bg-rose-500' },
  bearish: { label: '利空', icon: TrendingDown, color: 'bg-emerald-500' },
  neutral: { label: '中性', icon: BarChart3, color: 'bg-ink-500' },
} as const

export function MarketNews() {
  const [items, setItems] = useState<NewsItem[]>(load())
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'bullish' | 'bearish'>('all')
  const [catFilter, setCatFilter] = useState<'all' | NewsItem['category']>('all')
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => { save(items) }, [items])

  const total = items.length
  const unread = items.filter((i) => !i.read).length
  const starred = items.filter((i) => i.starred).length
  const bullish = items.filter((i) => i.sentiment === 'bullish').length
  const bearish = items.filter((i) => i.sentiment === 'bearish').length

  const filtered = items.filter((i) => {
    if (filter === 'unread' && i.read) return false
    if (filter === 'starred' && !i.starred) return false
    if (filter === 'bullish' && i.sentiment !== 'bullish') return false
    if (filter === 'bearish' && i.sentiment !== 'bearish') return false
    if (catFilter !== 'all' && i.category !== catFilter) return false
    return true
  }).sort((a, b) => b.date.localeCompare(a.date))

  const toggleRead = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, read: !i.read } : i))
  const toggleStar = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, starred: !i.starred } : i))
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))
  const markAllRead = () => { setItems(items.map((i) => ({ ...i, read: true }))); toast('全部已读', 'success') }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const bullishItems = items.filter((i) => i.sentiment === 'bullish').slice(0, 3).map((i) => i.title).join('; ')
      const result = await aiComplete(`近期利好新闻: ${bullishItems}. 给出 1 段 60 字内市场情绪分析, 中文`, '你是 Versa 投资分析师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const active = items.find((i) => i.id === activeId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Newspaper className="w-5 h-5" />
          <h2 className="text-lg font-bold">市场资讯</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多源新闻 · 情绪分析 · 个股关联</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">新闻</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{unread}</p>
            <p className="text-[9px] opacity-80">未读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{bullish}</p>
            <p className="text-[9px] opacity-80">利好</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{bearish}</p>
            <p className="text-[9px] opacity-80">利空</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 解读
        </button>
        <button onClick={markAllRead} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">全部已读</button>
      </div>

      {aiTip && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'unread', 'starred', 'bullish', 'bearish'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'unread' ? '🔵 未读' : f === 'starred' ? '⭐ 收藏' : f === 'bullish' ? '↑ 利好' : '↓ 利空'}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCatFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部分类</button>
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
          <button key={k} onClick={() => setCatFilter(k as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === k ? `bg-gradient-to-r ${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {CAT_META[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Newspaper className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有新闻</p>
          </div>
        ) : filtered.map((n) => {
          const M = SENTIMENT_META[n.sentiment]
          const SentimentIcon = M.icon
          const CM = CAT_META[n.category]
          return (
            <motion.div key={n.id} whileHover={{ y: -1 }} onClick={() => { setActiveId(n.id); if (!n.read) toggleRead(n.id) }} className={cn('rounded-2xl p-2 border cursor-pointer', n.read ? 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800')}>
              <div className="flex items-start gap-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', CM.color)}>
                  <Newspaper className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', M.color)} />
                    <span className="text-[9px] text-ink-500 font-semibold">{M.label}</span>
                    <span className="text-[9px] text-ink-400">·</span>
                    <span className="text-[9px] text-ink-500">{CM.label}</span>
                    <span className="text-[9px] text-ink-400">·</span>
                    <span className="text-[9px] text-ink-500">{n.source}</span>
                    <span className="ml-auto flex">
                      {Array.from({ length: n.importance }).map((_, i) => (
                        <span key={i} className="w-0.5 h-2 bg-amber-400 mx-0.5 rounded" />
                      ))}
                    </span>
                  </div>
                  <p className={cn('text-sm leading-snug', !n.read && 'font-bold')}>{n.title}</p>
                  <p className="text-[10px] text-ink-500 mt-0.5 line-clamp-2">{n.summary}</p>
                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                    {n.symbols.slice(0, 3).map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 text-[9px] font-semibold">${s}</span>
                    ))}
                    <span className="text-[9px] text-ink-400 ml-auto">{formatTimeAgo(n.date)}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleStar(n.id) }}>
                  <Star className={cn('w-3.5 h-3.5', n.starred ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-[10px] text-ink-500">
              <span className={cn('px-1.5 py-0.5 rounded text-white font-semibold', SENTIMENT_META[active.sentiment].color)}>{SENTIMENT_META[active.sentiment].label}</span>
              <span>{CAT_META[active.category].label}</span>
              <span>·</span>
              <span>{active.source}</span>
              <span className="ml-auto">{formatTimeAgo(active.date)}</span>
            </div>
            <h3 className="text-lg font-bold">{active.title}</h3>
            <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-300">{active.summary}</p>
            {active.symbols.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {active.symbols.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 text-xs font-semibold">${s}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-500">重要性</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={cn('w-1 h-3 rounded', i < active.importance ? 'bg-amber-400' : 'bg-ink-200 dark:bg-ink-700')} />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => toggleStar(active.id)} className={cn('flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1', active.starred ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                <Star className={cn('w-3.5 h-3.5', active.starred && 'fill-current')} />{active.starred ? '已收藏' : '收藏'}
              </button>
              <button onClick={() => { remove(active.id); setActiveId(null) }} className="px-3 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-xs font-semibold">删除</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
