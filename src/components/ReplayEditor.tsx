import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Scissors, Play, Pause, Save, Share2, Download, X, Plus, Sparkles, Loader2 } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Clip {
  id: string
  start: number
  end: number
  label: string
}

const SAMPLE_DANMAKU = [
  { time: 5, text: '主播好帅!' },
  { time: 12, text: '这款我买了' },
  { time: 25, text: '618 多少钱?' },
  { time: 38, text: '包邮吗?' },
  { time: 52, text: '求链接!' },
  { time: 68, text: '颜值高' },
  { time: 85, text: '好用' },
  { time: 102, text: '我同事在用' },
]

export function ReplayEditor() {
  const [duration] = useState(120)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [clips, setClips] = useState<Clip[]>([
    { id: uid(), start: 5, end: 30, label: '产品介绍' },
    { id: uid(), start: 45, end: 80, label: '价格 PK' },
  ])
  const [activeClip, setActiveClip] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const playRef = useRef<number | null>(null)

  useEffect(() => {
    if (playing) {
      playRef.current = window.setInterval(() => {
        setCurrent((c) => {
          if (c >= duration) { setPlaying(false); return 0 }
          return c + 0.5
        })
      }, 100)
    } else if (playRef.current) {
      clearInterval(playRef.current)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [playing, duration])

  const addClip = () => {
    setClips([...clips, { id: uid(), start: current, end: Math.min(duration, current + 15), label: '新片段' }])
  }

  const removeClip = (id: string) => {
    setClips(clips.filter((c) => c.id !== id))
  }

  const playClip = (c: Clip) => {
    setActiveClip(c.id)
    setCurrent(c.start)
    setPlaying(true)
  }

  const generateAISummary = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `为直播回放生成 80-150 字精彩回顾, 包括高光时刻, 包含以下 ${clips.length} 个片段: ${clips.map((c) => c.label).join(', ')}`,
        '你是 Versa 回放总结助手, 生动有趣, 中文'
      )
      setAiSummary(result)
    } catch (e: any) {
      toast(e?.message || '生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const exportClip = () => {
    toast('已保存到我的片段 (模拟)', 'success')
  }

  const visibleDanmaku = SAMPLE_DANMAKU.filter((d) => Math.abs(d.time - current) < 3)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Scissors className="w-5 h-5" />
          <h2 className="text-lg font-bold">回放剪辑</h2>
        </div>
        <p className="text-xs opacity-90">截取精彩瞬间, 一键分享</p>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="aspect-video bg-gradient-to-br from-ink-900 to-ink-800 rounded-xl flex items-center justify-center text-white text-4xl relative overflow-hidden">
          📹
          {visibleDanmaku.map((d, i) => (
            <motion.div
              key={`${d.time}-${i}`}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: '-100%', opacity: 1 }}
              transition={{ duration: 3 }}
              className="absolute text-xs whitespace-nowrap"
              style={{ top: `${20 + i * 18}%` }}
            >
              {d.text}
            </motion.div>
          ))}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono">
            {Math.floor(current)}s / {duration}s
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={duration}
            value={current}
            onChange={(e) => setCurrent(+e.target.value)}
            className="flex-1 accent-violet-500"
          />
          <span className="text-[10px] text-ink-500 font-mono whitespace-nowrap">{Math.floor(current)}s</span>
        </div>

        <div className="mt-2 space-y-1">
          <div className="relative h-2 bg-ink-100 dark:bg-ink-800 rounded-full">
            {clips.map((c) => (
              <div
                key={c.id}
                className={cn('absolute h-full rounded', activeClip === c.id ? 'bg-amber-500' : 'bg-violet-500')}
                style={{ left: `${(c.start / duration) * 100}%`, width: `${((c.end - c.start) / duration) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">片段 ({clips.length})</h3>
        <button onClick={addClip} className="px-2.5 h-7 rounded-full bg-violet-500 text-white text-xs font-semibold flex items-center gap-0.5">
          <Plus className="w-3 h-3" />截取
        </button>
      </div>

      <div className="space-y-1.5">
        {clips.map((c) => (
          <div
            key={c.id}
            className={cn('flex items-center gap-2 p-2 rounded-xl border', activeClip === c.id ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}
          >
            <button onClick={() => playClip(c)} className="w-7 h-7 rounded-full bg-violet-500 text-white flex items-center justify-center">
              <Play className="w-3 h-3" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="text-[10px] text-ink-500">{c.start}s - {c.end}s · 时长 {c.end - c.start}s</p>
            </div>
            <button onClick={() => removeClip(c.id)} className="text-ink-400 hover:text-rose-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={exportClip} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          <Save className="w-3.5 h-3.5" />保存
        </button>
        <button onClick={() => toast('已生成分享链接', 'success')} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
          <Share2 className="w-3.5 h-3.5" />分享
        </button>
        <button onClick={() => toast('已下载', 'success')} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
          <Download className="w-3.5 h-3.5" />下载
        </button>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />AI 精彩回顾
          </p>
          <button onClick={generateAISummary} disabled={loading} className="px-2.5 h-6 rounded-full bg-violet-500 text-white text-[10px] font-semibold flex items-center gap-1">
            {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
            生成
          </button>
        </div>
        {aiSummary ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
        ) : (
          <p className="text-xs text-ink-500">让 AI 为你总结这场直播的高光时刻</p>
        )}
      </div>
    </div>
  )
}
