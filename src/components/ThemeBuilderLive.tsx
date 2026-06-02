import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Save, RotateCcw, Eye, Sparkles, Check, Copy, Download, Upload } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAccentTheme, ACCENT_PRESETS } from '../hooks/useAccentTheme'
import { toast } from './ui/Toaster'

interface ThemeSnapshot {
  name: string
  accent: string
  primary: string
  secondary: string
  bg: string
  text: string
  radius: number
  font: string
  createdAt: number
}

const STORAGE_KEY = 'versa:theme-snapshots'

function loadSnapshots(): ThemeSnapshot[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { name: '预设: 暖色', accent: 'sunset', primary: '#f97316', secondary: '#ec4899', bg: '#fff7ed', text: '#7c2d12', radius: 12, font: 'sans', createdAt: Date.now() },
    { name: '预设: 商务', accent: 'nova', primary: '#1e293b', secondary: '#334155', bg: '#f8fafc', text: '#0f172a', radius: 6, font: 'sans', createdAt: Date.now() },
  ]
}
function saveSnapshots(d: ThemeSnapshot[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const SAMPLE_BG: ThemeSnapshot[] = [
  { name: '示例: 奶茶', accent: 'rose', primary: '#d97706', secondary: '#92400e', bg: '#fef3c7', text: '#451a03', radius: 16, font: 'serif', createdAt: 0 },
  { name: '示例: 极光', accent: 'cyber', primary: '#06b6d4', secondary: '#8b5cf6', bg: '#0f172a', text: '#f1f5f9', radius: 20, font: 'sans', createdAt: 0 },
]

export function ThemeBuilderLive() {
  const { theme, setTheme, current } = useAccentTheme()
  const [primary, setPrimary] = useState('#8b5cf6')
  const [secondary, setSecondary] = useState('#ec4899')
  const [bg, setBg] = useState('#ffffff')
  const [text, setText] = useState('#0a0a0a')
  const [radius, setRadius] = useState(12)
  const [font, setFont] = useState<'sans' | 'serif' | 'mono'>('sans')
  const [snapshots, setSnapshots] = useState<ThemeSnapshot[]>(loadSnapshots())
  const [name, setName] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')

  const applyAccent = (key: string) => setTheme(key as any)
  const currentPreset = ACCENT_PRESETS.find((p) => p.key === theme) || ACCENT_PRESETS[0]
  const activeColor = currentPreset.swatches[500]

  const snapshotNow = (): ThemeSnapshot => ({
    name: name || `${currentPreset.name}主题`, accent: theme, primary, secondary, bg, text, radius, font, createdAt: Date.now(),
  })

  const saveCurrent = () => {
    const snap = snapshotNow()
    const next = [snap, ...snapshots]
    setSnapshots(next)
    saveSnapshots(next)
    setName('')
    toast('快照已保存', 'success')
  }

  const apply = (s: ThemeSnapshot) => {
    setPrimary(s.primary); setSecondary(s.secondary); setBg(s.bg); setText(s.text)
    setRadius(s.radius); setFont(s.font as any); applyAccent(s.accent)
    toast(`已应用: ${s.name}`, 'success')
  }

  const remove = (idx: number) => {
    const next = snapshots.filter((_, i) => i !== idx)
    setSnapshots(next); saveSnapshots(next)
  }

  const exportTheme = () => {
    const json = JSON.stringify(snapshotNow(), null, 2)
    navigator.clipboard?.writeText(json)
    toast('已复制到剪贴板', 'success')
  }

  const importTheme = () => {
    try {
      const obj = JSON.parse(importText)
      if (obj.primary && obj.bg) {
        apply(obj)
        setShowImport(false); setImportText('')
        toast('已导入', 'success')
      } else { toast('格式错误', 'error') }
    } catch { toast('JSON 解析失败', 'error') }
  }

  const reset = () => {
    setPrimary('#8b5cf6'); setSecondary('#ec4899'); setBg('#ffffff'); setText('#0a0a0a')
    setRadius(12); setFont('sans'); applyAccent('nova')
    toast('已重置', 'info')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-1.5">
          <Palette className="w-5 h-5 text-nova-500" />
          主题工坊
        </h3>
        <div className="flex items-center gap-1.5">
          <button onClick={exportTheme} className="px-2 h-7 rounded-lg text-[10px] font-medium bg-ink-100 dark:bg-ink-800 flex items-center gap-0.5">
            <Download className="w-3 h-3" />导出
          </button>
          <button onClick={() => setShowImport(true)} className="px-2 h-7 rounded-lg text-[10px] font-medium bg-ink-100 dark:bg-ink-800 flex items-center gap-0.5">
            <Upload className="w-3 h-3" />导入
          </button>
          <button onClick={reset} className="px-2 h-7 rounded-lg text-[10px] font-medium bg-ink-100 dark:bg-ink-800 flex items-center gap-0.5">
            <RotateCcw className="w-3 h-3" />重置
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-ink-500 mb-2">主题色</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyAccent(p.key)}
              className={cn(
                'relative p-2 rounded-xl border-2 transition',
                theme === p.key ? 'border-ink-900 dark:border-white' : 'border-transparent hover:border-ink-300'
              )}
            >
              <div className={cn('w-full aspect-square rounded-lg bg-gradient-to-br mb-1 flex items-center justify-center text-xl', p.gradient)}>
                {p.emoji}
              </div>
              <p className="text-[9px] font-medium truncate">{p.name}</p>
              {theme === p.key && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-ink-900 dark:bg-white flex items-center justify-center">
                  <Check className="w-2 h-2 text-white dark:text-ink-900" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { k: 'primary', label: '主色', v: primary, set: setPrimary },
          { k: 'secondary', label: '次色', v: secondary, set: setSecondary },
          { k: 'bg', label: '背景', v: bg, set: setBg },
          { k: 'text', label: '文字', v: text, set: setText },
        ].map((c) => (
          <div key={c.k}>
            <label className="text-[10px] text-ink-500 mb-1 block">{c.label}</label>
            <div className="flex items-center gap-1">
              <input type="color" value={c.v} onChange={(e) => c.set(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-ink-200" />
              <input value={c.v} onChange={(e) => c.set(e.target.value)} className="flex-1 min-w-0 px-1.5 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-[10px] font-mono outline-none" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-ink-500 mb-1 block">圆角: {radius}px</label>
          <input type="range" min="0" max="24" value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full accent-nova-500" />
        </div>
        <div>
          <label className="text-[10px] text-ink-500 mb-1 block">字体</label>
          <div className="flex gap-1">
            {(['sans', 'serif', 'mono'] as const).map((f) => (
              <button key={f} onClick={() => setFont(f)} className={cn('flex-1 h-8 text-[10px] font-medium', font === f ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-nova-500" />
          <p className="text-xs font-semibold">实时预览</p>
        </div>
        <div className="p-3 rounded-xl" style={{ background: bg, color: text, borderRadius: radius, fontFamily: font === 'serif' ? 'Georgia, serif' : font === 'mono' ? 'Menlo, monospace' : 'inherit' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, borderRadius: radius }}>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm font-bold">Versa 卡片</p>
          </div>
          <p className="text-[10px] opacity-70 mb-2">这是当前主题的实时预览</p>
          <div className="flex gap-1.5">
            <button className="px-2.5 h-7 text-[10px] font-semibold text-white" style={{ background: primary, borderRadius: radius }}>主操作</button>
            <button className="px-2.5 h-7 text-[10px] font-semibold text-white" style={{ background: secondary, borderRadius: radius }}>次操作</button>
            <button className="px-2.5 h-7 text-[10px] font-semibold border" style={{ borderColor: activeColor, color: activeColor, borderRadius: radius }}>描边</button>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="快照名 (可选)" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500" />
        <button onClick={saveCurrent} className="px-3 h-9 rounded-lg bg-nova-500 text-white text-xs font-semibold flex items-center gap-1">
          <Save className="w-3 h-3" />保存
        </button>
      </div>

      <div>
        <p className="text-xs text-ink-500 mb-2">我的快照 ({snapshots.length})</p>
        {snapshots.length === 0 ? (
          <p className="text-xs text-center text-ink-400 py-4">还没有快照, 点击"保存"添加</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {snapshots.map((s, i) => (
              <div key={i} className="p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
                <div className="flex gap-0.5 flex-shrink-0">
                  <div className="w-4 h-4 rounded-full" style={{ background: s.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: s.secondary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{s.name}</p>
                  <p className="text-[9px] text-ink-500">{s.accent} · r{s.radius} · {s.font}</p>
                </div>
                <button onClick={() => apply(s)} className="text-[10px] text-nova-500 font-bold">应用</button>
                <button onClick={() => remove(i)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-500 mb-2">示例快照</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SAMPLE_BG.map((s, i) => (
            <div key={i} className="p-2 rounded-xl bg-nova-50/40 dark:bg-nova-900/20 border border-nova-200/40 flex items-center gap-2">
              <div className="flex gap-0.5 flex-shrink-0">
                <div className="w-4 h-4 rounded-full" style={{ background: s.primary }} />
                <div className="w-4 h-4 rounded-full" style={{ background: s.secondary }} />
              </div>
              <p className="flex-1 text-xs font-semibold">{s.name}</p>
              <button onClick={() => apply(s)} className="text-[10px] text-nova-500 font-bold">应用</button>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold">导入主题</h3>
              <p className="text-xs text-ink-500">粘贴导出的主题 JSON:</p>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs font-mono outline-none focus:ring-2 focus:ring-nova-500 resize-none" />
              <div className="flex gap-1.5">
                <button onClick={() => setShowImport(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm">取消</button>
                <button onClick={importTheme} className="flex-1 h-9 rounded-lg bg-nova-500 text-white text-sm font-semibold">导入</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
