import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scale, ArrowLeftRight, Sparkles, Loader2, Star, Plus, Trash2, Copy, Check, Calculator } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type Category = 'length' | 'weight' | 'temperature' | 'area' | 'volume' | 'time' | 'speed' | 'data' | 'pressure' | 'energy' | 'currency' | 'angle'

interface Unit {
  key: string
  name: string
  toBase: (n: number) => number
  fromBase: (n: number) => number
}

const UNITS: Record<Category, { label: string; icon: string; base: string; units: Unit[] }> = {
  length: { label: '长度', icon: '📏', base: 'm', units: [
    { key: 'mm', name: '毫米', toBase: (n) => n / 1000, fromBase: (n) => n * 1000 },
    { key: 'cm', name: '厘米', toBase: (n) => n / 100, fromBase: (n) => n * 100 },
    { key: 'm', name: '米', toBase: (n) => n, fromBase: (n) => n },
    { key: 'km', name: '千米', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    { key: 'in', name: '英寸', toBase: (n) => n * 0.0254, fromBase: (n) => n / 0.0254 },
    { key: 'ft', name: '英尺', toBase: (n) => n * 0.3048, fromBase: (n) => n / 0.3048 },
    { key: 'mi', name: '英里', toBase: (n) => n * 1609.344, fromBase: (n) => n / 1609.344 },
  ] },
  weight: { label: '重量', icon: '⚖️', base: 'kg', units: [
    { key: 'mg', name: '毫克', toBase: (n) => n / 1e6, fromBase: (n) => n * 1e6 },
    { key: 'g', name: '克', toBase: (n) => n / 1000, fromBase: (n) => n * 1000 },
    { key: 'kg', name: '千克', toBase: (n) => n, fromBase: (n) => n },
    { key: 't', name: '吨', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    { key: 'oz', name: '盎司', toBase: (n) => n * 0.0283495, fromBase: (n) => n / 0.0283495 },
    { key: 'lb', name: '磅', toBase: (n) => n * 0.453592, fromBase: (n) => n / 0.453592 },
  ] },
  temperature: { label: '温度', icon: '🌡️', base: 'C', units: [
    { key: 'C', name: '摄氏度', toBase: (n) => n, fromBase: (n) => n },
    { key: 'F', name: '华氏度', toBase: (n) => (n - 32) * 5 / 9, fromBase: (n) => n * 9 / 5 + 32 },
    { key: 'K', name: '开尔文', toBase: (n) => n - 273.15, fromBase: (n) => n + 273.15 },
  ] },
  area: { label: '面积', icon: '⬜', base: 'm²', units: [
    { key: 'cm2', name: '平方厘米', toBase: (n) => n / 1e4, fromBase: (n) => n * 1e4 },
    { key: 'm2', name: '平方米', toBase: (n) => n, fromBase: (n) => n },
    { key: 'km2', name: '平方千米', toBase: (n) => n * 1e6, fromBase: (n) => n / 1e6 },
    { key: 'ha', name: '公顷', toBase: (n) => n * 1e4, fromBase: (n) => n / 1e4 },
    { key: 'mu', name: '亩', toBase: (n) => n * 666.67, fromBase: (n) => n / 666.67 },
  ] },
  volume: { label: '体积', icon: '🧊', base: 'L', units: [
    { key: 'ml', name: '毫升', toBase: (n) => n / 1000, fromBase: (n) => n * 1000 },
    { key: 'L', name: '升', toBase: (n) => n, fromBase: (n) => n },
    { key: 'm3', name: '立方米', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    { key: 'gal', name: '加仑', toBase: (n) => n * 3.785, fromBase: (n) => n / 3.785 },
  ] },
  time: { label: '时间', icon: '⏰', base: 's', units: [
    { key: 'ms', name: '毫秒', toBase: (n) => n / 1000, fromBase: (n) => n * 1000 },
    { key: 's', name: '秒', toBase: (n) => n, fromBase: (n) => n },
    { key: 'min', name: '分钟', toBase: (n) => n * 60, fromBase: (n) => n / 60 },
    { key: 'h', name: '小时', toBase: (n) => n * 3600, fromBase: (n) => n / 3600 },
    { key: 'd', name: '天', toBase: (n) => n * 86400, fromBase: (n) => n / 86400 },
    { key: 'w', name: '周', toBase: (n) => n * 604800, fromBase: (n) => n / 604800 },
  ] },
  speed: { label: '速度', icon: '🚀', base: 'm/s', units: [
    { key: 'm/s', name: '米/秒', toBase: (n) => n, fromBase: (n) => n },
    { key: 'km/h', name: '千米/时', toBase: (n) => n / 3.6, fromBase: (n) => n * 3.6 },
    { key: 'mph', name: '英里/时', toBase: (n) => n * 0.447, fromBase: (n) => n / 0.447 },
    { key: 'knot', name: '节', toBase: (n) => n * 0.514, fromBase: (n) => n / 0.514 },
  ] },
  data: { label: '数据', icon: '💾', base: 'B', units: [
    { key: 'B', name: '字节', toBase: (n) => n, fromBase: (n) => n },
    { key: 'KB', name: 'KB', toBase: (n) => n * 1024, fromBase: (n) => n / 1024 },
    { key: 'MB', name: 'MB', toBase: (n) => n * 1024 * 1024, fromBase: (n) => n / (1024 * 1024) },
    { key: 'GB', name: 'GB', toBase: (n) => n * 1024 ** 3, fromBase: (n) => n / (1024 ** 3) },
    { key: 'TB', name: 'TB', toBase: (n) => n * 1024 ** 4, fromBase: (n) => n / (1024 ** 4) },
  ] },
  pressure: { label: '压力', icon: '💨', base: 'Pa', units: [
    { key: 'Pa', name: '帕', toBase: (n) => n, fromBase: (n) => n },
    { key: 'kPa', name: '千帕', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    { key: 'bar', name: '巴', toBase: (n) => n * 100000, fromBase: (n) => n / 100000 },
    { key: 'atm', name: '大气压', toBase: (n) => n * 101325, fromBase: (n) => n / 101325 },
    { key: 'psi', name: 'PSI', toBase: (n) => n * 6894.76, fromBase: (n) => n / 6894.76 },
  ] },
  energy: { label: '能量', icon: '⚡', base: 'J', units: [
    { key: 'J', name: '焦耳', toBase: (n) => n, fromBase: (n) => n },
    { key: 'kJ', name: '千焦', toBase: (n) => n * 1000, fromBase: (n) => n / 1000 },
    { key: 'cal', name: '卡', toBase: (n) => n * 4.184, fromBase: (n) => n / 4.184 },
    { key: 'kWh', name: '千瓦时', toBase: (n) => n * 3.6e6, fromBase: (n) => n / 3.6e6 },
  ] },
  currency: { label: '汇率', icon: '💰', base: 'CNY', units: [
    { key: 'CNY', name: '人民币', toBase: (n) => n, fromBase: (n) => n },
    { key: 'USD', name: '美元', toBase: (n) => n * 7.2, fromBase: (n) => n / 7.2 },
    { key: 'EUR', name: '欧元', toBase: (n) => n * 7.8, fromBase: (n) => n / 7.8 },
    { key: 'JPY', name: '日元', toBase: (n) => n * 0.048, fromBase: (n) => n / 0.048 },
    { key: 'GBP', name: '英镑', toBase: (n) => n * 9.1, fromBase: (n) => n / 9.1 },
  ] },
  angle: { label: '角度', icon: '📐', base: 'rad', units: [
    { key: 'rad', name: '弧度', toBase: (n) => n, fromBase: (n) => n },
    { key: 'deg', name: '度', toBase: (n) => n * Math.PI / 180, fromBase: (n) => n * 180 / Math.PI },
    { key: 'grad', name: '梯度', toBase: (n) => n * Math.PI / 200, fromBase: (n) => n * 200 / Math.PI },
  ] },
}

const STORAGE_KEY = 'versa:unit-favs'

function load(): Category[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return ['length', 'weight', 'temperature'] }
function save(d: Category[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function UnitConverter() {
  const [cat, setCat] = useState<Category>('length')
  const [from, setFrom] = useState('m')
  const [to, setTo] = useState('ft')
  const [value, setValue] = useState(1)
  const [favs, setFavs] = useState<Category[]>(load())
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(favs) }, [favs])

  const units = UNITS[cat].units
  const fromU = units.find((u) => u.key === from)!
  const toU = units.find((u) => u.key === to)!
  const result = toU.fromBase(fromU.toBase(value))

  useEffect(() => {
    if (!units.find((u) => u.key === from)) setFrom(units[0].key)
    if (!units.find((u) => u.key === to)) setTo(units[1]?.key || units[0].key)
  }, [cat])

  const swap = () => { setFrom(to); setTo(from) }
  const toggleFav = () => {
    setFavs(favs.includes(cat) ? favs.filter((f) => f !== cat) : [...favs, cat])
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`解释 ${UNITS[cat].label} 单位的换算方法, 50-80 字`, '你是 Versa 单位换算专家, 简洁专业, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const CATS = Object.keys(UNITS) as Category[]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-5 h-5" />
          <h2 className="text-lg font-bold">单位换算</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 类别 · 60+ 单位</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{CATS.length}</p>
            <p className="text-[10px] opacity-80">类别</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{CATS.reduce((s, c) => s + UNITS[c].units.length, 0)}</p>
            <p className="text-[10px] opacity-80">单位</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{favs.length}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{UNITS[cat].icon}</span>
          <p className="text-lg font-bold flex-1">{UNITS[cat].label}</p>
          <button onClick={toggleFav} className={cn('w-8 h-8 rounded-lg flex items-center justify-center', favs.includes(cat) ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            <Star className={cn('w-3.5 h-3.5', favs.includes(cat) && 'fill-white')} />
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
          <div>
            <p className="text-[10px] text-ink-500 mb-1">从</p>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs">
              {units.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
            </select>
            <input type="number" value={value} onChange={(e) => setValue(+e.target.value)} className="w-full mt-1 px-2 h-12 rounded bg-ink-50 dark:bg-ink-800 text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={swap} className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[10px] text-ink-500 mb-1">到</p>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs">
              {units.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
            </select>
            <div className="mt-1 px-2 h-12 rounded bg-blue-500 text-white text-2xl font-bold text-center flex items-center justify-center">
              {result.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-ink-500 text-center">{value} {fromU.name} = {result.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toU.name}</p>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 换算提示
      </button>

      {aiTip && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed">{aiTip}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-bold mb-1.5">常用类别</p>
        <div className="grid grid-cols-3 gap-1.5">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn('h-10 rounded-lg flex items-center gap-1.5 px-2', cat === c ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span className="text-base">{UNITS[c].icon}</span>
              <span className="text-xs font-semibold">{UNITS[c].label}</span>
              {favs.includes(c) && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
