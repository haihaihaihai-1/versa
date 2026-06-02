import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, RotateCcw, Shuffle, Star, Heart, Crown, Eye, Moon, Sun, Compass, Zap, Anchor, Flower2, BookMarked, ChevronRight } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Card {
  id: number
  name: string
  emoji: string
  upright: string
  reversed: string
  keyword: string
  element: 'fire' | 'water' | 'air' | 'earth' | 'spirit'
}

const MAJOR_ARCANA: Card[] = [
  { id: 0, name: '愚者', emoji: '🃏', upright: '新的开始, 自由, 冒险', reversed: '鲁莽, 犹豫不决', keyword: '新旅程', element: 'air' },
  { id: 1, name: '魔术师', emoji: '🎩', upright: '创造力, 技能, 行动力', reversed: '欺骗, 操控', keyword: '显化', element: 'air' },
  { id: 2, name: '女祭司', emoji: '🌙', upright: '直觉, 神秘, 内在智慧', reversed: '秘密, 疏离', keyword: '直觉', element: 'water' },
  { id: 3, name: '皇后', emoji: '👑', upright: '丰盛, 母性, 自然', reversed: '依赖, 过度保护', keyword: '丰盛', element: 'earth' },
  { id: 4, name: '皇帝', emoji: '🏛️', upright: '权威, 稳定, 领导力', reversed: '专制, 僵化', keyword: '权威', element: 'fire' },
  { id: 5, name: '教皇', emoji: '⛪', upright: '传统, 信仰, 教导', reversed: '教条, 叛逆', keyword: '传统', element: 'earth' },
  { id: 6, name: '恋人', emoji: '💕', upright: '爱情, 关系, 价值观', reversed: '失衡, 错误选择', keyword: '选择', element: 'air' },
  { id: 7, name: '战车', emoji: '🏆', upright: '胜利, 意志力, 控制', reversed: '失控, 失去方向', keyword: '胜利', element: 'water' },
  { id: 8, name: '力量', emoji: '🦁', upright: '勇气, 内在力量, 耐心', reversed: '软弱, 自我怀疑', keyword: '勇气', element: 'fire' },
  { id: 9, name: '隐者', emoji: '🏮', upright: '内省, 寻找真理', reversed: '孤立, 拒绝引导', keyword: '智慧', element: 'earth' },
  { id: 10, name: '命运之轮', emoji: '🎡', upright: '循环, 改变, 机遇', reversed: '厄运, 抗拒改变', keyword: '循环', element: 'spirit' },
  { id: 11, name: '正义', emoji: '⚖️', upright: '公正, 真相, 因果', reversed: '不公, 逃避责任', keyword: '公正', element: 'air' },
  { id: 12, name: '倒吊人', emoji: '🙃', upright: '牺牲, 等待, 新视角', reversed: '抗拒, 拖延', keyword: '牺牲', element: 'water' },
  { id: 13, name: '死神', emoji: '💀', upright: '结束, 转变, 新生', reversed: '抗拒改变, 停滞', keyword: '转变', element: 'spirit' },
  { id: 14, name: '节制', emoji: '🌊', upright: '平衡, 耐心, 中庸', reversed: '失衡, 极端', keyword: '平衡', element: 'water' },
  { id: 15, name: '恶魔', emoji: '😈', upright: '束缚, 诱惑, 执着', reversed: '挣脱, 觉醒', keyword: '束缚', element: 'earth' },
  { id: 16, name: '塔', emoji: '🗼', upright: '突变, 觉醒, 破坏重建', reversed: '抗拒改变, 灾难延迟', keyword: '突变', element: 'fire' },
  { id: 17, name: '星星', emoji: '⭐', upright: '希望, 灵感, 宁静', reversed: '绝望, 失去信念', keyword: '希望', element: 'air' },
  { id: 18, name: '月亮', emoji: '🌕', upright: '幻象, 潜意识, 直觉', reversed: '释放恐惧, 真相对齐', keyword: '直觉', element: 'water' },
  { id: 19, name: '太阳', emoji: '☀️', upright: '成功, 快乐, 活力', reversed: '暂时的阴霾', keyword: '成功', element: 'fire' },
  { id: 20, name: '审判', emoji: '📯', upright: '重生, 觉醒, 召唤', reversed: '自我怀疑, 错失机会', keyword: '觉醒', element: 'spirit' },
  { id: 21, name: '世界', emoji: '🌍', upright: '完成, 整合, 成就', reversed: '未完成, 缺乏闭环', keyword: '圆满', element: 'earth' },
]

const SPREADS = [
  { id: 'one', name: '单张', desc: '快速指引', cards: 1 },
  { id: 'three', name: '三张', desc: '过去/现在/未来', cards: 3 },
  { id: 'celtic', name: '凯尔特十字', desc: '深度解读 (5 张)', cards: 5 },
]

const STORAGE_KEY = 'versa:tarot'

interface Draw { id: string; cards: { card: Card; reversed: boolean; position: string }[]; aiReading: string; at: number }

