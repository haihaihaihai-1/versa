import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Heart, Star, Gift, Award, DollarSign, Video, FileText, ShoppingBag, BarChart3, Eye, MessageCircle } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '../lib/utils'

const TABS = [
  { key: 'overview', label: '概览' },
  { key: 'content', label: '内容' },
  { key: 'live', label: '直播' },
  { key: 'product', label: '商品' },
  { key: 'revenue', label: '收益' },
] as const

const WEEKLY = [1200, 1900, 1500, 2200, 2800, 3500, 4200]
const DAILY = [42, 58, 31, 89, 64, 102, 78]

const CONTENTS = [
  { id: 'c1', type: 'post', title: '618 数码好物推荐', views: 12400, likes: 856, comments: 124, time: '2h 前' },
  { id: 'c2', type: 'video', title: 'iPhone 16 体验视频', views: 8900, likes: 612, comments: 89, time: '1d 前' },
  { id: 'c3', type: 'post', title: '露营装备清单分享', views: 5600, likes: 432, comments: 67, time: '2d 前' },
  { id: 'c4', type: 'video', title: '美食探店 vlog', views: 3400, likes: 234, comments: 45, time: '3d 前' },
]

const REVENUE = [
  { src: '商品佣金', amount: 4580, color: 'bg-rose-500', percent: 65 },
  { src: '礼物分成', amount: 1280, color: 'bg-violet-500', percent: 18 },
  { src: '直播打赏', amount: 760, color: 'bg-amber-500', percent: 11 },
  { src: '平台激励', amount: 420, color: 'bg-blue-500', percent: 6 },
]

export function CreatorStudio() {
  const [tab, setTab] = useState<typeof TABS[number]['key']>('overview')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-nova-500 via-pink-500 to-violet-500 p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] opacity-80">本周总收益</p>
            <p className="text-3xl font-bold">¥{formatNumber(7040)}</p>
            <p className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />较上周 <span className="font-bold">+18.6%</span>
            </p>
          </div>
          <button className="px-3 h-8 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold">提现</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-[10px] opacity-80">粉丝</p>
            <p className="text-base font-bold">12.8w</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-[10px] opacity-80">本周阅读</p>
            <p className="text-base font-bold">3.4w</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-[10px] opacity-80">互动</p>
            <p className="text-base font-bold">2.1w</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium flex-shrink-0',
              tab === t.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" />本周数据</p>
              <span className="text-[10px] text-ink-500">近 7 天</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {WEEKLY.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gradient-to-t from-nova-500 to-pink-400 rounded-t" style={{ height: `${(v / 5000) * 100}%` }} />
                  <span className="text-[8px] text-ink-500">{'一二三四五六日'[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
              <Award className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-xs text-ink-500">创作者等级</p>
              <p className="text-lg font-bold">Lv. 5</p>
              <p className="text-[10px] text-ink-400">距 Lv.6 还差 320 经验</p>
            </div>
            <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
              <Star className="w-5 h-5 text-rose-500 mb-1" />
              <p className="text-xs text-ink-500">内容评分</p>
              <p className="text-lg font-bold">4.8</p>
              <p className="text-[10px] text-ink-400">超过 92% 创作者</p>
            </div>
          </div>
        </>
      )}

      {tab === 'content' && (
        <div className="space-y-1.5">
          {CONTENTS.map((c) => (
            <div key={c.id} className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2.5 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', c.type === 'video' ? 'bg-rose-100 text-rose-500 dark:bg-rose-900/30' : 'bg-blue-100 text-blue-500 dark:bg-blue-900/30')}>
                {c.type === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold line-clamp-1">{c.title}</p>
                <p className="text-[10px] text-ink-500 flex items-center gap-2">
                  <span><Eye className="inline w-2.5 h-2.5 mr-0.5" />{formatNumber(c.views)}</span>
                  <span><Heart className="inline w-2.5 h-2.5 mr-0.5" />{c.likes}</span>
                  <span><MessageCircle className="inline w-2.5 h-2.5 mr-0.5" />{c.comments}</span>
                  <span>· {c.time}</span>
                </p>
              </div>
              <button className="text-[10px] text-ink-500 hover:text-nova-500">分析</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-2">
          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
            <p className="text-sm font-bold mb-2">本月直播</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-rose-500">8</p>
                <p className="text-[10px] text-ink-500">直播场次</p>
              </div>
              <div>
                <p className="text-xl font-bold text-rose-500">5.6w</p>
                <p className="text-[10px] text-ink-500">观看人次</p>
              </div>
              <div>
                <p className="text-xl font-bold text-rose-500">¥3.2k</p>
                <p className="text-[10px] text-ink-500">礼物收入</p>
              </div>
            </div>
          </div>
          <button className="w-full h-10 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-1">
            <Video className="w-4 h-4" />开始直播
          </button>
        </div>
      )}

      {tab === 'product' && (
        <div className="space-y-2">
          {[
            { id: 'p1', name: 'iPhone 16 Pro', sales: 156, commission: 2340, status: '在售' },
            { id: 'p2', name: 'AirPods Pro 2', sales: 89, commission: 890, status: '在售' },
            { id: 'p3', name: 'Apple Watch S10', sales: 45, commission: 1350, status: '审核中' },
          ].map((p) => (
            <div key={p.id} className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2.5 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-ink-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-[10px] text-ink-500">已售 {p.sales} 件</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-rose-500">¥{p.commission}</p>
                <span className="text-[10px] text-ink-500">{p.status}</span>
              </div>
            </div>
          ))}
          <button className="w-full h-9 rounded-xl border-2 border-dashed border-nova-300 text-nova-500 text-sm font-semibold">+ 添加商品</button>
        </div>
      )}

      {tab === 'revenue' && (
        <div className="space-y-3">
          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
            <p className="text-sm font-bold mb-2 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />本月收益构成</p>
            <div className="space-y-1.5">
              {REVENUE.map((r) => (
                <div key={r.src}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs">{r.src}</span>
                    <span className="text-xs font-bold">¥{r.amount} · {r.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <div className={cn('h-full', r.color)} style={{ width: `${r.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
            <p className="text-sm font-bold mb-2">提现记录</p>
            <div className="space-y-1.5 text-xs">
              {[
                { date: '06-01', amount: 5800, status: '已到账' },
                { date: '05-15', amount: 4200, status: '已到账' },
                { date: '05-01', amount: 6100, status: '已到账' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-ink-100 dark:border-ink-800 last:border-0">
                  <span>{r.date}</span>
                  <span className="font-bold">¥{r.amount}</span>
                  <span className="text-emerald-500 text-[10px]">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
