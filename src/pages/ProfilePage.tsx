import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Edit3, Award, Newspaper, Scale, ShoppingBag, Heart, Package, Activity, Settings, LogOut,
  Sparkles, TrendingUp, Check, MapPin, Calendar, Link2, Share2, Camera, Grid3x3, Bookmark,
  MessageCircle, Heart as HeartIcon, Eye, Headphones,
} from 'lucide-react'
import { useVersa, versa, levelFor, levelTitle, levelProgress } from '../store/versa'
import { allBadges, moduleMeta, news, debates, products } from '../data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ProgressBar, ScorePill } from '../components/ui/Progress'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

const COVERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80&auto=format&fit=crop',
]

type ProfileTab = 'overview' | 'read' | 'debate' | 'shop' | 'badges' | 'activity'

export function ProfilePage() {
  const { user, visitedModules, orders, wishlist } = useVersa()
  const activity = user.activity
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio)
  const [tab, setTab] = useState<ProfileTab>('overview')
  const [cover] = useState(COVERS[Math.floor(Math.random() * COVERS.length)])
  const rep = levelProgress(user.reputation)

  const earnedIds = new Set(user.badges.map((b) => b.id))
  const isEarned = (id: string) => earnedIds.has(id) || id === 'b_early'
  const earnedBadges = allBadges.filter((b) => isEarned(b.id))

  // Cross-module stats
  const stats = {
    articlesRead: user.stats.articlesRead,
    debatesJoined: user.stats.debatesJoined,
    argumentsPosted: user.stats.argumentsPosted,
    productsPurchased: user.stats.productsPurchased,
    wishlist: wishlist.length,
    orders: orders.length,
  }

  const tabs: { value: ProfileTab; label: string; icon: any }[] = [
    { value: 'overview', label: '概览', icon: Grid3x3 },
    { value: 'read', label: `阅读 · ${stats.articlesRead}`, icon: Newspaper },
    { value: 'debate', label: `辩论 · ${stats.debatesJoined}`, icon: Scale },
    { value: 'shop', label: `好物 · ${stats.wishlist + stats.orders}`, icon: ShoppingBag },
    { value: 'badges', label: `勋章 · ${earnedBadges.length}`, icon: Award },
    { value: 'activity', label: '活动', icon: Activity },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Cover hero */}
      <div className="relative h-48 sm:h-64 lg:h-72 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 overflow-hidden bg-ink-900">
        <img src={cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2">
          <button onClick={() => toast('已复制主页链接', 'success')} className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-medium hover:bg-white/30 inline-flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> 分享
          </button>
          <button onClick={() => toast('已上传新封面', 'success')} className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-medium hover:bg-white/30 inline-flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> 换封面
          </button>
        </div>
      </div>

      {/* Avatar + identity */}
      <div className="px-2 sm:px-4 -mt-12 sm:-mt-16 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="relative">
            <img src={user.avatar} alt="" className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl ring-4 ring-white dark:ring-ink-900 shadow-xl" />
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-gradient-to-br from-nova-500 to-shop-500 text-white font-bold flex items-center justify-center ring-4 ring-white dark:ring-ink-900 shadow-lg">
              {user.level}
            </div>
          </div>
          <div className="flex-1 min-w-0 pb-2">
            {!editing ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold">{user.displayName}</h1>
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400 hover:text-ink-900 dark:hover:text-white">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {user.level >= 5 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold">
                      <Sparkles className="w-2.5 h-2.5" /> 优质创作者
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">@{user.username}</div>
              </>
            ) : (
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-sm h-10 px-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 focus:border-nova-500 outline-none text-base font-semibold" />
            )}
          </div>
          <div className="flex gap-2 pb-2">
            <Button size="sm" variant="outline" leftIcon={<Settings className="w-3.5 h-3.5" />}>设置</Button>
            <Button size="sm" onClick={() => toast('已退出登录', 'info')}>编辑资料</Button>
          </div>
        </div>

        {/* Bio */}
        {!editing ? (
          <p className="mt-3 text-ink-700 dark:text-ink-200 max-w-2xl">{user.bio}</p>
        ) : (
          <div className="mt-3 space-y-2 max-w-2xl">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 focus:border-nova-500 outline-none text-sm resize-none" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { versa.updateProfile({ displayName: name, bio }); setEditing(false); toast('已更新', 'success') }} leftIcon={<Check className="w-3.5 h-3.5" />}>保存</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>取消</Button>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> 加入于 {formatTimeAgo(user.joinedAt)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> 上海</span>
          <span className="inline-flex items-center gap-1"><Link2 className="w-3 h-3" /> versa.app/@{user.username}</span>
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-0 divide-x divide-ink-200 dark:divide-ink-800 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
          <StatCell label="声誉" value={user.reputation} accent="nova" />
          <StatCell label="阅读" value={stats.articlesRead} accent="news" />
          <StatCell label="辩论" value={stats.debatesJoined} accent="debate" />
          <StatCell label="购买" value={stats.productsPurchased} accent="shop" />
          <StatCell label="收藏" value={stats.wishlist} accent="debate" />
          <StatCell label="订单" value={stats.orders} accent="shop" />
        </div>

        {/* Quick links */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink to="/profile/orders" icon={Package} label="我的订单" color="shop" count={stats.orders} />
          <QuickLink to="/profile/wishlist" icon={Heart} label="我的收藏" color="debate" count={stats.wishlist} />
          <QuickLink to="/news" icon={Newspaper} label="继续阅读" color="news" />
          <QuickLink to="/debates" icon={Scale} label="参与辩论" color="nova" />
          <QuickLink to="/help/support" icon={Headphones} label="客服中心" color="news" />
        </div>

        {/* Reputation progress */}
        <div className="mt-5 p-5 rounded-2xl bg-gradient-to-br from-nova-500/8 to-shop-500/5 border border-ink-200/60 dark:border-ink-800/60">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-bold">Lv.{user.level} · {levelTitle(user.level)}</span>
            <span className="text-ink-500">{user.reputation} / {rep.next + user.reputation - rep.current} 声誉</span>
          </div>
          <ProgressBar value={rep.percent} variant="gradient" height="md" />
          <div className="mt-3 flex flex-wrap gap-2">
            <ScorePill variant="news" label="资讯" value={user.stats.articlesRead} />
            <ScorePill variant="debate" label="辩论" value={user.stats.debatesJoined + user.stats.argumentsPosted} />
            <ScorePill variant="shop" label="购物" value={user.stats.productsPurchased} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 -mx-4 sm:-mx-6 lg:-mx-8 border-b border-ink-200 dark:border-ink-800 overflow-x-auto">
        <div className="flex gap-1 px-4 sm:px-6 lg:px-8 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'px-4 py-3 text-sm font-medium inline-flex items-center gap-1.5 border-b-2 transition-colors',
                  active ? 'border-nova-500 text-ink-900 dark:text-white' : 'border-transparent text-ink-500 hover:text-ink-900 dark:hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* 最近阅读 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base flex items-center gap-2"><Newspaper className="w-4 h-4 text-news-500" />最近阅读</h3>
                  <Link to="/news" className="text-xs text-news-600 hover:underline">更多 ›</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {news.slice(0, 4).map((a) => <NewsCard key={a.id} article={a} />)}
                </div>
              </div>

              {/* 关注的辩论 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base flex items-center gap-2"><Scale className="w-4 h-4 text-debate-500" />我参与的辩论</h3>
                  <Link to="/debates" className="text-xs text-debate-600 hover:underline">更多 ›</Link>
                </div>
                <div className="space-y-3">
                  {debates.slice(0, 3).map((d) => <DebateCard key={d.id} debate={d} />)}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              {/* 勋章 */}
              <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2"><Award className="w-4 h-4 text-nova-500" />勋章</h3>
                  <span className="text-xs text-ink-500">{earnedBadges.length} / {allBadges.length}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {earnedBadges.slice(0, 8).map((b) => (
                    <div key={b.id} className="aspect-square rounded-xl bg-gradient-to-br from-nova-500/15 to-shop-500/10 flex items-center justify-center" title={b.name}>
                      <Award className="w-5 h-5 text-nova-500" />
                    </div>
                  ))}
                  {earnedBadges.length === 0 && (
                    <div className="col-span-4 text-xs text-ink-500 text-center py-4">还没有勋章，去探索吧</div>
                  )}
                </div>
              </div>

              {/* 最近活动 */}
              <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 p-5">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3"><Activity className="w-4 h-4" />最近活动</h3>
                {activity.length === 0 ? (
                  <div className="text-xs text-ink-500 text-center py-4">还没有活动</div>
                ) : (
                  <div className="space-y-2">
                    {activity.slice(0, 5).map((a: typeof activity[number]) => (
                      <div key={a.id} className="flex items-start gap-2 text-xs">
                        <div className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                          a.module === 'news' && 'bg-news-500/10 text-news-500',
                          a.module === 'debate' && 'bg-debate-500/10 text-debate-500',
                          a.module === 'shop' && 'bg-shop-500/10 text-shop-500',
                        )}>
                          {a.module === 'news' ? <Newspaper className="w-3 h-3" /> : a.module === 'debate' ? <Scale className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{a.refTitle}</div>
                          <div className="text-[10px] text-ink-400">{formatTimeAgo(a.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 跨模块足迹 */}
              <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 p-5">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" />足迹</h3>
                <div className="space-y-2">
                  {(['news', 'debate', 'shop'] as const).map((k) => (
                    <div key={k} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: moduleMeta[k].color + '20', color: moduleMeta[k].color }}>
                        {k === 'news' ? <Newspaper className="w-3.5 h-3.5" /> : k === 'debate' ? <Scale className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 text-xs">{moduleMeta[k].name}</div>
                      <div className="text-sm font-bold tabular-nums">{visitedModules[k]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {tab === 'read' && (
          <div>
            <div className="text-sm text-ink-500 mb-4">已读 {stats.articlesRead} 篇文章 · 共 {formatNumber(news.reduce((s, a) => s + a.views, 0))} 字</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.slice(0, 6).map((a) => <NewsCard key={a.id} article={a} />)}
            </div>
          </div>
        )}

        {tab === 'debate' && (
          <div>
            <div className="text-sm text-ink-500 mb-4">参与 {stats.debatesJoined} 场辩论 · 发布 {stats.argumentsPosted} 个论点</div>
            <div className="space-y-3">
              {debates.slice(0, 5).map((d) => <DebateCard key={d.id} debate={d} />)}
            </div>
          </div>
        )}

        {tab === 'shop' && (
          <div className="space-y-6">
            {orders.length > 0 && (
              <div>
                <h3 className="font-bold text-base mb-3">我的订单 ({orders.length})</h3>
                <div className="space-y-3">
                  {orders.slice(0, 3).map((o) => (
                    <Link key={o.id} to="/profile/orders" className="block p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-shop-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-ink-500 font-mono">{o.id}</div>
                        <Badge variant="news">已支付</Badge>
                      </div>
                      <div className="flex gap-2">
                        {o.items.slice(0, 3).map((it) => (
                          <img key={it.productId} src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-bold text-base mb-3">我的收藏 ({wishlist.length})</h3>
              {wishlist.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.filter((p) => wishlist.includes(p.id)).map((p) => <ProductCardV2 key={p.id} product={p} compact />)}
                  {products.slice(0, 4).map((p) => <ProductCardV2 key={'r-' + p.id} product={p} compact />)}
                </div>
              ) : (
                <div className="text-sm text-ink-500 text-center py-12">还没有收藏，去 <Link to="/shop" className="text-shop-600 hover:underline">逛逛商城</Link></div>
              )}
            </div>
          </div>
        )}

        {tab === 'badges' && <BadgeGallery />}

        {tab === 'activity' && (
          <div>
            <h3 className="font-bold text-base mb-3">所有活动</h3>
            {activity.length === 0 ? (
              <div className="text-sm text-ink-500 text-center py-12">还没有活动</div>
            ) : (
              <div className="space-y-2">
                {activity.map((a: typeof activity[number]) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 text-sm">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      a.module === 'news' && 'bg-news-500/10 text-news-500',
                      a.module === 'debate' && 'bg-debate-500/10 text-debate-500',
                      a.module === 'shop' && 'bg-shop-500/10 text-shop-500',
                    )}>
                      {a.module === 'news' ? <Newspaper className="w-4 h-4" /> : a.module === 'debate' ? <Scale className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{a.refTitle}</div>
                      <div className="text-xs text-ink-500">{formatTimeAgo(a.createdAt)}</div>
                    </div>
                    <Badge variant="nova" size="sm">+{a.points}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCell({ label, value, accent }: { label: string; value: number; accent: 'nova' | 'news' | 'debate' | 'shop' }) {
  const colors = {
    nova: 'text-nova-600',
    news: 'text-news-600',
    debate: 'text-debate-600',
    shop: 'text-shop-600',
  }
  return (
    <div className="text-center py-3">
      <div className={cn('text-xl sm:text-2xl font-bold tabular-nums', colors[accent])}>{value}</div>
      <div className="text-[11px] text-ink-500 mt-0.5">{label}</div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label, color, count }: { to: string; icon: any; label: string; color: 'shop' | 'debate' | 'news' | 'nova'; count?: number }) {
  const colorMap: any = {
    shop: 'from-shop-500/10 to-shop-500/0 text-shop-600',
    debate: 'from-debate-500/10 to-debate-500/0 text-debate-600',
    news: 'from-news-500/10 to-news-500/0 text-news-600',
    nova: 'from-nova-500/10 to-nova-500/0 text-nova-600',
  }
  return (
    <Link to={to} className={cn('relative p-4 rounded-2xl bg-gradient-to-br border border-ink-200/60 dark:border-ink-800/60 card-hover', colorMap[color])}>
      <Icon className="w-5 h-5 mb-2" />
      <div className="text-sm font-semibold text-ink-900 dark:text-white">{label}</div>
      {count !== undefined && count > 0 && (
        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-current text-white font-bold opacity-90">{count}</span>
      )}
    </Link>
  )
}

function BadgeGallery() {
  const { user } = useVersa()
  const earnedIds = new Set(user.badges.map((b) => b.id))
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {allBadges.map((b) => {
        const got = earnedIds.has(b.id) || b.id === 'b_early'
        return (
          <div
            key={b.id}
            className={cn(
              'p-4 rounded-2xl text-center border transition-all',
              got
                ? 'border-nova-500/30 bg-gradient-to-br from-nova-500/10 to-shop-500/5'
                : 'border-ink-200 dark:border-ink-800 opacity-40 grayscale'
            )}
            title={b.description}
          >
            <div className={cn('w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2', got ? 'bg-nova-500/20' : 'bg-ink-100 dark:bg-ink-800')}>
              <Award className={cn('w-6 h-6', got ? 'text-nova-500' : 'text-ink-400')} />
            </div>
            <div className="text-xs font-semibold">{b.name}</div>
            <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-2">{b.description}</div>
          </div>
        )
      })}
    </div>
  )
}
