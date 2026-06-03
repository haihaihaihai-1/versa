import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2, Sparkles, Loader2, User, Heart, Crown, Baby, Briefcase, UserPlus, Star, Calendar, Award, Gift } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface FamilyMember {
  id: string
  name: string
  role: 'parent' | 'child' | 'grandparent' | 'partner' | 'sibling' | 'pet' | 'other'
  avatar: string
  emoji: string
  birthday: string
  color: string
  points: number
  joinedAt: string
  notes: string
}

const STORAGE_KEY = 'versa:family-v1'

function load(): FamilyMember[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: FamilyMember[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): FamilyMember[] {
  return [
    { id: 'm1', name: '爸爸', role: 'parent', avatar: 'https://picsum.photos/seed/dad/200/200', emoji: '👨', birthday: '1985-03-15', color: '#3b82f6', points: 320, joinedAt: new Date(Date.now() - 86400000 * 365).toISOString(), notes: '主厨' },
    { id: 'm2', name: '妈妈', role: 'parent', avatar: 'https://picsum.photos/seed/mom/200/200', emoji: '👩', birthday: '1988-07-20', color: '#ec4899', points: 450, joinedAt: new Date(Date.now() - 86400000 * 365).toISOString(), notes: '理财' },
    { id: 'm3', name: '小宝', role: 'child', avatar: 'https://picsum.photos/seed/kid/200/200', emoji: '👧', birthday: '2018-11-10', color: '#f59e0b', points: 180, joinedAt: new Date(Date.now() - 86400000 * 200).toISOString(), notes: '喜欢画画' },
    { id: 'm4', name: '爷爷', role: 'grandparent', avatar: 'https://picsum.photos/seed/gpa/200/200', emoji: '👴', birthday: '1955-01-05', color: '#8b5cf6', points: 200, joinedAt: new Date(Date.now() - 86400000 * 100).toISOString(), notes: '围棋高手' },
  ]
}

const ROLE_META = {
  parent: { label: '家长', icon: '👨', color: 'from-blue-500 to-cyan-500' },
  child: { label: '孩子', icon: '🧒', color: 'from-amber-500 to-orange-500' },
  grandparent: { label: '长辈', icon: '👴', color: 'from-violet-500 to-purple-500' },
  partner: { label: '伴侣', icon: '💑', color: 'from-rose-500 to-pink-500' },
  sibling: { label: '兄弟姐妹', icon: '🧑', color: 'from-emerald-500 to-teal-500' },
  pet: { label: '宠物', icon: '🐾', color: 'from-yellow-500 to-amber-500' },
  other: { label: '其他', icon: '👤', color: 'from-ink-500 to-ink-600' },
} as const

function daysToBirthday(birthday: string): number {
  const today = new Date()
  const bday = new Date(birthday)
  bday.setFullYear(today.getFullYear())
  if (bday.getTime() < today.getTime()) bday.setFullYear(today.getFullYear() + 1)
  return Math.ceil((bday.getTime() - today.getTime()) / 86400000)
}

export function FamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>(load())
  const [adding, setAdding] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(members[0]?.id || null)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<FamilyMember['role']>('parent')
  const [emoji, setEmoji] = useState('👤')
  const [birthday, setBirthday] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [notes, setNotes] = useState('')

  useEffect(() => { save(members) }, [members])

  const total = members.length
  const totalPoints = members.reduce((s, m) => s + m.points, 0)
  const upcomingBdays = members
    .map((m) => ({ member: m, days: daysToBirthday(m.birthday) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)
  const active = members.find((m) => m.id === activeId)
  const avgAge = members.length > 0 ? Math.round(members.reduce((s, m) => s + (new Date().getFullYear() - new Date(m.birthday).getFullYear()), 0) / members.length) : 0

  const add = () => {
    if (!name.trim()) { toast('请输入姓名', 'error'); return }
    const m: FamilyMember = { id: uid(), name, role, avatar: `https://picsum.photos/seed/${Date.now()}/200/200`, emoji, birthday, color, points: 0, joinedAt: new Date().toISOString(), notes }
    setMembers([m, ...members])
    setActiveId(m.id)
    setName(''); setBirthday(''); setNotes('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => {
    setMembers(members.filter((m) => m.id !== id))
    if (activeId === id) setActiveId(members[0]?.id || null)
  }

  const addPoints = (id: string, n: number) => {
    setMembers(members.map((m) => m.id === id ? { ...m, points: Math.max(0, m.points + n) } : m))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = members.map((m) => `${m.name}(${ROLE_META[m.role].label})`).join('、')
      const result = await aiComplete(`家庭成员: ${summary}. 给出 1 段 50 字内家庭活动建议, 中文`, '你是 Versa 家庭顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭成员</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">7 角色 · 积分排行 · 生日提醒</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">成员</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalPoints}</p>
            <p className="text-[9px] opacity-80">总积分</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgAge}</p>
            <p className="text-[9px] opacity-80">均年龄</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{upcomingBdays[0]?.days || 0}</p>
            <p className="text-[9px] opacity-80">最近生日</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <UserPlus className="w-3.5 h-3.5" />加成员
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><Gift className="w-3 h-3" />即将生日</p>
        <div className="space-y-1">
          {upcomingBdays.map((u) => {
            const RM = ROLE_META[u.member.role]
            return (
              <div key={u.member.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="text-xl">{u.member.emoji}</span>
                <span className="font-semibold flex-1">{u.member.name}</span>
                <span className="text-ink-500">{u.days} 天后</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-500 font-semibold">{u.days <= 7 ? '🎉' : '🎂'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-24">
            <img src={active.avatar} alt={active.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white flex items-end gap-2">
              <div className="text-3xl">{active.emoji}</div>
              <div>
                <p className="text-lg font-bold">{active.name}</p>
                <p className="text-[10px] opacity-90">{ROLE_META[active.role].label} · {new Date(active.birthday).getFullYear()} · 加入 {formatTimeAgo(active.joinedAt)}</p>
              </div>
            </div>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-semibold flex-1">积分: {active.points}</p>
              <button onClick={() => addPoints(active.id, 10)} className="px-2 h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-bold">+10</button>
              <button onClick={() => addPoints(active.id, -10)} className="px-2 h-7 rounded-lg bg-rose-500 text-white text-[10px] font-bold">-10</button>
            </div>
            {active.notes && <p className="text-[10px] text-ink-500">💭 {active.notes}</p>}
            <button onClick={() => remove(active.id)} className="w-full px-2 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[10px] font-semibold">删除成员</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {members.filter((m) => m.id !== activeId).map((m) => {
          const RM = ROLE_META[m.role]
          return (
            <motion.div key={m.id} whileHover={{ y: -1 }} onClick={() => setActiveId(m.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{m.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{m.name}</p>
                  <p className="text-[10px] text-ink-500">{RM.label} · {m.points} 积分</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加成员</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">头像 emoji</p>
              <div className="grid grid-cols-6 gap-1.5">
                {['👨', '👩', '🧒', '👧', '👦', '👴', '👵', '👶', '🐶', '🐱', '🧑', '👤'].map((e) => (
                  <button key={e} onClick={() => setEmoji(e)} className={cn('h-10 rounded-lg text-2xl flex items-center justify-center', emoji === e ? 'bg-rose-500 scale-110' : 'bg-ink-100 dark:bg-ink-800')}>{e}</button>
                ))}
              </div>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="称呼" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">角色</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map((k) => {
                  const R = ROLE_META[k]
                  return (
                    <button key={k} onClick={() => setRole(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', role === k ? `bg-gradient-to-br ${R.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-base">{R.icon}</span>
                      <span>{R.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="flex items-center gap-1.5">
              {['#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'].map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cn('w-8 h-8 rounded-full', color === c && 'ring-2 ring-offset-2 ring-ink-400')} style={{ background: c }} />
              ))}
            </div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注 (如 喜欢什么)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
