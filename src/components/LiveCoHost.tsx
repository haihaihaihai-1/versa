import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Users, Volume2, VolumeX, Hand, MoreHorizontal, Sparkles, Loader2, ScreenShare, Crown, Star } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Guest {
  id: string
  name: string
  avatar: string
  role: 'host' | 'cohost' | 'guest' | 'listener'
  micOn: boolean
  camOn: boolean
  handRaised: boolean
  level: number
  joinedAt: number
  title?: string
}

const HOST: Guest = { id: 'host', name: '我 (主播)', avatar: 'https://i.pravatar.cc/100?img=99', role: 'host', micOn: true, camOn: true, handRaised: false, level: 100, joinedAt: Date.now() }

const SEED_GUESTS: Guest[] = [
  { id: 'g1', name: '美食家 Lily', avatar: 'https://i.pravatar.cc/100?img=20', role: 'cohost', micOn: true, camOn: true, handRaised: false, level: 80, joinedAt: Date.now() - 60000, title: '美食主播' },
  { id: 'g2', name: '数码小王子', avatar: 'https://i.pravatar.cc/100?img=51', role: 'guest', micOn: false, camOn: true, handRaised: true, level: 60, joinedAt: Date.now() - 30000, title: '数码评测' },
  { id: 'g3', name: '学生党 G', avatar: 'https://i.pravatar.cc/100?img=88', role: 'listener', micOn: false, camOn: false, handRaised: false, level: 0, joinedAt: Date.now() - 10000 },
  { id: 'g4', name: '穿搭博主 Mia', avatar: 'https://i.pravatar.cc/100?img=33', role: 'guest', micOn: true, camOn: false, handRaised: false, level: 45, joinedAt: Date.now() - 5000, title: '穿搭' },
]

const STORAGE_KEY = 'versa:cohost'

