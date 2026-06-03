import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Hash, Sparkles, User, Calendar, Heart, Briefcase, DollarSign, Activity, Star, TrendingUp, ChevronRight, Compass, Eye } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

function reduceDigits(num: number, keep: boolean = true): number {
  let n = Math.abs(num)
  while (n > 9 && (!keep || n > 9)) {
    if (n === 11 || n === 22 || n === 33) break
    n = n.toString().split('').reduce((s, d) => s + Number(d), 0)
  }
  return n
}

function lifePath(date: string): { num: number; isMaster: boolean; desc: string } {
  const digits = date.replace(/\D/g, '').split('').map(Number)
  let sum = digits.reduce((s, d) => s + d, 0)
  let isMaster = false
  if (sum === 11 || sum === 22 || sum === 33) isMaster = true
  const final = reduceDigits(sum, false)
  return { num: final, isMaster, desc: '' }
}

const NUM_MEANINGS: Record<number, { name: string; desc: string; traits: string; color: string; gradient: string }> = {
  1: { name: '开拓者', desc: '领导力、独立、原创', traits: '自信、有野心、创造力强', color: 'from-red-500 to-rose-500', gradient: 'bg-gradient-to-br from-red-500 to-rose-500' },
  2: { name: '协调者', desc: '合作、敏感、平衡', traits: '温柔、善解人意、外交手腕', color: 'from-orange-500 to-amber-500', gradient: 'bg-gradient-to-br from-orange-500 to-amber-500' },
  3: { name: '表达者', desc: '创意、社交、表达', traits: '乐观、艺术天赋、沟通力强', color: 'from-yellow-500 to-amber-500', gradient: 'bg-gradient-to-br from-yellow-500 to-amber-500' },
  4: { name: '建设者', desc: '稳定、务实、秩序', traits: '可靠、勤奋、注重细节', color: 'from-lime-500 to-green-500', gradient: 'bg-gradient-to-br from-lime-500 to-green-500' },
  5: { name: '自由者', desc: '变化、自由、冒险', traits: '好奇心强、爱旅行、适应力好', color: 'from-emerald-500 to-teal-500', gradient: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
  6: { name: '守护者', desc: '家庭、爱、责任', traits: '有爱心、重视家庭、疗愈力', color: 'from-cyan-500 to-blue-500', gradient: 'bg-gradient-to-br from-cyan-500 to-blue-500' },
  7: { name: '探索者', desc: '智慧、内省、灵性', traits: '深思、追求真理、哲学倾向', color: 'from-indigo-500 to-blue-500', gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500' },
  8: { name: '成就者', desc: '权力、财富、平衡', traits: '商业头脑、有野心、重视成功', color: 'from-violet-500 to-purple-500', gradient: 'bg-gradient-to-br from-violet-500 to-purple-500' },
  9: { name: '完结者', desc: '人道、智慧、慈善', traits: '博爱、有远见、善于总结', color: 'from-pink-500 to-rose-500', gradient: 'bg-gradient-to-br from-pink-500 to-rose-500' },
  11: { name: '大师之光', desc: '直觉、灵感、启发', traits: '高度敏感、洞察力、直觉强', color: 'from-amber-400 to-yellow-400', gradient: 'bg-gradient-to-br from-amber-400 to-yellow-400' },
  22: { name: '大师之建', desc: '实现、远见、创造', traits: '理想主义、实干派、留下遗产', color: 'from-cyan-400 to-blue-400', gradient: 'bg-gradient-to-br from-cyan-400 to-blue-400' },
  33: { name: '大师之爱', desc: '奉献、教导、慈悲', traits: '无私、疗愈他人、精神导师', color: 'from-rose-400 to-pink-400', gradient: 'bg-gradient-to-br from-rose-400 to-pink-400' },
}

const STORAGE_KEY = 'versa:numerology-v1'

function load(): { name: string; birth: string } { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return { name: '我', birth: '1995-06-15' } }
function saveNum(d: { name: string; birth: string }) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function letterValue(c: string): number {
  const upper = c.toUpperCase()
  if (upper < 'A' || upper > 'Z') return 0
  return upper.charCodeAt(0) - 64
}

function nameNumber(name: string): number {
  const sum = name.replace(/\s/g, '').split('').reduce((s, c) => s + letterValue(c), 0)
  return reduceDigits(sum, false)
}

function todayNumber(): number {
  const today = new Date()
  const digits = `${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`.split('').map(Number)
  return reduceDigits(digits.reduce((s, d) => s + d, 0), false)
}

function birthdayNumber(date: string): number {
  const d = new Date(date).getDate()
  return reduceDigits(d, false)
}

function soulUrge(name: string): number {
  const vowels = 'AEIOU'
  const sum = name.toUpperCase().split('').filter((c) => vowels.includes(c)).reduce((s, c) => s + letterValue(c), 0)
  return reduceDigits(sum, false)
}

export function Numerology() {
  const [data, setData] = useState(load())
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(data)
  const [showCompat, setShowCompat] = useState(false)
  const [partner, setPartner] = useState({ name: '', birth: '' })

  useEffect(() => { saveNum(data) }, [data])

  const lp = lifePath(data.birth)
  const expr = nameNumber(data.name)
  const soul = soulUrge(data.name)
  const bday = birthdayNumber(data.birth)
  const today = todayNumber()
  const personalYear = reduceDigits(lifePath(data.birth).num + new Date().getFullYear() % 100, false)

  const save = () => { setData(draft); setShowForm(false); toast('已保存', 'success') }
  const compatScore = useMemo(() => {
    if (!partner.name || !partner.birth) return 0
    const a = lifePath(data.birth).num
    const b = lifePath(partner.birth).num
    const diff = Math.abs(a - b)
    if (diff === 0) return 95
    if (diff === 1) return 85
    if (diff === 2) return 75
    if (diff === 3) return 60
    if (diff === 4) return 50
    if (diff === 5) return 65
    if (diff === 6) return 55
    if (diff === 7) return 45
    return 40
  }, [partner, data])

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-3 text-white ${NUM_MEANINGS[lp.num]?.gradient || 'bg-gradient-to-br from-violet-500 to-purple-500'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-5 h-5" />
          <h2 className="text-lg font-bold">数字命理</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">生命密码 · 表达 · 灵魂 · 配对</p>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] opacity-80">{data.name} · {data.birth}</p>
            <p className="text-3xl font-bold">{lp.num} {lp.isMaster && '✨'}</p>
            <p className="text-xs font-semibold">{NUM_MEANINGS[lp.num]?.name}</p>
            <p className="text-[10px] opacity-80">{NUM_MEANINGS[lp.num]?.desc}</p>
          </div>
          <Sparkles className="w-12 h-12 opacity-30" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{expr}</p><p className="text-[9px] opacity-80">表达</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{soul}</p><p className="text-[9px] opacity-80">灵魂</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{bday}</p><p className="text-[9px] opacity-80">生日</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{personalYear}</p><p className="text-[9px] opacity-80">流年</p></div>
        </div>
      </div>

      <button onClick={() => { setDraft(data); setShowForm(!showForm) }} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold">
        {showForm ? '收起' : '✏️ 编辑信息'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="姓名 (全名)" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <input type="date" value={draft.birth} onChange={(e) => setDraft({ ...draft, birth: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={save} className="w-full h-9 rounded-lg bg-violet-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-violet-500" />核心数字</div>
        {[
          { label: '生命密码', num: lp.num, sub: '你的天赋和人生方向', icon: Compass, isMaster: lp.isMaster },
          { label: '表达数字', num: expr, sub: '你展现给他人的能力', icon: User },
          { label: '灵魂数字', num: soul, sub: '你内心深处的渴望', icon: Heart },
          { label: '生日数字', num: bday, sub: '与生俱来的天赋', icon: Star },
          { label: '今日能量', num: today, sub: '今天的整体振动', icon: Calendar },
        ].map((item) => {
          const Icon = item.icon
          const meta = NUM_MEANINGS[item.num]
          return (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50/40 dark:bg-ink-800/30">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white text-base font-bold bg-gradient-to-br', meta?.color)}>
                {item.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] font-bold text-ink-800 dark:text-ink-200">{item.label}</p>
                  {item.isMaster && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">大师数</span>}
                </div>
                <p className="text-[10px] text-ink-500">{item.sub}</p>
                <p className="text-[10px] text-ink-600 dark:text-ink-400 mt-0.5">{meta?.traits}</p>
              </div>
              <Icon className="w-3.5 h-3.5 text-ink-400" />
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
        <button onClick={() => setShowCompat(!showCompat)} className="w-full flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" />数字配对</span>
          <ChevronRight className={cn('w-3.5 h-3.5 text-ink-400 transition-transform', showCompat && 'rotate-90')} />
        </button>
        {showCompat && (
          <div className="mt-2 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <input value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} placeholder="对方姓名" className="h-8 px-2 text-[10px] bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
              <input type="date" value={partner.birth} onChange={(e) => setPartner({ ...partner, birth: e.target.value })} className="h-8 px-2 text-[10px] bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            {partner.name && partner.birth && (
              <div className="p-2 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-violet-600">{lp.num}</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${compatScore}%` }} className={cn('h-full', compatScore >= 80 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : compatScore >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-zinc-400 to-zinc-500')} />
                  </div>
                  <span className="text-base font-bold text-rose-600">{lifePath(partner.birth).num}</span>
                  <span className={cn('text-sm font-mono font-bold', compatScore >= 80 ? 'text-rose-500' : 'text-amber-500')}>{compatScore}</span>
                </div>
                <p className="text-[10px] text-ink-600 dark:text-ink-300 mt-1">{compatScore >= 80 ? '✨ 灵魂共振' : compatScore >= 60 ? '⚖️ 相容尚可' : '⚠️ 需要磨合'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
