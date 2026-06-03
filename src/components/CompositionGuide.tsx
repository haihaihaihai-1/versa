import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crop, Camera, Eye, Sparkles, ChevronRight, Info, Grid3x3, Target, Circle, Triangle, Square } from 'lucide-react'
import { cn } from '../lib/utils'

interface Guide {
  id: string
  name: string
  emoji: string
  desc: string
  bestFor: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
}

const GUIDES: Guide[] = [
  { id: 'rule-of-thirds', name: '三分法', emoji: '⚏', desc: '将画面横竖三等分, 主体放在交叉点上. 最经典、最安全的构图法则.', bestFor: ['人像', '风光', '街拍'], difficulty: 1 },
  { id: 'golden-ratio', name: '黄金比例', emoji: '🌀', desc: '按 1:0.618 划分画面, 比三分法更精细, 营造自然和谐感.', bestFor: ['风光', '建筑', '人像'], difficulty: 2 },
  { id: 'leading-lines', name: '引导线', emoji: '➜', desc: '利用画面中的线条 (路、河流、栏杆) 引导视线至主体.', bestFor: ['风光', '街拍', '建筑'], difficulty: 2 },
  { id: 'symmetry', name: '对称构图', emoji: '🪞', desc: '上下或左右对称, 营造庄严、稳定、震撼的视觉效果.', bestFor: ['建筑', '倒影', '产品'], difficulty: 2 },
  { id: 'diagonal', name: '对角线', emoji: '╱', desc: '主体沿对角线分布, 增加画面动感和张力.', bestFor: ['运动', '街拍', '人像'], difficulty: 3 },
  { id: 'frame-in-frame', name: '画中画', emoji: '🖼️', desc: '利用门、窗、树枝等元素框住主体, 增加层次感.', bestFor: ['风光', '街拍', '建筑'], difficulty: 3 },
  { id: 'negative-space', name: '极简留白', emoji: '⬜', desc: '大面积留白突出主体, 营造安静、极简、高级的氛围.', bestFor: ['人像', '产品', '极简风'], difficulty: 3 },
  { id: 'low-angle', name: '低角度', emoji: '📐', desc: '从下往上拍, 让主体显得高大、雄伟、有力量感.', bestFor: ['建筑', '人像', '风光'], difficulty: 3 },
  { id: 'birds-eye', name: '鸟瞰视角', emoji: '🦅', desc: '从正上方俯拍, 展现图案美感和全局视角.', bestFor: ['美食', '产品', '风光'], difficulty: 4 },
  { id: 'worm-eye', name: '虫视角', emoji: '🐛', desc: '贴近地面向上拍, 营造新奇、夸张、超现实的视角.', bestFor: ['创意', '人像', '街拍'], difficulty: 4 },
  { id: 'triangle', name: '三角构图', emoji: '△', desc: '画面中三个主体形成三角形, 稳定且富有变化.', bestFor: ['人像合影', '静物', '建筑'], difficulty: 2 },
  { id: 'center', name: '居中构图', emoji: '⊕', desc: '主体居中放置, 适合对称场景或强调主体本身.', bestFor: ['产品', '建筑', '极简'], difficulty: 1 },
]

const SCENE_TIPS: { [k: string]: string[] } = {
  portrait: ['使用 50mm 以上焦距', '眼睛在画面上 1/3 处', '对焦眼睛, 背景虚化', '注意光影在脸上形成三角形'],
  landscape: ['使用广角或中焦', '地平线放在上 1/3 或下 1/3', '前景增加纵深', '黄金时刻光线最迷人'],
  street: ['35mm 定焦是经典', '保持警觉, 抓拍决定性瞬间', '引导线增强故事性', '寻找光影对比'],
  food: ['45° 角是黄金视角', '俯拍适合平铺食物', '侧光凸显质感', '留白避免拥挤'],
  architecture: ['寻找对称与重复', '用广角夸张透视', '低角度仰拍更宏伟', '注意垂直线条不要歪'],
}

