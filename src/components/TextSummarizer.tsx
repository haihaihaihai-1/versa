import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Sparkles, Loader2, Copy, Check, Hash, AlignLeft, Zap, BookOpen, Type, Languages, TrendingUp, ListChecks, Target, Trash2, RefreshCw, ChevronDown } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Summary {
  id: string
  input: string
  output: string
  mode: 'extract' | 'paragraph' | 'bullets' | 'tldr' | 'keywords' | 'translate'
  ratio: number
  duration: number
  date: string
}

const STORAGE_KEY = 'versa:summaries-v1'

function load(): Summary[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Summary[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Summary[] {
  return [
    { id: '1', input: 'Versa 是一个三体融合的购物/社交/资讯/辩论平台...', output: 'Versa 是融合购物、社交、资讯、辩论的一站式 React 应用。', mode: 'tldr', ratio: 12, duration: 1200, date: new Date().toISOString() },
  ]
}

const MODE_META = {
  extract: { label: '核心提取', icon: Target, color: 'from-rose-500 to-pink-500', prompt: '请从以下文本中提取 3-5 个最核心的信息, 每个不超过 30 字. 用 JSON 数组返回, 不要任何解释. 文本: ' },
  paragraph: { label: '段落总结', icon: AlignLeft, color: 'from-blue-500 to-cyan-500', prompt: '请将以下文本总结为一段流畅的中文段落, 保留关键信息和语气, 字数控制在原文 20% 以内. 文本: ' },
  bullets: { label: '要点列表', icon: ListChecks, color: 'from-emerald-500 to-teal-500', prompt: '请将以下文本总结为最多 5 条要点, 每条 10-25 字, 使用简洁清晰的语言, 编号列出. 文本: ' },
  tldr: { label: '一句话', icon: Zap, color: 'from-amber-500 to-orange-500', prompt: '请用一句话 (不超过 50 字) 概括以下文本的核心内容, 让没看过原文的人立刻明白主旨. 文本: ' },
  keywords: { label: '关键词', icon: Hash, color: 'from-violet-500 to-purple-500', prompt: '请从以下文本中提取 5-8 个核心关键词 (中文或英文短语), 按重要性排序, 用 JSON 数组返回. 文本: ' },
  translate: { label: '中英互译', icon: Languages, color: 'from-cyan-500 to-blue-500', prompt: '请将以下文本翻译为英文, 保持原意和语气, 自然流畅. 文本: ' },
} as const

const SAMPLE_TEXT = `人工智能正以前所未有的速度改变着人类社会的方方面面。从 2022 年底 ChatGPT 引爆生成式 AI 浪潮以来, 大语言模型的能力边界不断扩展, 渗透到教育、医疗、金融、创作、编程等众多领域。Versa 作为一个融合购物、社交、资讯、辩论的综合性平台, 也在积极探索 AI 的应用场景: 智能搜索、个性化推荐、AI 写作助手、商品问答、直播弹幕情感分析、辩论总结等。\n\n然而, AI 的快速发展也带来了挑战: 数据隐私、模型偏见、就业冲击、伦理边界等问题日益突出。Versa 团队认为, AI 应该是人类的助手而非替代者, 应当秉持「AI 增强而非 AI 取代」的设计哲学, 在提升用户体验的同时, 保留人类的创造力和判断力。\n\n未来, Versa 将继续探索 AI 与三体融合的深度结合, 为用户打造更智能、更安全、更有温度的下一代互联网平台。`

export function TextSummarizer() {
  const [input, setInput] = useState(SAMPLE_TEXT)
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<keyof typeof MODE_META>('bullets')
  const [loading, setLoading] = useState(false)
  const [hist, setHist] = useState<Summary[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => { save(hist) }, [hist])

  const run = async () => {
    if (!input.trim()) { toast('请输入文本', 'error'); return }
    if (!isAIEnabled()) { toast('请先在 .env.local 配置 VITE_MIMO_API_KEY', 'error'); return }
    setLoading(true); setOutput(''); setProgress(0)
    const meta = MODE_META[mode]
    const start = Date.now()
    const tick = setInterval(() => setProgress((p) => Math.min(95, p + 5 + Math.random() * 10)), 120)
    try {
      const text = await aiComplete(meta.prompt + input, '你是一名专业的中文文本编辑, 输出简洁准确, 严格遵循用户要求的格式和字数限制.', { model: 'mimo-2.5' })
      setOutput(text)
      const ratio = Math.round((text.length / input.length) * 100)
      const duration = Date.now() - start
      const newItem: Summary = { id: uid(), input, output: text, mode, ratio, duration, date: new Date().toISOString() }
      setHist([newItem, ...hist].slice(0, 30))
      setActiveId(newItem.id)
      toast(`${meta.label}完成 (${duration}ms)`, 'success')
    } catch (e: any) {
      toast(e?.message || '总结失败', 'error')
    } finally {
      clearInterval(tick); setProgress(100); setTimeout(() => { setLoading(false); setProgress(0) }, 400)
    }
  }

  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('已复制', 'success') }
  const loadHist = (s: Summary) => { setInput(s.input); setOutput(s.output); setMode(s.mode); setActiveId(s.id) }
  const del = (id: string) => { setHist(hist.filter((h) => h.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }
  const insertSample = () => { setInput(SAMPLE_TEXT); toast('已载入示例文本', 'success') }

  const inputWords = input.length
  const outputWords = output.length
  const compression = inputWords > 0 ? Math.round((1 - outputWords / inputWords) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-bold">文本总结</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 模式 · AI 驱动 · 压缩比统计</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{inputWords}</p><p className="text-[9px] opacity-80">原文字</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{outputWords}</p><p className="text-[9px] opacity-80">总结字</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{compression > 0 ? compression : 0}%</p><p className="text-[9px] opacity-80">压缩比</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{hist.length}</p><p className="text-[9px] opacity-80">历史</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">总结模式</span>
          <button onClick={insertSample} className="text-[10px] text-nova-500 hover:underline">载入示例</button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(MODE_META).map(([k, m]) => {
            const Icon = m.icon
            return (
              <button key={k} onClick={() => setMode(k as keyof typeof MODE_META)} className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', mode === k ? `bg-gradient-to-br ${m.color} text-white shadow-md` : 'bg-ink-100/60 dark:bg-ink-800/40 text-ink-600 dark:text-ink-400')}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">原文</span>
          <span className="text-[10px] text-ink-500">{inputWords} 字符</span>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full h-32 p-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-nova-500/40 resize-none" placeholder="粘贴或输入要总结的文本..." />
      </div>

      <button onClick={run} disabled={loading || !input.trim()} className={cn('w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50', loading && 'animate-pulse')}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />总结中...</> : <><Sparkles className="w-4 h-4" />开始 {MODE_META[mode].label}</>}
      </button>

      {loading && (
        <div className="h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <AnimatePresence>
        {output && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-3 border border-cyan-200/40 dark:border-cyan-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI 总结结果</span>
              <button onClick={() => copy(output)} className="text-[10px] text-cyan-600 hover:underline flex items-center gap-0.5"><Copy className="w-3 h-3" />复制</button>
            </div>
            <pre className="text-xs text-ink-800 dark:text-ink-200 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre>
          </motion.div>
        )}
      </AnimatePresence>

      {hist.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300">历史记录 ({hist.length})</div>
          {hist.slice(0, 8).map((h) => {
            const meta = MODE_META[h.mode]
            const Icon = meta.icon
            return (
              <div key={h.id} className={cn('p-2.5 rounded-xl border transition-all', activeId === h.id ? 'border-nova-400 bg-nova-50/40 dark:bg-nova-900/20' : 'border-ink-200/40 dark:border-ink-800/40 bg-white/40 dark:bg-ink-900/30')}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-5 h-5 rounded-md flex items-center justify-center bg-gradient-to-br text-white', meta.color)}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-semibold text-ink-700 dark:text-ink-300">{meta.label}</span>
                    <span className="text-[9px] text-ink-500">· {h.ratio}% · {h.duration}ms</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => loadHist(h)} className="text-[10px] text-nova-500 hover:underline">加载</button>
                    <button onClick={() => del(h.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <p className="text-[10px] text-ink-600 dark:text-ink-400 line-clamp-2">{h.output}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
