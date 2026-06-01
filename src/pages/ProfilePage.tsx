import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Edit3, Award, Newspaper, Scale, ShoppingBag, Heart, Package, Activity, Settings, LogOut, Sparkles, TrendingUp, Check } from 'lucide-react'
import { useVersa, versa, levelFor, levelTitle, levelProgress } from '../store/versa'
import { allBadges, moduleMeta } from '../data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ProgressBar, ScorePill } from '../components/ui/Progress'
import { Tabs } from '../components/ui/Tabs'
import { formatTimeAgo, formatNumber, cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export function ProfilePage() {
  const { user, visitedModules } = useVersa()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio)
  const rep = levelProgress(user.reputation)

  const earnedIds = new Set(user.badges.map((b) => b.id))
  const isEarned = (id: string) => earnedIds.has(id) || id === 'b_early'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-nova-500/10 via-debate-500/5 to-shop-500/10 border border-ink-200/60 dark:border-ink-800/60 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative">
            <img src={user.avatar} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-white dark:ring-ink-900" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-nova-500 to-shop-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white dark:ring-ink-900">
              {user.level}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {!editing ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold">{user.displayName}</h1>
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400 hover:text-ink-900 dark:hover:text-white">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-ink-500 dark:text-ink-400">@{user.username} · 加入于 {formatTimeAgo(user.joinedAt)}</div>
                <p className="mt-3 text-ink-700 dark:text-ink-200 max-w-xl">{user.bio}</p>
              </>
            ) : (
              <div className="space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 focus:border-nova-500 outline-none text-sm" />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 focus:border-nova-500 outline-none text-sm resize-none" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { versa.updateProfile({ displayName: name, bio }); setEditing(false); toast('已更新', 'success') }} leftIcon={<Check className="w-3.5 h-3.5" />}>保存</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>取消</Button>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ScorePill variant="nova" label="声誉" value={user.reputation} icon={Sparkles} />
              <ScorePill variant="news" label="资讯" value={user.stats.articlesRead} />
              <ScorePill variant="debate" label="辩论" value={user.stats.debatesJoined + user.stats.argumentsPosted} />
              <ScorePill variant="shop" label="购买" value={user.stats.productsPurchased} />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-ink-200/60 dark:border-ink-800/60">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-ink-500">Lv.{user.level} · {levelTitle(user.level)}</span>
            <span className="text-ink-500">{user.reputation} 声誉</span>
          </div>
          <ProgressBar value={rep.percent} variant="gradient" height="md" />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <QuickLink to="/profile/orders" icon={Package} label="我的订单" color="shop" />
        <QuickLink to="/profile/wishlist" icon={Heart} label="我的收藏" color="debate" />
        <QuickLink to="/news" icon={Newspaper} label="继续阅读" color="news" />
        <QuickLink to="/debates" icon={Scale} label="参与辩论" color="nova" />
      </div>

      {/* Tabs */}
      <Tabs
        variant="underline"
        tabs={[
          { value: 'badges', label: '勋章', icon: <Award className="w-3.5 h-3.5" /> },
          { value: 'activity', label: '活动流', icon: <Activity className="w-3.5 h-3.5" /> },
          { value: 'modules', label: '足迹', icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ]}
        value="badges"
        onChange={() => {}}
      />

      <div className="mt-6">
        <BadgeGallery />
      </div>

      {user.activity.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4" />最近活动</h3>
          <div className="space-y-2">
            {user.activity.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 text-sm">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
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
        </div>
      )}

      {/* 跨模块足迹 */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" />跨模块足迹</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['news', 'debate', 'shop'] as const).map((k) => (
            <div key={k} className="p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: moduleMeta[k].color + '20', color: moduleMeta[k].color }}>
                  {k === 'news' ? <Newspaper className="w-4 h-4" /> : k === 'debate' ? <Scale className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <span className="font-semibold text-sm">{moduleMeta[k].name}</span>
              </div>
              <div className="text-2xl font-bold">{visitedModules[k]}</div>
              <div className="text-xs text-ink-500">次访问</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: 'shop' | 'debate' | 'news' | 'nova' }) {
  const colorMap = {
    shop: 'from-shop-500/10 to-shop-500/0 text-shop-600',
    debate: 'from-debate-500/10 to-debate-500/0 text-debate-600',
    news: 'from-news-500/10 to-news-500/0 text-news-600',
    nova: 'from-nova-500/10 to-nova-500/0 text-nova-600',
  }
  return (
    <Link to={to} className={cn('p-4 rounded-2xl bg-gradient-to-br border border-ink-200/60 dark:border-ink-800/60 card-hover', colorMap[color])}>
      <Icon className="w-5 h-5 mb-2" />
      <div className="text-sm font-semibold">{label}</div>
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
