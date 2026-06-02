import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { versa } from '../store/versa'
import { toast } from '../components/ui/Toaster'
import { Button } from '../components/ui/Button'
import { FAQ_CATEGORIES, seedFAQs } from '../data/support'
import { cn } from '../lib/utils'
import {
  Search, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Filter,
  Package, Truck, CreditCard, RotateCcw, Crown, Ticket, Shield,
  ShoppingBag, Sparkles, MessageCircle, Star, Send, X, Check, BookOpen
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  Package, Truck, CreditCard, RotateCcw, Crown, Ticket, Shield, ShoppingBag
}

const POPULAR_QUERIES = [
  '如何申请退款',
  '优惠券怎么用',
  '多久能收到货',
  '如何升级会员',
  '怎么修改地址',
  '商品是否正品',
]

export function HelpCenterPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({})
  const [showAsk, setShowAsk] = useState(false)
  const [askText, setAskText] = useState('')
  const [askedQuestions, setAskedQuestions] = useState<{ id: string; q: string; at: string }[]>([])

  const filtered = useMemo(() => {
    let list = seedFAQs
    if (cat !== 'all') list = list.filter((f) => f.category === cat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.helpful - a.helpful)
  }, [query, cat])

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((p) => ({ ...p, [id]: p[id] === type ? null : type }))
    if (type === 'up') {
      versa.markFAQHelpful(id)
      toast('感谢你的反馈 ✨', 'success')
    } else {
      toast('已记录，我们会持续优化', 'info')
    }
  }

  const submitQuestion = () => {
    if (askText.trim().length < 5) {
      toast('问题至少 5 个字', 'error')
      return
    }
    setAskedQuestions((p) => [
      { id: `q-${Date.now()}`, q: askText.trim(), at: new Date().toISOString() },
      ...p,
    ])
    setAskText('')
    setShowAsk(false)
    toast('问题已提交，预计 2 小时内回复', 'success')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        ← 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-nova-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs mb-3">
            <BookOpen className="w-3 h-3" />
            帮助中心 2.0
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Hi，这里能帮你解决大部分问题</h1>
          <p className="text-white/90 mb-5">
            {seedFAQs.length} 个常见问题 · 8 个分类 · 平均响应 &lt; 2 小时
          </p>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索问题，例如：退款、优惠券..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/95 text-ink-900 text-sm placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction
          icon={MessageCircle}
          label="在线客服"
          sub="7×24h"
          gradient="from-cyan-500 to-blue-500"
          onClick={() => navigate('/support')}
        />
        <QuickAction
          icon={Send}
          label="提交工单"
          sub="复杂问题"
          gradient="from-nova-500 to-purple-500"
          onClick={() => setShowAsk(true)}
        />
        <QuickAction
          icon={Phone}
          label="电话客服"
          sub="400-888-VERSA"
          gradient="from-amber-500 to-orange-500"
          onClick={() => toast('请拨打 400-888-VERSA', 'info')}
        />
        <QuickAction
          icon={MessageCircle}
          label="意见反馈"
          sub="产品建议"
          gradient="from-shop-500 to-news-500"
          onClick={() => setShowAsk(true)}
        />
      </div>

      {/* Popular queries */}
      {query === '' && (
        <div>
          <h3 className="text-sm font-semibold text-ink-500 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 大家都在搜
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="px-3 py-1.5 rounded-full text-sm bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-700 hover:border-nova-500 hover:text-nova-600 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-ink-500 mb-3 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> 问题分类
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          <button
            onClick={() => setCat('all')}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-xl transition',
              cat === 'all'
                ? 'bg-nova-500 text-white shadow'
                : 'bg-ink-50 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-100'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px]">全部</span>
          </button>
          {FAQ_CATEGORIES.map((c) => {
            const Icon = ICON_MAP[c.icon] || Package
            const count = seedFAQs.filter((f) => f.category === c.key).length
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition',
                  cat === c.key
                    ? `bg-gradient-to-br ${c.gradient} text-white shadow`
                    : 'bg-ink-50 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-100'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{c.label}</span>
                <span className="text-[9px] opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* FAQ list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-ink-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>未找到相关问题</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowAsk(true)}
            >
              提交新问题
            </Button>
          </div>
        ) : (
          filtered.map((f) => {
            const isOpen = openId === f.id
            const fb = feedback[f.id]
            return (
              <motion.div
                key={f.id}
                layout
                className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : f.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-ink-50/30 dark:hover:bg-ink-800/30 transition"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-500 flex-shrink-0 mt-0.5">
                      {FAQ_CATEGORIES.find((c) => c.key === f.category)?.label}
                    </span>
                    <span className="font-medium text-sm flex-1">{f.question}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-ink-400 hidden sm:flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {f.helpful}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-ink-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink-400" />
                    )}
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-ink-100 dark:border-ink-800">
                        <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                          {f.answer}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <span className="text-ink-500">这个回答有帮助吗？</span>
                          <button
                            onClick={() => handleFeedback(f.id, 'up')}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded transition',
                              fb === 'up'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                : 'text-ink-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            )}
                          >
                            <ThumbsUp className="w-3 h-3" /> 有用 ({f.helpful})
                          </button>
                          <button
                            onClick={() => handleFeedback(f.id, 'down')}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded transition',
                              fb === 'down'
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                                : 'text-ink-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            )}
                          >
                            <ThumbsDown className="w-3 h-3" /> 没用
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Asked questions (locally submitted) */}
      {askedQuestions.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30 p-5 border border-emerald-200/50 dark:border-emerald-800/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            我已提交的问题
          </h3>
          <div className="space-y-2">
            {askedQuestions.map((q) => (
              <div key={q.id} className="text-sm p-3 rounded-xl bg-white/60 dark:bg-ink-900/60">
                <p className="text-ink-700 dark:text-ink-200">{q.q}</p>
                <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                  <Star className="w-3 h-3" /> 处理中 · 预计 2 小时内回复
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ask modal */}
      <AnimatePresence>
        {showAsk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAsk(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-ink-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-nova-500 to-cyan-500 p-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">提交你的问题</h2>
                <button onClick={() => setShowAsk(false)} className="p-1 rounded hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <textarea
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  placeholder="详细描述你的问题或建议..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-ink-50 dark:bg-ink-800 text-sm border border-ink-200 dark:border-ink-700 focus:outline-none focus:border-nova-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAsk(false)}>
                    取消
                  </Button>
                  <Button onClick={submitQuestion}>
                    <Send className="w-4 h-4 mr-1.5" />
                    提交
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  sub,
  gradient,
  onClick,
}: {
  icon: any
  label: string
  sub: string
  gradient: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative overflow-hidden p-4 rounded-2xl text-white text-left shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition',
        `bg-gradient-to-br ${gradient}`
      )}
    >
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
      <Icon className="w-6 h-6 mb-1" />
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-80">{sub}</p>
    </button>
  )
}

function Phone(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
