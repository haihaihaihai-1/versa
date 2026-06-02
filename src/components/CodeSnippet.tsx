import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Code, Plus, Trash2, Copy, Check, Star, Sparkles, Loader2, Search, Lock, Eye, EyeOff, Tag } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Snippet {
  id: string
  title: string
  description: string
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'css' | 'html' | 'bash' | 'sql'
  code: string
  tags: string[]
  favorite: boolean
  isPrivate: boolean
  at: number
  uses: number
}

const STORAGE_KEY = 'versa:snippets'

function load(): Snippet[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 's1', title: 'React Hook: useDebounce', description: '防抖 hook, 优化搜索输入', language: 'typescript', code: 'export function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value)\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay)\n    return () => clearTimeout(timer)\n  }, [value, delay])\n  return debounced\n}', tags: ['react', 'hook', '性能'], favorite: true, isPrivate: false, at: Date.now() - 86400000 * 3, uses: 24 },
    { id: 's2', title: 'Python: 列表去重保持顺序', description: '保留首次出现顺序', language: 'python', code: 'def dedupe(items):\n  seen = set()\n  return [x for x in items if not (x in seen or seen.add(x))]', tags: ['python', 'list'], favorite: false, isPrivate: false, at: Date.now() - 86400000 * 7, uses: 12 },
    { id: 's3', title: 'CSS: 玻璃拟态效果', description: 'Glassmorphism card', language: 'css', code: '.glass {\n  background: rgba(255, 255, 255, 0.1);\n  backdrop-filter: blur(12px);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);\n}', tags: ['css', 'glass', 'ui'], favorite: true, isPrivate: false, at: Date.now() - 86400000 * 5, uses: 38 },
    { id: 's4', title: 'SQL: 用户留存查询', description: '计算 7 日留存率', language: 'sql', code: 'SELECT\n  cohort_date,\n  COUNT(DISTINCT user_id) AS cohort_size,\n  COUNT(DISTINCT CASE WHEN day_7_active THEN user_id END) * 1.0 /\n    COUNT(DISTINCT user_id) AS retention_7d\nFROM user_activity\nGROUP BY cohort_date', tags: ['sql', 'analytics'], favorite: false, isPrivate: true, at: Date.now() - 86400000 * 14, uses: 5 },
  ]
}
function save(d: Snippet[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const LANG_META = {
  typescript: { label: 'TypeScript', color: 'bg-blue-500', emoji: '🔷' },
  javascript: { label: 'JavaScript', color: 'bg-amber-500', emoji: '🟨' },
  python: { label: 'Python', color: 'bg-emerald-500', emoji: '🐍' },
  go: { label: 'Go', color: 'bg-cyan-500', emoji: '🐹' },
  rust: { label: 'Rust', color: 'bg-orange-500', emoji: '⚙️' },
  css: { label: 'CSS', color: 'bg-violet-500', emoji: '🎨' },
  html: { label: 'HTML', color: 'bg-rose-500', emoji: '🌐' },
  bash: { label: 'Bash', color: 'bg-ink-500', emoji: '💻' },
  sql: { label: 'SQL', color: 'bg-indigo-500', emoji: '🗃️' },
} as const

export function CodeSnippet() {
  const [snippets, setSnippets] = useState<Snippet[]>(load())
  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState<'all' | keyof typeof LANG_META>('all')
  const [filterFav, setFilterFav] = useState(false)
  const [adding, setAdding] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [aiExplain, setAiExplain] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newLang, setNewLang] = useState<keyof typeof LANG_META>('typescript')
  const [newCode, setNewCode] = useState('')
  const [newTags, setNewTags] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { save(snippets) }, [snippets])

  const filtered = (() => {
    let out = snippets
    if (filterLang !== 'all') out = out.filter((s) => s.language === filterLang)
    if (filterFav) out = out.filter((s) => s.favorite)
    if (search) out = out.filter((s) => s.title.includes(search) || s.code.includes(search) || s.tags.some((t) => t.includes(search)))
    return out
  })()

  const add = () => {
    if (!newTitle.trim() || !newCode.trim()) { toast('请填写完整', 'error'); return }
    const s: Snippet = { id: uid(), title: newTitle, description: newDesc, language: newLang, code: newCode, tags: newTags.split(',').map((t) => t.trim()).filter(Boolean), favorite: false, isPrivate: false, at: Date.now(), uses: 0 }
    setSnippets([s, ...snippets])
    setNewTitle(''); setNewDesc(''); setNewCode(''); setNewTags('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const copy = (s: Snippet) => {
    navigator.clipboard?.writeText(s.code)
    setSnippets(snippets.map((x) => x.id === s.id ? { ...x, uses: x.uses + 1 } : x))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast('已复制', 'success')
  }

  const toggleFav = (id: string) => setSnippets(snippets.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s))
  const togglePrivate = (id: string) => setSnippets(snippets.map((s) => s.id === id ? { ...s, isPrivate: !s.isPrivate } : s))
  const remove = (id: string) => setSnippets(snippets.filter((s) => s.id !== id))

  const runAI = async (s: Snippet) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    setActiveId(s.id)
    try {
      const result = await aiComplete(`为这段 ${s.language} 代码生成 50-80 字的简洁说明: \n${s.code}`, '你是 Versa 代码导师, 简洁专业, 中文')
      setAiExplain(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = snippets.find((s) => s.id === activeId)
  const totalUses = snippets.reduce((s, sn) => s + sn.uses, 0)
  const favCount = snippets.filter((s) => s.favorite).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Code className="w-5 h-5" />
          <h2 className="text-lg font-bold">代码片段</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">9 语言 · 标签 · AI 解读</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{snippets.length}</p>
            <p className="text-[10px] opacity-80">片段</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{favCount}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalUses}</p>
            <p className="text-[10px] opacity-80">使用</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setAdding(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />新增
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilterLang('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filterLang === 'all' ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(LANG_META) as Array<keyof typeof LANG_META>).map((k) => (
          <button key={k} onClick={() => setFilterLang(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filterLang === k ? `${LANG_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {LANG_META[k].emoji} {LANG_META[k].label}
          </button>
        ))}
        <button onClick={() => setFilterFav(!filterFav)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filterFav ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>⭐ 收藏</button>
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Code className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有匹配的片段</p>
          </div>
        ) : filtered.map((s) => {
          const Meta = LANG_META[s.language]
          return (
            <motion.div key={s.id} whileHover={{ x: 2 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
              <div className="flex items-center gap-2 p-2.5 cursor-pointer" onClick={() => setActiveId(s.id)}>
                <span className={cn('w-2 h-2 rounded-full', Meta.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-1">
                    {s.title}
                    {s.isPrivate && <Lock className="w-2.5 h-2.5 text-ink-400" />}
                  </p>
                  <p className="text-[10px] text-ink-500 truncate">{s.description || Meta.label} · {s.uses} 次使用</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFav(s.id) }} className="text-amber-500">
                  <Star className={cn('w-3.5 h-3.5', s.favorite ? 'fill-amber-400' : 'text-ink-300')} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); copy(s) }} className="text-ink-400 hover:text-blue-500">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              {activeId === s.id && (
                <div className="border-t border-ink-200/60 dark:border-ink-800/60 p-2 space-y-2">
                  <pre className="p-2 rounded-lg bg-ink-900 text-ink-100 text-[10px] font-mono overflow-x-auto max-h-40 whitespace-pre-wrap">{s.code}</pre>
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => runAI(s)} disabled={loading} className="flex-1 h-7 rounded bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1">
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 解读
                    </button>
                    <button onClick={() => togglePrivate(s.id)} className="h-7 px-2 rounded bg-ink-100 dark:bg-ink-800 text-[10px] flex items-center gap-0.5">
                      {s.isPrivate ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button onClick={() => remove(s.id)} className="h-7 px-2 rounded bg-rose-500 text-white text-[10px] flex items-center gap-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {aiExplain && activeId === s.id && (
                    <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded p-2 border border-blue-200/40">
                      <p className="text-[10px] leading-relaxed">{aiExplain}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">新增片段</h3>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <select value={newLang} onChange={(e) => setNewLang(e.target.value as any)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm">
              {(Object.keys(LANG_META) as Array<keyof typeof LANG_META>).map((k) => <option key={k} value={k}>{LANG_META[k].label}</option>)}
            </select>
            <textarea value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="代码" rows={8} className="w-full px-3 py-2 rounded-lg bg-ink-900 text-ink-100 text-xs font-mono outline-none resize-none" />
            <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
