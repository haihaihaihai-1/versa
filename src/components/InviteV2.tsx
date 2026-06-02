import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Gift, Copy, Share2, Trophy, Users, TrendingUp, Star, Crown, Sparkles } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface InviteRecord {
  id: string
  name: string
  avatar: string
  status: 'registered' | 'ordered' | 'active'
  reward: number
  time: number
}

const SEED: InviteRecord[] = [
  { id: 'i1', name: '小红', avatar: 'https://i.pravatar.cc/100?img=44', status: 'active', reward: 50, time: Date.now() - 86400000 * 2 },
  { id: 'i2', name: '小明', avatar: 'https://i.pravatar.cc/100?img=55', status: 'ordered', reward: 30, time: Date.now() - 86400000 * 3 },
  { id: 'i3', name: '阿花', avatar: 'https://i.pravatar.cc/100?img=66', status: 'registered', reward: 10, time: Date.now() - 86400000 * 5 },
  { id: 'i4', name: '购物达人王', avatar: 'https://i.pravatar.cc/100?img=11', status: 'active', reward: 50, time: Date.now() - 86400000 * 7 },
  { id: 'i5', name: 'Lisa', avatar: 'https://i.pravatar.cc/100?img=22', status: 'active', reward: 50, time: Date.now() - 86400000 * 10 },
]

const STATUS_MAP: Record<InviteRecord['status'], { label: string; color: string }> = {
  registered: { label: '已注册', color: 'bg-blue-500' },
  ordered: { label: '已下单', color: 'bg-amber-500' },
  active: { label: '已成交', color: 'bg-emerald-500' },
}

const RANK = [
  { rank: 1, name: '邀客王老李', avatar: 'https://i.pravatar.cc/100?img=33', count: 286, reward: 12800, badge: '👑' },
  { rank: 2, name: '社交达人 J', avatar: 'https://i.pravatar.cc/100?img=44', count: 198, reward: 8900, badge: '🥈' },
  { rank: 3, name: 'Influencer K', avatar: 'https://i.pravatar.cc/100?img=55', count: 156, reward: 7200, badge: '🥉' },
  { rank: 4, name: '老用户 M', avatar: 'https://i.pravatar.cc/100?img=66', count: 124, reward: 5800 },
  { rank: 5, name: '种草机 N', avatar: 'https://i.pravatar.cc/100?img=77', count: 98, reward: 4500 },
]

const REWARD_TIERS = [
  { count: 1, reward: 10, label: '首邀奖励', icon: '🎁' },
  { count: 5, reward: 80, label: '5 人', icon: '🎉' },
  { count: 10, reward: 200, label: '10 人', icon: '🎊' },
  { count: 20, reward: 500, label: '20 人', icon: '🏆' },
  { count: 50, reward: 1500, label: '50 人', icon: '👑' },
  { count: 100, reward: 5000, label: '100 人', icon: '💎' },
]

export function InviteV2() {
  const [code, setCode] = useState('VERSA-NEW2025')
  const [records, setRecords] = useState<InviteRecord[]>([])
  const [tab, setTab] = useState<'records' | 'rank'>('records')

  useEffect(() => {
    setRecords(SEED)
  }, [])

  const copyCode = () => {
    navigator.clipboard?.writeText(code)
    toast('邀请码已复制', 'success')
  }

  const share = (channel: string) => {
    toast(`已通过 ${channel} 分享`, 'success')
  }

  const totalReward = records.reduce((s, r) => s + r.reward, 0)
  const activeCount = records.filter((r) => r.status === 'active').length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5" />
          <h2 className="text-lg font-bold">邀请 2.0</h2>
        </div>
        <p className="text-xs opacity-90 mb-3">邀请好友, 三重奖励, 上不封顶</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">{records.length}</p>
            <p className="text-[10px] opacity-80">已邀请</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">{activeCount}</p>
            <p className="text-[10px] opacity-80">已成交</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">¥{totalReward}</p>
            <p className="text-[10px] opacity-80">累计奖励</p>
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-4 border border-ink-200/60 dark:border-ink-800/60 text-center">
        <p className="text-xs text-ink-500 mb-2">我的邀请码</p>
        <div className="flex items-center justify-center gap-2">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 font-mono text-2xl font-bold tracking-wider text-violet-500">
            {code}
          </div>
          <button onClick={copyCode} className="w-9 h-9 rounded-full bg-violet-500 text-white flex items-center justify-center">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => share('微信')} className="flex-1 h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold">微信</button>
          <button onClick={() => share('QQ')} className="flex-1 h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold">QQ</button>
          <button onClick={() => share('微博')} className="flex-1 h-9 rounded-lg bg-rose-500 text-white text-xs font-semibold">微博</button>
          <button onClick={() => share('复制链接')} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
            <Share2 className="w-3 h-3" />链接
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />阶梯奖励
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {REWARD_TIERS.map((t) => {
            const achieved = records.length >= t.count
            return (
              <div
                key={t.count}
                className={cn('rounded-xl p-2 text-center border', achieved ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300' : 'bg-ink-50 dark:bg-ink-900/40 border-dashed border-ink-300 dark:border-ink-700 opacity-60')}
              >
                <div className="text-2xl">{t.icon}</div>
                <p className="text-[10px] font-bold mt-0.5">{t.label}</p>
                <p className="text-[10px] text-violet-500 font-bold">¥{t.reward}</p>
                {achieved && <p className="text-[9px] text-emerald-500">已达成</p>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1">
        {[
          { k: 'records', l: `邀请记录 (${records.length})` },
          { k: 'rank', l: '邀请排行' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={cn('flex-1 h-7 rounded-full text-xs font-medium', tab === t.k ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'records' && (
        <div className="space-y-1.5">
          {records.map((r) => {
            const status = STATUS_MAP[r.status]
            return (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
                <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-[10px] text-ink-500">{new Date(r.time).toLocaleDateString()}</p>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded text-white font-semibold', status.color)}>
                  {status.label}
                </span>
                <span className="text-sm font-bold text-rose-500">+¥{r.reward}</span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'rank' && (
        <div className="space-y-1.5">
          {RANK.map((u) => (
            <div key={u.rank} className={cn('flex items-center gap-2 p-2 rounded-xl', u.rank <= 3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/40' : 'bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60')}>
              <div className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-sm font-bold text-ink-500">
                {u.rank <= 3 ? u.badge : u.rank}
              </div>
              <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{u.name}</p>
                <p className="text-[10px] text-ink-500">邀请 {u.count} 人</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-500">¥{u.reward.toLocaleString()}</p>
                <p className="text-[10px] text-ink-500">奖励</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
