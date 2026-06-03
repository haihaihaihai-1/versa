import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Library, Plus, Trash2, Sparkles, Loader2, Search, Copy, Check, Star, Tag, Edit, FileText, Code, MessageCircle, Lightbulb, TrendingUp, Hash, Zap, Brain, Briefcase } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Prompt {
  id: string
  title: string
  category: 'writing' | 'coding' | 'analysis' | 'creative' | 'business' | 'learning' | 'marketing' | 'productivity' | 'other'
  content: string
  variables: string[]
  tags: string[]
  favorite: boolean
  useCount: number
  createdAt: string
}

const STORAGE_KEY = 'versa:prompts-v1'

function load(): Prompt[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Prompt[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Prompt[] {
  return [
    { id: '1', title: '文章润色', category: 'writing', content: '请润色以下文章, 改善表达但保持原意. 文章: {{text}}', variables: ['text'], tags: ['润色', '中文'], favorite: true, useCount: 12, createdAt: new Date().toISOString() },
    { id: '2', title: '代码解释', category: 'coding', content: '请详细解释以下代码的作用, 逐行分析, 指出潜在问题. 代码: {{code}}', variables: ['code'], tags: ['解释', '审查'], favorite: true, useCount: 8, createdAt: new Date().toISOString() },
    { id: '3', title: '头脑风暴', category: 'creative', content: '请围绕 {{topic}} 进行 10 点头脑风暴, 要求新颖有趣且可执行', variables: ['topic'], tags: ['创意'], favorite: false, useCount: 3, createdAt: new Date().toISOString() },
    { id: '4', title: '邮件回复', category: 'business', content: '请以专业友好的语气回复以下邮件, 保持简洁. 原邮件: {{email}}', variables: ['email'], tags: ['邮件', '商务'], favorite: false, useCount: 5, createdAt: new Date().toISOString() },
    { id: '5', title: '总结要点', category: 'analysis', content: '请总结以下内容的 3-5 个核心要点, 简洁有力. 内容: {{content}}', variables: ['content'], tags: ['总结'], favorite: true, useCount: 15, createdAt: new Date().toISOString() },
  ]
}

const CAT_META = {
  writing: { label: '写作', icon: FileText, color: 'from-blue-500 to-cyan-500' },
  coding: { label: '编程', icon: Code, color: 'from-emerald-500 to-teal-500' },
  analysis: { label: '分析', icon: TrendingUp, color: 'from-violet-500 to-purple-500' },
  creative: { label: '创意', icon: Lightbulb, color: 'from-amber-500 to-orange-500' },
  business: { label: '商务', icon: Briefcase, color: 'from-rose-500 to-pink-500' },
  learning: { label: '学习', icon: Brain, color: 'from-cyan-500 to-teal-500' },
  marketing: { label: '营销', icon: TrendingUp, color: 'from-pink-500 to-fuchsia-500' },
  productivity: { label: '效率', icon: Zap, color: 'from-orange-500 to-red-500' },
  other: { label: '其他', icon: Tag, color: 'from-ink-500 to-ink-600' },
} as const

function extractVars(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return []
  return Array.from(new Set(matches.map((m) => m.replace(/[{}\s]/g, ''))))
}

export function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>(load())
  const [adding, setAdding] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(prompts[0]?.id || null)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<'all' | Prompt['category']>('all')
  const [favFilter, setFavFilter] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Prompt['category']>('writing')
  const [tagsStr, setTagsStr] = useState('')
  const [varInputs, setVarInputs] = useState<{ [k: string]: string }>({})

  useEffect(() => { save(prompts) }, [prompts])

  const total = prompts.length
  const totalUses = prompts.reduce((s, p) => s + p.useCount, 0)
  const favCount = prompts.filter((p) => p.favorite).length
  const totalVars = new Set(prompts.flatMap((p) => p.variables)).size
  const active = prompts.find((p) => p.id === activeId)

  const filtered = prompts.filter((p) => {
    if (search && !p.title.includes(search) && !p.content.includes(search) && !p.tags.some((t) => t.includes(search))) return false
    if (catFilter !== 'all' && p.category !== catFilter) return false
    if (favFilter && !p.favorite) return false
    return true
  })

  const add = () => {
    if (!title.trim() || !content.trim()) { toast('请填写', 'error'); return }
    const p: Prompt = { id: uid(), title, content, category, tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean), variables: extractVars(content), favorite: false, useCount: 0, createdAt: new Date().toISOString() }
    setPrompts([p, ...prompts])
    setActiveId(p.id)
    setTitle(''); setContent(''); setTagsStr('')
    setAdding(false)
    toast('已保存', 'success')
  }

  const remove = (id: string) => {
    setPrompts(prompts.filter((p) => p.id !== id))
    if (activeId === id) setActiveId(prompts[0]?.id || null)
  }

  const toggleFav = (id: string) => setPrompts(prompts.map((p) => p.id === id ? { ...p, favorite: !p.favorite } : p))

  const fillVars = (text: string): string => {
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => varInputs[key.trim()] || `{{${key}}}`)
  }

  const run = async () => {
    if (!active) return
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setRunning(true); setOutput('')
    try {
      const filled = fillVars(active.content)
      const result = await aiComplete(filled, '你是 Versa AI 助手, 高效准确, 中文')
      setOutput(result)
      setPrompts(prompts.map((p) => p.id === active.id ? { ...p, useCount: p.useCount + 1 } : p))
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setRunning(false) }
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    toast('已复制', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('生成 3 个高效的 AI 提示词模板 (写作/编程/学习), 格式: "标题 | 提示词内容(含{{变量}})" 每行 1 个', '你是 Versa 提示词专家, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Library className="w-5 h-5" />
          <h2 className="text-lg font-bold">提示词库</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">9 类别 · 变量模板 · 收藏管理</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">提示词</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{favCount}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalUses}</p>
            <p className="text-[9px] opacity-80">使用</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalVars}</p>
            <p className="text-[9px] opacity-80">变量</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新提示词
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索提示词/标签..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCatFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === 'all' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        <button onClick={() => setFavFilter(!favFilter)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', favFilter ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>⭐ 收藏</button>
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
          <button key={k} onClick={() => setCatFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === k ? `bg-gradient-to-r ${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {CAT_META[k].label}
          </button>
        ))}
      </div>

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-base font-bold flex-1">{active.title}</h3>
            <button onClick={() => toggleFav(active.id)}>
              <Star className={cn('w-4 h-4', active.favorite ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
            </button>
            <button onClick={() => copy(active.content)} className="text-ink-400 hover:text-violet-500 text-xs">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => remove(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
          </div>
          <div className="rounded-lg bg-violet-50/40 dark:bg-violet-900/20 p-2 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-ink-700 dark:text-ink-300 mb-2">{active.content}</div>
          {active.variables.length > 0 && (
            <div className="space-y-1.5 mb-2">
              <p className="text-[10px] font-semibold text-violet-500">📝 填写变量</p>
              {active.variables.map((v) => (
                <input key={v} value={varInputs[v] || ''} onChange={(e) => setVarInputs({ ...varInputs, [v]: e.target.value })} placeholder={v} className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
              ))}
            </div>
          )}
          <button onClick={run} disabled={running} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}运行提示词
          </button>
          {output && (
            <div className="mt-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-900/20 p-2 border border-emerald-200/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-emerald-500">✨ 输出</p>
                <button onClick={() => copy(output)} className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                  <Copy className="w-3 h-3" />复制
                </button>
              </div>
              <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{output}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {filtered.filter((p) => p.id !== activeId).map((p) => {
          const CM = CAT_META[p.category]
          return (
            <motion.div key={p.id} whileHover={{ y: -1 }} onClick={() => setActiveId(p.id)} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', CM.color)}>
                <CM.icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold truncate">{p.title}</p>
                  {p.favorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                </div>
                <p className="text-[10px] text-ink-500">{CM.label} · {p.useCount} 次</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id) }}>
                <Star className={cn('w-3.5 h-3.5', p.favorite ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
              </button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">新提示词</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">分类</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const C = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-9 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1', category === k ? `bg-gradient-to-r ${C.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <C.icon className="w-3 h-3" />{C.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="提示词内容 (用 {{变量名}} 表示可替换部分)" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[100px] font-mono" />
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <p className="text-[10px] text-ink-500">变量: {extractVars(content).join(', ') || '无'}</p>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
