import { Link } from 'react-router-dom'
import { Smartphone, Shirt, Home as HomeIcon, BookOpen, Coffee, Dumbbell, Sparkles, Gamepad2 } from 'lucide-react'
import type { ProductCategory } from '../../data/types'
import { cn } from '../../lib/utils'

const categories: { value: ProductCategory; label: string; icon: any; color: string }[] = [
  { value: 'tech', label: '数码', icon: Smartphone, color: 'from-nova-500 to-nova-600' },
  { value: 'fashion', label: '服饰', icon: Shirt, color: 'from-pink-500 to-rose-500' },
  { value: 'home', label: '家居', icon: HomeIcon, color: 'from-emerald-500 to-green-600' },
  { value: 'books', label: '图书', icon: BookOpen, color: 'from-amber-500 to-orange-500' },
  { value: 'food', label: '食品', icon: Coffee, color: 'from-amber-600 to-yellow-500' },
  { value: 'sports', label: '运动', icon: Dumbbell, color: 'from-blue-500 to-indigo-500' },
  { value: 'beauty', label: '美妆', icon: Sparkles, color: 'from-debate-500 to-pink-500' },
  { value: 'tech', label: '游戏', icon: Gamepad2, color: 'from-purple-500 to-violet-500' },
]

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
      {categories.map((c, i) => {
        const Icon = c.icon
        return (
          <Link
            key={i}
            to={`/shop?category=${c.value}`}
            className="group flex flex-col items-center gap-2"
          >
            <div className={cn(
              'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform',
              c.color
            )}>
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-ink-700 dark:text-ink-200">{c.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
