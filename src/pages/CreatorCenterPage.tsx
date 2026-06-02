import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVersa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn, formatCurrency, formatNumber } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, TrendingUp, DollarSign, Users, Eye, Heart,
  MessageCircle, Star, FileText, Video, ShoppingBag,
  BarChart3, Award, Sparkles, Crown, Zap, ChevronRight,
  Calendar, ArrowUpRight, CheckCircle2
} from 'lucide-react'

type Tab = 'overview' | 'content' | 'earnings' | 'fans'

const SEEN_FANS = [
  { id: 'f1', name: '小红豆', avatar: 'https://i.pravatar.cc/120?img=20', tier: '黄金粉', spend: 1280, joined: '2026-04-12' },
  { id: 'f2', name: '思考者', avatar: 'https://i.pravatar.cc/120?img=25', tier: '白银粉', spend: 580, joined: '2026-05-01' },
  { id: 'f3', name: '晴天', avatar: 'https://i.pravatar.cc/120?img=27', tier: '钻石粉', spend: 4500, joined: '2026-03-08' },
  { id: 'f4', name: '夜归人', avatar: 'https://i.pravatar.cc/120?img=33', tier: '黄金粉', spend: 2100, joined: '2026-04-25' },
  { id: 'f5', name: '云中鸟', avatar: 'https://i.pravatar.cc/120?img=35', tier: '白银粉', spend: 320, joined: '2026-05-20' },
]

const CONTENT_LIST = [
  { id: 'c1', type: 'post', title: '为什么我放弃 200 万年薪去 Versa？', views: 12.4, likes: 1280, comments: 86, at: '2026-05-28', status: 'published' },
  { id: 'c2', type: 'video', title: '618 iPhone 选购避坑指南', views: 45.2, likes: 3240, comments: 412, at: '2026-05-25', status: 'published' },
  { id: 'c3', type: 'post', title: '聊聊我对消费降级的 3 个反思', views: 8.6, likes: 924, comments: 156, at: '2026-05-22', status: 'published' },
  { id: 'c4', type: 'video', title: '50 元早餐挑战 5 家网红店', views: 22.8, likes: 1820, comments: 245, at: '2026-05-18', status: 'published' },
  { id: 'c5', type: 'post', title: 'Versa 三体融合：一种新的内容形态', views: 5.2, likes: 482, comments: 67, at: '2026-05-15', status: 'draft' },
  { id: 'c6', type: 'post', title: '测评 5 款国产耳机，结果有点意外', views: 18.6, likes: 1580, comments: 234, at: '2026-05-10', status: 'published' },
]

const EARNINGS = [
  { month: '1月', value: 3200 },
  { month: '2月', value: 4800 },
  { month: '3月', value: 5200 },
  { month: '4月', value: 7600 },
  { month: '5月', value: 12400 },
]

