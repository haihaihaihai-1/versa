import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { cn } from '../../lib/utils'

const banners = [
  {
    id: 'b1',
    title: '618 限时狂欢',
    subtitle: '全场低至 5 折 · 跨店满 300 减 50',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80&auto=format&fit=crop',
    cta: '立即抢购',
    color: 'from-debate-500 via-debate-500/80 to-nova-500',
    badge: '618',
  },
  {
    id: 'b2',
    title: 'Versa 编辑选 · 智能家居',
    subtitle: 'AI 中枢 X1 · 新品首发',
    image: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=1600&q=80&auto=format&fit=crop',
    cta: '了解详情',
    color: 'from-nova-500 via-nova-500/80 to-shop-500',
    badge: 'HOT',
  },
  {
    id: 'b3',
    title: '设计师礼盒限定',
    subtitle: '月光中秋 · 10000 套限量',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1600&q=80&auto=format&fit=crop',
    cta: '查看礼盒',
    color: 'from-shop-500 via-shop-500/80 to-debate-500',
    badge: '限量',
  },
]

export function ShopHero() {
  const [index, setIndex] = useState(0)
  const next = () => setIndex((i) => (i + 1) % banners.length)
  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length)

  useEffect(() => {
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative rounded-3xl overflow-hidden">
      <div className="relative aspect-[21/9] sm:aspect-[21/7]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-700',
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <img src={b.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className={cn('absolute inset-0 bg-gradient-to-r opacity-80', b.color)} />
            <div className="relative h-full p-8 sm:p-12 flex flex-col justify-center text-white max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-4 w-fit">
                <Flame className="w-3 h-3" />{b.badge}
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight">{b.title}</h2>
              <p className="mt-2 sm:mt-3 text-sm sm:text-lg opacity-90">{b.subtitle}</p>
              <button className="mt-4 sm:mt-6 inline-flex items-center justify-center h-10 sm:h-12 px-6 sm:px-8 rounded-full bg-white text-ink-900 font-semibold text-sm hover:scale-105 transition-transform w-fit">
                {b.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        aria-label="上一张"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        aria-label="下一张"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
            )}
            aria-label={`跳到第 ${i + 1} 张`}
          />
        ))}
      </div>
    </div>
  )
}
