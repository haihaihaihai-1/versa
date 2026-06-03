import { useState } from 'react'
import { TrendingUp, PieChart, Coins, Bitcoin, BarChart3, Activity, LineChart, Newspaper } from 'lucide-react'
import { cn } from '../lib/utils'
import { StockSimulator } from '../components/StockSimulator'
import { PortfolioTracker } from '../components/PortfolioTracker'
import { DividendTracker } from '../components/DividendTracker'
import { CryptoWatch } from '../components/CryptoWatch'
import { FundScreener } from '../components/FundScreener'
import { RiskAnalyzer } from '../components/RiskAnalyzer'
import { TradingJournal } from '../components/TradingJournal'
import { MarketNews } from '../components/MarketNews'

const TABS = [
  { id: 'stock', label: '股票', icon: TrendingUp, color: 'from-emerald-500 to-green-500' },
  { id: 'asset', label: '资产', icon: PieChart, color: 'from-violet-500 to-purple-500' },
  { id: 'div', label: '分红', icon: Coins, color: 'from-rose-500 to-pink-500' },
  { id: 'crypto', label: '加密', icon: Bitcoin, color: 'from-orange-500 to-amber-500' },
  { id: 'fund', label: '基金', icon: BarChart3, color: 'from-cyan-500 to-blue-500' },
  { id: 'risk', label: '风险', icon: Activity, color: 'from-violet-500 to-purple-500' },
  { id: 'journal', label: '日志', icon: LineChart, color: 'from-rose-500 to-red-500' },
  { id: 'news', label: '资讯', icon: Newspaper, color: 'from-blue-500 to-indigo-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function InvestHub() {
  const [tab, setTab] = useState<TabId>('stock')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">投资中心</h1>
        <p className="text-xs opacity-90">股票 · 资产 · 分红 · 加密 · 基金 · 风险 · 日志 · 资讯</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all',
                tab === t.id
                  ? `bg-gradient-to-br ${t.color} text-white shadow-lg scale-105`
                  : 'bg-white/60 dark:bg-ink-900/30 text-ink-700 dark:text-ink-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        {tab === 'stock' && <StockSimulator />}
        {tab === 'asset' && <PortfolioTracker />}
        {tab === 'div' && <DividendTracker />}
        {tab === 'crypto' && <CryptoWatch />}
        {tab === 'fund' && <FundScreener />}
        {tab === 'risk' && <RiskAnalyzer />}
        {tab === 'journal' && <TradingJournal />}
        {tab === 'news' && <MarketNews />}
      </div>
    </div>
  )
}
