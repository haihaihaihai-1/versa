import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Sparkles, RefreshCw, Plus, Trash2, Camera, Check, Star, Zap, Layers } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface ShotPlan {
  id: string
  scene: string
  category: 'portrait' | 'landscape' | 'street' | 'event' | 'product' | 'night' | 'food' | 'sports'
  time: string
  duration: number
  equipment: string[]
  shotList: string[]
  notes: string
  done: boolean
  rating: 1 | 2 | 3 | 4 | 5
  date: string
}

const STORAGE_KEY = 'versa:shotplans-v1'

function load(): ShotPlan[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: ShotPlan[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): ShotPlan[] {
  const today = new Date().toISOString()
  return [
    { id: '1', scene: '西湖晨雾', category: 'landscape', time: '05:30', duration: 120, equipment: ['Sony A7M4', '24-70mm f/2.8', '三脚架', '渐变灰滤镜', '快门线'], shotList: ['断桥日出', '雷峰塔倒影', '荷花特写', '晨练人像', '烟雾缭绕'], notes: '日出前 30 分钟到, 找好前景, 注意防潮', done: true, rating: 5, date: today },
    { id: '2', scene: '城市夜景', category: 'night', time: '19:00', duration: 90, equipment: ['Fuji X-T5', '35mm f/1.4', '便携三脚架'], shotList: ['外滩万国建筑', '南京路人流', '陆家嘴天际线', '霓虹招牌'], notes: 'ISO 控制在 1600, 光圈尽量大', done: false, rating: 3, date: today },
  ]
}

const CAT_META = {
  portrait: { label: '人像', icon: '👤', color: 'from-rose-500 to-pink-500' },
  landscape: { label: '风光', icon: '🏔️', color: 'from-emerald-500 to-teal-500' },
  street: { label: '街拍', icon: '🌆', color: 'from-violet-500 to-purple-500' },
  event: { label: '活动', icon: '🎉', color: 'from-amber-500 to-orange-500' },
  product: { label: '产品', icon: '📦', color: 'from-cyan-500 to-blue-500' },
  night: { label: '夜景', icon: '🌃', color: 'from-indigo-500 to-purple-600' },
  food: { label: '美食', icon: '🍜', color: 'from-orange-500 to-amber-500' },
  sports: { label: '运动', icon: '⚽', color: 'from-green-500 to-emerald-500' },
} as const

const EQUIPMENT_PRESETS = ['三脚架', '闪光灯', '反光板', '柔光箱', '渐变灰滤镜', 'CPL 偏振镜', 'ND 减光镜', '快门线', '备用电池', '存储卡', '镜头布', '雨具']

export function ShotList() {
  const [plans, setPlans] = useState<ShotPlan[]>(load())
  const [adding, setAdding] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(plans[0]?.id || null)
  const [form, setForm] = useState<Partial<ShotPlan>>({ category: 'portrait', time: '09:00', duration: 60, equipment: [], shotList: [] })

  useEffect(() => { save(plans) }, [plans])
  const active = plans.find((p) => p.id === activeId) || null

  const add = () => {
    if (!form.scene?.trim()) { toast('请输入场景', 'error'); return }
    const p: ShotPlan = {
      id: uid(),
      scene: form.scene!,
      category: (form.category as any) || 'portrait',
      time: form.time || '09:00',
      duration: form.duration || 60,
      equipment: form.equipment || [],
      shotList: form.shotList || [],
      notes: form.notes || '',
      done: false,
      rating: 3,
      date: new Date().toISOString(),
    }
    setPlans([p, ...plans])
    setActiveId(p.id)
    setAdding(false)
    setForm({ category: 'portrait', time: '09:00', duration: 60, equipment: [], shotList: [] })
    toast('已添加', 'success')
  }

  const toggleDone = (id: string) => setPlans(plans.map((p) => p.id === id ? { ...p, done: !p.done } : p))
  const rate = (id: string, r: 1 | 2 | 3 | 4 | 5) => setPlans(plans.map((p) => p.id === id ? { ...p, rating: r } : p))
  const del = (id: string) => { setPlans(plans.filter((p) => p.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }

  const totalDuration = plans.filter((p) => !p.done).reduce((s, p) => s + p.duration, 0)
  const completedCount = plans.filter((p) => p.done).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Camera className="w-5 h-5" />
          <h2 className="text-lg font-bold">拍摄清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">场景规划 · 装备列表 · 完成追踪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{plans.length}</p><p className="text-[9px] opacity-80">计划</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{completedCount}</p><p className="text-[9px] opacity-80">完成</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Math.round(totalDuration / 60)}h</p><p className="text-[9px] opacity-80">待摄</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{plans.reduce((s, p) => s + p.shotList.length, 0)}</p><p className="text-[9px] opacity-80">镜头</p></div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-5 space-y-1.5">
          <button onClick={() => setAdding(true)} className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" />新建计划</button>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {plans.length === 0 && <p className="text-[10px] text-ink-400 text-center py-3">暂无计划</p>}
            {plans.map((p) => {
              const m = CAT_META[p.category]
              return (
                <button key={p.id} onClick={() => setActiveId(p.id)} className={cn('w-full p-2 rounded-xl text-left border transition-all', activeId === p.id ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/20' : 'border-ink-200/40 bg-white/40 dark:bg-ink-900/30')}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-base">{m.icon}</span>
                    <p className="text-[11px] font-semibold text-ink-800 dark:text-ink-200 truncate flex-1">{p.scene}</p>
                    {p.done && <Check className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <p className="text-[9px] text-ink-500">⏰ {p.time} · {p.duration}min · {m.label}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="col-span-7 space-y-1.5">
          {active ? (
            <>
              <div className={cn('rounded-2xl p-3 bg-gradient-to-br text-white', CAT_META[active.category].color)}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-2xl">{CAT_META[active.category].icon}</span>
                  <h3 className="text-base font-bold flex-1">{active.scene}</h3>
                  <button onClick={() => toggleDone(active.id)} className={cn('w-7 h-7 rounded-full flex items-center justify-center', active.done ? 'bg-emerald-500' : 'bg-white/20')}>
                    {active.done && <Check className="w-4 h-4" />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="bg-white/15 rounded-lg py-1"><p className="text-base font-bold">{active.time}</p><p className="opacity-80">时间</p></div>
                  <div className="bg-white/15 rounded-lg py-1"><p className="text-base font-bold">{active.duration}min</p><p className="opacity-80">时长</p></div>
                  <div className="bg-white/15 rounded-lg py-1"><p className="text-base font-bold">{active.shotList.length}</p><p className="opacity-80">镜头</p></div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
                <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1"><Camera className="w-3.5 h-3.5" />装备清单 ({active.equipment.length})</div>
                <div className="flex flex-wrap gap-1">
                  {active.equipment.map((e) => (
                    <span key={e} className="px-2 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] flex items-center">{e}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1">
                <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1"><Layers className="w-3.5 h-3.5" />拍摄镜头 ({active.shotList.length})</div>
                {active.shotList.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1 rounded bg-ink-50/60 dark:bg-ink-800/40 text-[11px]">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-ink-700 dark:text-ink-300">{s}</span>
                  </div>
                ))}
              </div>

              {active.notes && (
                <div className="rounded-2xl bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/40 p-2.5 text-[10px] text-ink-700 dark:text-ink-300">
                  <p className="font-semibold mb-0.5">📝 拍摄笔记</p>
                  <p>{active.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-500">评分:</span>
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} onClick={() => rate(active.id, r as 1 | 2 | 3 | 4 | 5)} className={cn('text-base', r <= active.rating ? 'text-amber-400' : 'text-ink-300')}>★</button>
                ))}
                <button onClick={() => del(active.id)} className="ml-auto w-7 h-7 rounded-lg bg-rose-100 text-rose-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </>
          ) : (
            <div className="aspect-video rounded-2xl bg-ink-50 dark:bg-ink-900/30 flex items-center justify-center text-ink-400 text-xs">选择或新建计划</div>
          )}
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => setAdding(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white dark:bg-ink-900 p-3 space-y-2 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold">新建拍摄计划</h3>
            <input value={form.scene || ''} onChange={(e) => setForm({ ...form, scene: e.target.value })} placeholder="场景名称" className="w-full h-9 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <div className="grid grid-cols-2 gap-1.5">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                {Object.entries(CAT_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
              </select>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
              <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} placeholder="时长(分钟)" className="h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold mb-1">装备 (点击选择)</div>
              <div className="flex flex-wrap gap-1">
                {EQUIPMENT_PRESETS.map((e) => {
                  const sel = (form.equipment || []).includes(e)
                  return (
                    <button key={e} onClick={() => setForm({ ...form, equipment: sel ? (form.equipment || []).filter((x) => x !== e) : [...(form.equipment || []), e] })} className={cn('px-2 h-6 rounded-full text-[10px]', sel ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>{e}</button>
                  )
                })}
              </div>
            </div>
            <textarea value={(form.shotList || []).join('\n')} onChange={(e) => setForm({ ...form, shotList: e.target.value.split('\n').filter(Boolean) })} placeholder="镜头列表 (每行一个)..." className="w-full h-20 px-3 py-1.5 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 resize-none" />
            <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="拍摄笔记..." className="w-full h-14 px-3 py-1.5 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 resize-none" />
            <div className="flex gap-1">
              <button onClick={() => setAdding(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">取消</button>
              <button onClick={add} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect } from 'react'
