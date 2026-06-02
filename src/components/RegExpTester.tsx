import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Regex, Sparkles, Loader2, Copy, Check, X, Search, Replace, BookOpen, Code, History, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Match {
  start: number
  end: number
  text: string
}

const SAMPLE_PATTERNS = [
  { name: '邮箱', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { name: 'URL', pattern: 'https?:\\/\\/[^\\s]+' },
  { name: '手机号', pattern: '1[3-9]\\d{9}' },
  { name: 'IPv4', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' },
  { name: '日期', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  { name: '十六进制色', pattern: '#[0-9A-Fa-f]{6}' },
  { name: '整数', pattern: '-?\\d+' },
  { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]+' },
]

const STORAGE_KEY = 'versa:regex-history'

function load(): { pattern: string; flags: string; at: number }[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function RegExpTester() {
  const [pattern, setPattern] = useState('\\b\\w+@\\w+\\.[a-z]{2,}\\b')
  const [flags, setFlags] = useState('gi')
  const [text, setText] = useState('联系我: foo@bar.com 或 test@example.cn. 电话 13800138000, 另一个邮箱 admin@versa.app')
  const [replace, setReplace] = useState('')
  const [replaceMode, setReplaceMode] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [error, setError] = useState('')
  const [history, setHistory] = useState(load())
  const [aiExplain, setAiExplain] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!pattern) { setMatches([]); setError(''); return }
    try {
      const re = new RegExp(pattern, flags)
      const out: Match[] = []
      let m
      while ((m = re.exec(text)) !== null) {
        if (m.index === re.lastIndex) { re.lastIndex++; continue }
        out.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
        if (!flags.includes('g')) break
      }
      setMatches(out)
      setError('')
    } catch (e: any) { setError(e.message); setMatches([]) }
  }, [pattern, flags, text])

  const highlightText = (): { text: string; match: boolean }[] => {
    if (!matches.length) return [{ text, match: false }]
    const parts: { text: string; match: boolean }[] = []
    let last = 0
    matches.forEach((m) => {
      if (m.start > last) parts.push({ text: text.substring(last, m.start), match: false })
      parts.push({ text: m.text, match: true })
      last = m.end
    })
    if (last < text.length) parts.push({ text: text.substring(last), match: false })
    return parts
  }

  const doReplace = () => {
    if (!pattern) return
    try {
      const re = new RegExp(pattern, flags)
      const newText = text.replace(re, replace)
      setText(newText)
      toast('已替换', 'success')
    } catch (e: any) { toast(e.message, 'error') }
  }

  const savePattern = () => {
    setHistory([{ pattern, flags, at: Date.now() }, ...history].slice(0, 10))
    save([{ pattern, flags, at: Date.now() }, ...history].slice(0, 10))
    toast('已保存', 'success')
  }

  const copyMatches = () => {
    const joined = matches.map((m) => m.text).join('\n')
    navigator.clipboard?.writeText(joined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast(`已复制 ${matches.length} 个匹配`, 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`用 50-80 字简洁解释这个正则表达式的含义: /${pattern}/${flags}`, '你是 Versa 正则专家, 简洁专业, 中文')
      setAiExplain(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Regex className="w-5 h-5" />
          <h2 className="text-lg font-bold">正则测试</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">实时匹配 · 替换 · AI 解释</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{matches.length}</p>
            <p className="text-[10px] opacity-80">匹配</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{text.length}</p>
            <p className="text-[10px] opacity-80">字符</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] opacity-80">历史</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-cyan-500 font-mono font-bold">/</span>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="正则表达式" className="flex-1 px-2 h-9 rounded bg-ink-50 dark:bg-ink-800 text-sm font-mono outline-none" />
          <span className="text-cyan-500 font-mono font-bold">/</span>
          <input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="flags" className="w-16 px-2 h-9 rounded bg-ink-50 dark:bg-ink-800 text-sm font-mono outline-none" />
        </div>
        {error && <p className="text-[10px] text-rose-500 font-mono">⚠ {error}</p>}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setReplaceMode(!replaceMode)} className={cn('px-2 h-7 rounded text-[10px] font-semibold', replaceMode ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            <Replace className="w-3 h-3 inline mr-0.5" />替换
          </button>
          <button onClick={runAI} disabled={loading} className="px-2 h-7 rounded bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-semibold flex items-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
          </button>
          <button onClick={savePattern} className="px-2 h-7 rounded bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold">保存</button>
        </div>
        {replaceMode && (
          <div className="flex gap-1.5">
            <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="替换为..." className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
            <button onClick={doReplace} className="px-3 h-7 rounded bg-cyan-500 text-white text-xs font-semibold">执行</button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SAMPLE_PATTERNS.map((s) => (
          <button key={s.name} onClick={() => { setPattern(s.pattern); setFlags('g') }} className="px-2.5 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold flex-shrink-0">
            {s.name}
          </button>
        ))}
      </div>

      {aiExplain && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed">{aiExplain}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold">测试文本</p>
          <div className="flex gap-1">
            <button onClick={copyMatches} disabled={!matches.length} className="px-2 h-6 rounded bg-cyan-500 text-white text-[10px] font-semibold flex items-center gap-0.5">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}匹配
            </button>
          </div>
        </div>
        <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full px-2 py-1.5 rounded bg-ink-50 dark:bg-ink-800 text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5">高亮预览 ({matches.length})</p>
        <div className="p-2 rounded bg-ink-50 dark:bg-ink-800 text-xs font-mono whitespace-pre-wrap break-all min-h-[60px]">
          {highlightText().map((p, i) => p.match ? (
            <mark key={i} className="bg-cyan-500 text-white px-0.5 rounded">{p.text}</mark>
          ) : (
            <span key={i}>{p.text}</span>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {history.slice(0, 5).map((h, i) => (
            <button key={i} onClick={() => { setPattern(h.pattern); setFlags(h.flags) }} className="w-full flex items-center gap-1.5 p-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-left">
              <span className="text-cyan-500 font-mono">/</span>
              <code className="text-xs font-mono flex-1 truncate">{h.pattern}</code>
              <span className="text-cyan-500 font-mono">/{h.flags}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
