import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Plus, X, Calendar, Trash2, Video, Clock } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Reminder {
  id: string
  liveId: string
  hostName: string
  hostAvatar: string
  topic: string
  category: string
  startAt: number
  notified: boolean
}

const SEED: Reminder[] = [
  { id: 'r1', liveId: 'l1', hostName: '数码小王子', hostAvatar: 'https://i.pravatar.cc/100?img=51', topic: 'iPhone 16 首发体验', category: '数码', startAt: Date.now() + 3600000 * 2, notified: false },
  { id: 'r2', liveId: 'l2', hostName: '美食家 Lily', hostAvatar: 'https://i.pravatar.cc/100?img=20', topic: '618 厨电大促', category: '美食', startAt: Date.now() + 3600000 * 5, notified: false },
  { id: 'r3', liveId: 'l3', hostName: '穿搭博主 Mia', hostAvatar: 'https://i.pravatar.cc/100?img=33', topic: '夏季穿搭灵感', category: '服饰', startAt: Date.now() + 86400000, notified: false },
  { id: 'r4', liveId: 'l4', hostName: '美妆博主 Ava', hostAvatar: 'https://i.pravatar.cc/100?img=22', topic: '618 平价彩妆', category: '美妆', startAt: Date.now() + 86400000 * 2, notified: false },
]

const STORAGE_KEY = 'versa:live-reminders'

function load(): Reminder[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED }
function save(r: Reminder[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)) } catch {} }

export function LiveReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [newTime, setNewTime] = useState('')
  const [newHost, setNewHost] = useState('')
  const [newTopic, setNewTopic] = useState('')

  useEffect(() => { setReminders(load()) }, [])
  useEffect(() => { if (reminders.length) save(reminders) }, [reminders])

  const remove = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id))
    toast('已移除提醒', 'success')
  }

  const toggle = (id: string) => {
    setReminders((rs) => rs.map((r) => r.id === id ? { ...r, notified: !r.notified } : r))
  }

  const addReminder = () => {
    if (!newHost.trim() || !newTopic.trim() || !newTime) { toast('请填写完整', 'error'); return }
    const r: Reminder = {
      id: uid(), liveId: 'l' + uid(), hostName: newHost, hostAvatar: 'https://i.pravatar.cc/100?img=44',
      topic: newTopic, category: '其他', startAt: new Date(newTime).getTime(), notified: false,
    }
    setReminders([r, ...reminders])
    setNewHost(''); setNewTopic(''); setNewTime(''); setAddOpen(false)
    toast('提醒已添加', 'success')
  }

  const sorted = [...reminders].sort((a, b) => a.startAt - b.startAt)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-bold">直播提醒</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">不错过任何精彩直播</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{reminders.filter((r) => !r.notified).length}</p>
            <p className="text-[10px] opacity-80">待开播</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{reminders.length}</p>
            <p className="text-[10px] opacity-80">总提醒</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{new Set(reminders.map((r) => r.hostName)).size}</p>
            <p className="text-[10px] opacity-80">关注主播</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-rose-500" />时间表</p>
        <button onClick={() => setAddOpen(true)} className="px-2.5 h-7 rounded-full bg-rose-500 text-white text-xs font-semibold flex items-center gap-0.5">
          <Plus className="w-3 h-3" />添加
        </button>
      </div>

      <div className="space-y-1.5">
        {sorted.map((r) => {
          const remaining = Math.max(0, r.startAt - Date.now())
          const days = Math.floor(remaining / 86400000)
          const hours = Math.floor((remaining % 86400000) / 3600000)
          const mins = Math.floor((remaining % 3600000) / 60000)
          const isPast = remaining === 0
          return (
            <motion.div
              key={r.id}
              whileHover={{ x: 4 }}
              className={cn('flex items-center gap-2 p-2.5 rounded-xl border', isPast || r.notified ? 'bg-ink-50 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60 opacity-60' : 'bg-white/60 dark:bg-ink-900/30 border-rose-200/40')}
            >
              <img src={r.hostAvatar} alt={r.hostName} className="w-9 h-9 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.topic}</p>
                <p className="text-[10px] text-ink-500">{r.hostName} · {r.category}</p>
                <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                  {isPast ? '已开播' : days > 0 ? `${days}天 ${hours}小时后` : hours > 0 ? `${hours}小时 ${mins}分钟后` : `${mins} 分钟后`}
                </p>
              </div>
              <button onClick={() => toggle(r.id)} className={cn('w-7 h-7 rounded-full flex items-center justify-center', r.notified ? 'bg-ink-100 dark:bg-ink-800' : 'bg-rose-500 text-white')}>
                {r.notified ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => remove(r.id)} className="text-ink-400 hover:text-rose-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddOpen(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">添加直播提醒</h3>
              <button onClick={() => setAddOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <input value={newHost} onChange={(e) => setNewHost(e.target.value)} placeholder="主播名称" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="直播主题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            <button onClick={addReminder} className="w-full h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold">添加提醒</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
