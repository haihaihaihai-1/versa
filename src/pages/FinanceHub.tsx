import { useState } from 'react'
import { Heart, ShoppingCart, Bell, Wallet, TrendingDown, FileText, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { WishlistTracker } from '../components/WishlistTracker'
import { ShoppingListMaker } from '../components/ShoppingListMaker'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { BudgetPlanner } from '../components/BudgetPlanner'
import { DebtTracker } from '../components/DebtTracker'
import { PriceTrendTracker } from '../components/PriceTrendTracker'
import { InvoiceTracker } from '../components/InvoiceTracker'

const TABS = [
  { id: 'wish', label: '心愿', icon: Heart, color: 'from-rose-500 to-pink-500' },
  { id: 'shop', label: '购物清单', icon: ShoppingCart, color: 'from-emerald-500 to-teal-500' },
  { id: 'subs', label: '订阅', icon: Bell, color: 'from-rose-500 to-red-500' },
  { id: 'budget', label: '预算', icon: Wallet, color: 'from-emerald-500 to-cyan-500' },
  { id: 'debt', label: '债务', icon: TrendingDown, color: 'from-rose-600 to-orange-500' },
  { id: 'price', label: '价格', icon: TrendingDown, color: 'from-blue-500 to-cyan-500' },
  { id: 'invoice', label: '发票', icon: FileText, color: 'from-emerald-500 to-teal-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function FinanceHub() {
  const [tab, setTab] = useState<TabId>('wish')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">财务中心</h1>
        <p className="text-xs opacity-90">心愿 · 购物 · 订阅 · 预算 · 债务 · 价格 · 发票</p>
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
        {tab === 'wish' && <WishlistTracker />}
        {tab === 'shop' && <ShoppingListMaker />}
        {tab === 'subs' && <SubscriptionManager />}
        {tab === 'budget' && <BudgetPlanner />}
        {tab === 'debt' && <DebtTracker />}
        {tab === 'price' && <PriceTrendTracker />}
        {tab === 'invoice' && <InvoiceTracker />}
      </div>
    </div>
  )
}
