import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Plus, X, Edit3, Save, Trash2, Palette } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

const STORAGE_KEY = 'versa:quicknotes'
const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'] as const
const COLOR_BG: Record<typeof COLORS[number], string> = {
  yellow: 'bg-yellow-200 text-yellow-900',
  pink: 'bg-pink-200 text-pink-900',
  blue: 'bg-blue-200 text-blue-900',
  green: 'bg-emerald-200 text-emerald-900',
  purple: 'bg-violet-200 text-violet-900',
}

export interface QuickNote {
  id: string
  text: string
  color: typeof COLORS[number]
  createdAt: number
}

function loadNotes(): QuickNote[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return [
    { id: 'demo1', text: '记得买 iPhone 16 Pro', color: 'yellow', createdAt: Date.now() - 86400000 },
    { id: 'demo2', text: 'AI 写作模板 demo', color: 'blue', createdAt: Date.now() - 3600000 },
  ]
}

export function QuickNotes() {
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [colorPicker, setColorPicker] = useState<string | null>(null)

  useEffect(() => {
    setNotes(loadNotes())
  }, [])

  useEffect(() => {
    if (notes.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch {}
    }
  }, [notes])

  const add = () => {
    const n: QuickNote = {
      id: uid('qn'),
      text: '',
      color: 'yellow',
      createdAt: Date.now(),
    }
    setNotes((arr) => [n, ...arr])
    setEditingId(n.id)
    setEditText('')
  }

  const update = (id: string, patch: Partial<QuickNote>) => {
    setNotes((arr) => arr.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  const remove = (id: string) => {
    setNotes((arr) => arr.filter((n) => n.id !== id))
    toast('便签已删除', 'success')
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <AnimatePresence>
        {notes.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ y: -4, rotate: 1, zIndex: 10 }}
            className={cn(
              'relative p-3 rounded-lg shadow-md min-h-[120px] flex flex-col',
              COLOR_BG[n.color]
            )}
          >
            {editingId === n.id ? (
              <>
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="写点啥..."
                  className="flex-1 bg-transparent outline-none resize-none text-sm placeholder-current placeholder:opacity-50"
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => update(n.id, { color: c })}
                        className={cn(
                          'w-4 h-4 rounded-full border-2',
                          COLOR_BG[c],
                          n.color === c ? 'border-ink-900' : 'border-transparent'
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (!editText.trim()) {
                          remove(n.id)
                        } else {
                          update(n.id, { text: editText })
                          setEditingId(null)
                        }
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  onClick={() => {
                    setEditingId(n.id)
                    setEditText(n.text)
                  }}
                  className="flex-1 text-sm whitespace-pre-wrap cursor-pointer"
                >
                  {n.text || <span className="opacity-50 italic">空便签 · 点击编辑</span>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] opacity-50">
                    {new Date(n.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => {
                        setEditingId(n.id)
                        setEditText(n.text)
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        layout
        onClick={add}
        className="min-h-[120px] rounded-lg border-2 border-dashed border-ink-300 dark:border-ink-700 hover:border-nova-500 hover:bg-nova-50/50 dark:hover:bg-nova-950/20 flex flex-col items-center justify-center gap-1 text-ink-500 hover:text-nova-500 transition"
      >
        <Plus className="w-6 h-6" />
        <span className="text-xs">新建便签</span>
      </motion.button>
    </div>
  )
}
