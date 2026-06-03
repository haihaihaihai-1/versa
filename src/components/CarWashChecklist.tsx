import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check, RotateCcw, Calendar, Droplet, Wind, Sun, Wrench, Award, Plus, Trash2 } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface WashItem {
  id: string
  name: string
  category: 'exterior' | 'interior' | 'detail' | 'tire' | 'glass' | 'engine'
  done: boolean
}

const STORAGE_KEY = 'versa:car-wash-tasks-v1'

function load(): WashItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: WashItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): WashItem[] {
  return [
    { id: '1', name: '车身预冲洗', category: 'exterior', done: false },
    { id: '2', name: '喷洒洗车液', category: 'exterior', done: false },
    { id: '3', name: '手工擦洗轮毂', category: 'tire', done: false },
    { id: '4', name: '清洗轮胎侧壁', category: 'tire', done: false },
    { id: '5', name: '冲洗车身缝隙', category: 'exterior', done: false },
    { id: '6', name: '擦拭车身漆面', category: 'exterior', done: false },
    { id: '7', name: '清洁车窗玻璃', category: 'glass', done: false },
    { id: '8', name: '擦拭后视镜', category: 'glass', done: false },
    { id: '9', name: '清理内饰灰尘', category: 'interior', done: false },
    { id: '10', name: '吸尘座椅/地毯', category: 'interior', done: false },
    { id: '11', name: '清洁仪表台', category: 'interior', done: false },
    { id: '12', name: '擦拭中控屏幕', category: 'detail', done: false },
    { id: '13', name: '空调出风口清洁', category: 'detail', done: false },
    { id: '14', name: '车门边框清洁', category: 'detail', done: false },
    { id: '15', name: '底盘冲洗', category: 'exterior', done: false },
    { id: '16', name: '打蜡/镀膜', category: 'exterior', done: false },
    { id: '17', name: '轮胎上光', category: 'tire', done: false },
    { id: '18', name: '内饰皮革护理', category: 'detail', done: false },
    { id: '19', name: '引擎舱除尘', category: 'engine', done: false },
    { id: '20', name: '空气净化', category: 'interior', done: false },
  ]
}

const CAT_META = {
  exterior: { label: '外观', icon: Sun, color: 'from-cyan-500 to-blue-500' },
  interior: { label: '内饰', icon: Wind, color: 'from-violet-500 to-purple-500' },
  detail: { label: '细节', icon: Sparkles, color: 'from-amber-500 to-orange-500' },
  tire: { label: '轮胎', icon: Wrench, color: 'from-slate-500 to-zinc-600' },
  glass: { label: '玻璃', icon: Droplet, color: 'from-cyan-500 to-teal-500' },
  engine: { label: '引擎', color: 'from-rose-500 to-red-500', icon: Wrench },
} as const

export function CarWashChecklist() {
  const [list, setList] = useState<WashItem[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<keyof typeof CAT_META | 'all' | 'undone'>('all')
  const [draft, setDraft] = useState({ name: '', category: 'exterior' as keyof typeof CAT_META })

  useEffect(() => { save(list) }, [list])

  const filtered = list.filter((i) => {
    if (filter === 'undone' && i.done) return false
    if (filter !== 'all' && filter !== 'undone' && i.category !== filter) return false
    return true
  })
  const doneCount = list.filter((i) => i.done).length
  const percent = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0
  const earn = percent >= 100 ? 50 : percent >= 75 ? 30 : percent >= 50 ? 15 : 0

  const toggle = (id: string) => setList(list.map((i) => i.id === id ? { ...i, done: !i.done } : i))
  const reset = () => { setList(list.map((i) => ({ ...i, done: false }))); toast('已重置', 'success') }
  const add = () => {
    if (!draft.name) { toast('请填写名称', 'error'); return }
    setList([...list, { id: uid(), name: draft.name, category: draft.category, done: false }])
    setDraft({ ...draft, name: '' })
    setShowForm(false)
    toast('已添加', 'success')
  }
  const del = (id: string) => setList(list.filter((i) => i.id !== id))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">洗车清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">20+ 项步骤 · 6 分类 · 积分奖励</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{doneCount}/{list.length}</p><p className="text-[9px] opacity-80">完成</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{percent}%</p><p className="text-[9px] opacity-80">进度</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">+{earn}</p><p className="text-[9px] opacity-80">积分</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(CAT_META).length}</p><p className="text-[9px] opacity-80">类别</p></div>
        </div>
        <div className="h-2 rounded-full bg-white/20 overflow-hidden mt-2">
          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-gradient-to-r from-amber-300 to-yellow-400" />
        </div>
      </div>

      <div className="flex gap-1">
        <button onClick={reset} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"><RotateCcw className="w-3 h-3" />重置</button>
        <button onClick={() => setShowForm(!showForm)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加'}</button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="步骤名称" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(CAT_META) as (keyof typeof CAT_META)[]).map((c) => {
              const Icon = CAT_META[c].icon
              return (
                <button key={c} onClick={() => setDraft({ ...draft, category: c })} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px]', draft.category === c ? `bg-gradient-to-br ${CAT_META[c].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                  <Icon className="w-3 h-3" />{CAT_META[c].label}
                </button>
              )
            })}
          </div>
          <button onClick={add} className="w-full h-9 rounded-lg bg-sky-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'undone', ...Object.keys(CAT_META)] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filter === c ? 'bg-sky-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'undone' ? '未完成' : CAT_META[c as keyof typeof CAT_META].label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2 border border-ink-200/40 dark:border-ink-800/40">
        {filtered.map((item) => {
          const meta = CAT_META[item.category]
          const Icon = meta.icon
          return (
            <div key={item.id} className="flex items-center gap-1.5 py-1.5 px-1 border-b border-ink-200/30 last:border-0">
              <button onClick={() => toggle(item.id)} className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', item.done ? `bg-gradient-to-br ${meta.color} text-white` : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>
                {item.done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              </button>
              <span className={cn('flex-1 text-xs', item.done ? 'line-through text-ink-400' : 'text-ink-800 dark:text-ink-200 font-semibold')}>{item.name}</span>
              <span className="text-[9px] bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 rounded">{meta.label}</span>
              <button onClick={() => del(item.id)} className="text-ink-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          )
        })}
      </div>

      {percent === 100 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-2.5 border border-amber-200/40 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-amber-700 dark:text-amber-300">🎉 完美洗车 +50 积分</p>
            <p className="text-ink-500 text-[10px]">所有步骤完成, 车辆焕然一新</p>
          </div>
        </div>
      )}
    </div>
  )
}
