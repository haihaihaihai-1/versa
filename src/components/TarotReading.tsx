import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCw, Save, History, BookOpen, Star, Eye, EyeOff, ChevronRight, Heart, Briefcase, DollarSign, Activity } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface TarotCard {
  id: number
  name: string
  enName: string
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  number: number
  upright: string
  reversed: string
  keywords: string[]
  emoji: string
  color: string
}

const CARDS: TarotCard[] = [
  { id: 0, name: '愚者', enName: 'The Fool', arcana: 'major', number: 0, upright: '新开始、自由、冒险', reversed: '鲁莽、犹豫、风险', keywords: ['新起点', '纯真', '潜能'], emoji: '🃏', color: 'from-amber-400 to-yellow-500' },
  { id: 1, name: '魔术师', enName: 'The Magician', arcana: 'major', number: 1, upright: '创造力、行动力、专注', reversed: '操控、欺骗、才能浪费', keywords: ['显化', '技能', '意志'], emoji: '🪄', color: 'from-red-500 to-rose-500' },
  { id: 2, name: '女祭司', enName: 'The High Priestess', arcana: 'major', number: 2, upright: '直觉、潜意识、神秘', reversed: '秘密、疏离、忽视直觉', keywords: ['智慧', '内在', '神秘'], emoji: '🌙', color: 'from-blue-500 to-indigo-500' },
  { id: 3, name: '皇后', enName: 'The Empress', arcana: 'major', number: 3, upright: '丰盛、母性、创造力', reversed: '依赖、停滞、过度保护', keywords: ['丰饶', '滋养', '自然'], emoji: '👑', color: 'from-pink-500 to-rose-500' },
  { id: 4, name: '皇帝', enName: 'The Emperor', arcana: 'major', number: 4, upright: '权威、领导、稳定', reversed: '专制、僵化、过度控制', keywords: ['结构', '父权', '秩序'], emoji: '⚔️', color: 'from-orange-500 to-amber-500' },
  { id: 5, name: '教皇', enName: 'The Hierophant', arcana: 'major', number: 5, upright: '传统、信仰、教育', reversed: '教条、叛逆、非常规', keywords: ['信仰', '传统', '指导'], emoji: '📿', color: 'from-amber-600 to-yellow-600' },
  { id: 6, name: '恋人', enName: 'The Lovers', arcana: 'major', number: 6, upright: '爱情、选择、和谐', reversed: '失衡、错误选择、冲突', keywords: ['关系', '价值', '选择'], emoji: '💕', color: 'from-rose-500 to-pink-500' },
  { id: 7, name: '战车', enName: 'The Chariot', arcana: 'major', number: 7, upright: '胜利、决心、行动', reversed: '失控、缺乏方向、侵略', keywords: ['胜利', '意志', '控制'], emoji: '🏇', color: 'from-slate-500 to-zinc-600' },
  { id: 8, name: '力量', enName: 'Strength', arcana: 'major', number: 8, upright: '勇气、耐心、内在力量', reversed: '软弱、自我怀疑、压抑', keywords: ['勇气', '柔中带刚', '信念'], emoji: '🦁', color: 'from-yellow-500 to-amber-500' },
  { id: 9, name: '隐士', enName: 'The Hermit', arcana: 'major', number: 9, upright: '内省、独处、智慧', reversed: '孤立、拒绝建议、迷失', keywords: ['独处', '内省', '指引'], emoji: '🕯️', color: 'from-violet-500 to-purple-500' },
  { id: 10, name: '命运之轮', enName: 'Wheel of Fortune', arcana: 'major', number: 10, upright: '转变、循环、机遇', reversed: '厄运、抗拒改变、停滞', keywords: ['命运', '循环', '转机'], emoji: '🎡', color: 'from-emerald-500 to-teal-500' },
  { id: 11, name: '正义', enName: 'Justice', arcana: 'major', number: 11, upright: '公正、真相、因果', reversed: '不公、逃避责任、偏见', keywords: ['公平', '真理', '因果'], emoji: '⚖️', color: 'from-blue-600 to-cyan-600' },
  { id: 12, name: '倒吊人', enName: 'The Hanged Man', arcana: 'major', number: 12, upright: '牺牲、新视角、暂停', reversed: '抗拒、抗争、徒劳', keywords: ['放下', '新视角', '等待'], emoji: '🙃', color: 'from-cyan-500 to-blue-500' },
  { id: 13, name: '死神', enName: 'Death', arcana: 'major', number: 13, upright: '结束、转变、新生', reversed: '抗拒改变、停滞、恐惧', keywords: ['结束', '蜕变', '重生'], emoji: '💀', color: 'from-zinc-700 to-zinc-900' },
  { id: 14, name: '节制', enName: 'Temperance', arcana: 'major', number: 14, upright: '平衡、耐心、中庸', reversed: '失衡、过度、不耐烦', keywords: ['平衡', '调和', '耐心'], emoji: '🕊️', color: 'from-sky-400 to-cyan-400' },
  { id: 15, name: '恶魔', enName: 'The Devil', arcana: 'major', number: 15, upright: '束缚、欲望、执着', reversed: '解脱、打破枷锁、觉醒', keywords: ['阴影', '执着', '束缚'], emoji: '😈', color: 'from-red-600 to-rose-700' },
  { id: 16, name: '塔', enName: 'The Tower', arcana: 'major', number: 16, upright: '突变、崩塌、觉醒', reversed: '避免灾难、恐惧改变、渐进', keywords: ['突变', '觉醒', '解放'], emoji: '🗼', color: 'from-red-500 to-orange-500' },
  { id: 17, name: '星星', enName: 'The Star', arcana: 'major', number: 17, upright: '希望、灵感、宁静', reversed: '绝望、缺乏信心、迷失', keywords: ['希望', '灵感', '疗愈'], emoji: '⭐', color: 'from-cyan-400 to-blue-400' },
  { id: 18, name: '月亮', enName: 'The Moon', arcana: 'major', number: 18, upright: '幻象、直觉、潜意识', reversed: '释放恐惧、真相、清晰', keywords: ['潜意识', '幻象', '直觉'], emoji: '🌕', color: 'from-indigo-500 to-purple-500' },
  { id: 19, name: '太阳', enName: 'The Sun', arcana: 'major', number: 19, upright: '快乐、成功、活力', reversed: '短暂的沮丧、过度乐观、延迟', keywords: ['喜悦', '成功', '活力'], emoji: '☀️', color: 'from-yellow-400 to-orange-400' },
  { id: 20, name: '审判', enName: 'Judgement', arcana: 'major', number: 20, upright: '觉醒、重生、召唤', reversed: '自我怀疑、逃避、停滞', keywords: ['觉醒', '重生', '召唤'], emoji: '📯', color: 'from-amber-500 to-yellow-500' },
  { id: 21, name: '世界', enName: 'The World', arcana: 'major', number: 21, upright: '完成、成就、圆满', reversed: '未完成、停滞、缺乏闭合', keywords: ['圆满', '完成', '成就'], emoji: '🌍', color: 'from-emerald-400 to-teal-500' },
]

