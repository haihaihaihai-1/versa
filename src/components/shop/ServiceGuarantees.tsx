import { Truck, Shield, RotateCcw, Package, Award, Zap } from 'lucide-react'
import type { Service } from '../../data/types'
import { cn } from '../../lib/utils'

const iconMap: Record<string, any> = {
  truck: Truck, shield: Shield, rotate: RotateCcw, package: Package, award: Award, zap: Zap,
}

export function ServiceGuarantees({ services }: { services: Service[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {services.map((s, i) => {
        const Icon = iconMap[s.icon] || Shield
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gradient-to-br from-shop-50 to-orange-50 dark:from-shop-500/10 dark:to-orange-500/10 border border-shop-200/50 dark:border-shop-800/50 text-center"
          >
            <Icon className="w-5 h-5 text-shop-600" />
            <div className="text-xs font-semibold text-ink-800 dark:text-ink-100">{s.name}</div>
            <div className="text-[10px] text-ink-500 line-clamp-1">{s.description}</div>
          </div>
        )
      })}
    </div>
  )
}
