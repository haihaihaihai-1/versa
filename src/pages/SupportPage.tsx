import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search, MessageCircle, Phone, Mail, ChevronRight, ChevronDown, ThumbsUp,
  Sparkles, Send, Ticket, X, Bot, Headphones, ArrowLeft, Package, Truck,
  CreditCard, RotateCcw, Crown, ShieldCheck, ShoppingBag, Clock, CheckCircle2
} from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import { FAQ_CATEGORIES, seedFAQs } from '../data/support'
import { formatTimeAgo } from '../lib/utils'

const ICONS: Record<string, any> = {
  Package, Truck, CreditCard, RotateCcw, Crown, Ticket, ShieldCheck, ShoppingBag,
}

type View = 'home' | 'faq' | 'chat' | 'tickets' | 'ticket_detail'

export default function SupportPage() {
  const [view, setView] = useState<View>('home')
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)

  const filteredFAQs = useMemo(() => {
    let list = seedFAQs
    if (selectedCat !== 'all') list = list.filter((f) => f.category === selectedCat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    }
    return list
  }, [query, selectedCat])

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 via-white to-blue-50/30 pb-20">
      {view === 'home' && (
        <SupportHome onNavigate={setView} />
      )}
      {view === 'faq' && (
        <FAQView
          query={query}
          setQuery={setQuery}
          selectedCat={selectedCat}
          setSelectedCat={setSelectedCat}
          openFAQ={openFAQ}
          setOpenFAQ={setOpenFAQ}
          faqs={filteredFAQs}
          onBack={() => setView('home')}
        />
      )}
      {view === 'chat' && <ChatView onBack={() => setView('home')} />}
      {view === 'tickets' && (
        <TicketsView
          onOpen={(id) => { setActiveTicketId(id); setView('ticket_detail') }}
          onBack={() => setView('home')}
        />
      )}
      {view === 'ticket_detail' && activeTicketId && (
        <TicketDetailView ticketId={activeTicketId} onBack={() => setView('tickets')} />
      )}
    </div>
  )
}

