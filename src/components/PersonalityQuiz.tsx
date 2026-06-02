import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Sparkles, Loader2, Check, X, ChevronRight, Plus, BarChart3, Calendar, Zap } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Question {
  id: string
  text: string
  category: 'lifestyle' | 'career' | 'relationship' | 'finance' | 'health' | 'mindset'
  description: string
  emoji: string
  options: { id: string; text: string; desc: string }[]
}

const QUESTIONS: Question[] = [
  { id: 'q1', text: '周末你更喜欢?', category: 'lifestyle', description: '了解你如何分配休息时间', emoji: '☕',
    options: [
      { id: 'a', text: '户外活动 / 社交聚会', desc: '外向活力' },
      { id: 'b', text: '宅家 / 独处充电', desc: '内向思考' },
    ] },
  { id: 'q2', text: '面对 10 万元的意外收入, 你会?', category: 'finance', description: '判断你的财务倾向', emoji: '💰',
    options: [
      { id: 'a', text: '存起来 / 稳健投资', desc: '保守型' },
      { id: 'b', text: '投资 / 创业 / 学习', desc: '进取型' },
    ] },
  { id: 'q3', text: '在团队中你通常是?', category: 'career', description: '识别你的团队角色', emoji: '👥',
    options: [
      { id: 'a', text: '协调沟通, 推动大家', desc: '领导者' },
      { id: 'b', text: '专研任务, 提供方案', desc: '专家型' },
    ] },
  { id: 'q4', text: '遇到困难时, 你会?', category: 'mindset', description: '了解你的应对模式', emoji: '🧠',
    options: [
      { id: 'a', text: '分析问题, 系统解决', desc: '理性' },
      { id: 'b', text: '寻求帮助, 倾诉交流', desc: '感性' },
    ] },
  { id: 'q5', text: '健康方面你更关注?', category: 'health', description: '健康优先级', emoji: '💪',
    options: [
      { id: 'a', text: '运动 / 体态', desc: '体能型' },
      { id: 'b', text: '饮食 / 睡眠', desc: '内调型' },
    ] },
  { id: 'q6', text: '理想中的关系是?', category: 'relationship', description: '了解你的关系观', emoji: '❤️',
    options: [
      { id: 'a', text: '激情 / 浪漫', desc: '感性' },
      { id: 'b', text: '稳定 / 陪伴', desc: '理性' },
    ] },
]

const STORAGE_KEY = 'versa:personality-answers'

function load(): Record<string, string> { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return {} }
function save(d: Record<string, string>) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  lifestyle: { label: '生活', color: 'from-rose-500 to-pink-500' },
  career: { label: '事业', color: 'from-violet-500 to-purple-500' },
  relationship: { label: '关系', color: 'from-rose-500 to-red-500' },
  finance: { label: '财务', color: 'from-amber-500 to-orange-500' },
  health: { label: '健康', color: 'from-emerald-500 to-teal-500' },
  mindset: { label: '心智', color: 'from-blue-500 to-indigo-500' },
}

export function PersonalityQuiz() {
  const [answers, setAnswers] = useState<Record<string, string>>(load())
  const [active, setActive] = useState(0)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'quiz' | 'result'>('quiz')

  useEffect(() => { save(answers) }, [answers])

  const q = QUESTIONS[active]
  const answered = Object.keys(answers).length
  const progress = (answered / QUESTIONS.length) * 100
  const allAnswered = answered === QUESTIONS.length

  const answer = (qid: string, aid: string) => {
    setAnswers({ ...answers, [qid]: aid })
    if (active < QUESTIONS.length - 1) {
      setTimeout(() => setActive(active + 1), 200)
    } else {
      setView('result')
    }
  }

  const reset = () => { setAnswers({}); setActive(0); setView('quiz') }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const traits = QUESTIONS.map((q) => {
        const a = q.options.find((o) => o.id === answers[q.id])
        return `${q.category}: ${a?.desc}`
      }).join(', ')
      const result = await aiComplete(`基于人格测试结果 [${traits}] 生成 1 段 100-150 字的人物画像, 包含核心特质、潜在优势和发展建议`, '你是 Versa 心理分析师, 专业温柔, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  if (view === 'result') {
    const traits = QUESTIONS.map((q) => {
      const a = q.options.find((o) => o.id === answers[q.id])
      return { cat: q.category, desc: a?.desc || '', text: a?.text || '' }
    })

    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-bold">测试结果</h2>
          </div>
          <p className="text-xs opacity-90 mb-2">基于 6 维人格测评</p>
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="bg-white/15 rounded-xl py-2">
              <p className="text-lg font-bold">{answered}</p>
              <p className="text-[10px] opacity-80">已答</p>
            </div>
            <div className="bg-white/15 rounded-xl py-2">
              <p className="text-lg font-bold">6</p>
              <p className="text-[10px] opacity-80">维度</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {traits.map((t, i) => {
            const Meta = CAT_META[t.cat as keyof typeof CAT_META]
            return (
              <div key={i} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-center gap-2">
                  <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', Meta.color)}>
                    <span className="text-base font-bold">{Meta.label[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{Meta.label}维度</p>
                    <p className="text-sm font-bold text-violet-500">{t.desc}</p>
                  </div>
                </div>
                <p className="text-[10px] text-ink-500 mt-1">{t.text}</p>
              </div>
            )
          })}
        </div>

        <button onClick={runAI} disabled={loading} className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold flex items-center justify-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}AI 深度解读
        </button>

        {aiRec && (
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-2xl p-3 border border-violet-200/40">
            <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 画像</p>
            <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiRec}</p>
          </div>
        )}

        <button onClick={reset} className="w-full h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm font-semibold">重新测试</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">人格测试</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 维度 · 了解自己</p>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-white" />
        </div>
        <p className="text-[10px] opacity-80 mt-1">{answered}/{QUESTIONS.length} 已答</p>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-5 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">{q.emoji}</span>
          <div className="flex-1">
            <p className="text-[10px] text-ink-500">问题 {active + 1}/{QUESTIONS.length} · {CAT_META[q.category].label}</p>
            <p className="text-base font-bold">{q.text}</p>
          </div>
        </div>
        <p className="text-[10px] text-ink-500 mb-3">{q.description}</p>

        <div className="space-y-2">
          {q.options.map((opt) => (
            <motion.button
              key={opt.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => answer(q.id, opt.id)}
              className={cn('w-full p-3 rounded-xl border text-left', answers[q.id] === opt.id ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700')}
            >
              <p className="text-sm font-semibold">{opt.text}</p>
              <p className={cn('text-[10px]', answers[q.id] === opt.id ? 'opacity-90' : 'text-ink-500')}>{opt.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button disabled={active === 0} onClick={() => setActive(active - 1)} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs disabled:opacity-30">上题</button>
        <div className="flex-1 flex gap-0.5">
          {QUESTIONS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={cn('flex-1 h-8 rounded text-[10px] font-bold', i === active ? 'bg-violet-500 text-white' : answers[QUESTIONS[i].id] ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              {i + 1}
            </button>
          ))}
        </div>
        {allAnswered ? (
          <button onClick={() => setView('result')} className="px-3 h-8 rounded-lg bg-violet-500 text-white text-xs font-bold">结果</button>
        ) : (
          <button disabled={active === QUESTIONS.length - 1} onClick={() => setActive(active + 1)} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs disabled:opacity-30">下题</button>
        )}
      </div>
    </div>
  )
}
