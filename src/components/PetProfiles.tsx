import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PawPrint, Plus, Trash2, Sparkles, Loader2, Dog, Cat, Bird, Fish, Rabbit, Turtle, Heart, Calendar, Star, Cake, Edit } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Pet {
  id: string
  name: string
  species: 'dog' | 'cat' | 'bird' | 'fish' | 'rabbit' | 'reptile' | 'hamster' | 'other'
  breed: string
  emoji: string
  birthday: string
  adoptedAt: string
  weight: number
  gender: 'male' | 'female'
  color: string
  microchip: string
  avatar: string
  notes: string
}

const STORAGE_KEY = 'versa:pets-v1'

function load(): Pet[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Pet[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Pet[] {
  return [
    { id: '1', name: '旺财', species: 'dog', breed: '柴犬', emoji: '🐕', birthday: '2021-03-15', adoptedAt: '2021-05-20', weight: 12.5, gender: 'male', color: '#f59e0b', microchip: 'CN-2021-001', avatar: 'https://picsum.photos/seed/dog1/300/300', notes: '爱吃胡萝卜' },
    { id: '2', name: '咪咪', species: 'cat', breed: '英短蓝猫', emoji: '🐈', birthday: '2022-08-10', adoptedAt: '2022-09-01', weight: 4.2, gender: 'female', color: '#3b82f6', microchip: 'CN-2022-002', avatar: 'https://picsum.photos/seed/cat1/300/300', notes: '超粘人' },
  ]
}

const SPECIES_META = {
  dog: { label: '狗狗', icon: Dog, color: 'from-amber-500 to-orange-500' },
  cat: { label: '猫咪', icon: Cat, color: 'from-blue-500 to-cyan-500' },
  bird: { label: '鸟类', icon: Bird, color: 'from-emerald-500 to-teal-500' },
  fish: { label: '鱼类', icon: Fish, color: 'from-cyan-500 to-blue-500' },
  rabbit: { label: '兔兔', icon: Rabbit, color: 'from-pink-500 to-rose-500' },
  reptile: { label: '爬宠', icon: Turtle, color: 'from-emerald-600 to-green-700' },
  hamster: { label: '仓鼠', icon: '🐹', color: 'from-orange-400 to-amber-500' },
  other: { label: '其他', icon: PawPrint, color: 'from-ink-500 to-ink-600' },
} as const

function ageInYears(birthday: string): number {
  return Math.floor((Date.now() - new Date(birthday).getTime()) / (365.25 * 86400000))
}

function daysToBirthday(birthday: string): number {
  const today = new Date()
  const bday = new Date(birthday)
  bday.setFullYear(today.getFullYear())
  if (bday.getTime() < today.getTime()) bday.setFullYear(today.getFullYear() + 1)
  return Math.ceil((bday.getTime() - today.getTime()) / 86400000)
}

export function PetProfiles() {
  const [pets, setPets] = useState<Pet[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(pets[0]?.id || null)
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Pet['species']>('dog')
  const [breed, setBreed] = useState('')
  const [emoji, setEmoji] = useState('🐕')
  const [birthday, setBirthday] = useState('')
  const [weight, setWeight] = useState('5')
  const [gender, setGender] = useState<Pet['gender']>('male')
  const [color, setColor] = useState('#f59e0b')
  const [microchip, setMicrochip] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { save(pets) }, [pets])

  const total = pets.length
  const speciesCount = new Set(pets.map((p) => p.species)).size
  const totalWeight = pets.reduce((s, p) => s + p.weight, 0)
  const upcomingBdays = pets
    .map((p) => ({ pet: p, days: daysToBirthday(p.birthday) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)
  const active = pets.find((p) => p.id === activeId)

  const add = () => {
    if (!name.trim()) { toast('请输入名字', 'error'); return }
    const p: Pet = { id: uid(), name, species, breed, emoji, birthday, adoptedAt: new Date().toISOString().split('T')[0], weight: +weight, gender, color, microchip, avatar: `https://picsum.photos/seed/${Date.now()}/300/300`, notes }
    setPets([p, ...pets])
    setActiveId(p.id)
    setName(''); setBreed(''); setBirthday(''); setMicrochip(''); setNotes('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => {
    setPets(pets.filter((p) => p.id !== id))
    if (activeId === id) setActiveId(pets[0]?.id || null)
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = pets.map((p) => `${p.name}(${SPECIES_META[p.species].label}, ${p.breed}, ${ageInYears(p.birthday)}岁)`).join('、')
      const result = await aiComplete(`我有宠物: ${summary}. 给出 1 段 60 字内养宠建议, 中文`, '你是 Versa 宠物顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <PawPrint className="w-5 h-5" />
          <h2 className="text-lg font-bold">宠物档案</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 物种 · 体重管理 · 生日提醒</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">宠物</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{speciesCount}</p>
            <p className="text-[9px] opacity-80">种类</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalWeight.toFixed(1)}kg</p>
            <p className="text-[9px] opacity-80">总重</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{upcomingBdays[0]?.days || 0}</p>
            <p className="text-[9px] opacity-80">最近生日</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加宠物
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><Cake className="w-3 h-3" />即将生日</p>
        <div className="space-y-1">
          {upcomingBdays.map((u) => {
            const SM = SPECIES_META[u.pet.species]
            return (
              <div key={u.pet.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="text-xl">{u.pet.emoji}</span>
                <span className="font-semibold flex-1">{u.pet.name}</span>
                <span className="text-ink-500">{u.days} 天后</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-500 font-semibold">{u.days <= 7 ? '🎉' : '🎂'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-32">
            <img src={active.avatar} alt={active.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <div className="flex items-center gap-2">
                <div className="text-3xl">{active.emoji}</div>
                <div>
                  <p className="text-lg font-bold">{active.name}</p>
                  <p className="text-[10px] opacity-90">{active.breed} · {SPECIES_META[active.species].label} · {ageInYears(active.birthday)}岁 · {active.weight}kg</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-2 space-y-1 text-[10px] text-ink-500">
            <p>📅 生日: {active.birthday}</p>
            <p>🏠 领养: {active.adoptedAt}</p>
            {active.microchip && <p>🔖 芯片: {active.microchip}</p>}
            {active.notes && <p>💭 {active.notes}</p>}
            <button onClick={() => remove(active.id)} className="w-full mt-1 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[10px] font-semibold">删除档案</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {pets.filter((p) => p.id !== activeId).map((p) => {
          const SM = SPECIES_META[p.species]
          return (
            <motion.div key={p.id} whileHover={{ y: -1 }} onClick={() => setActiveId(p.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{p.name}</p>
                  <p className="text-[10px] text-ink-500">{p.breed} · {p.weight}kg</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加宠物</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">物种</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(SPECIES_META) as Array<keyof typeof SPECIES_META>).map((k) => {
                  const S = SPECIES_META[k]
                  return (
                    <button key={k} onClick={() => { setSpecies(k); setEmoji(typeof S.icon === 'string' ? S.icon : '🐾') }} className={cn('h-12 rounded-lg flex flex-col items-center justify-center', species === k ? `bg-gradient-to-br ${S.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      {typeof S.icon === 'string' ? <span className="text-base">{S.icon}</span> : <S.icon className="w-3.5 h-3.5" />}
                      <span className="text-[9px]">{S.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名字" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="品种" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="体重 kg" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => setGender('male')} className={cn('h-9 rounded-lg text-xs font-semibold', gender === 'male' ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>♂ 公</button>
                <button onClick={() => setGender('female')} className={cn('h-9 rounded-lg text-xs font-semibold', gender === 'female' ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>♀ 母</button>
              </div>
              <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} placeholder="芯片号 (可选)" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
