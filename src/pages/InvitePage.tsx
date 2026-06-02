import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Gift, Copy, Share2, Users, Sparkles, Trophy,
  Crown, CheckCircle2, Clock, Zap, TrendingUp
} from 'lucide-react'

interface InviteRecord {
  id: string
  name: string
  avatar: string
  status: 'registered' | 'ordered'
  reward: number
  at: string
}

const SEED_RECORDS: InviteRecord[] = [
  { id: 'r1', name: '小红豆', avatar: 'https://i.pravatar.cc/120?img=20', status: 'ordered', reward: 30, at: '2026-05-28' },
  { id: 'r2', name: '思考者', avatar: 'https://i.pravatar.cc/120?img=25', status: 'registered', reward: 10, at: '2026-05-25' },
  { id: 'r3', name: '晴天', avatar: 'https://i.pravatar.cc/120?img=27', status: 'ordered', reward: 30, at: '2026-05-22' },
  { id: 'r4', name: '夜归人', avatar: 'https://i.pravatar.cc/120?img=33', status: 'ordered', reward: 30, at: '2026-05-18' },
  { id: 'r5', name: '云中鸟', avatar: 'https://i.pravatar.cc/120?img=35', status: 'registered', reward: 10, at: '2026-05-15' },
  { id: 'r6', name: '海风', avatar: 'https://i.pravatar.cc/120?img=40', status: 'ordered', reward: 30, at: '2026-05-10' },
  { id: 'r7', name: '夏目', avatar: 'https://i.pravatar.cc/120?img=45', status: 'ordered', reward: 30, at: '2026-05-05' },
]

export function InvitePage() {
  const navigate = useNavigate()
  const [inviteCode] = useState('VERSA-' + Math.random().toString(36).slice(2, 6).toUpperCase())
  const [records, setRecords] = useState<InviteRecord[]>(SEED_RECORDS)
  const [tab, setTab] = useState<'overview' | 'records' | 'tiers'>('overview')

  const totalReward = records.reduce((s, r) => s + r.reward, 0)
  const totalInvites = records.length
  const orderedCount = records.filter((r) => r.status === 'ordered').length

  const tiers = [
    { count: 1, reward: 10, label: '青铜邀请', icon: Sparkles, color: 'from-amber-700 to-amber-900' },
    { count: 5, reward: 80, label: '白银邀请', icon: Trophy, color: 'from-slate-400 to-slate-500' },
    { count: 15, reward: 300, label: '黄金邀请', icon: Crown, color: 'from-yellow-400 to-amber-500' },
    { count: 50, reward: 1500, label: '钻石邀请', icon: Crown, color: 'from-cyan-400 to-blue-500' },
    { count: 100, reward: 5000, label: '至尊邀请', icon: Crown, color: 'from-fuchsia-500 to-purple-600' },
  ]

  const currentTier = [...tiers].reverse().find((t) => totalInvites >= t.count) || tiers[0]
  const nextTier = tiers.find((t) => totalInvites < t.count)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-rose-500 to-fuchsia-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs mb-3">
            <Gift className="w-3 h-3" />
            邀请有礼
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">邀请好友 · 双方都得奖</h1>
          <p className="text-white/90 mb-5 max-w-xl">
            每邀请 1 位好友注册得 <strong>10 积分</strong>，好友首单再得 <strong>30 积分</strong>，无上限累计！
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <div className="text-3xl font-black">{totalInvites}</div>
              <div className="text-xs text-white/80">已邀请</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <div className="text-3xl font-black">{orderedCount}</div>
              <div className="text-xs text-white/80">已下单</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <div className="text-3xl font-black">{totalReward}</div>
              <div className="text-xs text-white/80">累计积分</div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite code */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <p className="text-sm text-ink-500 mb-2">我的邀请码</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-ink-50 to-ink-100 dark:from-ink-800 dark:to-ink-700 font-mono text-xl font-black text-center tracking-wider">
            {inviteCode}
          </div>
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(inviteCode)
              toast('邀请码已复制', 'success')
            }}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            复制
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(`https://haihaihaihai-1.github.io/versa/?invite=${inviteCode}`)
              toast('邀请链接已复制', 'success')
            }}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            分享
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-200 dark:border-ink-800 pb-3">
        {[
          { key: 'overview', label: '进度' },
          { key: 'records', label: `邀请记录 (${records.length})` },
          { key: 'tiers', label: '奖励阶梯' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition',
              tab === t.key
                ? 'bg-amber-500 text-white shadow'
                : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Current tier */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br', currentTier.color)}>
                <currentTier.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-ink-500">当前等级</p>
                <h3 className="text-lg font-bold">{currentTier.label}</h3>
              </div>
            </div>
            {nextTier && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>距离 {nextTier.label}</span>
                  <span>{totalInvites} / {nextTier.count}</span>
                </div>
                <div className="h-2 rounded-full bg-white/40 dark:bg-ink-900/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalInvites / nextTier.count) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                  />
                </div>
                <p className="text-xs text-ink-500 mt-2">
                  再邀请 <strong className="text-amber-600">{nextTier.count - totalInvites}</strong> 人可解锁 <strong>¥{nextTier.reward}</strong> 阶梯奖励
                </p>
              </div>
            )}
          </div>

          {/* Reward rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/60 p-4">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                邀请人奖励（你）
              </h3>
              <ul className="text-sm space-y-1.5 mt-2 text-ink-700 dark:text-ink-200">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  好友注册：+10 积分
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  好友首单：+30 积分
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  阶梯奖励：最高 5000 积分
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200/60 dark:border-rose-800/60 p-4">
              <h3 className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Gift className="w-4 h-4" />
                被邀请人奖励（好友）
              </h3>
              <ul className="text-sm space-y-1.5 mt-2 text-ink-700 dark:text-ink-200">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-rose-500" />
                  注册即得 30 元无门槛券
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-rose-500" />
                  首单 9 折 + 20 元券
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-rose-500" />
                  会员 7 天试用
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      {tab === 'records' && (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4 flex items-center gap-3"
            >
              <img src={r.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-ink-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {r.at}
                </p>
              </div>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                r.status === 'ordered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-ink-100 text-ink-500'
              )}>
                {r.status === 'ordered' ? '已下单' : '已注册'}
              </span>
              <span className="text-shop-600 font-bold text-sm">+{r.reward} 积分</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'tiers' && (
        <div className="space-y-2">
          {tiers.map((t) => {
            const Icon = t.icon
            const reached = totalInvites >= t.count
            return (
              <div
                key={t.count}
                className={cn(
                  'rounded-2xl p-4 flex items-center gap-3 border',
                  reached
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-700'
                    : 'bg-white/80 dark:bg-ink-900/60 border-ink-200/60 dark:border-ink-800/60'
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br', t.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{t.label}</h3>
                  <p className="text-xs text-ink-500">邀请 {t.count} 人</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-amber-600">¥{t.reward}</p>
                  {reached && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> 已达成
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
