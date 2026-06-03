import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Star, Heart, Briefcase, AlertCircle, Search, Calendar, Users, Trophy, ChevronRight, Globe } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Zodiac {
  id: string
  name: string
  symbol: string
  animal: string
  emoji: string
  years: number[]
  traits: string
  lucky: string
  unlucky: string
  color: string
  gradient: string
  element: '金' | '木' | '水' | '火' | '土'
  yinYang: '阴' | '阳'
}

const ZODIAC: Zodiac[] = [
  { id: 'rat', name: '鼠', symbol: '子', animal: '鼠', emoji: '🐭', years: [1996, 2008, 2020, 2032], traits: '机灵、聪明、善于理财', lucky: '龙、猴、牛', unlucky: '马、兔、羊', color: 'from-slate-500 to-zinc-600', gradient: 'bg-gradient-to-br from-slate-500 to-zinc-600', element: '水', yinYang: '阳' },
  { id: 'ox', name: '牛', symbol: '丑', animal: '牛', emoji: '🐂', years: [1997, 2009, 2021, 2033], traits: '勤劳、稳重、可靠', lucky: '鼠、蛇、鸡', unlucky: '羊、马、狗', color: 'from-amber-700 to-orange-700', gradient: 'bg-gradient-to-br from-amber-700 to-orange-700', element: '土', yinYang: '阴' },
  { id: 'tiger', name: '虎', symbol: '寅', animal: '虎', emoji: '🐯', years: [1998, 2010, 2022, 2034], traits: '勇猛、领导、自信', lucky: '马、狗、猪', unlucky: '猴、蛇、鼠', color: 'from-orange-500 to-amber-500', gradient: 'bg-gradient-to-br from-orange-500 to-amber-500', element: '木', yinYang: '阳' },
  { id: 'rabbit', name: '兔', symbol: '卯', animal: '兔', emoji: '🐰', years: [1999, 2011, 2023, 2035], traits: '温柔、文静、善良', lucky: '狗、猪、羊', unlucky: '鸡、龙、鼠', color: 'from-pink-400 to-rose-400', gradient: 'bg-gradient-to-br from-pink-400 to-rose-400', element: '木', yinYang: '阴' },
  { id: 'dragon', name: '龙', symbol: '辰', animal: '龙', emoji: '🐲', years: [2000, 2012, 2024, 2036], traits: '霸气、有野心、热情', lucky: '鼠、猴、鸡', unlucky: '狗、兔、龙', color: 'from-yellow-500 to-amber-500', gradient: 'bg-gradient-to-br from-yellow-500 to-amber-500', element: '土', yinYang: '阳' },
  { id: 'snake', name: '蛇', symbol: '巳', animal: '蛇', emoji: '🐍', years: [2001, 2013, 2025, 2037], traits: '智慧、神秘、直觉强', lucky: '牛、鸡、猴', unlucky: '猪、虎、猴', color: 'from-emerald-500 to-green-500', gradient: 'bg-gradient-to-br from-emerald-500 to-green-500', element: '火', yinYang: '阴' },
  { id: 'horse', name: '马', symbol: '午', animal: '马', emoji: '🐴', years: [2002, 2014, 2026, 2038], traits: '自由、热情、积极', lucky: '虎、羊、狗', unlucky: '鼠、牛、鸡', color: 'from-red-500 to-rose-500', gradient: 'bg-gradient-to-br from-red-500 to-rose-500', element: '火', yinYang: '阳' },
  { id: 'goat', name: '羊', symbol: '未', animal: '羊', emoji: '🐑', years: [2003, 2015, 2027, 2039], traits: '温柔、艺术、善良', lucky: '兔、马、猪', unlucky: '鼠、牛、狗', color: 'from-emerald-400 to-teal-400', gradient: 'bg-gradient-to-br from-emerald-400 to-teal-400', element: '土', yinYang: '阴' },
  { id: 'monkey', name: '猴', symbol: '申', animal: '猴', emoji: '🐵', years: [2004, 2016, 2028, 2040], traits: '机智、幽默、灵活', lucky: '鼠、龙、蛇', unlucky: '虎、猪、蛇', color: 'from-amber-500 to-yellow-500', gradient: 'bg-gradient-to-br from-amber-500 to-yellow-500', element: '金', yinYang: '阳' },
  { id: 'rooster', name: '鸡', symbol: '酉', animal: '鸡', emoji: '🐔', years: [2005, 2017, 2029, 2041], traits: '勤奋、准时、自信', lucky: '牛、蛇、龙', unlucky: '兔、鸡、狗', color: 'from-orange-600 to-red-600', gradient: 'bg-gradient-to-br from-orange-600 to-red-600', element: '金', yinYang: '阴' },
  { id: 'dog', name: '狗', symbol: '戌', animal: '狗', emoji: '🐕', years: [2006, 2018, 2030, 2042], traits: '忠诚、正义、可靠', lucky: '虎、兔、马', unlucky: '龙、鸡、羊', color: 'from-stone-600 to-zinc-700', gradient: 'bg-gradient-to-br from-stone-600 to-zinc-700', element: '土', yinYang: '阳' },
  { id: 'pig', name: '猪', symbol: '亥', animal: '猪', emoji: '🐖', years: [2007, 2019, 2031, 2043], traits: '善良、宽厚、真诚', lucky: '兔、羊、虎', unlucky: '蛇、猪、猴', color: 'from-pink-500 to-fuchsia-500', gradient: 'bg-gradient-to-br from-pink-500 to-fuchsia-500', element: '水', yinYang: '阴' },
]

