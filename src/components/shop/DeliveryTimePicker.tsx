import { useState } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { Clock, Truck, Sun, Moon, Coffee } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Slot {
  id: string
  label: string
  range: string
  icon: any
  desc: string
}

const SLOTS: Slot[] = [
  { id: 'anytime', label: '不限时间', range: '随时送达', icon: Sun, desc: '最快配送' },
  { id: 'work_am', label: '工作日上午', range: '9:00 - 12:00', icon: Coffee, desc: '上班前送达' },
  { id: 'work_pm', label: '工作日下午', range: '14:00 - 18:00', icon: Sun, desc: '下班前送达' },
  { id: 'work_eve', label: '工作日晚上', range: '18:00 - 21:00', icon: Moon, desc: '下班后送达' },
  { id: 'weekend', label: '周末全天', range: '9:00 - 21:00', icon: Sun, desc: '不限时段' },
]

export function DeliveryTimePicker({ open, onClose, value, onSelect }: {
  open: boolean
  onClose: () => void
  value: string
  onSelect: (slotId: string) => void
}) {
  const [selected, setSelected] = useState(value || 'anytime')

  return (
    <BottomSheet open={open} onClose={onClose} title="选择送达时间">
      <div className="p-5 space-y-2 pb-6">
        <div className="rounded-2xl p-3 bg-gradient-to-r from-news-500/8 to-nova-500/5 border border-news-500/20 mb-2">
          <div className="flex items-center gap-2 text-xs">
            <Truck className="w-4 h-4 text-news-500" />
            <span>预计送达时间由商家发货时间 + 物流时长决定</span>
          </div>
        </div>
        {SLOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSelected(s.id); onSelect(s.id); onClose() }}
            className={cn(
              'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left',
              selected === s.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60 hover:border-shop-500/30'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              selected === s.id ? 'bg-gradient-to-br from-shop-500 to-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500'
            )}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />{s.range} · {s.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