export function CreatorCenterPage() {
  const navigate = useNavigate()
  const { user } = useVersa()
  const [tab, setTab] = useState<Tab>('overview')

  const totalEarnings = EARNINGS.reduce((s, e) => s + e.value, 0)
  const totalFollowers = 12_840
  const totalViews = CONTENT_LIST.reduce((s, c) => s + c.views, 0) * 10000
  const totalLikes = CONTENT_LIST.reduce((s, c) => s + c.likes, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-nova-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <img
            src={user.avatar}
            alt=""
            className="w-20 h-20 rounded-2xl border-4 border-white/30 shadow-2xl"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-xs text-white/80">认证创作者</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">{user.displayName} 创作者中心</h1>
            <p className="text-white/80 text-sm">L{user.level || 1} · {user.username} · 加入 365 天</p>
          </div>
          <Link
            to={`/u/${user.username}`}
            className="px-4 py-2 rounded-full bg-white/20 backdrop-blur text-sm hover:bg-white/30 transition flex items-center gap-1"
          >
            公开主页 <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 dark:border-ink-800 pb-3">
        {[
          { key: 'overview', label: '总览', icon: BarChart3 },
          { key: 'content', label: '内容管理', icon: FileText },
          { key: 'earnings', label: '收益', icon: DollarSign },
          { key: 'fans', label: '粉丝', icon: Users },
        ].map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5',
                tab === t.key
                  ? 'bg-fuchsia-500 text-white shadow'
                  : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="总收益" value={formatCurrency(totalEarnings)} icon={DollarSign} color="from-amber-500 to-orange-500" trend="+18%" />
            <KPICard label="粉丝数" value={formatNumber(totalFollowers)} icon={Users} color="from-fuchsia-500 to-purple-500" trend="+342" />
            <KPICard label="总曝光" value={formatNumber(totalViews)} icon={Eye} color="from-nova-500 to-blue-500" trend="+24%" />
            <KPICard label="总获赞" value={formatNumber(totalLikes)} icon={Heart} color="from-rose-500 to-pink-500" />
          </div>

          {/* Earnings chart */}
          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
            <h3 className="text-lg font-bold mb-4">收益趋势（最近 5 个月）</h3>
            <div className="flex items-end gap-3 h-40">
              {EARNINGS.map((e, i) => {
                const max = Math.max(...EARNINGS.map((x) => x.value))
                return (
                  <div key={e.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] text-ink-500">{e.value.toLocaleString()}</div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(e.value / max) * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-fuchsia-500 to-amber-400 min-h-[4px]"
                    />
                    <div className="text-xs text-ink-500">{e.month}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={FileText} label="发布文章" gradient="from-nova-500 to-blue-500" onClick={() => navigate('/compose')} />
            <QuickAction icon={Video} label="上传视频" gradient="from-shop-500 to-news-500" onClick={() => toast('即将开放', 'info')} />
            <QuickAction icon={ShoppingBag} label="带货推广" gradient="from-emerald-500 to-teal-500" onClick={() => toast('即将开放', 'info')} />
            <QuickAction icon={Award} label="创作者活动" gradient="from-amber-500 to-orange-500" onClick={() => toast('即将开放', 'info')} />
          </div>
        </>
      )}

      {tab === 'content' && (
        <div className="space-y-2">
          {CONTENT_LIST.map((c) => {
            const Icon = c.type === 'video' ? Video : FileText
            return (
              <div
                key={c.id}
                className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-500 to-fuchsia-500 flex items-center justify-center text-white flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm line-clamp-1">{c.title}</h3>
                      {c.status === 'draft' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                          草稿
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {(c.views * 10000).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {c.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {c.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {c.at}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-400" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'earnings' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-white shadow-xl">
            <p className="text-sm text-white/80">可提现余额</p>
            <p className="text-5xl font-black mt-1">{formatCurrency(totalEarnings)}</p>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => toast('提现申请已提交，1-3 个工作日到账', 'success')}
                className="bg-white text-amber-600 hover:bg-white/90"
              >
                立即提现
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast('明细已导出', 'info')}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                导出明细
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
            <h3 className="font-semibold mb-3">收益来源</h3>
            <div className="space-y-2.5">
              {[
                { label: '内容创作激励', value: 18400, percent: 56, color: 'from-nova-500 to-fuchsia-500' },
                { label: '商品带货佣金', value: 8400, percent: 26, color: 'from-shop-500 to-news-500' },
                { label: '直播打赏分成', value: 3800, percent: 12, color: 'from-rose-500 to-pink-500' },
                { label: '会员订阅分成', value: 1800, percent: 6, color: 'from-amber-500 to-orange-500' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{s.label}</span>
                    <span className="font-medium">
                      {formatCurrency(s.value)} <span className="text-ink-500">({s.percent}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${s.color}`} style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'fans' && (
        <div className="space-y-2">
          {SEEN_FANS.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4 flex items-center gap-3"
            >
              <img src={f.avatar} alt="" className="w-12 h-12 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{f.name}</p>
                <p className="text-xs text-ink-500">加入 {f.joined} · 消费 {formatCurrency(f.spend)}</p>
              </div>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                f.tier === '钻石粉' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                f.tier === '黄金粉' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800'
              )}>
                {f.tier}
              </span>
              <Button size="sm" variant="outline">
                私信
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4">
      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-2', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5">
        <span>{label}</span>
        {trend && <span className="text-emerald-500">· {trend}</span>}
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, gradient, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-2xl text-white text-left shadow hover:shadow-lg hover:-translate-y-0.5 transition bg-gradient-to-br',
        gradient
      )}
    >
      <Icon className="w-6 h-6 mb-2" />
      <p className="font-semibold text-sm">{label}</p>
    </button>
  )
}
