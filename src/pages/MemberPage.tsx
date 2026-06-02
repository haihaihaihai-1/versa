import { useState, useMemo } from 'react'
import {
  Crown, Award, Gem, User as UserIcon, ChevronRight, Check, Star, Sparkles,
  Calendar, Eye, Share2, ShoppingBag, TrendingUp, UserPlus, Ticket, Gift,
  Headphones, ArrowLeft, Coins, Flame, Trophy, ChevronDown
} from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import { MEMBER_LEVELS, seedRewards } from '../data/member'
import { formatNumber, formatTimeAgo } from '../lib/utils'

const ICONS: Record<string, any> = {
  User: UserIcon, Award, Crown, Gem, Calendar, Eye, Share2, ShoppingBag, TrendingUp,
  UserPlus, Star, Ticket, Gift, Headphones, Coins,
}

type Tab = 'overview' | 'signin' | 'tasks' | 'mall' | 'records'

export default function MemberPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const { user, pointsRecords, signInDays, tasks, redeemedRewards } = useVersa()
  const currentLevel = MEMBER_LEVELS.find((l) => l.level === user.memberLevel) || MEMBER_LEVELS[0]
  const nextLevel = MEMBER_LEVELS[MEMBER_LEVELS.findIndex((l) => l.level === user.memberLevel) + 1]
  const totalSpend = 2180 // mock total spend for progress

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-yellow-50/30 pb-20">
      {/* Hero 渐变 */}
      <div className={`relative bg-gradient-to-br ${currentLevel.gradient} text-white overflow-hidden`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-2 border-white/40" />
          <div className="absolute top-12 right-12 w-20 h-20 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full border-2 border-white/30" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/40 flex items-center justify-center">
              <Crown className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{currentLevel.name}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">
                  LV{MEMBER_LEVELS.findIndex((l) => l.level === user.memberLevel) + 1}
                </span>
              </div>
              <p className="text-sm opacity-80">{user.displayName} · 享受 {Math.round(currentLevel.pointsRate * 100)}% 积分倍率</p>
            </div>
          </div>

          {/* 积分 + 余额 */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 border border-white/20">
              <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
                <Coins className="w-3.5 h-3.5" />积分
              </div>
              <p className="text-2xl font-bold">{formatNumber(user.points)}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 border border-white/20">
              <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
                <Sparkles className="w-3.5 h-3.5" />余额
              </div>
              <p className="text-2xl font-bold">¥{user.balance.toFixed(2)}</p>
            </div>
          </div>

          {/* 进度 */}
          {nextLevel && (
            <div>
              <div className="flex items-center justify-between text-xs opacity-80 mb-1.5">
                <span>距 {nextLevel.name}</span>
                <span>¥{Math.max(0, nextLevel.threshold - totalSpend)} / ¥{nextLevel.threshold - MEMBER_LEVELS.find((l) => l.level === user.memberLevel)!.threshold}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalSpend / nextLevel.threshold) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-ink-100">
        <div className="max-w-3xl mx-auto flex">
          {[
            { k: 'overview', l: '概览' },
            { k: 'signin', l: '签到' },
            { k: 'tasks', l: '任务' },
            { k: 'mall', l: '积分商城' },
            { k: 'records', l: '明细' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                tab === t.k ? 'text-amber-600' : 'text-ink-500'
              }`}
            >
              {t.l}
              {tab === t.k && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'signin' && <SignInTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'mall' && <MallTab redeemed={redeemedRewards} />}
        {tab === 'records' && <RecordsTab records={pointsRecords} />}
      </div>
    </div>
  )
}

/* ==================== 概览 ==================== */
function OverviewTab() {
  const { user } = useVersa()
  const currentLevel = MEMBER_LEVELS.find((l) => l.level === user.memberLevel) || MEMBER_LEVELS[0]
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-ink-100">
        <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />会员等级特权
        </h3>
        <div className="space-y-2">
          {currentLevel.benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-ink-700">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              {b}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">等级体系</h3>
        <div className="space-y-2">
          {MEMBER_LEVELS.map((l, i) => {
            const Icon = ICONS[l.icon] || UserIcon
            const isCurrent = l.level === user.memberLevel
            return (
              <div
                key={l.level}
                className={`p-3 rounded-2xl border ${
                  isCurrent ? `bg-gradient-to-br ${l.gradient} text-white border-transparent` : 'bg-white border-ink-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isCurrent ? 'bg-white/20' : `bg-gradient-to-br ${l.gradient}`
                  }`}>
                    <Icon className={`w-5 h-5 ${isCurrent ? 'text-white' : 'text-white'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{l.name}</span>
                      {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/30">当前</span>}
                    </div>
                    <p className={`text-xs ${isCurrent ? 'opacity-80' : 'text-ink-500'}`}>
                      累计消费 ≥ ¥{l.threshold} · {Math.round(l.pointsRate * 100)}% 积分
                    </p>
                  </div>
                  <span className={`text-xs ${isCurrent ? 'opacity-80' : 'text-ink-400'}`}>
                    {l.discount > 0 ? `${(l.discount * 10).toFixed(1)} 折` : '无折扣'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ==================== 签到 ==================== */
function SignInTab() {
  const { signInDays, user } = useVersa()
  const today = signInDays.find((d) => d.isToday)
  const signedToday = today?.status === 'done'
  const totalEarned = signInDays.filter((d) => d.status === 'done').reduce((a, d) => a + d.points, 0)
  const continuous = signInDays.filter((d) => d.status === 'done' || d.status === 'today').length

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs opacity-80">连续签到 {continuous} 天</p>
            <p className="text-3xl font-bold mt-1">+{totalEarned} <span className="text-sm font-normal opacity-80">积分</span></p>
          </div>
          <Flame className="w-10 h-10 opacity-50" />
        </div>
        <p className="text-xs opacity-80 mb-3">7 天累计可领 450 积分 + 神秘大礼包</p>
        <button
          onClick={() => !signedToday && versa.signIn()}
          disabled={signedToday}
          className={`w-full py-2.5 rounded-full font-medium text-sm ${
            signedToday ? 'bg-white/30 cursor-not-allowed' : 'bg-white text-pink-600 hover:bg-pink-50'
          }`}
        >
          {signedToday ? '✅ 今日已签到' : '立即签到 +' + (today?.points || 0)}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">7 天奖励</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {signInDays.map((d) => (
            <div
              key={d.day}
              className={`p-2 rounded-xl text-center border ${
                d.status === 'done'
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-transparent'
                  : d.isToday
                  ? 'bg-white border-rose-400 ring-2 ring-rose-200'
                  : 'bg-white border-ink-100'
              }`}
            >
              <p className="text-[10px] opacity-70">第{d.day}天</p>
              <p className="text-base font-bold my-1">+{d.points}</p>
              {d.isReward && <p className="text-[9px] text-rose-500 font-medium">大礼包</p>}
              {d.status === 'done' && <Check className="w-3 h-3 mx-auto mt-0.5" />}
              {d.isToday && !signedToday && <span className="text-[9px] text-rose-500">今日</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
        <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>签到福利：</strong>连续签到 7 天可获得 200 积分 + 神秘大礼包。中断签到将重置进度。
        </p>
      </div>
    </div>
  )
}

/* ==================== 任务 ==================== */
function TasksTab() {
  const { tasks } = useVersa()
  const daily = tasks.filter((t) => t.type === 'daily')
  const achieve = tasks.filter((t) => t.type === 'achieve')

  const renderTask = (t: typeof tasks[number]) => {
    const Icon = ICONS[t.icon] || Star
    return (
      <div key={t.id} className="bg-white border border-ink-100 rounded-2xl p-3 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-ink-800">{t.name}</p>
            {t.completed && !t.claimed && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">可领</span>}
            {t.claimed && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ink-100 text-ink-500">已领</span>}
          </div>
          <p className="text-[11px] text-ink-500 mt-0.5">{t.desc}</p>
          {/* 进度条 */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${t.gradient}`} style={{ width: `${Math.min(100, (t.progress / t.target) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-ink-500 flex-shrink-0">{t.progress}/{t.target}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-amber-600">+{t.points}</p>
          {t.completed && !t.claimed ? (
            <button
              onClick={() => versa.claimTask(t.id)}
              className="mt-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-medium"
            >领取</button>
          ) : t.claimed ? (
            <span className="text-[10px] text-ink-400 mt-1 block">已到账</span>
          ) : (
            <span className="text-[10px] text-ink-400 mt-1 block">进行中</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-rose-500" />每日任务
          <span className="text-[10px] text-ink-400 font-normal">每日 0 点刷新</span>
        </h3>
        <div className="space-y-2">{daily.map(renderTask)}</div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />成就任务
          <span className="text-[10px] text-ink-400 font-normal">长期任务</span>
        </h3>
        <div className="space-y-2">{achieve.map(renderTask)}</div>
      </div>
    </div>
  )
}

/* ==================== 积分商城 ==================== */
function MallTab({ redeemed }: { redeemed: string[] }) {
  const { user } = useVersa()
  const [filter, setFilter] = useState<'all' | 'coupon' | 'product' | 'privilege' | 'gift'>('all')
  const items = filter === 'all' ? seedRewards : seedRewards.filter((r) => r.type === filter)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {[
          { k: 'all', l: '全部' },
          { k: 'coupon', l: '优惠券' },
          { k: 'product', l: '实物' },
          { k: 'privilege', l: '特权' },
          { k: 'gift', l: '礼包' },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k as any)}
            className={`py-1.5 rounded-full text-xs font-medium ${
              filter === f.k ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' : 'bg-white text-ink-600 border border-ink-200'
            }`}
          >{f.l}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((r) => {
          const isRedeemed = redeemed.includes(r.id)
          const canAfford = user.points >= r.cost
          return (
            <div key={r.id} className="bg-white rounded-2xl overflow-hidden border border-ink-100">
              <div className="relative aspect-square" style={{ background: r.coverGradient }}>
                {r.badge && (
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-white font-medium">{r.badge}</span>
                )}
                {isRedeemed && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">已兑换</span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-bold text-amber-600">
                  {formatNumber(r.cost)} 积分
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                  {r.type === 'product' ? '实物' : r.type === 'coupon' ? '优惠券' : r.type === 'privilege' ? '会员特权' : '礼包'}
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-ink-800 truncate">{r.name}</p>
                <p className="text-[11px] text-ink-500 line-clamp-1 mt-0.5">{r.desc}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-ink-400">剩 {r.stock} 份</span>
                  <button
                    onClick={() => !isRedeemed && canAfford && versa.redeemReward(r.id)}
                    disabled={isRedeemed || !canAfford}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isRedeemed
                        ? 'bg-ink-100 text-ink-400'
                        : canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white'
                        : 'bg-ink-100 text-ink-400'
                    }`}
                  >{isRedeemed ? '已兑换' : canAfford ? '立即兑换' : '积分不足'}</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==================== 积分明细 ==================== */
function RecordsTab({ records }: { records: any[] }) {
  return (
    <div className="space-y-2">
      {records.length === 0 ? (
        <div className="text-center py-20 text-ink-400 text-sm">暂无积分记录</div>
      ) : (
        records.map((r) => (
          <div key={r.id} className="bg-white border border-ink-100 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              r.type === 'earn' ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-rose-400 to-pink-500'
            }`}>
              {r.type === 'earn' ? <Coins className="w-4 h-4 text-white" /> : <Gift className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-800 truncate">{r.title}</p>
              <p className="text-[11px] text-ink-400">{formatTimeAgo(r.at)}</p>
            </div>
            <span className={`text-base font-bold ${r.type === 'earn' ? 'text-amber-600' : 'text-rose-500'}`}>
              {r.amount > 0 ? '+' : ''}{r.amount}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
