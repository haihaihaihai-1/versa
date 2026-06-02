import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { products } from '../data/products'
import { versa } from '../store/versa'
import { Button } from '../components/ui/Button'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { toast } from '../components/ui/Toaster'
import {
  Tv, Play, Heart, Share2, Users, Eye, ShoppingCart, Zap, Star, MessageCircle,
  Sparkles, Send, ChevronRight, Flame, Crown, Award, X, Plus, ChevronUp, Calendar,
  MessageSquare, Gift
} from 'lucide-react'
import { DanmuOverlay, useDanmuStream } from '../components/live/DanmuOverlay'
import { GiftPanel, fireGiftToast, type Gift as GiftItem } from '../components/live/GiftPanel'
import { LiveLeaderboard } from '../components/live/LiveLeaderboard'
import { cn, formatCurrency, formatNumber, uid } from '../lib/utils'

interface LiveRoom {
  id: string
  title: string
  host: { id: string; name: string; avatar: string; title: string; followers: number }
  cover: string
  category: string
  viewerCount: number
  hot: number
  status: 'live' | 'upcoming'
  startAt?: string
  productIds: string[]
  tags: string[]
  description: string
}

const LIVE_ROOMS: LiveRoom[] = [
  {
    id: 'lr-1',
    title: '618 数码狂欢夜 · iPhone 直降 1500',
    host: { id: 'h1', name: '数码小仙女', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techgirl', title: 'Versa 数码官方', followers: 1280000 },
    cover: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=80&auto=format&fit=crop',
    category: 'tech',
    viewerCount: 234567,
    hot: 98,
    status: 'live',
    productIds: products.filter((p) => p.category === 'tech').slice(0, 6).map((p) => p.id),
    tags: ['数码', 'iPhone', '限时秒杀'],
    description: '今晚 8 点不见不散！全场 iPhone 15 直降 1500，加赠 200 元配件券...',
  },
  {
    id: 'lr-2',
    title: '美妆直播 · SK-II 神仙水专场',
    host: { id: 'h2', name: '美妆博主林林', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=beauty', title: '资深美妆达人', followers: 856000 },
    cover: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80&auto=format&fit=crop',
    category: 'beauty',
    viewerCount: 89432,
    hot: 95,
    status: 'live',
    productIds: products.filter((p) => p.category === 'beauty').slice(0, 6).map((p) => p.id),
    tags: ['美妆', 'SK-II', '护肤'],
    description: 'SK-II 神仙水直降 1000！买一送十，仅限今晚直播...',
  },
  {
    id: 'lr-3',
    title: '家居好物专场 · 设计师严选',
    host: { id: 'h3', name: '家居设计师阿强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=home', title: 'Versa 家居买手', followers: 423000 },
    cover: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop',
    category: 'home',
    viewerCount: 45123,
    hot: 89,
    status: 'live',
    productIds: products.filter((p) => p.category === 'home').slice(0, 4).map((p) => p.id),
    tags: ['家居', '设计师', '严选'],
    description: '设计师精选家居好物，限时折扣 + 满 1000 减 200...',
  },
  {
    id: 'lr-4',
    title: '潮流服饰 · 夏季新品发布',
    host: { id: 'h4', name: '潮流买手CC', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fashion', title: '时尚买手', followers: 234000 },
    cover: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&auto=format&fit=crop',
    category: 'fashion',
    viewerCount: 12890,
    hot: 72,
    status: 'upcoming',
    startAt: '2026-06-15T20:00:00Z',
    productIds: products.filter((p) => p.category === 'fashion').slice(0, 4).map((p) => p.id),
    tags: ['服饰', '新品', '潮流'],
    description: '夏季新品发布会，多款首发 + 直播专属价...',
  },
  {
    id: 'lr-5',
    title: '美食探店 · 全球零食大赏',
    host: { id: 'h5', name: '美食家老王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=food', title: '美食博主', followers: 567000 },
    cover: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&auto=format&fit=crop',
    category: 'food',
    viewerCount: 0,
    hot: 65,
    status: 'upcoming',
    startAt: '2026-06-18T19:30:00Z',
    productIds: products.filter((p) => p.category === 'food').slice(0, 4).map((p) => p.id),
    tags: ['美食', '零食', '全球'],
    description: '全球零食大赏，边吃边买...',
  },
  {
    id: 'lr-6',
    title: '运动健身 · 618 装备节',
    host: { id: 'h6', name: '健身教练JACK', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sport', title: '专业教练', followers: 198000 },
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80&auto=format&fit=crop',
    category: 'sports',
    viewerCount: 8921,
    hot: 78,
    status: 'live',
    productIds: products.filter((p) => p.category === 'sports').slice(0, 4).map((p) => p.id),
    tags: ['运动', '健身', '装备'],
    description: '运动装备专场，专业教练在线教学 + 限时折扣...',
  },
]

const FAKE_DANMU = [
  { user: '小仙女', text: '主播好美！', color: '#ef4444' },
  { user: '数码控', text: 'iPhone 真的降 1500 吗？', color: '#f59e0b' },
  { user: '购物达人', text: '刚下单了，求发货', color: '#10b981' },
  { user: '理性消费', text: '问一下，电池续航怎么样？', color: '#3b82f6' },
  { user: 'VIP 用户', text: '支持！', color: '#8b5cf6' },
  { user: '新人报到', text: '这个颜色还有吗？', color: '#ec4899' },
]

export function LiveShoppingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const liveRooms = LIVE_ROOMS.filter((r) => r.status === 'live')
  const upcomingRooms = LIVE_ROOMS.filter((r) => r.status === 'upcoming')

  if (id) return <LiveRoom room={LIVE_ROOMS.find((r) => r.id === id)} />
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 text-white p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_50%)]" />
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3">
              <Tv className="w-3 h-3" /> VERSA LIVE
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">直播购物</h1>
            <p className="mt-2 text-sm sm:text-base text-white/90">主播在线 · 实时互动 · 专享好价</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/80">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />{liveRooms.length} 个直播中</span>
              <span className="flex items-center gap-1.5"><Users className="w-3 h-3" />{(liveRooms.reduce((s, r) => s + r.viewerCount, 0)).toLocaleString()} 人正在观看</span>
            </div>
          </div>
          <div className="hidden sm:block text-6xl">📺</div>
        </div>
      </div>

      {/* Calendar quicklink */}
      <Link
        to="/shop/live-schedule"
        className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-news-50 to-shop-50 dark:from-news-950/30 dark:to-shop-950/30 border border-news-200/50 dark:border-news-800/50 hover:shadow-md transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-news-500 to-shop-500 flex items-center justify-center text-white">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">直播日历</p>
            <p className="text-xs text-ink-500">查看未来 7 天直播预告 · 订阅开播提醒</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-400" />
      </Link>

      {/* 直播中 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold">正在直播</h2>
          <span className="text-xs text-ink-500">点击进入直播间</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveRooms.map((room) => (
            <Link
              key={room.id}
              to={`/shop/live/${room.id}`}
              className="group block rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all hover:shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
                <img src={room.cover} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ink-950/60 backdrop-blur-md text-white text-[10px] font-semibold">
                  <Eye className="w-3 h-3" />{formatNumber(room.viewerCount)}
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                  <img src={room.host.avatar} alt={room.host.name} className="w-7 h-7 rounded-full ring-2 ring-white" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold line-clamp-1">{room.title}</div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {room.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600">#{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span>{room.host.name}</span>
                  <span>·</span>
                  <span>{formatNumber(room.host.followers)} 粉丝</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {room.productIds.slice(0, 3).map((pid) => {
                    const p = products.find((x) => x.id === pid)
                    if (!p) return null
                    return (
                      <div key={pid} className="w-12 h-12 rounded-lg overflow-hidden bg-ink-100 ring-1 ring-ink-200">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )
                  })}
                  {room.productIds.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-xs font-bold text-ink-500">
                      +{room.productIds.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 即将开播 */}
      {upcomingRooms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 text-white fill-current" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">即将开播</h2>
            <span className="text-xs text-ink-500">订阅提醒</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingRooms.map((room) => (
              <div key={room.id} className="rounded-2xl overflow-hidden bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:shadow-xl transition-all">
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
                  <img src={room.cover} alt="" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-ink-950/30" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    <Play className="w-3 h-3 fill-current" />预约
                  </div>
                  {room.startAt && (
                    <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-ink-950/70 backdrop-blur-md text-white text-xs text-center font-bold">
                      {new Date(room.startAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm line-clamp-1">{room.title}</h3>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-500">
                    <img src={room.host.avatar} alt="" className="w-4 h-4 rounded-full" />
                    <span>{room.host.name}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" fullWidth onClick={() => toast(`📅 已预约 ${room.title}`, 'success')}>
                      提醒我
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/shop/live/${room.id}`)}>
                      详情
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LiveRoom({ room }: { room?: LiveRoom }) {
  const navigate = useNavigate()
  const [activeProduct, setActiveProduct] = useState(0)
  const [danmu, setDanmu] = useState<Array<{ id: string; user: string; text: string; color: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [showProducts, setShowProducts] = useState(true)
  const [danmuEnabled, setDanmuEnabled] = useState(true)
  const [showGift, setShowGift] = useState(false)

  useEffect(() => {
    if (!room) return
    setViewerCount(room.viewerCount)
    const interval = setInterval(() => {
      setViewerCount((c) => c + Math.floor(Math.random() * 50) - 20)
      // 随机弹幕
      if (danmuEnabled && Math.random() > 0.5) {
        const d = FAKE_DANMU[Math.floor(Math.random() * FAKE_DANMU.length)]
        setDanmu((prev) => [...prev.slice(-10), { id: uid('d'), ...d }])
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [room?.id, danmuEnabled])

  if (!room) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">直播间不存在</h2>
        <Button onClick={() => navigate('/shop/live')}>返回直播列表</Button>
      </div>
    )
  }

  const liveProducts = room.productIds.map((pid) => products.find((p) => p.id === pid)!).filter(Boolean)
  const currentProduct = liveProducts[activeProduct] || liveProducts[0]

  const handleAddToCart = (productId: string) => {
    versa.addToCart(productId, 1)
    toast(`已加入购物车`, 'success')
  }

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    setDanmu((prev) => [...prev.slice(-10), { id: uid('d'), user: '我', text: chatInput, color: '#ec4899' }])
    setChatInput('')
  }

  const handleSendGift = (gift: GiftItem, count: number) => {
    fireGiftToast(gift, count)
    setDanmu((prev) => [...prev.slice(-10), { id: uid('d'), user: '我', text: `送出了 ${gift.name} x${count}`, color: '#fbbf24' }])
    setShowGift(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button onClick={() => navigate('/shop/live')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4">
        ← 返回直播列表
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 直播主区域 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 视频区 */}
          <div className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-gradient-to-br from-rose-500 via-purple-600 to-indigo-700">
            <img src={room.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/40" />

            {/* 弹幕浮层 */}
            <DanmuOverlay danmus={danmu} />

            {/* 顶部状态条 */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between flex-wrap gap-2 z-10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-950/60 backdrop-blur-md text-white text-xs font-semibold">
                  <Eye className="w-3 h-3" />{formatNumber(viewerCount)}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-bold">
                  <Flame className="w-3 h-3" />热度 {room.hot}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="w-9 h-9 rounded-full bg-ink-950/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-ink-950/70">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/shop/live')} className="w-9 h-9 rounded-full bg-ink-950/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-ink-950/70">
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDanmuEnabled((v) => {
                      toast(!v ? '已开启弹幕' : '已关闭弹幕', 'info')
                      return !v
                    })
                  }}
                  className="px-3 h-9 rounded-full bg-ink-950/50 backdrop-blur-md text-white text-xs flex items-center gap-1 hover:bg-ink-950/70"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  弹幕
                </button>
              </div>
            </div>

            {/* 主播信息 */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="flex items-center gap-2 mb-2">
                <img src={room.host.avatar} alt={room.host.name} className="w-10 h-10 rounded-full ring-2 ring-white" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm flex items-center gap-1.5">
                    {room.host.name}
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-400 text-amber-900 text-[9px] font-bold">
                      <Crown className="w-2.5 h-2.5" />主播
                    </span>
                  </div>
                  <div className="text-white/80 text-xs">{room.host.title} · {formatNumber(room.host.followers)} 粉丝</div>
                </div>
                <button className="px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-600">
                  + 关注
                </button>
              </div>
              <div className="text-white/90 text-sm line-clamp-2 max-w-2xl">{room.description}</div>
            </div>

            {/* 弹幕层 */}
            <div className="absolute top-16 right-4 max-w-[200px] sm:max-w-xs space-y-1.5 max-h-80 overflow-hidden pointer-events-none z-10">
              {danmu.slice(-6).map((d) => (
                <div key={d.id} className="bg-ink-950/40 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white inline-block animate-fadeIn">
                  <span className="font-bold" style={{ color: d.color }}>{d.user}:</span> {d.text}
                </div>
              ))}
            </div>
          </div>

          {/* 当前讲解商品 */}
          {currentProduct && (
            <div className="rounded-2xl bg-gradient-to-br from-debate-500/10 via-orange-500/5 to-rose-500/10 border border-debate-200/40 dark:border-debate-800/40 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-debate-500 fill-current" />
                <span className="text-xs font-bold text-debate-600 uppercase tracking-wider">主播正在讲解</span>
                <span className="ml-auto text-[10px] text-ink-500">第 {activeProduct + 1} / {liveProducts.length} 件</span>
              </div>
              <div className="flex gap-4">
                <Link to={`/shop/${currentProduct.id}`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-ink-100 flex-shrink-0 ring-2 ring-debate-500/20">
                  <img src={currentProduct.images[0]} alt="" className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm line-clamp-1">{currentProduct.name}</h3>
                  <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{currentProduct.tagline}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    {currentProduct.flashSale ? (
                      <span className="text-2xl font-bold bg-gradient-to-r from-debate-500 to-orange-500 bg-clip-text text-transparent">
                        <span className="text-sm">¥</span>{currentProduct.flashSale.flashPrice}
                      </span>
                    ) : (
                      <span className="text-2xl font-bold bg-gradient-to-r from-shop-600 to-pink-500 bg-clip-text text-transparent">
                        <span className="text-sm">¥</span>{currentProduct.price}
                      </span>
                    )}
                    {currentProduct.originalPrice && (
                      <span className="text-xs text-ink-400 line-through">¥{currentProduct.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(currentProduct.id)}
                      className="flex-1 h-8 rounded-lg bg-debate-500 text-white text-xs font-bold hover:bg-debate-600 inline-flex items-center justify-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />加入购物车
                    </button>
                    <Link to={`/shop/${currentProduct.id}`} className="flex-1 h-8 rounded-lg border-2 border-debate-500 text-debate-600 text-xs font-bold hover:bg-debate-500/5 inline-flex items-center justify-center gap-1">
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 互动输入 */}
          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="发条弹幕飘过~"
                className="flex-1 px-3 h-9 rounded-full bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:bg-white dark:focus:bg-ink-900 border border-transparent focus:border-rose-500"
              />
              <button
                onClick={() => setShowGift((v) => !v)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center hover:scale-105 transition shadow"
                title="送礼物"
              >
                <Gift className="w-4 h-4" />
              </button>
              <button onClick={handleSendMessage} className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center hover:scale-105 transition shadow">
                <Send className="w-4 h-4" />
              </button>
            </div>
            {showGift && (
              <div className="flex justify-center pt-2">
                <GiftPanel onSend={handleSendGift} onClose={() => setShowGift(false)} />
              </div>
            )}
            <p className="text-[10px] text-ink-500 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              弹幕会从直播间飘过
              {danmu.length > 0 && ` · 当前 ${danmu.length} 条`}
            </p>
          </div>
        </div>

        {/* 右侧商品列表 */}
        <div className="space-y-4">
          <LiveLeaderboard roomId={room.id} limit={5} />
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">本场商品 ({liveProducts.length})</h3>
            <button
              onClick={() => setShowProducts(!showProducts)}
              className="text-xs text-shop-600 hover:underline"
            >
              {showProducts ? '收起' : '展开'}
            </button>
          </div>
          {showProducts && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {liveProducts.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActiveProduct(i)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-xl border-2 transition-all',
                    activeProduct === i
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-transparent bg-white/60 dark:bg-ink-900/40 hover:border-ink-200/60'
                  )}
                >
                  <div className="flex gap-2.5">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-ink-100 flex-shrink-0">
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs line-clamp-1">{p.name}</h4>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-bold text-rose-600">
                          <span className="text-[10px]">¥</span>{p.flashSale ? p.flashSale.flashPrice : p.price}
                        </span>
                        {p.originalPrice && (
                          <span className="text-[10px] text-ink-400 line-through">¥{p.originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5">⭐ {p.rating} · {(p.sales || 0).toLocaleString()} 已售</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