const SPREADS = [
  { id: 1, name: '单牌', icon: '🃏', desc: '一张牌快速指引' },
  { id: 3, name: '三牌阵', icon: '🌸', desc: '过去-现在-未来' },
  { id: 5, name: '五牌阵', icon: '⭐', desc: '现状-挑战-建议-潜在-结果' },
  { id: 10, name: '凯尔特十字', icon: '✨', desc: '深度占卜 10 张' },
]

interface Reading {
  id: string
  date: string
  question: string
  spread: number
  cards: { cardId: number; reversed: boolean; position: string }[]
  note: string
}

const STORAGE_KEY = 'versa:tarot-readings-v1'

function loadReadings(): Reading[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function saveReadings(d: Reading[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TarotReading() {
  const [spread, setSpread] = useState<1 | 3 | 5 | 10>(3)
  const [question, setQuestion] = useState('')
  const [drawn, setDrawn] = useState<{ card: TarotCard; reversed: boolean; position: string }[]>([])
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [readings, setReadings] = useState<Reading[]>(loadReadings())
  const [note, setNote] = useState('')

  useEffect(() => { saveReadings(readings) }, [readings])

  const positions = {
    1: ['核心讯息'],
    3: ['过去', '现在', '未来'],
    5: ['现状', '挑战', '建议', '潜在', '结果'],
    10: ['现状', '挑战', '潜意识', '过去', '可能', '近期未来', '自我', '环境', '希望/恐惧', '最终结果'],
  }

  const draw = () => {
    if (!question) { toast('请先输入问题', 'error'); return }
    const shuffled = shuffle(CARDS).slice(0, spread)
    const cards = shuffled.map((c, i) => ({ card: c, reversed: Math.random() < 0.3, position: positions[spread][i] }))
    setDrawn(cards)
    setRevealed(new Array(spread).fill(false))
    setNote('')
  }

  const reveal = (idx: number) => {
    const r = [...revealed]
    r[idx] = true
    setRevealed(r)
  }

  const saveIt = () => {
    if (drawn.length === 0) { return }
    const r: Reading = { id: uid(), date: new Date().toISOString(), question, spread, cards: drawn.map((d) => ({ cardId: d.card.id, reversed: d.reversed, position: d.position })), note }
    setReadings([r, ...readings].slice(0, 30))
    toast('已保存解读', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">塔罗牌阵</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">22 大阿尔克那 · 4 种牌阵 · AI 解读</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{CARDS.length}</p><p className="text-[9px] opacity-80">卡牌</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{SPREADS.length}</p><p className="text-[9px] opacity-80">牌阵</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{readings.length}</p><p className="text-[9px] opacity-80">记录</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{drawn.length}</p><p className="text-[9px] opacity-80">本局</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300">你的问题</div>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如: 我近期的事业发展如何?" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
        <div className="grid grid-cols-4 gap-1">
          {SPREADS.map((s) => (
            <button key={s.id} onClick={() => setSpread(s.id as any)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px]', spread === s.id ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md' : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
              <span className="text-lg">{s.icon}</span>
              <span className="font-semibold">{s.name}</span>
            </button>
          ))}
        </div>
        <button onClick={draw} className="w-full h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-1">
          <RotateCw className="w-4 h-4" />抽取 {spread} 张牌
        </button>
      </div>

      {drawn.length > 0 && (
        <>
          <div className={cn('grid gap-2', spread === 1 ? 'grid-cols-1' : spread === 3 ? 'grid-cols-3' : spread === 5 ? 'grid-cols-5' : 'grid-cols-5')}>
            {drawn.map((d, i) => (
              <button key={i} onClick={() => reveal(i)} className="aspect-[2/3] relative">
                <AnimatePresence>
                  {revealed[i] ? (
                    <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} className={cn('w-full h-full rounded-xl p-2 flex flex-col items-center justify-center text-white text-center', d.card.color, d.reversed && 'rotate-180')}>
                      <span className="text-3xl mb-1">{d.card.emoji}</span>
                      <p className="text-[10px] font-bold">{d.card.name}</p>
                      <p className="text-[8px] opacity-80">{d.card.enName}</p>
                      {d.reversed && <p className="text-[8px] mt-0.5">↺ 逆位</p>}
                    </motion.div>
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center text-2xl">❓</div>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          {revealed.every((r) => r) && (
            <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-2">
              <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-indigo-500" />牌阵解读</div>
              {drawn.map((d, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20">
                  <span className="text-2xl shrink-0">{d.card.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-1.5 rounded">{d.position}</span>
                      <span className="text-xs font-bold text-ink-800 dark:text-ink-200">{d.card.name}</span>
                      {d.reversed && <span className="text-[9px] bg-rose-100 text-rose-700 px-1 rounded">逆位</span>}
                    </div>
                    <p className="text-[10px] text-ink-700 dark:text-ink-300 leading-relaxed">{d.reversed ? d.card.reversed : d.card.upright}</p>
                  </div>
                </div>
              ))}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录你的感受和反思..." rows={2} className="w-full p-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 resize-none" />
              <button onClick={saveIt} className="w-full h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                <Save className="w-3.5 h-3.5" />保存这次占卜
              </button>
            </div>
          )}
        </>
      )}

      {readings.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><History className="w-3.5 h-3.5" />历史解读</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {readings.slice(0, 5).map((r) => (
              <div key={r.id} className="p-1.5 rounded-lg bg-ink-50/60 dark:bg-ink-800/40">
                <p className="text-[10px] text-ink-500">{new Date(r.date).toLocaleDateString('zh-CN')} · {r.spread} 牌阵</p>
                <p className="text-xs font-semibold text-ink-800 dark:text-ink-200 truncate">{r.question}</p>
                <div className="flex gap-0.5 mt-0.5">
                  {r.cards.map((c, i) => <span key={i} className="text-base">{CARDS.find((x) => x.id === c.cardId)?.emoji}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
