import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock, MapPin, Bell, Trash2, X } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

const STORAGE_KEY = 'versa:events'

export interface EventItem {
  id: string
  title: string
  date: string
  startTime: string
  endTime?: string
  type: 'meeting' | 'live' | 'reminder' | 'personal' | 'shop'
  location?: string
  note?: string
  remind?: number
}

const TYPE_COLORS = {
  meeting: 'from-blue-500 to-indigo-500',
  live: 'from-rose-500 to-pink-500',
  reminder: 'from-amber-500 to-orange-500',
  personal: 'from-emerald-500 to-teal-500',
  shop: 'from-shop-500 to-emerald-500',
}

const TYPE_LABELS = {
  meeting: '会议',
  live: '直播',
  reminder: '提醒',
  personal: '个人',
  shop: '购物',
}

function loadEvents(): EventItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const today = new Date()
  return [
    { id: 'demo1', title: '618 数码直播', date: today.toISOString().slice(0, 10), startTime: '20:00', type: 'live', location: 'Versa 直播', note: 'iPhone 直降 1500', remind: 15 },
    { id: 'demo2', title: '团队周会', date: new Date(today.getTime() + 86400000 * 2).toISOString().slice(0, 10), startTime: '10:00', endTime: '11:00', type: 'meeting', location: '线上 · 飞书' },
  ]
}

function saveEvents(events: EventItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)) } catch {}
}

export function Calendar() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<Partial<EventItem>>({ type: 'reminder' })

  useEffect(() => {
    setEvents(loadEvents())
  }, [])

  useEffect(() => {
    if (events.length > 0) saveEvents(events)
  }, [events])

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const days = monthEnd.getDate()
  const firstDay = monthStart.getDay()

  const days_array = useMemo(() => {
    const arr: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = []
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(monthStart)
      d.setDate(d.getDate() - (firstDay - i))
      arr.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), isCurrentMonth: false, isToday: false })
    }
    for (let i = 1; i <= days; i++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
      arr.push({ date: d.toISOString().slice(0, 10), day: i, isCurrentMonth: true, isToday: d.toDateString() === new Date().toDateString() })
    }
    return arr
  }, [currentMonth, days, firstDay])

  const eventsOnDate = (date: string) => events.filter((e) => e.date === date)
  const selectedEvents = eventsOnDate(selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const prev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const next = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const goToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date().toISOString().slice(0, 10)) }

  const add = () => {
    if (!form.title?.trim() || !form.date || !form.startTime) {
      toast('请填写完整', 'error')
      return
    }
    const e: EventItem = {
      id: uid('e'),
      title: form.title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      type: form.type as EventItem['type'],
      location: form.location,
      note: form.note,
      remind: form.remind,
    }
    setEvents((arr) => [...arr, e])
    setShowAdd(false)
    setForm({ type: 'reminder' })
    toast('已添加日程', 'success')
  }

  const remove = (id: string) => {
    setEvents((arr) => arr.filter((e) => e.id !== id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button onClick={prev} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="text-lg font-bold min-w-32 text-center">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h2>
            <button onClick={next} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={goToday} className="text-xs px-3 h-7 rounded-full bg-nova-500 text-white">今天</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-ink-500 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days_array.map((d) => {
            const dayEvents = eventsOnDate(d.date)
            const isSelected = d.date === selectedDate
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={cn(
                  'aspect-square p-1 rounded-lg flex flex-col items-center justify-start text-xs transition',
                  d.isCurrentMonth ? 'text-ink-900 dark:text-ink-100' : 'text-ink-300 dark:text-ink-700',
                  isSelected && 'bg-nova-500 text-white',
                  !isSelected && d.isToday && 'ring-2 ring-nova-500',
                  !isSelected && d.isCurrentMonth && 'hover:bg-ink-100 dark:hover:bg-ink-800'
                )}
              >
                <span className={cn('font-semibold', d.isToday && !isSelected && 'text-nova-500')}>{d.day}</span>
                {dayEvents.length > 0 && (
                  <div className="mt-0.5 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div key={e.id} className={cn('w-1 h-1 rounded-full bg-gradient-to-br', TYPE_COLORS[e.type], isSelected && 'bg-white')} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-1.5">
            <CalIcon className="w-4 h-4 text-nova-500" />
            {selectedDate}
          </h3>
          <button
            onClick={() => {
              setShowAdd(true)
              setForm({ type: 'reminder', date: selectedDate })
            }}
            className="p-1.5 rounded-lg bg-nova-500 text-white hover:scale-105 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="text-center py-12 text-ink-500">
            <CalIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">当日无日程</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-white dark:bg-ink-900/60 border border-ink-200 dark:border-ink-700"
              >
                <div className="flex items-start gap-2">
                  <div className={cn('w-1 h-12 rounded-full bg-gradient-to-b flex-shrink-0', TYPE_COLORS[e.type])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{e.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500 flex-shrink-0">
                        {TYPE_LABELS[e.type]}
                      </span>
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}
                      {e.remind && (
                        <>
                          <Bell className="w-3 h-3 ml-1" />
                          提前 {e.remind} 分钟
                        </>
                      )}
                    </div>
                    {e.location && (
                      <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{e.location}
                      </div>
                    )}
                    {e.note && <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">{e.note}</p>}
                  </div>
                  <button onClick={() => remove(e.id)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-ink-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-ink-200 dark:border-ink-800">
          <div className="text-xs text-ink-500 mb-2">即将到来</div>
          {events
            .filter((e) => new Date(e.date + 'T' + e.startTime) > new Date())
            .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
            .slice(0, 3)
            .map((e) => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 text-xs">
                <div className={cn('w-2 h-2 rounded-full bg-gradient-to-br flex-shrink-0', TYPE_COLORS[e.type])} />
                <span className="flex-1 truncate">{e.title}</span>
                <span className="text-ink-400">{e.date.slice(5)} {e.startTime}</span>
              </div>
            ))}
        </div>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl shadow-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> 新建日程</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">标题</label>
              <input
                value={form.title || ''}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">日期</label>
                <input
                  type="date"
                  value={form.date || ''}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">类型</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventItem['type'] }))}
                  className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">开始</label>
                <input
                  type="time"
                  value={form.startTime || ''}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">结束</label>
                <input
                  type="time"
                  value={form.endTime || ''}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">地点 (可选)</label>
              <input
                value={form.location || ''}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">备注 (可选)</label>
              <textarea
                value={form.note || ''}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none resize-none"
              />
            </div>
            <button
              onClick={add}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold"
            >
              添加日程
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
