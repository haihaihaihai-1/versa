import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Eye, Save, Download, Sparkles, Loader2, Hash, Bold, Italic, List, Link2, Code, Quote, FileText, Sun, Moon } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:md-docs'

interface Doc {
  id: string
  title: string
  content: string
  theme: 'light' | 'dark' | 'sepia'
  at: number
}

function load(): Doc[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'd1', title: '欢迎使用 Versa', content: '# 欢迎\n\n这是一个 **Markdown** 编辑器。\n\n## 功能\n- 实时预览\n- 语法高亮\n- AI 优化\n- 多主题\n\n## 代码\n```javascript\nconst hello = "world";\n```\n\n> 引用块', theme: 'light', at: Date.now() - 86400000 },
] }
function save(d: Doc[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function md(text: string, theme: 'light' | 'dark' | 'sepia'): string {
  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-pink-500 text-xs font-mono">$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="p-3 rounded-lg bg-ink-900 text-ink-100 text-xs font-mono overflow-x-auto my-2"><code>$2</code></pre>')
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-nova-500 pl-3 italic my-2 text-ink-600 dark:text-ink-400">$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-nova-500 underline">$1</a>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
  return html
}

const TEMPLATES = [
  { name: '空', content: '' },
  { name: 'README', content: '# 项目名\n\n## 介绍\n简短介绍这个项目\n\n## 安装\n```bash\nnpm install\n```\n\n## 使用\n```javascript\nimport lib from "lib"\n```\n\n## 贡献\n欢迎 PR!' },
  { name: '会议纪要', content: '# 会议纪要\n\n**时间**: \n**参与者**: \n\n## 议题\n1. \n2. \n\n## 决定\n- \n\n## 行动项\n- [ ] ' },
  { name: '博客', content: '# 标题\n\n*作者 · 日期*\n\n## 引言\n\n## 主体\n\n## 总结' },
]

export function MarkdownEditor() {
  const [docs, setDocs] = useState<Doc[]>(load())
  const [activeId, setActiveId] = useState(docs[0]?.id || null)
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [aiPolishing, setAiPolishing] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => { save(docs) }, [docs])

  const active = docs.find((d) => d.id === activeId) || docs[0]

  const updateActive = (patch: Partial<Doc>) => {
    setDocs(docs.map((d) => d.id === active.id ? { ...d, ...patch } : d))
  }

  const add = () => {
    const d: Doc = { id: 'd' + Date.now(), title: newTitle || '新文档', content: '# ' + (newTitle || '新文档') + '\n\n开始写作...', theme: 'light', at: Date.now() }
    setDocs([d, ...docs])
    setActiveId(d.id)
    setNewTitle('')
    toast('已创建', 'success')
  }
  const remove = (id: string) => {
    if (confirm('删除文档?')) {
      setDocs(docs.filter((d) => d.id !== id))
      if (activeId === id) setActiveId(docs[0]?.id || null)
    }
  }

  const download = () => {
    if (!active) return
    const blob = new Blob([active.content], { type: 'text/markdown' })
    const link = document.createElement('a')
    link.download = `${active.title}.md`
    link.href = URL.createObjectURL(blob)
    link.click()
    toast('已下载 .md', 'success')
  }

  const insertMarkdown = (before: string, after: string = '') => {
    if (!active) return
    const textarea = document.getElementById('md-textarea') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = active.content.substring(start, end)
    const newContent = active.content.substring(0, start) + before + selected + after + active.content.substring(end)
    updateActive({ content: newContent })
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, start + before.length + selected.length) }, 0)
  }

  const aiPolish = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiPolishing(true)
    try {
      const result = await aiComplete(`优化以下 Markdown 内容, 50-100 字, 保留 Markdown 格式: ${active.content}`, '你是 Versa 文案助理, 简洁专业, 中文')
      updateActive({ content: active.content + '\n\n## AI 优化建议\n\n' + result })
      toast('已添加 AI 建议', 'success')
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setAiPolishing(false) }
  }

  const themeClass = active?.theme === 'dark' ? 'bg-ink-900 text-ink-100' : active?.theme === 'sepia' ? 'bg-amber-50 text-amber-900' : 'bg-white text-ink-900'

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Edit3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">Markdown 编辑</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">实时预览 · 3 主题 · AI 优化</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{docs.length}</p>
            <p className="text-[10px] opacity-80">文档</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{active?.content.length || 0}</p>
            <p className="text-[10px] opacity-80">字符</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{(active?.content.match(/^#+\s/gm) || []).length}</p>
            <p className="text-[10px] opacity-80">标题</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="新文档名" className="flex-1 px-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm" />
        <button onClick={add} className="px-3 h-9 rounded-lg bg-slate-800 text-white text-xs font-semibold">+ 新建</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {docs.map((d) => (
          <button key={d.id} onClick={() => setActiveId(d.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', activeId === d.id ? 'bg-slate-800 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {d.title}
          </button>
        ))}
      </div>

      {active && (
        <>
          <div className="flex gap-1.5">
            <input value={active.title} onChange={(e) => updateActive({ title: e.target.value })} className="flex-1 px-2 h-8 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm font-bold" />
            <button onClick={() => updateActive({ theme: active.theme === 'light' ? 'dark' : active.theme === 'dark' ? 'sepia' : 'light' })} className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              {active.theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : active.theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            </button>
            <button onClick={download} className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => remove(active.id)} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs">×</button>
          </div>

          <div className="flex gap-1.5">
            {(['edit', 'split', 'preview'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn('flex-1 h-7 rounded-lg text-xs font-semibold', mode === m ? 'bg-slate-800 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {m === 'edit' ? '编辑' : m === 'split' ? '双栏' : '预览'}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {([
              { i: Hash, l: '标题', a: '## ', b: '' },
              { i: Bold, l: '粗体', a: '**', b: '**' },
              { i: Italic, l: '斜体', a: '*', b: '*' },
              { i: Code, l: '代码', a: '`', b: '`' },
              { i: List, l: '列表', a: '- ', b: '' },
              { i: Quote, l: '引用', a: '> ', b: '' },
              { i: Link2, l: '链接', a: '[', b: '](url)' },
            ] as const).map((t) => (
              <button key={t.l} onClick={() => insertMarkdown(t.a, t.b)} className="px-2 h-7 rounded bg-ink-100 dark:bg-ink-800 text-xs flex items-center gap-1">
                <t.i className="w-3 h-3" />{t.l}
              </button>
            ))}
            <button onClick={aiPolish} disabled={aiPolishing} className="px-2 h-7 rounded bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs flex items-center gap-1">
              {aiPolishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => updateActive({ content: t.content })} className="px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 bg-ink-100 dark:bg-ink-800">
                {t.name}
              </button>
            ))}
          </div>

          <div className={cn('rounded-2xl border border-ink-200 dark:border-ink-700 overflow-hidden', themeClass)}>
            {mode === 'split' ? (
              <div className="grid grid-cols-2 divide-x divide-ink-200 dark:divide-ink-700">
                <textarea id="md-textarea" value={active.content} onChange={(e) => updateActive({ content: e.target.value })} className="w-full h-96 p-3 font-mono text-xs outline-none resize-none bg-transparent" placeholder="开始用 Markdown 写作..." />
                <div className="p-3 overflow-y-auto h-96" dangerouslySetInnerHTML={{ __html: md(active.content, active.theme) }} />
              </div>
            ) : mode === 'edit' ? (
              <textarea id="md-textarea" value={active.content} onChange={(e) => updateActive({ content: e.target.value })} className="w-full h-96 p-3 font-mono text-xs outline-none resize-none bg-transparent" placeholder="开始用 Markdown 写作..." />
            ) : (
              <div className="p-3 overflow-y-auto h-96" dangerouslySetInnerHTML={{ __html: md(active.content, active.theme) }} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
