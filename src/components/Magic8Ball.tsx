import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Circle, Sparkles, Loader2, History, Shuffle, X, Plus } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

const ANSWERS = [
  { text: '✅ 肯定是的', type: 'positive' },
  { text: '✅ 毫无疑问', type: 'positive' },
  { text: '✅ 当然', type: 'positive' },
  { text: '✅ 一定会实现', type: 'positive' },
  { text: '✅ 相信你的直觉', type: 'positive' },
  { text: '🤔 再想想', type: 'neutral' },
  { text: '🤔 或许吧', type: 'neutral' },
  { text: '🤔 问别人吧', type: 'neutral' },
  { text: '🤔 说不准', type: 'neutral' },
  { text: '🤔 关注其他事', type: 'neutral' },
  { text: '❌ 不太可能', type: 'negative' },
  { text: '❌ 答案是否', type: 'negative' },
  { text: '❌ 重新考虑', type: 'negative' },
  { text: '❌ 别想了', type: 'negative' },
  { text: '❌ 不会发生', type: 'negative' },
  { text: '🔮 答案在星空', type: 'mystic' },
  { text: '🔮 宇宙还没决定', type: 'mystic' },
  { text: '🔮 等待下一次', type: 'mystic' },
  { text: '🌟 今天很有希望', type: 'lucky' },
  { text: '🌟 试试就知道', type: 'lucky' },
]

const STORAGE_KEY = 'versa:magic8ball'

interface Q { id: string; question: string; answer: string; at: number }

function load(): Q[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Q[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_COLOR = {
  positive: 'from-emerald-500 to-teal-500',
  neutral: 'from-amber-500 to-orange-500',
  negative: 'from-rose-500 to-pink-500',
  mystic: 'from-violet-500 to-purple-500',
  lucky: 'from-cyan-500 to-blue-500',
} as const

export function Magic8Ball() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<typeof ANSWERS[0] | null>(null)
  const [shaking, setShaking] = useState(false)
  const [history, setHistory] = useState<Q[]>(load())
  const [aiExpl, setAiExpl] = useState('')
  const [loading, setLoading] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  useEffect(() => { save(history) }, [history])

  const shake = () => {
    if (!question.trim()) { toast('先问个问题吧', 'error'); return }
    setShaking(true)
    setAnswer(null)
    setTimeout(() => {
      const ans = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
      setAnswer(ans)
      setShaking(false)
      setHistory([{ id: uid(), question, answer: ans.text, at: Date.now() }, ...history].slice(0, 20))
    }, 1500)
  }

  const presets = [
    '我今天会好运吗?', '这份工作会成功吗?', '我应该接受吗?', '他能成为我的朋友吗?', '这次投资值吗?',
    '下周会有惊喜吗?', '我会减肥成功吗?', '我适合这份工作吗?', '我们会有未来吗?', '这次旅行会顺利吗?',
  ]

  const runAI = async () => {
    if (!question.trim() || !isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`为这个问题生成 30-50 字的智慧建议: "${question}" (答案: ${answer?.text || '?'})`, '你是 Versa 智慧导师, 温和有深度, 中文')
      setAiExpl(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const remove = (id: string) => setHistory(history.filter((h) => h.id !== id))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Circle className="w-5 h-5" />
          <h2 className="text-lg font-bold">魔法 8 球</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">神秘问答 · 20 种答案 · AI 解读</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{ANSWERS.length}</p>
            <p className="text-[10px] opacity-80">答案</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] opacity-80">已问</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.filter((h) => h.answer.includes('✅')).length}</p>
            <p className="text-[10px] opacity-80">肯定</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center my-3">
        <motion.div
          animate={shaking ? { x: [-5, 5, -5, 5, -3, 3, 0], rotate: [-5, 5, -5, 5, 0] } : { y: [0, -8, 0] }}
          transition={{ duration: shaking ? 0.5 : 2, repeat: shaking ? 0 : Infinity, ease: 'easeInOut' }}
          className="w-44 h-44 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-2xl border-4 border-slate-700"
        >
          <div className={cn('w-32 h-32 rounded-full flex items-center justify-center text-center p-2', answer ? `bg-gradient-to-br ${TYPE_COLOR[answer.type as keyof typeof TYPE_COLOR]}` : 'bg-slate-700')}>
            <p className="text-xs font-bold text-white">{answer ? answer.text : '?'}</p>
          </div>
        </motion.div>
      </div>

      <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && shake()} placeholder="问点什么..." className="w-full px-3 h-10 rounded-xl bg-white/60 dark:bg-ink-900/30 border-2 border-ink-200 dark:border-ink-700 text-sm outline-none focus:border-violet-500" />

      <div className="flex gap-1.5">
        <button onClick={() => setQuestion(presets[presetIdx])} className="px-2 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex-shrink-0 flex items-center gap-1">
          <Shuffle className="w-3 h-3" />{presets[presetIdx].slice(0, 6)}...
        </button>
        <button onClick={() => setPresetIdx((presetIdx + 1) % presets.length)} className="px-2 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">下一个</button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={shake} disabled={shaking} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-1">
          {shaking ? <span className="animate-pulse">🔮 摇晃中...</span> : '🔮 提问'}
        </button>
        <button onClick={runAI} disabled={loading || !answer} className="px-3 h-10 rounded-xl bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiExpl && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed italic">{aiExpl}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800 flex items-start gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">Q: {h.question}</p>
                <p className="text-[10px] text-violet-500">A: {h.answer}</p>
                <p className="text-[9px] text-ink-400 mt-0.5">{formatTimeAgo(new Date(h.at).toISOString())}</p>
              </div>
              <button onClick={() => remove(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
