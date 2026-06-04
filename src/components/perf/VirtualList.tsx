/**
 * Versa · 虚拟列表 (v12.0)
 *
 * 基于 IntersectionObserver + 动态行高的简化实现
 * 适用：商品列表、评论列表、消息列表 (>50 项)
 *
 * 用法：
 *   <VirtualList items={list} itemHeight={80} renderItem={(it) => <Row data={it} />} />
 */
import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'

interface Props<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  emptyState?: ReactNode
  keyExtractor?: (item: T, index: number) => string
}

export function VirtualList<T>({ items, itemHeight, overscan = 5, renderItem, className, emptyState, keyExtractor }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = () => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }

  const { startIdx, endIdx, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visible = Math.ceil(viewportHeight / itemHeight) + overscan * 2
    const end = Math.min(items.length, start + visible)
    return { startIdx: start, endIdx: end, offsetY: start * itemHeight }
  }, [scrollTop, itemHeight, overscan, items.length, viewportHeight])

  if (items.length === 0) {
    return <div className={className}>{emptyState}</div>
  }

  const slice = items.slice(startIdx, endIdx)
  const totalHeight = items.length * itemHeight

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={className}
      style={{ overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
          {slice.map((it, i) => {
            const idx = startIdx + i
            const key = keyExtractor ? keyExtractor(it, idx) : idx
            return (
              <div key={key} style={{ height: itemHeight }}>
                {renderItem(it, idx)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