function load(): Guest[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [HOST, ...SEED_GUESTS] }
function save(d: Guest[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function LiveCoHost() {
  const [guests, setGuests] = useState<Guest[]>(load())
  const [layout, setLayout] = useState<'grid' | 'speaker' | 'sidebar'>('grid')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(guests) }, [guests])

  const updateGuest = (id: string, patch: Partial<Guest>) => {
    setGuests((gs) => gs.map((g) => g.id === id ? { ...g, ...patch } : g))
  }

  const lowerHand = (id: string) => updateGuest(id, { handRaised: false })

  const toggleMic = (id: string) => {
    const g = guests.find((x) => x.id === id)
    if (!g || g.role === 'listener') return
    updateGuest(id, { micOn: !g.micOn })
  }

  const toggleCam = (id: string) => {
    const g = guests.find((x) => x.id === id)
    if (!g) return
    updateGuest(id, { camOn: !g.camOn })
  }

  const promoteToCohost = (id: string) => {
    updateGuest(id, { role: 'cohost', micOn: true, camOn: true })
    toast('已提升为连麦嘉宾', 'success')
  }

  const kick = (id: string) => {
    if (id === 'host') return
    setGuests((gs) => gs.filter((g) => g.id !== id))
    toast('已请出', 'info')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为多人连麦直播推荐 3 个破冰话题 (50-80 字, 适合 4-6 人)', '你是 Versa 直播策划, 活泼有梗, 中文')
      setAiTopic(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const handsRaised = guests.filter((g) => g.handRaised)
  const speakers = guests.filter((g) => g.micOn)
  const viewers = guests.filter((g) => g.role === 'listener')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-bold">多人连麦</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">最多 6 人 · 举手发言 · 自由布局</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{guests.length}</p>
            <p className="text-[9px] opacity-80">在线</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{speakers.length}</p>
            <p className="text-[9px] opacity-80">麦上</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{handsRaised.length}</p>
            <p className="text-[9px] opacity-80">举手</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{viewers.length}</p>
            <p className="text-[9px] opacity-80">听众</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setLayout('grid')} className={cn('flex-1 h-7 rounded-lg text-[10px] font-semibold', layout === 'grid' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>网格</button>
        <button onClick={() => setLayout('speaker')} className={cn('flex-1 h-7 rounded-lg text-[10px] font-semibold', layout === 'speaker' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>主讲</button>
        <button onClick={() => setLayout('sidebar')} className={cn('flex-1 h-7 rounded-lg text-[10px] font-semibold', layout === 'sidebar' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>画中画</button>
        <button onClick={() => setInviteOpen(true)} className="px-2.5 h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-semibold">邀请</button>
      </div>

      {layout === 'grid' && (
        <div className="grid grid-cols-2 gap-1.5">
          {guests.slice(0, 6).map((g) => (
            <GuestTile key={g.id} g={g} onLowerHand={() => lowerHand(g.id)} onPromote={() => promoteToCohost(g.id)} onKick={() => kick(g.id)} isHost={g.id === 'host'} />
          ))}
        </div>
      )}

      {layout === 'speaker' && (
        <div>
          {speakers[0] && (
            <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 mb-1.5 relative">
              <img src={speakers[0].avatar} alt={speakers[0].name} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 text-amber-400" />{speakers[0].name} (主讲)
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {guests.filter((g) => g !== speakers[0]).slice(0, 6).map((g) => (
              <div key={g.id} className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 relative">
                {g.camOn && <img src={g.avatar} alt={g.name} className="w-full h-full object-cover" />}
                <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-white truncate">{g.name}</div>
                {!g.micOn && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center"><MicOff className="w-2.5 h-2.5 text-white" /></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {layout === 'sidebar' && (
        <div className="grid grid-cols-3 gap-1.5">
          <div className="col-span-2 aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 relative">
            {speakers[0] && <img src={speakers[0].avatar} alt={speakers[0].name} className="w-full h-full object-cover" />}
            {speakers[0] && <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white">{speakers[0].name}</div>}
          </div>
          <div className="space-y-1">
            {guests.filter((g) => g !== speakers[0]).slice(0, 5).map((g) => (
              <div key={g.id} className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 relative">
                {g.camOn && <img src={g.avatar} alt={g.name} className="w-full h-full object-cover" />}
                <div className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/60 backdrop-blur px-1 py-0.5 rounded text-[8px] text-white truncate">{g.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 破冰话题
      </button>

      {aiTopic && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 话题</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiTopic}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5">嘉宾管理</p>
        <div className="space-y-1.5">
          {guests.filter((g) => g.id !== 'host').map((g) => (
            <div key={g.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-ink-50/30 dark:bg-ink-800/30">
              <img src={g.avatar} alt={g.name} className="w-7 h-7 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate flex items-center gap-1">
                  {g.name}
                  {g.role === 'cohost' && <Crown className="w-2.5 h-2.5 text-amber-500" />}
                </p>
                <p className="text-[9px] text-ink-500">{g.title || g.role}</p>
              </div>
              {g.handRaised && <span className="text-amber-500 text-[10px]">✋</span>}
              <button onClick={() => toggleMic(g.id)} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', g.micOn ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
                {g.micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              </button>
              <button onClick={() => toggleCam(g.id)} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', g.camOn ? 'bg-emerald-500 text-white' : 'bg-ink-300 dark:bg-ink-700')}>
                {g.camOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
              </button>
              {g.handRaised && <button onClick={() => lowerHand(g.id)} className="px-1.5 h-7 rounded-lg bg-amber-500 text-white text-[10px]">接受</button>}
              {g.role === 'guest' && <button onClick={() => promoteToCohost(g.id)} className="px-1.5 h-7 rounded-lg bg-violet-500 text-white text-[10px]">升级</button>}
              <button onClick={() => kick(g.id)} className="text-ink-400 hover:text-rose-500"><PhoneOff className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setInviteOpen(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold">邀请嘉宾</h3>
            <input placeholder="搜索用户名..." className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={() => { setGuests([...guests, { id: uid(), name: '新嘉宾', avatar: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 99)}`, role: 'guest', micOn: false, camOn: true, handRaised: false, level: 0, joinedAt: Date.now() }]); setInviteOpen(false); toast('已发送邀请', 'success') }} className="w-full h-9 rounded-lg bg-violet-500 text-white text-sm font-semibold">+ 添加占位嘉宾</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function GuestTile({ g, onLowerHand, onPromote, onKick, isHost }: { g: Guest; onLowerHand: () => void; onPromote: () => void; onKick: () => void; isHost: boolean }) {
  return (
    <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 relative group">
      {g.camOn ? <img src={g.avatar} alt={g.name} className="w-full h-full object-cover" /> : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">{g.name[0]}</div>
        </div>
      )}
      <div className="absolute top-1 left-1 flex items-center gap-1">
        {g.role === 'host' && <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center"><Crown className="w-3 h-3 text-white" /></span>}
        {g.role === 'cohost' && <span className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"><Star className="w-3 h-3 text-white" /></span>}
        {g.handRaised && <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px]">✋</span>}
      </div>
      <div className="absolute top-1 right-1 flex gap-0.5">
        {!g.micOn && <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"><MicOff className="w-2.5 h-2.5 text-white" /></div>}
      </div>
      <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-white truncate flex items-center justify-between">
        <span>{g.name}</span>
        {!isHost && (
          <div className="hidden group-hover:flex gap-0.5">
            {g.handRaised && <button onClick={onLowerHand} className="w-4 h-4 rounded bg-emerald-500 text-white text-[8px]">✓</button>}
            {g.role === 'guest' && <button onClick={onPromote} className="w-4 h-4 rounded bg-violet-500 text-white text-[8px]">↑</button>}
            <button onClick={onKick} className="w-4 h-4 rounded bg-rose-500 text-white text-[8px]">×</button>
          </div>
        )}
      </div>
    </div>
  )
}
