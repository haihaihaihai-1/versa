import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Users, ShoppingBag, MessageSquare, Eye, ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react'
import { products } from '../data/products'
import { debates } from '../data/debates'
import { news } from '../data/news'
import api from '../api'
import { useStoreVersion } from '../api/hooks'

const RANGES = [
  { key: '7d', label: '7 天' },
  { key: '30d', label: '30 天' },
  { key: '90d', label: '90 天' },
]

export function AdminAnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  useStoreVersion()
  const data = useMemo(() => generateData(range), [range])
  const state = api.debug.state()
  const totalRevenue = 12450 + Math.floor(Math.random() * 5000)
  const totalOrders = Object.values(state.userState || {}).flat().filter((s: any) => s.orders).reduce((sum: number, u: any) => sum + ((u.orders?.length) || 0), 0) || 1
  const totalUsers = Object.keys(state.users || {}).length || 1
  const totalPosts = Object.values(state.posts || {}).flat().length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5" />数据分析</h1>
          <p className="text-sm text-ink-500 mt-1">实时业务指标与趋势</p>
        </div>
        <div className="inline-flex p-1 rounded-full bg-ink-100 dark:bg-ink-800">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${range === r.key ? 'bg-white dark:bg-ink-700 shadow-sm' : 'text-ink-500'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={DollarSign} label="总营收" value={`¥${totalRevenue.toLocaleString()}`} delta="+12.4%" up color="from-emerald-500 to-teal-500" />
        <Kpi icon={ShoppingBag} label="订单数" value={totalOrders.toString()} delta="+8.2%" up color="from-rose-500 to-pink-500" />
        <Kpi icon={Users} label="活跃用户" value={totalUsers.toString()} delta="+15.3%" up color="from-violet-500 to-fuchsia-500" />
        <Kpi icon={MessageSquare} label="新增帖子" value={totalPosts.toString()} delta="-2.1%" color="from-amber-500 to-orange-500" />
      </div>

      {/* 主图表 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="访问量趋势" data={data.traffic} unit="次" color="#7344ff" />
        <ChartCard title="订单趋势" data={data.orders} unit="单" color="#ec4899" />
      </div>

      {/* 表格 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-rose-500" />热门商品 Top 5</h3>
          <div className="space-y-2">
            {products.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800/50">
                <span className="w-6 h-6 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 overflow-hidden shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-ink-500">{p.brand} · ¥{p.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{Math.floor(100 + Math.random() * 900)}</p>
                  <p className="text-[10px] text-emerald-500">售出</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Activity className="w-4 h-4 text-violet-500" />模块访问占比</h3>
          <div className="space-y-3">
            {[
              { name: '购物', value: 42, color: 'bg-rose-500' },
              { name: '辩论', value: 23, color: 'bg-violet-500' },
              { name: '资讯', value: 18, color: 'bg-amber-500' },
              { name: '群组', value: 10, color: 'bg-cyan-500' },
              { name: '动态', value: 7, color: 'bg-pink-500' },
            ].map((m) => (
              <div key={m.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{m.name}</span>
                  <span className="font-medium">{m.value}%</span>
                </div>
                <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 内容统计 */}
      <section className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h3 className="text-sm font-semibold mb-3">内容统计</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: '商品', value: products.length, icon: ShoppingBag, color: 'from-rose-500 to-pink-500' },
            { label: '辩论', value: debates.length, icon: MessageSquare, color: 'from-violet-500 to-fuchsia-500' },
            { label: '资讯', value: news.length, icon: Eye, color: 'from-amber-500 to-orange-500' },
            { label: '帖子', value: totalPosts, icon: MessageSquare, color: 'from-cyan-500 to-blue-500' },
            { label: '订单', value: totalOrders, icon: ShoppingBag, color: 'from-emerald-500 to-teal-500' },
            { label: '用户', value: totalUsers, icon: Users, color: 'from-fuchsia-500 to-pink-500' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="p-3 rounded-xl bg-gradient-to-br from-ink-50 to-white dark:from-ink-900 dark:to-ink-800 border border-ink-200/40 dark:border-ink-800/40 text-center">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} mx-auto mb-1.5 flex items-center justify-center text-white`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-ink-500">{s.label}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, delta, up, color }: { icon: any; label: string; value: string; delta: string; up?: boolean; color: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className={`text-xs mt-1 flex items-center gap-0.5 ${up === false ? 'text-rose-500' : 'text-emerald-500'}`}>
        {up === false ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        {delta} <span className="text-ink-400">vs 上周</span>
      </p>
    </div>
  )
}

function ChartCard({ title, data, unit, color }: { title: string; data: number[]; unit: string; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <section className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-5">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="h-40 flex items-end gap-1">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{ height: `${(v / max) * 100}%`, background: `linear-gradient(to top, ${color}88, ${color})`, minHeight: '4px' }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-ink-900 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                {v} {unit}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function generateData(range: '7d' | '30d' | '90d') {
  const len = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const traffic = Array.from({ length: len }, () => Math.floor(200 + Math.random() * 800))
  const orders = Array.from({ length: len }, () => Math.floor(5 + Math.random() * 50))
  return { traffic, orders }
}

export default AdminAnalyticsPage