const COMPATIBILITY_MATRIX: Record<string, { best: string[]; worst: string[] }> = {
  rat: { best: ['dragon', 'monkey', 'ox'], worst: ['horse', 'rabbit', 'goat'] },
  ox: { best: ['rat', 'snake', 'rooster'], worst: ['goat', 'horse', 'dog'] },
  tiger: { best: ['horse', 'dog', 'pig'], worst: ['monkey', 'snake', 'rat'] },
  rabbit: { best: ['dog', 'pig', 'goat'], worst: ['rooster', 'dragon', 'rat'] },
  dragon: { best: ['rat', 'monkey', 'rooster'], worst: ['dog', 'rabbit', 'dragon'] },
  snake: { best: ['ox', 'rooster', 'monkey'], worst: ['pig', 'tiger', 'monkey'] },
  horse: { best: ['tiger', 'goat', 'dog'], worst: ['rat', 'ox', 'rooster'] },
  goat: { best: ['rabbit', 'horse', 'pig'], worst: ['rat', 'ox', 'dog'] },
  monkey: { best: ['rat', 'dragon', 'snake'], worst: ['tiger', 'pig', 'snake'] },
  rooster: { best: ['ox', 'snake', 'dragon'], worst: ['rabbit', 'rooster', 'dog'] },
  dog: { best: ['tiger', 'rabbit', 'horse'], worst: ['dragon', 'rooster', 'goat'] },
  pig: { best: ['rabbit', 'goat', 'tiger'], worst: ['snake', 'pig', 'monkey'] },
}

const STORAGE_KEY = 'versa:chinese-zodiac-v1'

function load(): { year: number; favId: string } { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return { year: 2000, favId: 'dragon' } }
function save(d: { year: number; favId: string }) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function ChineseZodiac() {
  const [data, setData] = useState(load())
  const [searchYear, setSearchYear] = useState('')
  const [pairA, setPairA] = useState('rat')
  const [pairB, setPairB] = useState('ox')

  useEffect(() => { save(data) }, [data])

  const yearToZodiac = (year: number): Zodiac => {
    const idx = ((year - 1900) % 12 + 12) % 12
    const order = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig']
    return ZODIAC.find((z) => z.id === order[idx]) || ZODIAC[0]
  }

  const yearZodiac = yearToZodiac(data.year)
  const active = ZODIAC.find((z) => z.id === data.favId) || ZODIAC[0]
  const a = ZODIAC.find((z) => z.id === pairA)!
  const b = ZODIAC.find((z) => z.id === pairB)!
  const compat = COMPATIBILITY_MATRIX[pairA]
  const compatScore = compat.best.includes(pairB) ? 95 : compat.worst.includes(pairB) ? 35 : 70

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-3 text-white ${active.gradient}`}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">生肖属相</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 生肖 · 五行阴阳 · 配对解析</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{active.emoji} {active.name}年 ({active.symbol})</p>
            <p className="text-[10px] opacity-80">{active.traits}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-80">{active.element} · {active.yinYang}</p>
            <p className="text-[10px] opacity-80">{active.years[0]}/{active.years[1]}/{active.years[2]}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center mt-2">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.element}</p><p className="text-[9px] opacity-80">五行</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.yinYang}</p><p className="text-[9px] opacity-80">阴阳</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.symbol}</p><p className="text-[9px] opacity-80">地支</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">第{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][ZODIAC.indexOf(active)]}位</p><p className="text-[9px] opacity-80">排序</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-500" />年份查询</div>
        <div className="flex gap-1">
          <input type="number" value={searchYear} onChange={(e) => setSearchYear(e.target.value)} placeholder="输入年份 (如 2000)" className="flex-1 h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={() => { if (searchYear) { const y = Number(searchYear); if (!isNaN(y)) setData({ ...data, year: y }) } }} className="h-9 px-3 rounded-lg bg-amber-500 text-white text-xs font-semibold">查询</button>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 dark:bg-amber-900/20">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">{data.year} 年:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl">{yearZodiac.emoji}</span>
            <span className="text-sm font-bold text-amber-600">{yearZodiac.name}年</span>
            <span className="text-[10px] text-ink-500">({yearZodiac.element} · {yearZodiac.yinYang})</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" />配对解析</div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <select value={pairA} onChange={(e) => setPairA(e.target.value)} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
            {ZODIAC.map((z) => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
          </select>
          <select value={pairB} onChange={(e) => setPairB(e.target.value)} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
            {ZODIAC.map((z) => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{a.emoji}</span>
          <div className="flex-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${compatScore}%` }} className={cn('h-full', compatScore >= 80 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : compatScore >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-zinc-400 to-zinc-500')} />
          </div>
          <span className="text-3xl">{b.emoji}</span>
          <span className={cn('text-base font-mono font-bold ml-1', compatScore >= 80 ? 'text-rose-500' : compatScore >= 50 ? 'text-amber-500' : 'text-zinc-500')}>{compatScore}</span>
        </div>
        <p className="text-[11px] text-ink-600 dark:text-ink-300 mt-1.5">{compatScore >= 80 ? '✨ 天作之合, 性格互补' : compatScore >= 50 ? '⚖️ 相容尚可, 需要磨合' : '⚠️ 性格差异大, 需多包容'}</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {ZODIAC.map((z) => (
          <button key={z.id} onClick={() => setData({ ...data, favId: z.id })} className={cn('h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', data.favId === z.id ? `${z.gradient} text-white shadow-md scale-105` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>
            <span className="text-2xl">{z.emoji}</span>
            <span className="text-[10px] font-semibold">{z.name}年</span>
          </button>
        ))}
      </div>
    </div>
  )
}
