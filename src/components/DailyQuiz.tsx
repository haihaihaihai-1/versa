import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Brain, Sparkles, Loader2, Play, Pause, RotateCcw, ChevronRight, Check, X, Trophy, Plus, Clock, Zap } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Question {
  id: string
  category: 'tech' | 'history' | 'science' | 'culture' | 'sport' | 'geography' | 'general'
  text: string
  options: string[]
  correct: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

const STORAGE_KEY = 'versa:quiz-history'

interface Session { id: string; questions: Question[]; answers: number[]; score: number; at: number }

function load(): Session[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Session[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  tech: { label: '科技', emoji: '💻', color: 'from-blue-500 to-indigo-500' },
  history: { label: '历史', emoji: '🏛️', color: 'from-amber-500 to-orange-500' },
  science: { label: '科学', emoji: '🔬', color: 'from-emerald-500 to-teal-500' },
  culture: { label: '文化', emoji: '🎭', color: 'from-pink-500 to-rose-500' },
  sport: { label: '体育', emoji: '⚽', color: 'from-green-500 to-emerald-500' },
  geography: { label: '地理', emoji: '🌍', color: 'from-cyan-500 to-blue-500' },
  general: { label: '常识', emoji: '💡', color: 'from-violet-500 to-purple-500' },
} as const

const FALLBACK: Question[] = [
  { id: 'q1', category: 'science', text: '水的化学式是什么?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correct: 0, difficulty: 'easy', explanation: '水由 2 个氢和 1 个氧组成' },
  { id: 'q2', category: 'tech', text: 'JavaScript 中, 哪个是数组方法?', options: ['push()', 'add()', 'append()', 'insert()'], correct: 0, difficulty: 'easy', explanation: 'push() 用于在数组末尾添加元素' },
  { id: 'q3', category: 'geography', text: '中国首都北京位于哪个时区?', options: ['UTC+7', 'UTC+8', 'UTC+9', 'UTC+6'], correct: 1, difficulty: 'medium', explanation: '中国采用 UTC+8 东八区时间' },
  { id: 'q4', category: 'history', text: '第二次世界大战结束于哪一年?', options: ['1943', '1944', '1945', '1946'], correct: 2, difficulty: 'easy' },
  { id: 'q5', category: 'tech', text: 'React 框架由哪家公司开发?', options: ['Google', 'Meta', 'Microsoft', 'Amazon'], correct: 1, difficulty: 'easy' },
  { id: 'q6', category: 'culture', text: '《红楼梦》是中国哪大古典名著之一?', options: ['二', '三', '四', '五'], correct: 2, difficulty: 'medium', explanation: '四大名著: 三国演义、水浒传、西游记、红楼梦' },
  { id: 'q7', category: 'sport', text: '足球比赛每队上场多少人?', options: ['9', '10', '11', '12'], correct: 2, difficulty: 'easy' },
  { id: 'q8', category: 'general', text: '一年有几天?', options: ['364', '365', '366', '367'], correct: 1, difficulty: 'easy' },
  { id: 'q9', category: 'tech', text: 'HTTP 状态码 404 表示?', options: ['服务器错误', '未找到', '未授权', '禁止'], correct: 1, difficulty: 'medium' },
  { id: 'q10', category: 'history', text: '孔子是哪个学派的创始人?', options: ['道家', '法家', '儒家', '墨家'], correct: 2, difficulty: 'easy' },
]

const SAMPLE_FUN: Question[] = [
  { id: 'f1', category: 'general', text: '猫的寿命平均多少年?', options: ['5-8', '10-15', '20-25', '30+'], correct: 1, difficulty: 'easy' },
  { id: 'f2', category: 'science', text: '光速大约多少 km/s?', options: ['3万', '30万', '300万', '3000万'], correct: 1, difficulty: 'medium' },
  { id: 'f3', category: 'geography', text: '世界上最长的河流?', options: ['亚马逊', '尼罗河', '长江', '密西西比'], correct: 1, difficulty: 'medium' },
]

export function DailyQuiz() {
  const [category, setCategory] = useState<keyof typeof CAT_META | 'all'>('all')
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [sessions, setSessions] = useState<Session[]>(load())
  const [aiLoading, setAiLoading] = useState(false)
  const [aiQ, setAiQ] = useState<Question | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => { save(sessions) }, [sessions])

  const startQuiz = () => {
    let pool = FALLBACK
    if (category !== 'all') pool = pool.filter((q) => q.category === category)
    if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty)
    if (pool.length < 3) pool = FALLBACK
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5)
    setQuestions(shuffled)
    setCurrentIdx(0); setSelected(null); setAnswers([])
    setShowResult(false); setAiQ(null)
  }

  const answer = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    setAnswers([...answers, i])
  }

  const next = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1); setSelected(null)
    } else {
      finish()
    }
  }

  const finish = () => {
    const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0) + (selected === questions[answers.length]?.correct ? 1 : 0)
    setShowResult(true)
    setSessions([{ id: uid(), questions, answers, score, at: Date.now() }, ...sessions].slice(0, 10))
  }

  const fetchAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiLoading(true)
    try {
      const cat = category === 'all' ? '通用' : CAT_META[category].label
      const diff = difficulty === 'all' ? '中等' : difficulty
      const result = await aiComplete(`为"${cat}"类别生成 1 道"${diff}"难度的中文知识问答, 严格返回 JSON 格式: {"text": "问题", "options": ["A", "B", "C", "D"], "correct": 0, "category": "${category === 'all' ? 'general' : category}", "difficulty": "${difficulty === 'all' ? 'medium' : difficulty}", "explanation": "解释"}`, '你是 Versa 出题专家, 简洁专业, 中文')
      const json = result.match(/\{[\s\S]*\}/)?.[0]
      if (json) {
        const obj = JSON.parse(json)
        const q: Question = { id: 'ai' + Date.now(), text: obj.text, options: obj.options, correct: obj.correct, category: obj.category, difficulty: obj.difficulty, explanation: obj.explanation }
        setAiQ(q)
        toast('已生成题目', 'success')
      }
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setAiLoading(false) }
  }

  const current = questions[currentIdx]
  const currentQ = current || aiQ
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5" />
          <h2 className="text-lg font-bold">每日问答</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">7 类目 · 3 难度 · AI 出题</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{FALLBACK.length + (aiQ ? 1 : 0)}</p>
            <p className="text-[10px] opacity-80">题库</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Object.keys(CAT_META).length}</p>
            <p className="text-[10px] opacity-80">类目</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{sessions.length}</p>
            <p className="text-[10px] opacity-80">已玩</p>
          </div>
        </div>
      </div>

      {questions.length === 0 && !aiQ ? (
        <>
          <div>
            <p className="text-xs font-bold mb-1.5">类目</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCategory('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', category === 'all' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
                <button key={k} onClick={() => setCategory(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', category === k ? `bg-gradient-to-r ${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                  {CAT_META[k].emoji} {CAT_META[k].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1.5">难度</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['all', 'easy', 'medium', 'hard'] as const).slice(0, 3).map((d) => (
                <button key={d} onClick={() => setDifficulty(d === 'all' ? 'all' : d)} className={cn('h-7 rounded-lg text-xs font-semibold', difficulty === d ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {d === 'all' ? '全部' : d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={startQuiz} className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-1">
            <Play className="w-4 h-4" />开始 5 题
          </button>
          <button onClick={fetchAI} disabled={aiLoading} className="w-full h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 单题挑战
          </button>
        </>
      ) : showResult ? (
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 p-6 text-white text-center">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-amber-300" />
          <p className="text-3xl font-bold mb-1">{score}/{questions.length}</p>
          <p className="text-sm opacity-90 mb-3">{score >= 4 ? '🎉 太棒了!' : score >= 3 ? '👍 不错!' : '💪 继续加油!'}</p>
          <button onClick={() => { setQuestions([]); setShowResult(false) }} className="px-4 h-8 rounded-full bg-white text-violet-500 text-sm font-bold">再来</button>
        </div>
      ) : currentQ ? (
        <>
          <div className={cn('rounded-2xl p-4 text-white bg-gradient-to-br', CAT_META[currentQ.category].color)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">{CAT_META[currentQ.category].emoji} {CAT_META[currentQ.category].label} · {currentQ.difficulty === 'easy' ? '简单' : currentQ.difficulty === 'medium' ? '中等' : '困难'}</span>
              <span className="text-xs font-mono">{(questions.length > 0 ? currentIdx : 0) + 1}/{(questions.length || 1)}</span>
            </div>
            <p className="text-lg font-bold mb-3">{currentQ.text}</p>
            <div className="space-y-1.5">
              {currentQ.options.map((opt, i) => {
                const correct = i === currentQ.correct
                const isSelected = i === selected
                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    disabled={selected !== null}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition',
                      selected === null ? 'bg-white/20 hover:bg-white/30' :
                        correct ? 'bg-emerald-500' :
                          isSelected ? 'bg-rose-500' : 'bg-white/20 opacity-60'
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1">{opt}</span>
                    {selected !== null && correct && <Check className="w-4 h-4" />}
                    {selected !== null && isSelected && !correct && <X className="w-4 h-4" />}
                  </button>
                )
              })}
            </div>
            {selected !== null && currentQ.explanation && (
              <p className="mt-2 text-xs bg-white/20 rounded p-2">💡 {currentQ.explanation}</p>
            )}
          </div>
          {selected !== null && (
            <button onClick={next} className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-1">
              {currentIdx < questions.length - 1 ? '下一题' : '查看结果'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      ) : null}

      {sessions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {sessions.slice(0, 5).map((s) => (
            <div key={s.id} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800 flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', s.score === s.questions.length ? 'bg-amber-500' : s.score >= s.questions.length / 2 ? 'bg-emerald-500' : 'bg-rose-500')}>
                {s.score}/{s.questions.length}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">得分 {s.score}/{s.questions.length}</p>
                <p className="text-[10px] text-ink-500">{formatTimeAgo(new Date(s.at).toISOString())}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
