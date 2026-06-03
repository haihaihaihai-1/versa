import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Hash, Sparkles, Loader2, Copy, FileText, Zap, DollarSign, Type, Languages, AlignLeft, TrendingUp, Calculator, Eye, Check } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Model {
  id: string
  name: string
  costPer1k: number
  multiplier: number
  color: string
}

const MODELS: Model[] = [
  { id: 'gpt-4', name: 'GPT-4', costPer1k: 0.03, multiplier: 1.33, color: 'from-emerald-500 to-green-500' },
  { id: 'gpt-3.5', name: 'GPT-3.5', costPer1k: 0.002, multiplier: 1.33, color: 'from-cyan-500 to-blue-500' },
  { id: 'claude-3-opus', name: 'Claude Opus', costPer1k: 0.015, multiplier: 1.33, color: 'from-violet-500 to-purple-500' },
  { id: 'claude-3-haiku', name: 'Claude Haiku', costPer1k: 0.00025, multiplier: 1.33, color: 'from-pink-500 to-rose-500' },
  { id: 'gemini-pro', name: 'Gemini Pro', costPer1k: 0.001, multiplier: 1.33, color: 'from-blue-500 to-cyan-500' },
  { id: 'mimo', name: 'MiMo 2.5', costPer1k: 0.001, multiplier: 1.33, color: 'from-amber-500 to-orange-500' },
  { id: 'llama-3', name: 'Llama 3 70B', costPer1k: 0.0009, multiplier: 1.33, color: 'from-rose-500 to-red-500' },
]

function estimateTokens(text: string, model: Model): { tokens: number; cost: number; chars: number; words: number } {
  const chars = text.length
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishChars = chars - chineseChars
  // Chinese ~1.5 chars/token, English ~4 chars/token
  const tokens = Math.ceil(chineseChars / 1.5 + englishChars / 4)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const cost = (tokens / 1000) * model.costPer1k
  return { tokens, cost, chars, words }
}

export function TokenCounter() {
  const [text, setText] = useState('Hello, 世界! 这是一段测试文本, 用于计算 token 数量和成本估算. ')
  const [selected, setSelected] = useState<string[]>(['gpt-4', 'mimo', 'gemini-pro'])
  const [language, setLanguage] = useState<'mixed' | 'chinese' | 'english'>('mixed')

  const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishCount = text.length - chineseCount
  const sentences = text.split(/[.!?。！？]/).filter((s) => s.trim()).length
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim()).length
  const lines = text.split('\n').length

  const toggleModel = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id])
  }

  const copy = (val: string) => {
    navigator.clipboard?.writeText(val)
    toast('已复制', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-5 h-5" />
          <h2 className="text-lg font-bold">Token 计数器</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">7 模型 · 多语言 · 成本估算</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{text.length}</p>
            <p className="text-[9px] opacity-80">字符</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{chineseCount}</p>
            <p className="text-[9px] opacity-80">中字</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{englishCount}</p>
            <p className="text-[9px] opacity-80">英字</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{lines}</p>
            <p className="text-[9px] opacity-80">行</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold">输入文本</p>
          <div className="flex gap-1">
            <button onClick={() => setText('')} className="px-2 h-6 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">清空</button>
            <button onClick={() => copy(text)} className="px-2 h-6 rounded bg-ink-100 dark:bg-ink-800 text-[10px] flex items-center gap-0.5">
              <Copy className="w-2.5 h-2.5" />复制
            </button>
          </div>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="输入或粘贴文本..." className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none min-h-[120px]" />
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><Type className="w-3 h-3" />统计</p>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-1.5">
            <p className="text-sm font-bold">{text.split(/\s+/).filter(Boolean).length}</p>
            <p className="text-[9px] text-ink-500">词数</p>
          </div>
          <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-1.5">
            <p className="text-sm font-bold">{sentences}</p>
            <p className="text-[9px] text-ink-500">句子</p>
          </div>
          <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-1.5">
            <p className="text-sm font-bold">{paragraphs}</p>
            <p className="text-[9px] text-ink-500">段落</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">模型成本估算 (选择多个对比)</p>
        <div className="space-y-1.5">
          {MODELS.map((m) => {
            const sel = selected.includes(m.id)
            const est = estimateTokens(text, m)
            return (
              <div key={m.id}>
                <button onClick={() => toggleModel(m.id)} className={cn('w-full p-2 rounded-xl text-left flex items-center gap-2', sel ? `bg-gradient-to-r ${m.color} text-white` : 'bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60')}>
                  <div className={cn('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', sel ? 'bg-white/20' : `bg-gradient-to-br ${m.color} text-white`)}>
                    {sel ? <Check className="w-3 h-3 text-white" /> : <span className="text-[9px] font-bold text-white">$</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{m.name}</p>
                    <p className={cn('text-[9px]', sel ? 'opacity-90' : 'text-ink-500')}>${m.costPer1k}/1k tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{est.tokens}</p>
                    <p className={cn('text-[9px]', sel ? 'opacity-90' : 'text-ink-500')}>${est.cost.toFixed(4)}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50/40 dark:bg-amber-900/20 p-2 border border-amber-200/40">
        <p className="text-[10px] leading-relaxed">💡 估算方式: 中文字符按 1.5 字/token, 英文字符按 4 字/token. 实际 token 数可能因模型而异. 1k tokens ≈ 750 中文字或 500 英文词.</p>
      </div>
    </div>
  )
}
