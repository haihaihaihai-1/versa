import { useState } from 'react'
import { Users, ListChecks, ShoppingCart, Calendar, Receipt, Utensils, Image as ImageIcon, StickyNote } from 'lucide-react'
import { cn } from '../lib/utils'
import { FamilyMembers } from '../components/FamilyMembers'
import { TaskAssignment } from '../components/TaskAssignment'
import { SharedShopping } from '../components/SharedShopping'
import { FamilyCalendar } from '../components/FamilyCalendar'
import { FamilyBillTracker } from '../components/FamilyBillTracker'
import { FamilyMealPlan } from '../components/FamilyMealPlan'
import { FamilyPhotoAlbum } from '../components/FamilyPhotoAlbum'
import { FamilyMessageBoard } from '../components/FamilyMessageBoard'

const TABS = [
  { id: 'members', label: '成员', icon: Users, color: 'from-rose-500 to-pink-500' },
  { id: 'tasks', label: '任务', icon: ListChecks, color: 'from-emerald-500 to-teal-500' },
  { id: 'shop', label: '购物', icon: ShoppingCart, color: 'from-orange-500 to-amber-500' },
  { id: 'cal', label: '日历', icon: Calendar, color: 'from-blue-500 to-indigo-500' },
  { id: 'bill', label: '账单', icon: Receipt, color: 'from-emerald-500 to-teal-500' },
  { id: 'meal', label: '餐谱', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  { id: 'album', label: '相册', icon: ImageIcon, color: 'from-pink-500 to-rose-500' },
  { id: 'board', label: '留言', icon: StickyNote, color: 'from-amber-500 to-orange-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function FamilyHub() {
  const [tab, setTab] = useState<TabId>('members')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">家庭中心</h1>
        <p className="text-xs opacity-90">成员 · 任务 · 购物 · 日历 · 账单 · 餐谱 · 相册 · 留言</p>
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
        {tab === 'members' && <FamilyMembers />}
        {tab === 'tasks' && <TaskAssignment />}
        {tab === 'shop' && <SharedShopping />}
        {tab === 'cal' && <FamilyCalendar />}
        {tab === 'bill' && <FamilyBillTracker />}
        {tab === 'meal' && <FamilyMealPlan />}
        {tab === 'album' && <FamilyPhotoAlbum />}
        {tab === 'board' && <FamilyMessageBoard />}
      </div>
    </div>
  )
}
