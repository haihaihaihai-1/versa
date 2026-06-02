import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Truck, Package, CheckCircle2, Ticket, Zap, TrendingDown, Crown, MessageCircle,
  Heart, Video, Megaphone, Shield, Trophy, Pin, Trash2, Check, CheckCheck,
  Bell, ArrowLeft, ChevronRight, Settings
} from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import { formatTimeAgo } from '../lib/utils'

const CATEGORY_META: Record<string, { label: string; gradient: string; bg: string }> = {
  shipping: { label: '物流通知', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
  promo: { label: '优惠活动', gradient: 'from-rose-400 to-pink-500', bg: 'bg-rose-50' },
  interact: { label: '互动消息', gradient: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-50' },
  system: { label: '系统通知', gradient: 'from-violet-400 to-fuchsia-500', bg: 'bg-violet-50' },
}

const ICONS: Record<string, any> = {
  Truck, Package, CheckCircle2, Ticket, Zap, TrendingDown, Crown, MessageCircle,
  Heart, Video, Megaphone, Shield, Trophy,
}

type View = 'list' | 'detail'

export default function NotificationsHubPage() {
  const { messages } = useVersa()
  const [activeCat, setActiveCat] = useState<string>('all')
  const [view, setView] = useState<View>('list')
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null)
  const navigate = useNavigate()

  const unreadByCat = useMemo(() => {
    const r: Record<string, number> = { all: 0, shipping: 0, promo: 0, interact: 0, system: 0 }
    messages.forEach((m) => {
      if (m.unread) {
        r.all++
        r[m.category] = (r[m.category] || 0) + 1
      }
    })
    return r
  }, [messages])

  const filtered = useMemo(() => {
    let list = activeCat === 'all' ? messages : messages.filter((m) => m.category === activeCat)
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return +new Date(b.at) - +new Date(a.at)
    })
  }, [messages, activeCat])

  if (view === 'detail' && activeMsgId) {
    return <MessageDetail messageId={activeMsgId} onBack={() => setView('list')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-violet-50/30 pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
            消息中心
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => versa.markAllMessagesRead()}
              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />全部已读
            </button>
          </div>
        </div>

        {/* 分类 Tabs */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <CatButton k="all" label="全部" gradient="from-slate-500 to-zinc-600" count={unreadByCat.all} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
          <CatButton k="shipping" label="物流" gradient="from-emerald-400 to-teal-500" count={unreadByCat.shipping} active={activeCat === 'shipping'} onClick={() => setActiveCat('shipping')} />
          <CatButton k="promo" label="优惠" gradient="from-rose-400 to-pink-500" count={unreadByCat.promo} active={activeCat === 'promo'} onClick={() => setActiveCat('promo')} />
          <CatButton k="interact" label="互动" gradient="from-cyan-400 to-blue-500" count={unreadByCat.interact} active={activeCat === 'interact'} onClick={() => setActiveCat('interact')} />
          <CatButton k="system" label="系统" gradient="from-violet-400 to-fuchsia-500" count={unreadByCat.system} active={activeCat === 'system'} onClick={() => setActiveCat('system')} />
        </div>

        {/* 消息列表 */}
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => {
              const Icon = ICONS[m.icon] || Bell
              return (
                <button
                  key={m.id}
                  onClick={() => { versa.markMessageRead(m.id); setActiveMsgId(m.id); setView('detail') }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition relative ${
                    m.unread ? `${CATEGORY_META[m.category].bg} border-current/30` : 'bg-white border-ink-100'
                  } hover:shadow-md`}
                >
                  {m.pinned && <Pin className="absolute top-2 right-2 w-3 h-3 text-rose-500 fill-rose-500" />}
                  <div className="flex items-start gap-3">
                    <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                      {m.unread && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm truncate ${m.unread ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>{m.title}</p>
                        <span className="text-[10px] text-ink-400 ml-2 flex-shrink-0">{formatTimeAgo(m.at)}</span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${m.unread ? 'text-ink-600' : 'text-ink-500'}`}>{m.preview}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CatButton({ k, label, gradient, count, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-2xl border transition ${
        active
          ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-md`
          : 'bg-white text-ink-700 border-ink-100'
      }`}
    >
      <p className="text-xs font-medium">{label}</p>
      {count > 0 && (
        <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
          active ? 'bg-white text-rose-500' : 'bg-rose-500 text-white'
        }`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20 text-ink-400">
      <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-ink-100 flex items-center justify-center">
        <Bell className="w-8 h-8" />
      </div>
      <p className="text-sm">暂无消息</p>
    </div>
  )
}

function MessageDetail({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { messages } = useVersa()
  const navigate = useNavigate()
  const m = messages.find((x) => x.id === messageId)
  if (!m) return null
  const Icon = ICONS[m.icon] || Bell
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-violet-50/30">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-ink-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => versa.togglePinMessage(m.id)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                m.pinned ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-ink-200 text-ink-500'
              }`}
            >
              <Pin className={`w-4 h-4 ${m.pinned ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              onClick={() => { versa.deleteMessage(m.id); onBack() }}
              className="w-9 h-9 rounded-full bg-white border border-ink-200 text-ink-500 flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-ink-100">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-ink-900">{m.title}</p>
              <p className="text-xs text-ink-500 mt-0.5">{formatTimeAgo(m.at)}</p>
            </div>
          </div>
          <div className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{m.content}</div>
          {m.link && (
            <button
              onClick={() => navigate(m.link!)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-medium flex items-center justify-center gap-1"
            >
              查看详情 <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
