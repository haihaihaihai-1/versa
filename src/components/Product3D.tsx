import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, RotateCw, ZoomIn, ZoomOut, Sparkles, Eye, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Product3DProps {
  productName: string
  productImage: string
  productCategory?: string
}

export function Product3D({ productName, productImage, productCategory }: Product3DProps) {
  const [rotating, setRotating] = useState(true)
  const [angle, setAngle] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (rotating) {
      intervalRef.current = window.setInterval(() => {
        setAngle((a) => (a + 1) % 360)
      }, 30)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [rotating])

  const generateAIDesc = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `用 80-150 字介绍商品 "${productName}" 的 3D 细节, 包括材质、做工、亮点`,
        '你是 Versa 商品 3D 展示助手, 沉浸式描述, 中文'
      )
      setDescription(result)
    } catch (e: any) {
      toast(e?.message || '生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Box className="w-4 h-4 text-violet-500" />3D 预览
          </h3>
          <span className="text-[10px] text-ink-500">{rotating ? '自动旋转中' : '已暂停'}</span>
        </div>

        <div className="relative aspect-square bg-gradient-to-br from-ink-100 via-ink-50 to-white dark:from-ink-900 dark:via-ink-950 dark:to-ink-900 rounded-2xl overflow-hidden flex items-center justify-center" style={{ perspective: '1000px' }}>
          <motion.div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${angle}deg) scale(${zoom})`,
              transition: rotating ? 'none' : 'transform 0.3s',
            }}
          >
            <img
              src={productImage}
              alt={productName}
              className="w-48 h-48 object-cover rounded-2xl shadow-2xl"
            />
            {rotating && (
              <>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" style={{ transform: 'translateZ(20px)' }} />
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 shadow-lg" style={{ transform: 'translateZ(40px)' }} />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-rose-400 shadow-lg" style={{ transform: 'translateZ(30px)' }} />
              </>
            )}
          </motion.div>

          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono">
            {Math.round(angle)}°
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => setRotating(!rotating)}
            className={cn('h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1', rotating ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            <RotateCw className="w-3.5 h-3.5" />{rotating ? '暂停' : '旋转'}
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
            className="h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <ZoomOut className="w-3.5 h-3.5" />缩小
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
            className="h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <ZoomIn className="w-3.5 h-3.5" />放大
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={360}
          value={angle}
          onChange={(e) => { setAngle(+e.target.value); setRotating(false) }}
          className="w-full mt-2 accent-nova-500"
        />

        <button
          onClick={() => { setAngle(0); setZoom(1); setRotating(true) }}
          className="w-full h-7 mt-1 rounded-lg bg-ink-50 dark:bg-ink-900 text-xs text-ink-500"
        >
          重置视角
        </button>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />AI 3D 讲解
          </p>
          <button
            onClick={generateAIDesc}
            disabled={loading}
            className="px-2.5 h-6 rounded-full bg-violet-500 text-white text-[10px] font-semibold flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
            生成
          </button>
        </div>
        {description ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{description}</p>
        ) : (
          <p className="text-xs text-ink-500">点击「生成」让 AI 用文字描述这个 3D 商品的材质和细节</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-base font-bold text-violet-500">{Math.round(angle / 3.6 * 10) / 10}%</p>
          <p className="text-[9px] text-ink-500">已查看</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-base font-bold text-violet-500">{Math.round(zoom * 100)}%</p>
          <p className="text-[9px] text-ink-500">缩放</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-base font-bold text-violet-500">{productCategory || '通用'}</p>
          <p className="text-[9px] text-ink-500">分类</p>
        </div>
      </div>
    </div>
  )
}
