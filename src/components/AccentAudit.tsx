import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, X, FileSearch, Sparkles, Loader2, Eye, Palette, Type, Ruler } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAccentTheme } from '../hooks/useAccentTheme'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface AuditIssue {
  id: string
  severity: 'high' | 'med' | 'low'
  category: 'color' | 'radius' | 'font' | 'spacing'
  message: string
  fix: string
  count: number
}

const SEED: AuditIssue[] = [
  { id: 'a1', severity: 'med', category: 'color', message: '9 个组件使用硬编码色 (bg-blue-500 等), 未使用主题色变量', fix: '替换为 bg-nova-500 或 text-nova-500', count: 9 },
  { id: 'a2', severity: 'low', category: 'color', message: '5 处使用 from-purple-500 渐变, 与 nova 主题色冲突', fix: '统一为 from-nova-500', count: 5 },
  { id: 'a3', severity: 'med', category: 'radius', message: '3 个按钮使用 rounded-md (6px), 与当前圆角设置不一致', fix: '应用 theme.radius 变量', count: 3 },
  { id: 'a4', severity: 'low', category: 'font', message: '1 处使用 font-mono 标题, 与主题字体冲突', fix: '使用 theme.font', count: 1 },
  { id: 'a5', severity: 'high', category: 'color', message: '头部 logo 颜色不响应主题切换', fix: '从 useAccentTheme 读取 current.swatches[500]', count: 1 },
  { id: 'a6', severity: 'low', category: 'spacing', message: '7 处 padding 不统一 (12px/14px/16px 混用)', fix: '统一为 spacing scale', count: 7 },
  { id: 'a7', severity: 'med', category: 'color', message: '通知 toast 使用固定绿色, 应响应主题', fix: '用 current.swatches[500] 动态着色', count: 4 },
  { id: 'a8', severity: 'low', category: 'radius', message: '卡片圆角 (rounded-2xl) 与全局圆角不联动', fix: '改用 var(--radius)', count: 12 },
]

const SEVERITY_META = {
  high: { label: '高', color: 'bg-rose-500', text: 'text-rose-500' },
  med: { label: '中', color: 'bg-amber-500', text: 'text-amber-500' },
  low: { label: '低', color: 'bg-blue-500', text: 'text-blue-500' },
} as const

const CATEGORY_META = {
  color: { label: '颜色', icon: Palette, color: 'text-rose-500' },
  radius: { label: '圆角', icon: Ruler, color: 'text-blue-500' },
  font: { label: '字体', icon: Type, color: 'text-violet-500' },
  spacing: { label: '间距', icon: FileSearch, color: 'text-emerald-500' },
} as const

const STORAGE_KEY = 'versa:audit-issues'
const STORAGE_RESOLVED = 'versa:audit-resolved'

function loadIssues(): AuditIssue[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED }
function saveIssues(d: AuditIssue[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadResolved(): string[] { try { const s = localStorage.getItem(STORAGE_RESOLVED); if (s) return JSON.parse(s) } catch {} return [] }
function saveResolved(d: string[]) { try { localStorage.setItem(STORAGE_RESOLVED, JSON.stringify(d)) } catch {} }

export function AccentAudit() {
  const { current } = useAccentTheme()
  const [issues, setIssues] = useState<AuditIssue[]>([])
  const [resolved, setResolved] = useState<string[]>(loadResolved())
  const [filter, setFilter] = useState<'all' | 'high' | 'med' | 'low' | 'resolved'>('all')
  const [aiReport, setAiReport] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setIssues(loadIssues()) }, [])
  useEffect(() => { if (issues.length) saveIssues(issues); saveResolved(resolved) }, [issues, resolved])

  const resolve = (id: string) => setResolved([...resolved, id])
  const unresolve = (id: string) => setResolved(resolved.filter((r) => r !== id))
  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `生成 1 段主题色应用审计报告 (80-120 字), 主题色: ${current.name} (${current.description})`,
        '你是 Versa 主题审计师, 简洁专业, 中文'
      )
      setAiReport(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = issues.filter((it) => !resolved.includes(it.id))
  const filtered = (() => {
    if (filter === 'all') return issues
    if (filter === 'resolved') return issues.filter((it) => resolved.includes(it.id))
    return issues.filter((it) => it.severity === filter && !resolved.includes(it.id))
  })()

  const stats = {
    total: issues.length,
    high: active.filter((i) => i.severity === 'high').length,
    med: active.filter((i) => i.severity === 'med').length,
    low: active.filter((i) => i.severity === 'low').length,
    resolved: resolved.length,
  }
  const score = Math.max(0, 100 - (stats.high * 8 + stats.med * 4 + stats.low * 2))

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-3 text-white', score > 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : score > 60 ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-rose-500 to-pink-500')}>
        <div className="flex items-center gap-2 mb-1">
          <FileSearch className="w-5 h-5" />
          <h2 className="text-lg font-bold">主题审计</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">当前主题: {current.emoji} {current.name} · {current.description}</p>
        <div className="flex items-end gap-3">
          <div>
            <p className="text-3xl font-bold">{score}</p>
            <p className="text-[10px] opacity-80">健康度</p>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-1.5 text-center pb-1">
            <div className="bg-white/15 rounded-lg py-1">
              <p className="text-sm font-bold">{stats.high}</p>
              <p className="text-[9px] opacity-80">高</p>
            </div>
            <div className="bg-white/15 rounded-lg py-1">
              <p className="text-sm font-bold">{stats.med}</p>
              <p className="text-[9px] opacity-80">中</p>
            </div>
            <div className="bg-white/15 rounded-lg py-1">
              <p className="text-sm font-bold">{stats.low}</p>
              <p className="text-[9px] opacity-80">低</p>
            </div>
            <div className="bg-white/15 rounded-lg py-1">
              <p className="text-sm font-bold">{stats.resolved}</p>
              <p className="text-[9px] opacity-80">已修</p>
            </div>
          </div>
        </div>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI 审计报告
      </button>

      {aiReport && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-3 border border-cyan-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-cyan-500"><Sparkles className="w-3.5 h-3.5" />AI 报告</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiReport}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'high', 'med', 'low', 'resolved'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-[10px] font-semibold flex-shrink-0', filter === f ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? `全部 (${stats.total})` : f === 'resolved' ? `已修 (${stats.resolved})` : `${SEVERITY_META[f].label} (${stats[f]})`}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((it) => {
          const sev = SEVERITY_META[it.severity]
          const cat = CATEGORY_META[it.category]
          const CatIcon = cat.icon
          const isResolved = resolved.includes(it.id)
          return (
            <motion.div
              key={it.id}
              whileHover={{ y: -1 }}
              className={cn('p-2.5 rounded-xl border', isResolved ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200/30 opacity-60' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}
            >
              <div className="flex items-start gap-2">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0', sev.color)}>
                  {isResolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CatIcon className={cn('w-3 h-3', cat.color)} />
                    <span className="text-[10px] text-ink-500">{cat.label}</span>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded text-white font-bold', sev.color)}>{sev.label}</span>
                    <span className="text-[9px] text-ink-400 ml-auto">×{it.count}</span>
                  </div>
                  <p className={cn('text-xs font-semibold', isResolved && 'line-through')}>{it.message}</p>
                  <p className="text-[10px] text-ink-500 mt-0.5">→ {it.fix}</p>
                </div>
                <button
                  onClick={() => isResolved ? unresolve(it.id) : resolve(it.id)}
                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center', isResolved ? 'bg-ink-100 dark:bg-ink-800' : 'bg-emerald-500 text-white')}
                >
                  {isResolved ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
