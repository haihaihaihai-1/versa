import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, Plus, Trash2, Sparkles, Loader2, Search, Copy, Check, Calendar, Clock } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface City {
  id: string
  name: string
  country: string
  flag: string
  offset: number
}

const SEED_CITIES: City[] = [
  { id: 'c1', name: '北京', country: '中国', flag: 'CN', offset: 8 },
  { id: 'c2', name: '上海', country: '中国', flag: 'CN', offset: 8 },
  { id: 'c3', name: '东京', country: '日本', flag: 'JP', offset: 9 },
  { id: 'c4', name: '首尔', country: '韩国', flag: 'KR', offset: 9 },
  { id: 'c5', name: '新加坡', country: '新加坡', flag: 'SG', offset: 8 },
  { id: 'c6', name: '伦敦', country: '英国', flag: 'GB', offset: 0 },
  { id: 'c7', name: '巴黎', country: '法国', flag: 'FR', offset: 1 },
  { id: 'c8', name: '纽约', country: '美国', flag: 'US', offset: -5 },
  { id: 'c9', name: '洛杉矶', country: '美国', flag: 'US', offset: -8 },
  { id: 'c10', name: '悉尼', country: '澳大利亚', flag: 'AU', offset: 10 },
]

const STORAGE_KEY = 'versa:tz-cities'

function load(): City[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED_CITIES.slice(0, 3) }
function save(d: City[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const ALL_CITIES = SEED_CITIES.concat([
  { id: 'e1', name: '莫斯科', country: '俄罗斯', flag: 'RU', offset: 3 },
  { id: 'e2', name: '迪拜', country: '阿联酋', flag: 'AE', offset: 4 },
  { id: 'e3', name: '孟买', country: '印度', flag: 'IN', offset: 5.5 },
  { id: 'e4', name: '柏林', country: '德国', flag: 'DE', offset: 1 },
  { id: 'e5', name: '多伦多', country: '加拿大', flag: 'CA', offset: -5 },
  { id: 'e6', name: '里约', country: '巴西', flag: 'BR', offset: -3 },
  { id: 'e7', name: '开罗', country: '埃及', flag: 'EG', offset: 2 },
])

function getTimeAt(offset: number): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + offset * 3600000)
}

function utcLabel(offset: number): string {
  return 'UTC' + (offset >= 0 ? '+' : '') + offset
}

export function TimezoneConverter() {
  const [cities, setCities] = useState<City[]>(load())
  const [search, setSearch] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingCity, setMeetingCity] = useState('c1')
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { save(cities) }, [cities])

  const add = (city: City) => {
    if (cities.find((c) => c.id === city.id)) return
    setCities([...cities, city])
    toast('已添加 ' + city.name, 'success')
  }
  const remove = (id: string) => setCities(cities.filter((c) => c.id !== id))

  const filtered = ALL_CITIES.filter((c) => c.name.indexOf(search) >= 0 || c.country.indexOf(search) >= 0)

  const baseCity = ALL_CITIES.find((c) => c.id === meetingCity) || cities[0]

  const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); toast('已复制', 'success') }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const cityNames = cities.map((c) => c.name + utcLabel(c.offset)).join(', ')
      const result = await aiComplete('推荐 3 个适合 ' + cityNames + ' 跨时区会议的时段 (50-80 字)', '你是 Versa 会议规划师, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5" />
          <h2 className="text-lg font-bold">时区转换</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">世界时钟 · 跨时区会议</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{cities.length}</p>
            <p className="text-[10px] opacity-80">已选</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{ALL_CITIES.length}</p>
            <p className="text-[10px] opacity-80">总城市</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">3</p>
            <p className="text-[10px] opacity-80">重叠时段</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {cities.map((c) => {
          const t = getTimeAt(c.offset)
          return (
            <motion.div key={c.id} whileHover={{ y: -2 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl">{'🏳️'}</span>
                  <div>
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-[10px] text-ink-500">{utcLabel(c.offset)}</p>
                  </div>
                </div>
                <button onClick={() => remove(c.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <p className="text-2xl font-bold font-mono text-center">{t.toLocaleTimeString('zh-CN')}</p>
              <p className="text-[10px] text-ink-500 text-center">{t.toLocaleDateString('zh-CN')}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-1.5 mb-2">
          <Search className="w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索城市..." className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => add(c)} disabled={!!cities.find((x) => x.id === c.id)} className="w-full flex items-center gap-1.5 p-1.5 rounded hover:bg-ink-50 dark:hover:bg-ink-800 text-left disabled:opacity-50">
              <span className="text-xs flex-1">{c.name}</span>
              <span className="text-[10px] text-ink-500">{utcLabel(c.offset)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <p className="text-xs font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />会议规划</p>
        <div className="grid grid-cols-2 gap-1.5">
          <input type="datetime-local" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
          <select value={meetingCity} onChange={(e) => setMeetingCity(e.target.value)} className="px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs">
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {cities.length >= 2 && (
          <div className="space-y-1.5">
            {cities.map((c) => {
              const t = meetingTime ? new Date(new Date(meetingTime).getTime() + (c.offset - baseCity.offset) * 3600000) : getTimeAt(c.offset)
              return (
                <div key={c.id} className="flex items-center gap-1.5 text-xs">
                  <span className="flex-1">{c.name}</span>
                  <span className="font-mono font-bold">{t.toLocaleTimeString('zh-CN')}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 推荐会议时段
      </button>

      {aiRec && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}
    </div>
  )
}
