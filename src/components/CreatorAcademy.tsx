import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Award, BookOpen, CheckCircle, Lock, Play, Sparkles, Trophy, Clock, ChevronRight, Star, Zap } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Course {
  id: string
  title: string
  desc: string
  level: '入门' | '进阶' | '高级'
  category: string
  duration: number
  lessons: number
  completed?: number
  cover: string
  instructor: string
  instructorAvatar: string
  reward: number
  tags: string[]
}

const COURSES: Course[] = [
  { id: 'c1', title: '新手主播 7 天速成', desc: '从设备到话术, 7 天开启直播生涯', level: '入门', category: '直播', duration: 120, lessons: 7, cover: 'https://picsum.photos/seed/c1/400/200', instructor: '资深主播 M', instructorAvatar: 'https://i.pravatar.cc/100?img=33', reward: 200, tags: ['直播', '新手指南'] },
  { id: 'c2', title: '短视频爆款公式', desc: '10 万 + 视频的共同点, 拆解 50 个爆款', level: '入门', category: '短视频', duration: 90, lessons: 6, cover: 'https://picsum.photos/seed/c2/400/200', instructor: '抖音大 V', instructorAvatar: 'https://i.pravatar.cc/100?img=44', reward: 180, tags: ['短视频', '爆款'] },
  { id: 'c3', title: '种草文案的 9 种套路', desc: '从标题到结尾, 写出让用户忍不住下单的文案', level: '进阶', category: '文案', duration: 75, lessons: 9, cover: 'https://picsum.photos/seed/c3/400/200', instructor: '文案鬼才 L', instructorAvatar: 'https://i.pravatar.cc/100?img=55', reward: 220, tags: ['文案', '种草'] },
  { id: 'c4', title: '数据驱动的内容优化', desc: '学会看数据, 让算法更懂你', level: '进阶', category: '运营', duration: 60, lessons: 5, cover: 'https://picsum.photos/seed/c4/400/200', instructor: '数据帝 K', instructorAvatar: 'https://i.pravatar.cc/100?img=66', reward: 250, tags: ['数据', '运营'] },
  { id: 'c5', title: '直播带货高阶话术', desc: '从开场到逼单, 完整直播话术体系', level: '高级', category: '直播', duration: 100, lessons: 8, cover: 'https://picsum.photos/seed/c5/400/200', instructor: '带货女王 A', instructorAvatar: 'https://i.pravatar.cc/100?img=77', reward: 300, tags: ['直播', '带货'] },
  { id: 'c6', title: '个人 IP 打造指南', desc: '从定位到变现, 构建可持续的 IP', level: '高级', category: 'IP', duration: 150, lessons: 10, cover: 'https://picsum.photos/seed/c6/400/200', instructor: 'IP 教父 B', instructorAvatar: 'https://i.pravatar.cc/100?img=88', reward: 400, tags: ['IP', '变现'] },
]

const STORAGE_KEY = 'versa:academy-progress'

function loadProgress(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveProgress(p: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

export function CreatorAcademy() {
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<'all' | '入门' | '进阶' | '高级'>('all')

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  const enroll = (c: Course) => {
    if (progress[c.id] !== undefined) { toast('已加入学习', 'error'); return }
    const next = { ...progress, [c.id]: 0 }
    setProgress(next)
    saveProgress(next)
    toast('已加入学习!', 'success')
  }

  const finish = (c: Course) => {
    if (progress[c.id] === c.lessons) return
    const next = { ...progress, [c.id]: c.lessons }
    setProgress(next)
    saveProgress(next)
    toast(`+${c.reward} 经验值!`, 'success')
  }

  const filtered = filter === 'all' ? COURSES : COURSES.filter((c) => c.level === filter)
  const enrolled = COURSES.filter((c) => progress[c.id] !== undefined).length
  const totalReward = COURSES.filter((c) => progress[c.id] === c.lessons).reduce((s, c) => s + c.reward, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">创作者学院</h2>
        </div>
        <p className="text-xs opacity-90 mb-3">从入门到精通, 系统化提升你的创作能力</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">{enrolled}</p>
            <p className="text-[10px] opacity-80">已学课程</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">{Object.values(progress).filter((p) => p === COURSES.find((c) => c.id === Object.keys(progress).find((k) => progress[k] === p))?.lessons).length}</p>
            <p className="text-[10px] opacity-80">已完成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">+{totalReward}</p>
            <p className="text-[10px] opacity-80">获得经验</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {['all', '入门', '进阶', '高级'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={cn('px-3 h-7 rounded-full text-xs font-medium flex-shrink-0', filter === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {f === 'all' ? '全部' : f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((c) => {
          const p = progress[c.id] ?? -1
          const isEnrolled = p >= 0
          const isCompleted = p === c.lessons
          const percent = p >= 0 ? (p / c.lessons) * 100 : 0
          return (
            <motion.div
              key={c.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-ink-900/30 rounded-2xl overflow-hidden border border-ink-200/60 dark:border-ink-800/60"
            >
              <div className="flex gap-3 p-3">
                <img src={c.cover} alt={c.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start gap-1">
                    <h3 className="text-sm font-bold flex-1 line-clamp-1">{c.title}</h3>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0',
                      c.level === '入门' ? 'bg-emerald-500 text-white' :
                      c.level === '进阶' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                    )}>{c.level}</span>
                  </div>
                  <p className="text-[10px] text-ink-500 line-clamp-1">{c.desc}</p>
                  <div className="flex items-center gap-2 text-[10px] text-ink-500">
                    <span><Clock className="inline w-2.5 h-2.5 mr-0.5" />{c.duration} 分钟</span>
                    <span>·</span>
                    <span>{c.lessons} 课时</span>
                    <span>·</span>
                    <span className="text-amber-500 font-bold">+{c.reward} 经验</span>
                  </div>
                  {isEnrolled && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold whitespace-nowrap">{p}/{c.lessons}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="text-[10px] text-emerald-500 flex items-center gap-0.5 font-semibold">
                        <CheckCircle className="w-3 h-3" />已完成
                      </span>
                    ) : isEnrolled ? (
                      <button onClick={() => finish(c)} className="flex-1 h-7 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                        <Play className="w-3 h-3" />完成 {c.lessons}/{p} 节
                      </button>
                    ) : (
                      <button onClick={() => enroll(c)} className="flex-1 h-7 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" />加入学习
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
