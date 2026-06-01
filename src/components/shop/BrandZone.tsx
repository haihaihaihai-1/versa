import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { brands } from '../../data/products'
import { cn, formatNumber } from '../../lib/utils'

export function BrandZone() {
  return (
    <div className="rounded-3xl p-5 bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base sm:text-lg">品牌专区</h3>
          <p className="text-xs text-ink-500 mt-0.5">官方旗舰 · 正品保证</p>
        </div>
        <Link to="/shop/brands" className="text-xs text-shop-600 hover:underline">查看全部 →</Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {brands.slice(0, 12).map((b) => (
          <Link
            key={b.id}
            to={`/shop/brand/${b.id}`}
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-ink-50 dark:hover:bg-ink-800/40 transition-colors"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-800 ring-2 ring-transparent group-hover:ring-shop-400 transition-all">
              <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-center line-clamp-1">{b.name}</div>
            <div className="text-[10px] text-ink-500 mt-0.5">{formatNumber(b.totalSales)} 销量</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