/* ==================== 主页 ==================== */
function SupportHome({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { supportTickets } = useVersa()
  const openCount = supportTickets.filter((t) => t.status === 'open' || t.status === 'waiting').length

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-xl shadow-cyan-500/30 mb-3">
          <Headphones className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-ink-900">Versa 客服中心</h1>
        <p className="text-sm text-ink-500 mt-1">7×24 小时为您服务</p>
      </div>

      {/* 服务状态 */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StatusCard label="在线客服" value="12 人" icon={MessageCircle} color="text-emerald-500" dot="bg-emerald-500" />
        <StatusCard label="平均响应" value="< 30s" icon={Clock} color="text-cyan-500" />
        <StatusCard label="满意度" value="98%" icon={ThumbsUp} color="text-rose-500" />
      </div>

      {/* 4 大入口 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <EntryCard
          icon={Bot}
          label="智能助手"
          sub="秒回 · 7×24"
          gradient="from-cyan-500 to-blue-500"
          onClick={() => onNavigate('chat')}
        />
        <EntryCard
          icon={Headphones}
          label="在线客服"
          sub="排队 3 人"
          gradient="from-emerald-500 to-teal-500"
          onClick={() => onNavigate('chat')}
        />
        <EntryCard
          icon={Sparkles}
          label="常见问题"
          sub="30+ 解答"
          gradient="from-amber-500 to-orange-500"
          onClick={() => onNavigate('faq')}
        />
        <EntryCard
          icon={Ticket}
          label="我的工单"
          sub={openCount > 0 ? `${openCount} 个进行中` : '无进行中'}
          gradient="from-rose-500 to-pink-500"
          onClick={() => onNavigate('tickets')}
        />
      </div>

      {/* 联系方式 */}
      <div className="bg-white rounded-2xl p-4 border border-ink-100 mb-4">
        <h3 className="text-sm font-semibold text-ink-700 mb-3">其他联系方式</h3>
        <div className="space-y-3">
          <ContactRow icon={Phone} label="400 客服热线" value="400-888-1688" sub="9:00 - 22:00" />
          <ContactRow icon={MessageCircle} label="微信客服" value="Versa 服务" sub="扫码添加" />
          <ContactRow icon={Mail} label="邮箱反馈" value="support@versa.com" sub="24h 内回复" />
        </div>
      </div>

      {/* 类目快捷 */}
      <div className="bg-white rounded-2xl p-4 border border-ink-100">
        <h3 className="text-sm font-semibold text-ink-700 mb-3">问题分类</h3>
        <div className="grid grid-cols-4 gap-3">
          {FAQ_CATEGORIES.map((c) => {
            const Icon = ICONS[c.icon] || Sparkles
            const count = seedFAQs.filter((f: typeof seedFAQs[number]) => f.category === c.key).length
            return (
              <button
                key={c.key}
                onClick={() => { onNavigate('faq') }}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-ink-700">{c.label}</span>
                <span className="text-[10px] text-ink-400">{count} 条</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatusCard({ label, value, icon: Icon, color, dot }: any) {
  return (
    <div className="bg-white rounded-xl p-3 border border-ink-100">
      <div className="flex items-center gap-1.5 mb-1">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />}
        <span className="text-[10px] text-ink-500">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}

function EntryCard({ icon: Icon, label, sub, gradient, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5`}
    >
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="relative flex flex-col items-start">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-2">
          <Icon className="w-5 h-5" />
        </div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs opacity-80 mt-0.5">{sub}</p>
      </div>
    </button>
  )
}

function ContactRow({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-ink-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-ink-700">{label}</p>
        <p className="text-xs text-ink-500">{value} · {sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-400" />
    </div>
  )
}

/* ==================== FAQ ==================== */
function FAQView({ query, setQuery, selectedCat, setSelectedCat, openFAQ, setOpenFAQ, faqs, onBack }: any) {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-ink-200 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold">常见问题</h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索问题或关键词..."
          className="w-full pl-10 pr-3 py-2.5 bg-white border border-ink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-3 mb-3 scrollbar-none">
        <button
          onClick={() => setSelectedCat('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
            selectedCat === 'all' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-ink-200'
          }`}
        >全部</button>
        {FAQ_CATEGORIES.map((c) => {
          const Icon = ICONS[c.icon] || Sparkles
          return (
            <button
              key={c.key}
              onClick={() => setSelectedCat(c.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCat === c.key ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-ink-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{c.label}
            </button>
          )
        })}
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-20 text-ink-400 text-sm">未找到相关问题</div>
      ) : (
        <div className="space-y-2">
          {faqs.map((f: typeof seedFAQs[number]) => (
            <FAQItem
              key={f.id}
              faq={f}
              open={openFAQ === f.id}
              onToggle={() => setOpenFAQ(openFAQ === f.id ? null : f.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FAQItem({ faq, open, onToggle }: any) {
  const { faqHelpful } = useVersa()
  const helpfulCount = faqHelpful[faq.id] || faq.helpful
  return (
    <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-ink-50/50 transition"
      >
        <span className="text-sm font-medium text-ink-800 flex-1 pr-2">{faq.question}</span>
        <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-ink-100">
          <p className="text-sm text-ink-600 leading-relaxed">{faq.answer}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-ink-400">
            <span>{helpfulCount} 人觉得有帮助</span>
            <button
              onClick={(e) => { e.stopPropagation(); versa.markFAQHelpful(faq.id) }}
              className="flex items-center gap-0.5 hover:text-cyan-500"
            >
              <ThumbsUp className="w-3 h-3" />有用
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==================== Chat ==================== */
function ChatView({ onBack }: { onBack: () => void }) {
  const { chatMessages } = useVersa()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const quickReplies = ['查订单', '快递到哪了', '申请退款', '怎么用券', '会员积分', '联系人工']

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMessages.length])

  const send = (content: string) => {
    if (!content.trim()) return
    versa.sendChatMessage(content.trim())
    setText('')
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-cyan-50/40 to-white flex flex-col">
      <div className="px-4 py-3 bg-white border-b border-ink-100 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">智能助手小 V</p>
            <p className="text-[10px] text-ink-500">在线 · 通常 30s 内回复</p>
          </div>
        </div>
        <button onClick={() => versa.clearChat()} className="text-xs text-ink-500 hover:text-ink-700">清空</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chatMessages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {quickReplies.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="px-3 py-1.5 rounded-full text-xs bg-white border border-cyan-200 text-cyan-700 whitespace-nowrap hover:bg-cyan-50"
          >{q}</button>
        ))}
      </div>

      <div className="p-3 bg-white border-t border-ink-100 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
          placeholder="输入您的问题..."
          className="flex-1 px-3 py-2.5 bg-ink-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <button
          onClick={() => send(text)}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: any }) {
  if (message.role === 'system') {
    return (
      <div className="text-center text-[11px] text-ink-400 my-2">
        <span className="px-3 py-1 rounded-full bg-ink-100">{message.content}</span>
      </div>
    )
  }
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-gradient-to-br from-rose-400 to-pink-500' : 'bg-gradient-to-br from-cyan-400 to-blue-500'
      }`}>
        {isUser ? <span className="text-white text-xs">我</span> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
        isUser ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-tr-sm' : 'bg-white border border-ink-100 text-ink-800 rounded-tl-sm'
      }`}>
        {message.content}
      </div>
    </div>
  )
}

/* ==================== Tickets ==================== */
function TicketsView({ onOpen, onBack }: { onOpen: (id: string) => void; onBack: () => void }) {
  const { supportTickets } = useVersa()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('order')

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-ink-200 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold flex-1">我的工单</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-medium"
        >+ 新建</button>
      </div>

      {supportTickets.length === 0 ? (
        <div className="text-center py-20 text-ink-400 text-sm">暂无工单</div>
      ) : (
        <div className="space-y-2">
          {supportTickets.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              className="w-full text-left p-4 bg-white border border-ink-100 rounded-xl hover:border-cyan-300 transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-ink-800 truncate flex-1">{t.title}</p>
                <TicketStatusBadge status={t.status} />
              </div>
              <p className="text-xs text-ink-500 line-clamp-1 mb-1.5">{t.lastMessage}</p>
              <div className="flex items-center justify-between text-[10px] text-ink-400">
                <span>#{t.id}</span>
                <span>{formatTimeAgo(t.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setCreating(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full bg-white rounded-t-2xl p-4">
            <h3 className="text-base font-semibold mb-3">新建工单</h3>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm mb-3"
            >
              {FAQ_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请描述您的问题..."
              rows={3}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 py-2.5 border border-ink-200 rounded-xl text-sm">取消</button>
              <button
                onClick={() => {
                  if (!title.trim()) return
                  versa.createTicket(title.trim(), cat)
                  setTitle('')
                  setCreating(false)
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-sm font-medium"
              >提交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TicketStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: '待接入', color: 'text-amber-700', bg: 'bg-amber-100' },
    waiting: { label: '处理中', color: 'text-cyan-700', bg: 'bg-cyan-100' },
    resolved: { label: '已解决', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    closed: { label: '已关闭', color: 'text-ink-500', bg: 'bg-ink-100' },
  }
  const c = config[status] || config.open
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.bg} ${c.color} font-medium`}>{c.label}</span>
}

function TicketDetailView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { supportTickets } = useVersa()
  const ticket = supportTickets.find((t) => t.id === ticketId)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [ticket?.messages.length])

  if (!ticket) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-cyan-50/40 to-white flex flex-col">
      <div className="px-4 py-3 bg-white border-b border-ink-100 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{ticket.title}</p>
          <div className="flex items-center gap-2 text-[10px] text-ink-500">
            <TicketStatusBadge status={ticket.status} />
            <span>#{ticket.id}</span>
          </div>
        </div>
        {ticket.status !== 'closed' && (
          <button onClick={() => versa.closeTicket(ticket.id)} className="text-xs text-ink-500">关闭</button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {ticket.messages.map((m) => <ChatBubble key={m.id} message={m} />)}
      </div>

      {ticket.status !== 'closed' && (
        <div className="p-3 bg-white border-t border-ink-100 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                versa.replyTicket(ticket.id, text.trim())
                setText('')
              }
            }}
            placeholder="输入回复..."
            className="flex-1 px-3 py-2.5 bg-ink-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
          />
          <button
            onClick={() => { if (text.trim()) { versa.replyTicket(ticket.id, text.trim()); setText('') } }}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
