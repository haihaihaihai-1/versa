import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import { BOT_INTENTS } from '../data/support'
import {
  ArrowLeft, Send, Bot, Sparkles, Phone, Image as ImageIcon,
  Smile, Paperclip, PhoneCall, Video, MoreVertical, CheckCheck
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'agent' | 'bot'
  content: string
  at: string
  status?: 'sent' | 'delivered' | 'read'
}

const QUICK_REPLIES = [
  '查物流',
  '申请退款',
  '优惠券怎么用',
  '人工客服',
]

const SUGGESTED = [
  { q: '我的订单到哪了？', a: '请提供您的订单号，我帮您查询具体物流信息。' },
  { q: '怎么联系人工客服？', a: '正在为您转接人工客服，预计等待 1-2 分钟...' },
  { q: '积分怎么用？', a: '100 积分 = 1 元，下单时勾选「使用积分」即可抵扣，最多抵扣订单金额的 30%。' },
]

export function LiveChatPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'bot',
      content: '您好！我是 Versa 智能助手 🤖\n请试试问我：订单 / 物流 / 退款 / 优惠券 / 会员',
      at: new Date().toISOString(),
    },
    {
      id: 'm2',
      role: 'agent',
      content: '您好，这里是 Versa 客服小王 👋 很高兴为您服务！',
      at: new Date(Date.now() - 60_000).toISOString(),
      status: 'read',
    },
  ])
  const [input, setInput] = useState('')
  const [agentTyping, setAgentTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, agentTyping])

  const send = (text: string) => {
    if (!text.trim()) return
    const now = new Date().toISOString()
    const userMsg: Message = {
      id: `m-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      at: now,
      status: 'sent',
    }
    setMessages((s) => [...s, userMsg])
    setInput('')

    // Mark as read after 500ms
    setTimeout(() => {
      setMessages((s) =>
        s.map((m) => (m.id === userMsg.id ? { ...m, status: 'read' } : m))
      )
    }, 800)

    // Bot reply
    setAgentTyping(true)
    setTimeout(() => {
      const intent = BOT_INTENTS.find((i) =>
        i.patterns.some((p) => text.includes(p))
      )
      const reply = intent?.reply || SUGGESTED.find((s) => text.includes(s.q.split('')[0]))?.a || '感谢您的咨询，我已记录您的问题，预计 2 小时内回复。'
      setMessages((s) => [
        ...s,
        {
          id: `m-${Date.now() + 1}`,
          role: 'bot',
          content: reply,
          at: new Date().toISOString(),
        },
      ])
      setAgentTyping(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-200 dark:border-ink-800 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-ink-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Versa 客服中心</p>
          <p className="text-[10px] text-emerald-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            在线 · 平均 30s 响应
          </p>
        </div>
        <button onClick={() => toast('正在拨打 400-888-VERSA', 'info')} className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800">
          <Phone className="w-4 h-4" />
        </button>
        <button onClick={() => toast('即将开放', 'info')} className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800">
          <Video className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-cyan-50/30 to-white dark:from-cyan-950/10 dark:to-ink-950">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'flex gap-2',
              m.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {m.role !== 'user' && (
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0',
                m.role === 'bot'
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500'
                  : 'bg-gradient-to-br from-pink-400 to-rose-500'
              )}>
                {m.role === 'bot' ? <Bot className="w-3.5 h-3.5" /> : <span className="text-xs">王</span>}
              </div>
            )}
            <div
              className={cn(
                'max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap',
                m.role === 'user'
                  ? 'bg-nova-500 text-white rounded-tr-sm'
                  : 'bg-white dark:bg-ink-800 text-ink-800 dark:text-ink-100 rounded-tl-sm border border-ink-200/40 dark:border-ink-700/40'
              )}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="text-[10px] text-ink-400 self-end mb-1 flex items-center gap-0.5">
                {m.status === 'read' && <CheckCheck className="w-3 h-3 text-nova-500" />}
                {m.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
              </div>
            )}
          </div>
        ))}

        <AnimatePresence>
          {agentTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-2 items-center"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white dark:bg-ink-800 border border-ink-200/40 dark:border-ink-700/40 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick replies */}
      <div className="px-4 py-2 border-t border-ink-200 dark:border-ink-800 bg-white/60 dark:bg-ink-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-nova-100 dark:hover:bg-nova-900/30 hover:text-nova-600 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900">
        <div className="flex items-center gap-2">
          <button onClick={() => toast('图片上传中...', 'info')} className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button onClick={() => toast('表情面板即将开放', 'info')} className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">
            <Smile className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="输入消息..."
            className="flex-1 px-3 h-9 rounded-full bg-ink-50 dark:bg-ink-800 text-sm outline-none border border-transparent focus:border-nova-500"
          />
          <Button
            onClick={() => send(input)}
            size="sm"
            className="w-9 h-9 rounded-full p-0"
            disabled={!input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
