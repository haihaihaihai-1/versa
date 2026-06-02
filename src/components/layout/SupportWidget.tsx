import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Headphones, X, Bot, MessageCircle, Sparkles, Send, ArrowLeft, Phone, Mail } from 'lucide-react'
import { useVersa, versa } from '../../store/versa'

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  // 不在客服页面显示按钮
  if (location.pathname.startsWith('/help')) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-xl shadow-cyan-500/40 hover:scale-110 transition flex items-center justify-center"
        aria-label="联系客服"
      >
        <Headphones className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
      </button>

      {open && <SupportDrawer onClose={() => setOpen(false)} />}
    </>
  )
}

function SupportDrawer({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="p-4 bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">需要帮助？</span>
            <button onClick={onClose}><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs opacity-80">7×24 小时为您服务</p>
        </div>
        <div className="p-2">
          <DrawerItem
            icon={Bot}
            label="智能助手"
            sub="秒回 · 7×24"
            gradient="from-cyan-500 to-blue-500"
            onClick={() => { navigate('/help/support'); onClose() }}
          />
          <DrawerItem
            icon={MessageCircle}
            label="在线客服"
            sub="排队 3 人"
            gradient="from-emerald-500 to-teal-500"
            onClick={() => { navigate('/help/support'); onClose() }}
          />
          <DrawerItem
            icon={Sparkles}
            label="常见问题"
            sub="30+ 解答"
            gradient="from-amber-500 to-orange-500"
            onClick={() => { navigate('/help/support'); onClose() }}
          />
          <DrawerItem
            icon={Phone}
            label="400-888-1688"
            sub="9:00 - 22:00"
            gradient="from-rose-500 to-pink-500"
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

function DrawerItem({ icon: Icon, label, sub, gradient, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-ink-50 transition"
    >
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-left flex-1">
        <p className="text-sm font-medium text-ink-800">{label}</p>
        <p className="text-[11px] text-ink-500">{sub}</p>
      </div>
    </button>
  )
}

/* ==================== Quick Chat Widget ==================== */
export function SupportQuickChat() {
  const [open, setOpen] = useState(false)
  const { chatMessages } = useVersa()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  if (location.pathname.startsWith('/help')) return null

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, chatMessages.length])

  const send = (content: string) => {
    if (!content.trim()) return
    versa.sendChatMessage(content.trim())
    setText('')
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-36 right-4 z-40 w-80 max-w-[90vw] h-[460px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-ink-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">智能助手小 V</p>
              <p className="text-[10px] opacity-80">在线 · 秒回</p>
            </div>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-cyan-50/30 to-white">
            {chatMessages.slice(-12).map((m) => {
              if (m.role === 'system') return null
              const isUser = m.role === 'user'
              return (
                <div key={m.id} className={`flex gap-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0 ${
                    isUser ? 'bg-rose-500' : 'bg-cyan-500'
                  }`}>
                    {isUser ? '我' : <Bot className="w-3 h-3" />}
                  </div>
                  <div className={`max-w-[75%] px-2.5 py-1.5 rounded-xl text-xs whitespace-pre-wrap ${
                    isUser ? 'bg-rose-500 text-white' : 'bg-white border border-ink-100 text-ink-800'
                  }`}>
                    {m.content}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="p-2 border-t border-ink-100 flex items-center gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(text)}
              placeholder="说点什么..."
              className="flex-1 px-2.5 py-1.5 bg-ink-100 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
            <button
              onClick={() => send(text)}
              className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => { navigate('/help/support'); setOpen(false) }}
            className="text-[10px] text-cyan-600 py-1.5 border-t border-ink-100 hover:bg-ink-50"
          >查看完整客服中心 →</button>
        </div>
      )}
    </>
  )
}