export function CompositionGuide() {
  const [activeId, setActiveId] = useState<string>('rule-of-thirds')
  const [scene, setScene] = useState<keyof typeof SCENE_TIPS>('portrait')
  const active = GUIDES.find((g) => g.id === activeId)!

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Crop className="w-5 h-5" />
          <h2 className="text-lg font-bold">构图指南</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 构图法 · 5 场景 · 难度分级</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{GUIDES.length}</p><p className="text-[9px] opacity-80">构图法</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(SCENE_TIPS).length}</p><p className="text-[9px] opacity-80">场景</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.difficulty}</p><p className="text-[9px] opacity-80">难度</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.bestFor.length}</p><p className="text-[9px] opacity-80">适用</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">构图法</div>
        <div className="grid grid-cols-4 gap-1.5">
          {GUIDES.map((g) => (
            <button key={g.id} onClick={() => setActiveId(g.id)} className={cn('h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', activeId === g.id ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md scale-105' : 'bg-ink-100/60 dark:bg-ink-800/40 text-ink-600 dark:text-ink-400')}>
              <span className="text-lg">{g.emoji}</span>
              <span className="text-[10px] font-semibold">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="aspect-video rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-violet-600 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-7xl">{active.emoji}</div>
        {active.id === 'rule-of-thirds' && (
          <>
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {[...Array(9)].map((_, i) => <div key={i} className="border border-white/40" />)}
            </div>
            <div className="absolute top-1/3 right-1/3 w-6 h-6 rounded-full bg-cyan-400 ring-4 ring-white shadow-lg" />
          </>
        )}
        {active.id === 'golden-ratio' && (
          <>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <rect x="0" y="0" width="100" height="100" fill="none" stroke="white" strokeWidth="0.4" opacity="0.5" />
              <rect x="0" y="0" width="61.8" height="61.8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.7" />
              <rect x="38.2" y="38.2" width="61.8" height="61.8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.7" />
              <circle cx="61.8" cy="38.2" r="2" fill="#06b6d4" />
            </svg>
          </>
        )}
        {active.id === 'symmetry' && <div className="absolute top-0 inset-x-0 h-1/2 border-b-2 border-dashed border-white/60" />}
        {active.id === 'diagonal' && (
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-white/60 rotate-45 origin-top-left" style={{ width: '141%' }} />
          </div>
        )}
        {active.id === 'center' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-cyan-400 ring-4 ring-white" /></div>}
        {active.id === 'triangle' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <polygon points="50,20 80,80 20,80" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="50" cy="20" r="2" fill="#f59e0b" />
            <circle cx="80" cy="80" r="2" fill="#10b981" />
            <circle cx="20" cy="80" r="2" fill="#ec4899" />
          </svg>
        )}
        <div className="absolute bottom-2 left-2 px-2 h-6 rounded-full bg-black/50 text-white text-[10px] font-semibold flex items-center">{active.emoji} {active.name}</div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 border border-amber-200/40 dark:border-amber-800/40 space-y-1.5">
        <h3 className="text-sm font-bold text-ink-800 dark:text-ink-200">{active.emoji} {active.name}</h3>
        <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">{active.desc}</p>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-ink-500">难度:</span>
          {[1, 2, 3, 4, 5].map((d) => (
            <span key={d} className={cn('w-3 h-1.5 rounded-full', d <= active.difficulty ? 'bg-amber-500' : 'bg-ink-200 dark:bg-ink-700')} />
          ))}
          <span className="text-ink-500 ml-1">· 适用:</span>
          {active.bestFor.map((b) => <span key={b} className="px-1.5 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] flex items-center">{b}</span>)}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Info className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">场景小贴士</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {Object.keys(SCENE_TIPS).map((s) => (
            <button key={s} onClick={() => setScene(s as any)} className={cn('h-7 rounded-full text-[10px] font-semibold', scene === s ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>{s === 'portrait' ? '人像' : s === 'landscape' ? '风光' : s === 'street' ? '街拍' : s === 'food' ? '美食' : '建筑'}</button>
          ))}
        </div>
        <ul className="space-y-1">
          {SCENE_TIPS[scene].map((t, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-ink-700 dark:text-ink-300">
              <ChevronRight className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="p-2 rounded-xl bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/30">
          <p className="text-[10px] text-amber-700 dark:text-amber-300">📐 黄金时刻</p>
          <p className="text-[10px] text-ink-600 dark:text-ink-400 mt-0.5">日出后 1 小时 / 日落前 1 小时, 光线柔和, 色彩温暖</p>
        </div>
        <div className="p-2 rounded-xl bg-blue-50/40 dark:bg-blue-900/10 border border-blue-200/30">
          <p className="text-[10px] text-blue-700 dark:text-blue-300">🌅 蓝色时刻</p>
          <p className="text-[10px] text-ink-600 dark:text-ink-400 mt-0.5">日出前 / 日落后 30 分钟, 天空呈现深蓝, 适合城市夜景</p>
        </div>
        <div className="p-2 rounded-xl bg-rose-50/40 dark:bg-rose-900/10 border border-rose-200/30">
          <p className="text-[10px] text-rose-700 dark:text-rose-300">☁️ 阴天优势</p>
          <p className="text-[10px] text-ink-600 dark:text-ink-400 mt-0.5">柔和均匀光线, 无强烈阴影, 适合人像和静物</p>
        </div>
      </div>
    </div>
  )
}
