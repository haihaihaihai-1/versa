import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Plus, Trash2, Sparkles, Loader2, Check, X, Shuffle, Edit, Award, Target, ChevronRight, ListChecks } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Question {
  id: string
  q: string
  options: string[]
  correct: number
  explain: string
  category: string
  difficulty: 'easy' | 'med' | 'hard'
}

interface Quiz {
  id: string
  name: string
  category: string
  questions: Question[]
}

const STORAGE_KEY = 'versa:quiz-v1'

function load(): Quiz[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Quiz[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Quiz[] {
  return [
    {
      id: 'q1', name: '世界地理常识', category: '地理',
      questions: [
        { id: uid(), q: '世界上最长的河流是?', options: ['尼罗河', '亚马逊河', '长江', '密西西比河'], correct: 1, explain: '尼罗河长 6650 公里, 是公认最长的河流 (亚马逊河有争议)', category: '地理', difficulty: 'med' },
        { id: uid(), q: '哪个国家的面积最大?', options: ['中国', '美国', '加拿大', '俄罗斯'], correct: 3, explain: '俄罗斯 1709 万平方公里', category: '地理', difficulty: 'easy' },
        { id: uid(), q: '撒哈拉沙漠位于哪个洲?', options: ['亚洲', '非洲', '美洲', '大洋洲'], correct: 1, explain: '撒哈拉沙漠在北非', category: '地理', difficulty: 'easy' },
      ],
    },
  ]
}

export function QuizBuilder() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(load())
  const [activeId, setActiveId] = useState<string | null>(quizzes[0]?.id || null)
  const [mode, setMode] = useState<'browse' | 'play'>('browse')
  const [playIdx, setPlayIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplain, setShowExplain] = useState(false)
  const [score, setScore] = useState(0)
  const [shuffled, setShuffled] = useState<Question[]>([])
  const [adding, setAdding] = useState(false)
  const [addingQuiz, setAddingQuiz] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [qText, setQText] = useState('')
  const [opt0, setOpt0] = useState('')
  const [opt1, setOpt1] = useState('')
  const [opt2, setOpt2] = useState('')
  const [opt3, setOpt3] = useState('')
  const [correct, setCorrect] = useState(0)
  const [explain, setExplain] = useState('')
  const [quizName, setQuizName] = useState('')
  const [quizCategory, setQuizCategory] = useState('常识')

  useEffect(() => { save(quizzes) }, [quizzes])

  const active = quizzes.find((q) => q.id === activeId)
  const totalQuizzes = quizzes.length
  const totalQuestions = quizzes.reduce((s, q) => s + q.questions.length, 0)
  const avgQuestions = totalQuizzes > 0 ? (totalQuestions / totalQuizzes).toFixed(1) : '0'

  const startPlay = () => {
    if (!active || active.questions.length === 0) { toast('请先添加题目', 'info'); return }
    const shuf = [...active.questions].sort(() => Math.random() - 0.5)
    setShuffled(shuf); setPlayIdx(0); setSelected(null); setShowExplain(false); setScore(0); setMode('play')
  }

  const answer = (idx: number) => {
    if (showExplain) return
    setSelected(idx)
    setShowExplain(true)
    if (idx === shuffled[playIdx].correct) setScore(score + 1)
  }

  const next = () => {
    if (playIdx + 1 < shuffled.length) {
      setPlayIdx(playIdx + 1); setSelected(null); setShowExplain(false)
    } else {
      setMode('browse')
      toast(`🎉 完成!得分 ${score}/${shuffled.length}`, 'success')
    }
  }

  const addQuiz = () => {
    if (!quizName.trim()) { toast('请输入', 'error'); return }
    const q: Quiz = { id: uid(), name: quizName, category: quizCategory, questions: [] }
    setQuizzes([q, ...quizzes])
    setActiveId(q.id)
    setAddingQuiz(false)
    setQuizName('')
    toast('已创建', 'success')
  }

  const removeQuiz = (id: string) => {
    setQuizzes(quizzes.filter((q) => q.id !== id))
    if (activeId === id) setActiveId(quizzes[0]?.id || null)
  }

  const addQuestion = () => {
    if (!active || !qText.trim() || !opt0 || !opt1) { toast('请填写完整', 'error'); return }
    const question: Question = { id: uid(), q: qText, options: [opt0, opt1, opt2, opt3].filter(Boolean), correct, explain, category: active.category, difficulty: 'med' }
    setQuizzes(quizzes.map((q) => q.id === active.id ? { ...q, questions: [question, ...q.questions] } : q))
    setQText(''); setOpt0(''); setOpt1(''); setOpt2(''); setOpt3(''); setCorrect(0); setExplain('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const removeQuestion = (qid: string) => {
    if (!active) return
    setQuizzes(quizzes.map((q) => q.id === active.id ? { ...q, questions: q.questions.filter((x) => x.id !== qid) } : q))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`生成 3 道 " ${activeQuiz?.category || '常识'} " 测验题, 格式: "问题 | A选项 | B选项 | C选项 | D选项 | 正确答案索引(0-3) | 解析" 每行 1 题, 不要编号`, '你是 Versa 测验出题专家, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const activeQuiz = active

  if (mode === 'play' && shuffled.length > 0) {
    const q = shuffled[playIdx]
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5" />
            <h2 className="text-lg font-bold">{active?.name}</h2>
          </div>
          <p className="text-xs opacity-90 mb-2">单选答题 · 即时反馈</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{playIdx + 1}/{shuffled.length}</p>
              <p className="text-[9px] opacity-80">题号</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{score}</p>
              <p className="text-[9px] opacity-80">得分</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{Math.round((score / Math.max(1, playIdx + (showExplain ? 1 : 0))) * 100)}%</p>
              <p className="text-[9px] opacity-80">正确率</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-sm font-bold mb-2">{q.q}</p>
          <div className="space-y-1.5">
            {q.options.map((o, i) => {
              const isCorrect = i === q.correct
              const isSelected = i === selected
              const showResult = showExplain
              return (
                <button key={i} onClick={() => answer(i)} disabled={showExplain} className={cn('w-full px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center gap-2 transition-all', !showResult && 'bg-ink-50 dark:bg-ink-800/50 hover:bg-pink-50 dark:hover:bg-pink-900/30', showResult && isCorrect && 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-400', showResult && isSelected && !isCorrect && 'bg-rose-100 dark:bg-rose-900/30 border border-rose-400', showResult && !isCorrect && !isSelected && 'opacity-50')}>
                  <span className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{o}</span>
                  {showResult && isCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                  {showResult && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-500" />}
                </button>
              )
            })}
          </div>
          {showExplain && q.explain && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/40">
              <p className="text-[10px] leading-relaxed">💡 {q.explain}</p>
            </div>
          )}
        </div>

        {showExplain && (
          <button onClick={next} className="w-full h-10 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold">
            {playIdx + 1 < shuffled.length ? '下一题 →' : '完成 ✓'}
          </button>
        )}
        <button onClick={() => setMode('browse')} className="w-full h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">退出</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5" />
          <h2 className="text-lg font-bold">测验题库</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">自定义题库 · 单选答题 · AI 出题</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalQuizzes}</p>
            <p className="text-[9px] opacity-80">题库</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalQuestions}</p>
            <p className="text-[9px] opacity-80">题目</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgQuestions}</p>
            <p className="text-[9px] opacity-80">均题数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{active?.questions.length || 0}</p>
            <p className="text-[9px] opacity-80">当前</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAddingQuiz(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新题库
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
        <button onClick={startPlay} className="px-3 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center gap-1">
          <Award className="w-3.5 h-3.5" />开始
        </button>
      </div>

      {aiTip && (
        <div className="bg-pink-50/40 dark:bg-pink-900/20 rounded-xl p-2 border border-pink-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {quizzes.map((q) => (
          <button key={q.id} onClick={() => setActiveId(q.id)} className={cn('flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold', activeId === q.id ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {q.name} ({q.questions.length})
          </button>
        ))}
      </div>

      {active ? (
        <div className="space-y-2">
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{active.name}</p>
                <p className="text-[10px] text-ink-500">{active.category} · {active.questions.length} 题</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setAdding(true)} className="px-2 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold">+题</button>
                <button onClick={() => removeQuiz(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </div>
          </div>

          {active.questions.length === 0 ? (
            <p className="text-center text-xs text-ink-500 py-3">还没有题目</p>
          ) : (
            <div className="space-y-1.5">
              {active.questions.map((q, i) => (
                <div key={q.id} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{q.q}</p>
                      <p className="text-[10px] text-ink-500 mt-0.5">答案: {String.fromCharCode(65 + q.correct)} · {q.options[q.correct]}</p>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有题库</p>
        </div>
      )}

      {addingQuiz && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingQuiz(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新建题库</h3>
            <input value={quizName} onChange={(e) => setQuizName(e.target.value)} placeholder="题库名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={quizCategory} onChange={(e) => setQuizCategory(e.target.value)} placeholder="分类" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addQuiz} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加题目</h3>
            <textarea value={qText} onChange={(e) => setQText(e.target.value)} placeholder="问题" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[60px]" />
            {([0, 1, 2, 3] as const).map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <button onClick={() => setCorrect(i)} className={cn('w-7 h-7 rounded-full text-xs font-bold flex-shrink-0', correct === i ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{String.fromCharCode(65 + i)}</button>
                <input value={[opt0, opt1, opt2, opt3][i]} onChange={(e) => {
                  if (i === 0) setOpt0(e.target.value)
                  if (i === 1) setOpt1(e.target.value)
                  if (i === 2) setOpt2(e.target.value)
                  if (i === 3) setOpt3(e.target.value)
                }} placeholder={`选项 ${String.fromCharCode(65 + i)}`} className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            ))}
            <input value={explain} onChange={(e) => setExplain(e.target.value)} placeholder="解析 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addQuestion} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
