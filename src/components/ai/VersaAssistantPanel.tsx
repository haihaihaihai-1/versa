/**
 * Versa · AI 助手面板 (v11.0)
 * 集成 5 大 AI 功能：导购 / 辩论 / 摘要 / 写作 / 推荐
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, ShoppingBag, MessageSquareQuote, Newspaper, PenLine, Heart, Loader2, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ai, type ChatMessage, getCostStats } from '../../ai/provider'
import { shopper, coach, brief, writer, recommend, type ShopResult, type CoachResult, type BriefResult, type WriteResult, type RecommendResult, type WriteType } from '../../ai/features'
import { cn } from '../../lib/utils'

type Tab = 'chat' | 'shopper' | 'coach' | 'brief' | 'writer' | 'recommend'

export function VersaAssistantPanel({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('chat')
  const [cost, setCost] = useState(getCostStats())

  useEffect(() => {
    const id = setInterval(() => setCost(getCostStats()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h2 className="font-semibold">Versa AI</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Coins className="w-3.5 h-3.5" />
          <span>{cost.calls} calls · {cost.tokens.toLocaleString()} tokens</span>
        </div>
      </div>

      <div className="flex gap-1 p-2 border-b border-ink-200 dark:border-ink-800 overflow-x-auto">
        <TabBtn icon={<Sparkles className="w-4 h-4" />} active={tab === 'chat'} onClick={() => setTab('chat')}>对话</TabBtn>
        <TabBtn icon={<ShoppingBag className="w-4 h-4" />} active={tab === 'shopper'} onClick={() => setTab('shopper')}>导购</TabBtn>
        <TabBtn icon={<MessageSquareQuote className="w-4 h-4" />} active={tab === 'coach'} onClick={() => setTab('coach')}>辩论</TabBtn>
        <TabBtn icon={<Newspaper className="w-4 h-4" />} active={tab === 'brief'} onClick={() => setTab('brief')}>摘要</TabBtn>
        <TabBtn icon={<PenLine className="w-4 h-4" />} active={tab === 'writer'} onClick={() => setTab('writer')}>写作</TabBtn>
        <TabBtn icon={<Heart className="w-4 h-4" />} active={tab === 'recommend'} onClick={() => setTab('recommend')}>推荐</TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'chat' && <ChatTab />}
            {tab === 'shopper' && <ShopperTab />}
            {tab === 'coach' && <CoachTab />}
            {tab === 'brief' && <BriefTab />}
            {tab === 'writer' && <WriterTab />}
            {tab === 'recommend' && <RecommendTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function TabBtn({ icon, children, active, onClick }: { icon: React.ReactNode; children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition',
        active
          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
          : 'hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-400'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: '你是 Versa 助手' },
    { role: 'assistant', content: '你好！我是 Versa 助手,有什么可以帮你的吗？🛍️ AI 导购 · ⚖️ 辩论陪练 · 📰 资讯摘要 · ✍️ AI 写作' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const newMsgs: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMsgs)
    setInput('')
    setBusy(true)
    try {
      const r = await ai.complete(newMsgs)
      setMessages((m) => [...m, { role: 'assistant', content: r.text }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: '请求失败,请稍后重试。' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div ref={scroller} className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.filter((m) => m.role !== 'system').map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[80%] px-3 py-2 rounded-2xl text-sm',
              m.role === 'user'
                ? 'bg-violet-500 text-white'
                : 'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100'
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="w-4 h-4 animate-spin" /> 思考中…
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="说点什么…"
          className="flex-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
          disabled={busy}
        />
        <button onClick={send} disabled={busy} className="px-3 py-2 rounded-xl bg-violet-500 text-white disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ShopperTab() {
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ShopResult | null>(null)

  const run = async () => {
    if (!query.trim() || busy) return
    setBusy(true)
    try {
      setResult(await shopper({ query, budget: budget ? Number(budget) : undefined }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-ink-500">想买什么？</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：500 元以内,送女朋友的生日礼物,要好看又实用"
          rows={3}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm resize-none"
        />
      </div>
      <div>
        <label className="text-xs text-ink-500">预算 (元,可选)</label>
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
          placeholder="500"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <button onClick={run} disabled={busy || !query.trim()} className="w-full py-2 rounded-xl bg-violet-500 text-white disabled:opacity-50 text-sm font-medium">
        {busy ? 'AI 思考中…' : '🔍 智能推荐'}
      </button>
      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-700 dark:text-ink-300">{result.intro}</p>
          {result.recommendations.length > 0 && (
            <div className="space-y-2">
              {result.recommendations.map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">推荐 #{i + 1}</span>
                    <span className="text-xs text-violet-500">{r.score} 分</span>
                  </div>
                  <p className="text-sm mt-1">{r.reason}</p>
                </div>
              ))}
            </div>
          )}
          {result.tips.length > 0 && (
            <div>
              <p className="text-xs text-ink-500 mb-1">购物建议：</p>
              <ul className="text-sm space-y-1 list-disc list-inside text-ink-700 dark:text-ink-300">
                {result.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CoachTab() {
  const [topic, setTopic] = useState('')
  const [side, setSide] = useState<'pro' | 'con'>('pro')
  const [argument, setArgument] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CoachResult | null>(null)

  const run = async () => {
    if (!topic.trim() || !argument.trim() || busy) return
    setBusy(true)
    try {
      setResult(await coach({ topic, userSide: side, userArgument: argument, difficulty }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-ink-500">辩题</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="AI 是否会取代人类工作"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setSide('pro')} className={cn('py-2 rounded-xl text-sm font-medium transition', side === 'pro' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>正方</button>
        <button onClick={() => setSide('con')} className={cn('py-2 rounded-xl text-sm font-medium transition', side === 'con' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>反方</button>
      </div>
      <div>
        <label className="text-xs text-ink-500">你的论点</label>
        <textarea
          value={argument}
          onChange={(e) => setArgument(e.target.value)}
          placeholder="我认为 AI 会取代大部分重复性工作..."
          rows={4}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm resize-none"
        />
      </div>
      <div className="flex gap-1">
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={cn('flex-1 py-1.5 rounded-lg text-xs', difficulty === d ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {d === 'easy' ? '入门' : d === 'medium' ? '中等' : '高阶'}
          </button>
        ))}
      </div>
      <button onClick={run} disabled={busy || !topic.trim() || !argument.trim()} className="w-full py-2 rounded-xl bg-violet-500 text-white disabled:opacity-50 text-sm font-medium">
        {busy ? 'AI 反驳中…' : '⚔️ 开始陪练'}
      </button>
      {result && (
        <div className="mt-4 space-y-3">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <p className="text-xs text-rose-600 mb-1">AI 反驳：</p>
            <p className="text-sm">{result.counterArgument}</p>
          </div>
          {result.weakPoints.length > 0 && (
            <div>
              <p className="text-xs text-ink-500 mb-1">薄弱点：</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.weakPoints.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          {result.strongPoints.length > 0 && (
            <div>
              <p className="text-xs text-ink-500 mb-1">亮点：</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.strongPoints.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20">
            <span className="text-sm">论证质量分</span>
            <span className="text-2xl font-bold text-violet-600">{result.score}</span>
          </div>
          {result.suggestions.length > 0 && (
            <div>
              <p className="text-xs text-ink-500 mb-1">改进建议：</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BriefTab() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<BriefResult | null>(null)

  const run = async () => {
    if (!content.trim() || busy) return
    setBusy(true)
    try {
      setResult(await brief({ title: title || '无标题', content }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-ink-500">标题</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-ink-500">正文</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="粘贴文章正文..."
          rows={6}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm resize-none"
        />
      </div>
      <button onClick={run} disabled={busy || !content.trim()} className="w-full py-2 rounded-xl bg-violet-500 text-white disabled:opacity-50 text-sm font-medium">
        {busy ? '摘要生成中…' : '✨ 生成摘要'}
      </button>
      {result && (
        <div className="mt-4 space-y-3">
          {result.summary.length > 0 && (
            <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
              <p className="text-xs text-ink-500 mb-1">3 行摘要：</p>
              {result.summary.map((s, i) => <p key={i} className="text-sm">• {s}</p>)}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-500">情感：</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              result.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-600' :
              result.sentiment === 'negative' ? 'bg-rose-100 text-rose-600' :
              'bg-ink-100 text-ink-600'
            )}>
              {result.sentiment === 'positive' ? '正面' : result.sentiment === 'negative' ? '负面' : '中性'}
            </span>
          </div>
          {result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.tags.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WriterTab() {
  const [type, setType] = useState<WriteType>('post')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<'casual' | 'professional' | 'funny' | 'serious'>('casual')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<WriteResult | null>(null)

  const run = async () => {
    if (!topic.trim() || busy) return
    setBusy(true)
    try {
      setResult(await writer({ type, topic, tone }))
    } finally {
      setBusy(false)
    }
  }

  const types: { value: WriteType; label: string }[] = [
    { value: 'post', label: '帖子' },
    { value: 'comment', label: '评论' },
    { value: 'product_description', label: '商品描述' },
    { value: 'debate_argument', label: '辩论论点' },
    { value: 'bio', label: '个人简介' },
  ]

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-ink-500">类型</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn('px-2.5 py-1 rounded-lg text-xs', type === t.value ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-ink-500">主题</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="要写的主题..."
          className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-ink-500">语气</label>
        <div className="flex gap-1 mt-1">
          {(['casual', 'professional', 'funny', 'serious'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs', tone === t ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
            >
              {t === 'casual' ? '轻松' : t === 'professional' ? '专业' : t === 'funny' ? '幽默' : '严肃'}
            </button>
          ))}
        </div>
      </div>
      <button onClick={run} disabled={busy || !topic.trim()} className="w-full py-2 rounded-xl bg-violet-500 text-white disabled:opacity-50 text-sm font-medium">
        {busy ? 'AI 创作中…' : '✍️ 开始创作'}
      </button>
      {result && (
        <div className="mt-4 space-y-3">
          <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
            <p className="text-xs text-ink-500 mb-1">主版本：</p>
            <p className="text-sm whitespace-pre-wrap">{result.content}</p>
          </div>
          {result.alternatives.length > 0 && (
            <div>
              <p className="text-xs text-ink-500 mb-1">备选版本：</p>
              {result.alternatives.map((alt, i) => (
                <p key={i} className="text-sm p-2 mt-1 rounded-lg bg-ink-100 dark:bg-ink-800">{alt}</p>
              ))}
            </div>
          )}
          {result.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.hashtags.map((h, i) => <span key={i} className="text-xs text-violet-500">{h}</span>)}
            </div>
          )}
          <div className="text-xs text-ink-500">预估互动量: {result.estimatedEngagement}/100</div>
        </div>
      )}
    </div>
  )
}

function RecommendTab() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RecommendResult | null>(null)

  const run = async (input: any) => {
    setBusy(true)
    try {
      const allProducts = [
        { id: 'p1', category: 'tech', rating: 4.8 },
        { id: 'p2', category: 'tech', rating: 4.0 },
        { id: 'p3', category: 'fashion', rating: 4.5 },
        { id: 'p4', category: 'home', rating: 4.7 },
        { id: 'p5', category: 'books', rating: 4.9 },
        { id: 'p6', category: 'sports', rating: 4.3 },
      ]
      setResult(await recommend(input, allProducts))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-600 dark:text-ink-400">基于浏览/收藏/分类加权 + 评分,本地算法即时推荐。</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => run({ userId: 'demo', recentViews: ['p1', 'p2'], favorites: ['p3'], purchases: [], followedCategories: ['tech'] })} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 hover:bg-ink-100 dark:hover:bg-ink-800 text-left text-xs">
          <p className="font-medium mb-1">📱 科技爱好者</p>
          <p className="text-ink-500">浏览 p1/p2, 收藏 p3, 关注 tech</p>
        </button>
        <button onClick={() => run({ userId: 'demo', recentViews: ['p4'], favorites: ['p4'], purchases: ['p4'], followedCategories: ['home', 'books'] })} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 hover:bg-ink-100 dark:hover:bg-ink-800 text-left text-xs">
          <p className="font-medium mb-1">🏠 家居控</p>
          <p className="text-ink-500">购买 p4, 关注 home/books</p>
        </button>
      </div>
      {busy && <p className="text-sm text-center text-ink-500">计算中…</p>}
      {result && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-ink-500">{result.explanation}</p>
          {result.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">
              <div>
                <span className="text-sm font-medium">{it.productId}</span>
                <span className="text-xs text-ink-500 ml-2">{it.reason}</span>
              </div>
              <span className="text-sm font-bold text-violet-500">{it.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