function load(): Draw[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Draw[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const POSITIONS_3 = ['过去', '现在', '未来']
const POSITIONS_5 = ['当前', '挑战', '过去', '未来', '结果']

export function TarotDeck() {
  const [draws, setDraws] = useState<Draw[]>(load())
  const [spread, setSpread] = useState<typeof SPREADS[0]>(SPREADS[0])
  const [drawing, setDrawing] = useState(false)
  const [currentDraw, setCurrentDraw] = useState<Draw | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => { save(draws) }, [draws])

  const startDraw = () => {
    setDrawing(true)
    setCurrentDraw(null)
    setRevealed(0)
    setTimeout(() => {
      const shuffled = shuffle(MAJOR_ARCANA).slice(0, spread.cards)
      const cards = shuffled.map((c, i) => ({
        card: c,
        reversed: Math.random() > 0.5,
        position: spread.id === 'one' ? '指引' : spread.id === 'three' ? POSITIONS_3[i] : POSITIONS_5[i],
      }))
      const d: Draw = { id: uid(), cards, aiReading: '', at: Date.now() }
      setCurrentDraw(d)
      setDrawing(false)
    }, 1500)
  }

  const revealAll = () => {
    if (!currentDraw) return
    setRevealed(currentDraw.cards.length)
  }

  const runAI = async () => {
    if (!currentDraw || !isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiLoading(true)
    try {
      const desc = currentDraw.cards.map((c) => `${c.position}: ${c.card.name}${c.reversed ? '(逆位)' : '(正位)'} - ${c.reversed ? c.card.reversed : c.card.upright}`).join('; ')
      const result = await aiComplete(`为这次塔罗占卜生成 100-150 字的详细解读: ${desc} (牌阵: ${spread.name})`, '你是 Versa 塔罗师, 神秘有智慧, 中文')
      const updated = { ...currentDraw, aiReading: result }
      setCurrentDraw(updated)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setAiLoading(false) }
  }

  const saveDraw = () => {
    if (!currentDraw || !currentDraw.aiReading) { toast('先 AI 解读', 'error'); return }
    setDraws([currentDraw, ...draws])
    toast('已保存', 'success')
  }

  const remove = (id: string) => setDraws(draws.filter((d) => d.id !== id))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">塔罗牌</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">22 大阿卡纳 · 3 牌阵 · AI 解读</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{MAJOR_ARCANA.length}</p>
            <p className="text-[10px] opacity-80">大阿卡纳</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{SPREADS.length}</p>
            <p className="text-[10px] opacity-80">牌阵</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{draws.length}</p>
            <p className="text-[10px] opacity-80">已保存</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SPREADS.map((s) => (
          <button key={s.id} onClick={() => setSpread(s)} className={cn('px-3 h-9 rounded-xl text-xs font-semibold flex-shrink-0', spread.id === s.id ? `bg-gradient-to-r ${s.id === 'celtic' ? 'from-violet-500 to-purple-500' : 'from-rose-500 to-pink-500'} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            <div>{s.name}</div>
            <div className="text-[9px] opacity-80 mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>

      <button onClick={startDraw} disabled={drawing} className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
        {drawing ? <Shuffle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {drawing ? '洗牌中...' : '开始抽牌'}
      </button>

      {currentDraw && (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {currentDraw.cards.map((c, i) => {
              const isRevealed = i < revealed
              return (
                <motion.div
                  key={i}
                  whileHover={!isRevealed ? { rotateY: 10 } : {}}
                  onClick={() => setRevealed(Math.max(revealed, i + 1))}
                  className={cn('aspect-[2/3] rounded-xl flex flex-col items-center justify-center cursor-pointer transition', isRevealed ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30' : 'bg-gradient-to-br from-violet-700 to-purple-700')}
                >
                  {isRevealed ? (
                    <>
                      <p className={cn('text-3xl', c.reversed && 'rotate-180')}>{c.card.emoji}</p>
                      <p className="text-[10px] font-bold mt-1 text-center px-1 leading-tight">{c.card.name}</p>
                      <p className="text-[8px] text-ink-500 mt-0.5">{c.reversed && '逆位'}</p>
                    </>
                  ) : (
                    <Sparkles className="w-6 h-6 text-white/50" />
                  )}
                </motion.div>
              )
            })}
          </div>

          <p className="text-[10px] text-ink-500 text-center">点击卡牌翻面 · 已翻 {revealed}/{currentDraw.cards.length}</p>

          <div className="flex gap-1.5">
            <button onClick={revealAll} disabled={revealed === currentDraw.cards.length} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-xs font-semibold">
              全部翻开
            </button>
            <button onClick={runAI} disabled={aiLoading || revealed === 0} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 解读
            </button>
          </div>

          {currentDraw.aiReading && (
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-3 border border-violet-200/40">
              <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 解读</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{currentDraw.aiReading}</p>
              <button onClick={saveDraw} className="mt-2 w-full h-8 rounded-lg bg-violet-500 text-white text-xs font-bold">保存到历史</button>
            </div>
          )}

          {revealed > 0 && !currentDraw.aiReading && (
            <div className="space-y-1.5">
              {currentDraw.cards.slice(0, revealed).map((c, i) => (
                <div key={i} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
                  <p className="text-xs font-bold">{c.position}: {c.card.name} {c.reversed && '(逆)'}</p>
                  <p className="text-[10px] text-ink-500">关键词: {c.card.keyword}</p>
                  <p className="text-[10px] text-ink-600 dark:text-ink-300 mt-0.5">{c.reversed ? c.card.reversed : c.card.upright}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {draws.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史占卜</p>
          {draws.slice(0, 3).map((d) => (
            <div key={d.id} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
              <div className="flex items-start gap-1.5">
                <div className="flex-1">
                  <p className="text-[10px] text-violet-500 font-bold">{SPREADS.find((s) => s.cards === d.cards.length)?.name} · {formatTimeAgo(new Date(d.at).toISOString())}</p>
                  <p className="text-[10px] mt-0.5 line-clamp-2">{d.aiReading}</p>
                </div>
                <button onClick={() => remove(d.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
