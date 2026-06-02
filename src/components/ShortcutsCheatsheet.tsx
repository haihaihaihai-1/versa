import { useState, useEffect } from 'react'
import { motion, Reorder } from 'framer-motion'
import { GripVertical, Plus, Trash2, Edit3, Check, X, Keyboard, Command } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Shortcut {
  id: string
  keys: string[]
  description: string
  category: 'nav' | 'action' | 'view' | 'custom'
  enabled: boolean
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 's1', keys: ['g', 'h'], description: '回到首页', category: 'nav', enabled: true },
  { id: 's2', keys: ['g', 'f'], description: '前往动态', category: 'nav', enabled: true },
  { id: 's3', keys: ['g', 's'], description: '前往购物', category: 'nav', enabled: true },
  { id: 's4', keys: ['g', 'n'], description: '前往资讯', category: 'nav', enabled: true },
  { id: 's5', keys: ['g', 'd'], description: '前往辩论', category: 'nav', enabled: true },
  { id: 's6', keys: ['/'], description: '聚焦搜索框', category: 'action', enabled: true },
  { id: 's7', keys: ['c'], description: '打开购物车', category: 'action', enabled: true },
  { id: 's8', keys: ['n'], description: '打开通知中心', category: 'action', enabled: true },
  { id: 's9', keys: ['m'], description: '打开消息', category: 'action', enabled: true },
  { id: 's10', keys: ['?'], description: '显示快捷键帮助', category: 'view', enabled: true },
  { id: 's11', keys: ['t'], description: '切换主题', category: 'view', enabled: true },
  { id: 's12', keys: ['l'], description: '切换语言', category: 'view', enabled: true },
  { id: 's13', keys: ['Esc'], description: '关闭弹窗', category: 'view', enabled: true },
  { id: 's14', keys: ['j'], description: '下一个内容', category: 'view', enabled: true },
  { id: 's15', keys: ['k'], description: '上一个内容', category: 'view', enabled: true },
]

const STORAGE_KEY = 'versa:shortcuts'

function load(): Shortcut[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return DEFAULT_SHORTCUTS }
function save(d: Shortcut[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  nav: { label: '导航', color: 'bg-blue-500', icon: '🧭' },
  action: { label: '操作', color: 'bg-violet-500', icon: '⚡' },
  view: { label: '视图', color: 'bg-emerald-500', icon: '👁️' },
  custom: { label: '自定义', color: 'bg-amber-500', icon: '✨' },
}

function KeysDisplay({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="text-[10px] text-ink-400 mx-0.5">+</span>}
          <kbd className="px-1.5 h-5 min-w-[20px] inline-flex items-center justify-center rounded bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 text-[10px] font-mono font-semibold text-ink-700 dark:text-ink-300">{k}</kbd>
        </span>
      ))}
    </div>
  )
}

export function ShortcutsCheatsheet() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(load())
  const [editing, setEditing] = useState<string | null>(null)
  const [tempDesc, setTempDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [newKeys, setNewKeys] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => { save(shortcuts) }, [shortcuts])

  const toggle = (id: string) => setShortcuts((ss) => ss.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))

  const startEdit = (id: string) => {
    const s = shortcuts.find((x) => x.id === id)
    if (s) { setTempDesc(s.description); setEditing(id) }
  }

  const saveEdit = () => {
    if (!editing) return
    setShortcuts((ss) => ss.map((s) => s.id === editing ? { ...s, description: tempDesc } : s))
    setEditing(null)
  }

  const remove = (id: string) => setShortcuts((ss) => ss.filter((s) => s.id !== id))

  const add = () => {
    if (!newKeys.trim() || !newDesc.trim()) { toast('请填写完整', 'error'); return }
    const s: Shortcut = { id: uid(), keys: newKeys.split('+').map((k) => k.trim()), description: newDesc, category: 'custom', enabled: true }
    setShortcuts([s, ...shortcuts])
    setNewKeys(''); setNewDesc(''); setAdding(false)
    toast('已添加', 'success')
  }

  const reset = () => { setShortcuts(DEFAULT_SHORTCUTS); toast('已重置', 'info') }

  const grouped = (() => {
    const out: Record<string, Shortcut[]> = {}
    shortcuts.forEach((s) => { if (!out[s.category]) out[s.category] = []; out[s.category].push(s) })
    return out
  })()

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Keyboard className="w-5 h-5" />
          <h2 className="text-lg font-bold">快捷键速查</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">键盘党的福音 · 自定义你的快捷键</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{shortcuts.length}</p>
            <p className="text-[10px] opacity-80">总数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{shortcuts.filter((s) => s.enabled).length}</p>
            <p className="text-[10px] opacity-80">启用</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{shortcuts.filter((s) => s.category === 'custom').length}</p>
            <p className="text-[10px] opacity-80">自定义</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" />添加快捷键
        </button>
        <button onClick={reset} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">重置</button>
      </div>

      {Object.entries(grouped).map(([cat, list]) => {
        const Meta = CATEGORIES[cat] || CATEGORIES.custom
        return (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cn('w-5 h-5 rounded-lg flex items-center justify-center text-xs', Meta.color)}>{Meta.icon}</span>
              <p className="text-xs font-bold">{Meta.label}</p>
              <span className="text-[10px] text-ink-500">{list.length} 项</span>
            </div>
            <Reorder.Group axis="y" values={list} onReorder={() => {}} className="space-y-1">
              {list.map((s) => (
                <Reorder.Item
                  key={s.id}
                  value={s}
                  onDragEnd={() => {
                    const newOrder = shortcuts.filter((x) => x.category !== cat)
                    newOrder.push(...list)
                    setShortcuts(newOrder)
                  }}
                  className={cn('flex items-center gap-1.5 p-2 rounded-xl border cursor-grab active:cursor-grabbing', s.enabled ? 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60' : 'bg-ink-50 dark:bg-ink-900/10 border-ink-200/30 opacity-50')}
                >
                  <GripVertical className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                  <KeysDisplay keys={s.keys} />
                  {editing === s.id ? (
                    <input value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} autoFocus className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
                  ) : (
                    <span className="flex-1 text-xs">{s.description}</span>
                  )}
                  {editing === s.id ? (
                    <>
                      <button onClick={saveEdit} className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setEditing(null)} className="w-6 h-6 rounded-lg bg-ink-200 dark:bg-ink-800 flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(s.id)} className="w-6 h-6 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center"><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => toggle(s.id)} className={cn('w-6 h-6 rounded-lg flex items-center justify-center', s.enabled ? 'bg-emerald-500 text-white' : 'bg-ink-200 dark:bg-ink-800')}>
                        {s.enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </button>
                      {s.category === 'custom' && (
                        <button onClick={() => remove(s.id)} className="w-6 h-6 rounded-lg bg-ink-100 dark:bg-ink-800 text-rose-500 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                      )}
                    </>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )
      })}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold">添加快捷键</h3>
            <input value={newKeys} onChange={(e) => setNewKeys(e.target.value)} placeholder="按键 (如: ctrl+k 或 g+h)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
            <div className="flex gap-1.5">
              <button onClick={() => setAdding(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm">取消</button>
              <button onClick={add} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-sm font-semibold">添加</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
