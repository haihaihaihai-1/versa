import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Copy, Check, ArrowLeftRight, Hash, FileText, Image as ImageIcon, Sparkles, Loader2, Trash2, History } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type Mode = 'b64-encode' | 'b64-decode' | 'url-encode' | 'url-decode' | 'hash' | 'jwt-decode'

const STORAGE_KEY = 'versa:encoder-history'

function load(): { id: string; mode: Mode; input: string; output: string; at: number }[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function saveHist(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function base64Encode(text: string): string {
  try { return btoa(unescape(encodeURIComponent(text))) } catch { return '' }
}
function base64Decode(b64: string): string {
  try { return decodeURIComponent(escape(atob(b64.replace(/\s/g, '')))) } catch { return '解码失败' }
}

function base64ImageEncode(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function jwtDecode(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { error: '无效 JWT 格式' }
    const header = JSON.parse(base64Decode(parts[0]) || '{}')
    const payload = JSON.parse(base64Decode(parts[1]) || '{}')
    const now = Math.floor(Date.now() / 1000)
    const expired = payload.exp && payload.exp < now
    return { header, payload, expired, expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString('zh-CN') : '永不过期' }
  } catch (e: any) { return { error: e.message } }
}

export function EncoderStudio() {
  const [mode, setMode] = useState<Mode>('b64-encode')
  const [input, setInput] = useState('Hello, Versa! 🚀 购物/社交/辩论 三体融合')
  const [output, setOutput] = useState('')
  const [history, setHistory] = useState(load())
  const [copied, setCopied] = useState(false)
  const [aiHelp, setAiHelp] = useState('')
  const [loading, setLoading] = useState(false)

  const convert = async () => {
    if (mode === 'b64-encode') setOutput(base64Encode(input))
    else if (mode === 'b64-decode') setOutput(base64Decode(input))
    else if (mode === 'url-encode') setOutput(encodeURIComponent(input))
    else if (mode === 'url-decode') { try { setOutput(decodeURIComponent(input)) } catch { setOutput('解码失败') } }
    else if (mode === 'hash') {
      const md5 = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h).toString(16).padStart(8, '0') }
      const sha = await sha256(input)
      setOutput(`MD5:    ${md5(input)}\nSHA-256: ${sha}`)
    }
    else if (mode === 'jwt-decode') {
      const r = jwtDecode(input)
      setOutput(JSON.stringify(r, null, 2))
    }
  }

  const onFile = async (e: any) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (mode === 'b64-encode' && f.type.startsWith('image/')) {
      const dataUrl = await base64ImageEncode(f)
      setInput(dataUrl)
      setOutput('图片已编码为 Base64 DataURL')
    }
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast('已复制', 'success')
  }

  const save = () => {
    setHistory([{ id: 'e' + Date.now(), mode, input, output, at: Date.now() }, ...history].slice(0, 10))
    saveHist([{ id: 'e' + Date.now(), mode, input, output, at: Date.now() }, ...history].slice(0, 10))
    toast('已保存', 'success')
  }
  const loadItem = (h: any) => { setMode(h.mode); setInput(h.input); setOutput(h.output) }
  const remove = (id: string) => setHistory(history.filter((h: any) => h.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiCurrent(mode)
      setAiHelp(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const aiCurrent = async (m: Mode) => {
    return await aiComplete(`用 50-80 字简洁解释 ${m} 编码方式的用途和场景`, '你是 Versa 编码专家, 简洁专业, 中文')
  }

  const swap = () => { setInput(output); setOutput('') }

  const MODES: Array<{ k: Mode; l: string; icon: any }> = [
    { k: 'b64-encode', l: 'Base64 编码', icon: Lock },
    { k: 'b64-decode', l: 'Base64 解码', icon: Unlock },
    { k: 'url-encode', l: 'URL 编码', icon: Hash },
    { k: 'url-decode', l: 'URL 解码', icon: Hash },
    { k: 'hash', l: '哈希', icon: FileText },
    { k: 'jwt-decode', l: 'JWT 解码', icon: FileText },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5" />
          <h2 className="text-lg font-bold">编码工坊</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">Base64 · URL · 哈希 · JWT</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{MODES.length}</p>
            <p className="text-[10px] opacity-80">模式</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] opacity-80">历史</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{output.length}</p>
            <p className="text-[10px] opacity-80">输出字符</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map((m) => (
          <button key={m.k} onClick={() => { setMode(m.k); setOutput('') }} className={cn('h-9 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold', mode === m.k ? 'bg-slate-800 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            <m.icon className="w-3.5 h-3.5" />{m.l}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold">输入</p>
          <div className="flex gap-1">
            {mode === 'b64-encode' && (
              <label className="px-2 h-6 rounded bg-slate-800 text-white text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer">
                <ImageIcon className="w-2.5 h-2.5" />图片
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
            )}
            <button onClick={swap} disabled={!output} className="px-2 h-6 rounded bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold flex items-center gap-0.5 disabled:opacity-30">
              <ArrowLeftRight className="w-2.5 h-2.5" />交换
            </button>
          </div>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} className="w-full px-2 py-1.5 rounded bg-ink-50 dark:bg-ink-800 text-xs font-mono outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
        <button onClick={convert} className="w-full h-9 rounded-lg bg-slate-800 text-white text-xs font-semibold">
          {mode.startsWith('b64-') || mode === 'hash' ? '🔄 转换' : mode.includes('encode') ? '🔒 编码' : '🔓 解码'}
        </button>
      </div>

      {output && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">输出</p>
            <button onClick={() => copy(output)} className="text-[10px] text-slate-800 font-semibold flex items-center gap-0.5">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}复制
            </button>
          </div>
          <pre className="px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-900 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-40">{output}</pre>
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={save} className="flex-1 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">保存</button>
        <button onClick={runAI} disabled={loading} className="flex-1 h-8 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiHelp && (
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2 border border-slate-200/40">
          <p className="text-[10px] leading-relaxed">{aiHelp}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {history.slice(0, 5).map((h: any) => (
            <div key={h.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
              <button onClick={() => loadItem(h)} className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-bold text-slate-800">{MODES.find((m) => m.k === h.mode)?.l}</p>
                <p className="text-[10px] text-ink-500 truncate">{h.input.substring(0, 30)}...</p>
              </button>
              <button onClick={() => remove(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
