import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, X, TrendingUp, Clock, Sparkles, ShoppingBag, Users, Video, Newspaper, Scale } from 'lucide-react'
import { products } from '../data/products'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'

const HOT_SEARCHES = ['iPhone 16', '618 优惠', '直播预告', '抗老精华', '露营装备', 'Switch 2', '连衣裙', '零食大礼包', '咖啡机', '运动耳机']

interface SearchHistory {
  text: string
  at: number
}

const HISTORY_KEY = 'versa:search-history'
const TRENDING_KEY = 'versa:trending-search'

function loadHistory(): SearchHistory[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function saveHistory(h: SearchHistory[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20))) } catch {}
}

function loadTrending() {
  try {
    const stored = localStorage.getItem(TRENDING_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return HOT_SEARCHES
}

export function GlobalSearch() {
  const [q, setQ] = useState('')
  const [history, setHistory] = useState<SearchHistory[]>([])
  const [trending] = useState<string[]>(loadTrending())
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'user' | 'live' | 'news' | 'debate'>('all')

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const productResults = useMemo(() => {
    if (!q) return []
    return products.filter((p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.brand.toLowerCase().includes(q.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 8)
  }, [q])

  const userResults = useMemo(() => {
    if (!q) return []
    return [
      { id: 'u1', name: '购物达人王', username: 'shopper_king', avatar: 'https://i.pravatar.cc/100?img=11', bio: '专业测评 5 年', followers: 128000, verified: true },
      { id: 'u2', name: '美食家 Lily', username: 'foodie_lily', avatar: 'https://i.pravatar.cc/100?img=20', bio: '吃遍全国', followers: 96000, verified: true },
      { id: 'u3', name: '数码小王子', username: 'tech_prince', avatar: 'https://i.pravatar.cc/100?img=51', bio: '第一时间上手', followers: 88000, verified: true },
    ].filter((u) => u.name.includes(q) || u.username.includes(q))
  }, [q])

  const liveResults = useMemo(() => {
    if (!q) return []
    return [
      { id: 'l1', host: '数码小王子', topic: 'iPhone 16 首发体验', category: '数码', viewers: 12400, isLive: true },
      { id: 'l2', host: '美食家 Lily', topic: '618 厨电大促', category: '美食', viewers: 8900, isLive: true },
      { id: 'l3', host: '穿搭博主 Mia', topic: '夏季穿搭灵感', category: '服饰', viewers: 5600, isLive: false, scheduledAt: Date.now() + 86400000 },
    ].filter((l) => l.topic.includes(q) || l.host.includes(q) || l.category.includes(q))
  }, [q])

  const newsResults = useMemo(() => {
    if (!q) return []
    return [
      { id: 'n1', title: 'iPhone 16 评测: 升级亮点全解析', source: '科技日报', views: 23000, time: Date.now() - 3600000 * 3 },
      { id: 'n2', title: '618 大促: 京东/天猫/拼多多优惠对比', source: '财经周刊', views: 18900, time: Date.now() - 86400000 },
    ].filter((n) => n.title.includes(q))
  }, [q])

  const debateResults = useMemo(() => {
    if (!q) return []
    return [
      { id: 'd1', title: 'AI 会不会取代人类工作?', participants: 234, comments: 1567 },
      { id: 'd2', title: '618 是不是消费主义陷阱?', participants: 156, comments: 892 },
    ].filter((d) => d.title.includes(q))
  }, [q])

  const search = (text: string) => {
    setQ(text)
    if (text && !history.find((h) => h.text === text)) {
      const next = [{ text, at: Date.now() }, ...history].slice(0, 20)
      setHistory(next)
      saveHistory(next)
    }
  }

  const clearHistory = () => {
    setHistory([])
    saveHistory([])
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索商品、用户、直播、资讯、辩论..."
          className="w-full pl-9 pr-10 h-11 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500 text-sm"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!q && (
        <>
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-ink-500 flex items-center gap-1"><Clock className="w-3 h-3" />搜索历史</p>
                <button onClick={clearHistory} className="text-[10px] text-ink-400 hover:text-rose-500">清空</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h) => (
                  <button
                    key={h.text}
                    onClick={() => search(h.text)}
                    className="px-3 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-xs hover:bg-nova-100 dark:hover:bg-nova-900/40 hover:text-nova-500"
                  >
                    {h.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-ink-500 flex items-center gap-1 mb-1.5">
              <TrendingUp className="w-3 h-3" />热搜榜
              <span className="ml-1 text-[10px]">实时更新</span>
            </p>
            <div className="space-y-1">
              {trending.slice(0, 10).map((t, idx) => (
                <button
                  key={t}
                  onClick={() => search(t)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition"
                >
                  <span className={cn(
                    'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0',
                    idx < 3 ? 'bg-rose-500 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-500'
                  )}>
                    {idx + 1}
                  </span>
                  <span className="text-sm flex-1 text-left">{t}</span>
                  {idx < 3 && <Sparkles className="w-3 h-3 text-rose-500" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {q && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: '全部', icon: Sparkles },
              { key: 'product', label: `商品 (${productResults.length})`, icon: ShoppingBag },
              { key: 'user', label: `用户 (${userResults.length})`, icon: Users },
              { key: 'live', label: `直播 (${liveResults.length})`, icon: Video },
              { key: 'news', label: `资讯 (${newsResults.length})`, icon: Newspaper },
              { key: 'debate', label: `辩论 (${debateResults.length})`, icon: Scale },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={cn(
                  'px-3 h-7 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0',
                  activeTab === t.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
                )}
              >
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {(activeTab === 'all' || activeTab === 'product') && productResults.length > 0 && (
              <div>
                <h3 className="text-xs font-bold mb-1.5 text-ink-500">商品</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {productResults.map((p) => (
                    <Link
                      key={p.id}
                      to={`/shop/product/${p.id}`}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-nova-300 transition"
                    >
                      <img src={p.images?.[0]} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                        <p className="text-xs text-rose-500 font-bold">¥{p.price}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'user') && userResults.length > 0 && (
              <div>
                <h3 className="text-xs font-bold mb-1.5 text-ink-500">用户</h3>
                <div className="space-y-1.5">
                  {userResults.map((u) => (
                    <Link
                      key={u.id}
                      to={`/u/${u.username}`}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-nova-300"
                    >
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{u.name} @{u.username}</p>
                        <p className="text-[10px] text-ink-500">{u.bio} · {formatNumber(u.followers)} 粉丝</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'live') && liveResults.length > 0 && (
              <div>
                <h3 className="text-xs font-bold mb-1.5 text-ink-500">直播</h3>
                <div className="space-y-1.5">
                  {liveResults.map((l) => (
                    <Link
                      key={l.id}
                      to="/shop/live"
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-rose-300"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-2xl flex-shrink-0">
                        📺
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{l.topic}</p>
                        <p className="text-[10px] text-ink-500">{l.host} · {formatNumber(l.viewers)} 人{l.isLive ? '在看' : '预约'}</p>
                      </div>
                      {l.isLive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">LIVE</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'news') && newsResults.length > 0 && (
              <div>
                <h3 className="text-xs font-bold mb-1.5 text-ink-500">资讯</h3>
                <div className="space-y-1.5">
                  {newsResults.map((n) => (
                    <Link
                      key={n.id}
                      to={`/news/${n.id}`}
                      className="block p-2 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-blue-300"
                    >
                      <p className="text-sm font-semibold line-clamp-1">{n.title}</p>
                      <p className="text-[10px] text-ink-500">{n.source} · {formatNumber(n.views)} 阅读 · {formatTimeAgo(new Date(n.time).toISOString())}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'debate') && debateResults.length > 0 && (
              <div>
                <h3 className="text-xs font-bold mb-1.5 text-ink-500">辩论</h3>
                <div className="space-y-1.5">
                  {debateResults.map((d) => (
                    <Link
                      key={d.id}
                      to={`/debate/${d.id}`}
                      className="block p-2 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-violet-300"
                    >
                      <p className="text-sm font-semibold line-clamp-1">{d.title}</p>
                      <p className="text-[10px] text-ink-500">{d.participants} 参与 · {d.comments} 评论</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {productResults.length === 0 && userResults.length === 0 && liveResults.length === 0 && newsResults.length === 0 && debateResults.length === 0 && (
              <div className="text-center py-12 text-ink-500">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>没有找到 "{q}" 相关结果</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
