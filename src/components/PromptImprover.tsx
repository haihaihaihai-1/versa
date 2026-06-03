import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Sparkles, Loader2, Copy, Check, Star, Trash2, Plus, Tag, Hash, Award, TrendingUp, ChevronRight, RefreshCw, Lightbulb, FileText, Code, MessageCircle, Briefcase } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Improvement {
  id: string
  input: string
  improved: string
  goal: 'clarity' | 'specificity' | 'creativity' | 'format' | 'reasoning' | 'safety'
  model: string
  rating: 1 | 2 | 3 | 4 | 5
  tags: string[]
  saved: boolean
  date: string
}

const STORAGE_KEY = 'versa:prompt-improves-v1'

function load(): Improvement[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Improvement[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Improvement[] {
  return [
    { id: '1', input: '写一篇文章', improved: '请以科技作家的视角, 写一篇 1500 字关于 "AI 改变教育" 的深度文章, 包含 3 个真实案例、5 个关键观点, 结尾呼吁行动.', goal: 'specificity', model: 'mimo-2.5', rating: 5, tags: ['写作', '教育', '示例'], saved: true, date: new Date().toISOString() },
  ]
}

const GOAL_META = {
  clarity: { label: '更清晰', icon: FileText, color: 'from-blue-500 to-cyan-500', prompt: '请改进以下 prompt, 让指令更清晰明确, 避免歧义, 明确告诉 AI 它的角色、任务、输出格式和限制条件. 原 prompt: ' },
  specificity: { label: '更具体', icon: Hash, color: 'from-violet-500 to-purple-500', prompt: '请将以下 prompt 改写得更具体, 补充必要的背景、约束条件、示例和衡量标准, 减少 AI 自由发挥的空间. 原 prompt: ' },
  creativity: { label: '更创意', icon: Lightbulb, color: 'from-amber-500 to-orange-500', prompt: '请增强以下 prompt 的创意性, 加入有趣的场景、角色扮演、风格要求或出人意料的角度, 让 AI 产出更有想象力. 原 prompt: ' },
  format: { label: '结构化', icon: TrendingUp, color: 'from-emerald-500 to-teal-500', prompt: '请将以下 prompt 重新组织为结构化形式: 包含 (1) 角色设定 (2) 任务描述 (3) 输出格式 (4) 示例 (5) 限制条件, 让 AI 输出更可控. 原 prompt: ' },
  reasoning: { label: '强推理', icon: Award, color: 'from-pink-500 to-rose-500', prompt: '请将以下 prompt 改写为引导 AI 进行链式推理 (Chain of Thought) 的形式, 要求 AI 逐步分析、列出假设、考虑反例, 最后得出结论. 原 prompt: ' },
  safety: { label: '更安全', icon: Shield, color: 'from-zinc-500 to-zinc-700' as string, prompt: '请为以下 prompt 添加安全护栏, 明确禁止有害内容, 要求 AI 在不确定时主动说明, 保护用户隐私. 原 prompt: ' },
} as const

const SAMPLE_PROMPTS = [
  '写一首诗',
  '解释一下机器学习',
  '帮我写邮件',
  '生成代码',
  '总结这篇文章',
  '推荐餐厅',
  '分析市场',
  '翻译成英文',
]

const TIPS = [
  { icon: '🎯', title: '明确角色', desc: '告诉 AI 它是 "资深编辑" 而非 "AI"' },
  { icon: '📏', title: '指定格式', desc: '说明输出是列表、JSON、还是段落' },
  { icon: '🚫', title: '列出限制', desc: '"不超过 200 字", "避免专业术语"' },
  { icon: '💡', title: '给示例', desc: '提供 1-2 个输入输出示例 (few-shot)' },
  { icon: '🔄', title: '分步思考', desc: '要求 AI "先列大纲, 再展开"' },
  { icon: '🛡️', title: '安全护栏', desc: '"不确定时说明, 不要编造"' },
]

function Shield(props: { className?: string }) { return <Award className={props.className || 'w-3 h-3'} /> }

export function PromptImprover() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [goal, setGoal] = useState<keyof typeof GOAL_META>('specificity')
  const [loading, setLoading] = useState(false)
  const [imps, setImps] = useState<Improvement[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => { save(imps) }, [imps])

  const improve = async () => {
    if (!input.trim()) { toast('请输入原始 prompt', 'error'); return }
    if (!isAIEnabled()) { toast('请先在 .env.local 配置 VITE_MIMO_API_KEY', 'error'); return }
    setLoading(true); setOutput('')
    const meta = GOAL_META[goal]
    try {
      const text = await aiComplete(meta.prompt + input, '你是一名 prompt 工程专家, 精通各种 prompt 优化技巧 (CoT, few-shot, role-play, format control). 输出仅给出优化后的 prompt, 简洁有力, 不要解释.', { model: 'mimo-2.5' })
      setOutput(text.trim())
      toast('改进完成', 'success')
    } catch (e: any) {
      toast(e?.message || '改进失败', 'error')
    } finally { setLoading(false) }
  }

  const saveIt = () => {
    if (!output) return
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    const newImp: Improvement = { id: uid(), input, improved: output, goal, model: 'mimo-2.5', rating: 3, tags, saved: true, date: new Date().toISOString() }
    setImps([newImp, ...imps])
    setActiveId(newImp.id)
    setInput(''); setOutput(''); setTagInput('')
    toast('已保存到历史', 'success')
  }

  const loadImp = (i: Improvement) => { setInput(i.input); setOutput(i.improved); setGoal(i.goal); setActiveId(i.id) }
  const del = (id: string) => { setImps(imps.filter((i) => i.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }
  const rate = (id: string, r: 1 | 2 | 3 | 4 | 5) => setImps(imps.map((i) => (i.id === id ? { ...i, rating: r } : i)))
  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('已复制', 'success') }
  const insertSample = (p: string) => setInput(p)

  const inputLen = input.length
  const outputLen = output.length
  const gain = inputLen > 0 && outputLen > 0 ? Math.round((outputLen / inputLen - 1) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5" />
          <h2 className="text-lg font-bold">Prompt 改进器</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 优化目标 · AI 工程化 · 评分收藏</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{imps.length}</p><p className="text-[9px] opacity-80">改进</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{imps.filter((i) => i.rating >= 4).length}</p><p className="text-[9px] opacity-80">高分</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{outputLen}</p><p className="text-[9px] opacity-80">输出字</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{gain > 0 ? '+' : ''}{gain}%</p><p className="text-[9px] opacity-80">增益</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">优化目标</div>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(GOAL_META).map(([k, m]) => {
            const Icon = m.icon
            return (
              <button key={k} onClick={() => setGoal(k as keyof typeof GOAL_META)} className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', goal === k ? `bg-gradient-to-br ${m.color} text-white shadow-md` : 'bg-ink-100/60 dark:bg-ink-800/40 text-ink-600 dark:text-ink-400')}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1"><FileText className="w-3 h-3" />原始 Prompt</span>
          <span className="text-[10px] text-ink-500">{inputLen} 字符</span>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full h-20 p-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none" placeholder="输入要改进的 prompt, 例如: 写一篇文章..." />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {SAMPLE_PROMPTS.slice(0, 4).map((p) => (
            <button key={p} onClick={() => insertSample(p)} className="px-2 h-5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[10px]">{p}</button>
          ))}
        </div>
      </div>

      <button onClick={improve} disabled={loading || !input.trim()} className={cn('w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50', loading && 'animate-pulse')}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />改进中...</> : <><Wand2 className="w-4 h-4" />开始改进</>}
      </button>

      <AnimatePresence>
        {output && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 border border-amber-200/40 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />改进结果 ({outputLen} 字 · {gain > 0 ? '+' : ''}{gain}%)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => copy(output)} className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5"><Copy className="w-3 h-3" />复制</button>
                <button onClick={improve} className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5"><RefreshCw className="w-3 h-3" />重试</button>
              </div>
            </div>
            <pre className="text-xs text-ink-800 dark:text-ink-200 whitespace-pre-wrap font-sans leading-relaxed p-2 bg-white/60 dark:bg-ink-900/40 rounded-lg">{output}</pre>
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-ink-500" />
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="标签 (逗号分隔)..." className="flex-1 h-7 px-2 text-[10px] bg-white/60 dark:bg-ink-900/40 rounded border border-ink-200/40 dark:border-ink-800/40" />
              <button onClick={saveIt} className="h-7 px-3 rounded-lg bg-amber-500 text-white text-[10px] font-semibold flex items-center gap-0.5"><Plus className="w-3 h-3" />保存</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-3 border border-cyan-200/40 dark:border-cyan-800/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">Prompt 工程 6 大技巧</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TIPS.map((t) => (
            <div key={t.title} className="p-1.5 rounded-lg bg-white/60 dark:bg-ink-900/40">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-base">{t.icon}</span>
                <span className="text-[10px] font-bold text-ink-800 dark:text-ink-200">{t.title}</span>
              </div>
              <p className="text-[9px] text-ink-500 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {imps.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300">历史改进 ({imps.length})</div>
          {imps.slice(0, 10).map((i) => {
            const meta = GOAL_META[i.goal]
            const Icon = meta.icon
            return (
              <div key={i.id} className={cn('p-2.5 rounded-xl border transition-all', activeId === i.id ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-900/20' : 'border-ink-200/40 dark:border-ink-800/40 bg-white/40 dark:bg-ink-900/30')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-5 h-5 rounded-md flex items-center justify-center bg-gradient-to-br text-white', meta.color)}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-semibold text-ink-700 dark:text-ink-300">{meta.label}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button key={r} onClick={() => rate(i.id, r as 1 | 2 | 3 | 4 | 5)} className={cn('text-[9px]', r <= i.rating ? 'text-amber-400' : 'text-ink-300')}>★</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => loadImp(i)} className="text-[10px] text-amber-500 hover:underline">加载</button>
                    <button onClick={() => copy(i.improved)} className="text-ink-400 hover:text-nova-500"><Copy className="w-3 h-3" /></button>
                    <button onClick={() => del(i.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <p className="text-[10px] text-ink-600 dark:text-ink-400 line-clamp-2"><span className="text-ink-400">原:</span> {i.input}</p>
                <p className="text-[10px] text-ink-700 dark:text-ink-300 line-clamp-2 mt-0.5"><span className="text-amber-500">改:</span> {i.improved}</p>
                {i.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {i.tags.map((t) => <span key={t} className="px-1.5 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] flex items-center">{t}</span>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
