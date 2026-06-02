import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Sparkles, Loader2, HelpCircle, Package, RotateCcw, ShieldCheck, Truck, MessageCircle, User } from 'lucide-react'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: number
}

const QUICK_TOPICS = [
  { id: 'order', label: '我的订单', icon: Package, color: 'bg-blue-500' },
  { id: 'refund', label: '退换货', icon: RotateCcw, color: 'bg-rose-500' },
  { id: 'shipping', label: '物流查询', icon: Truck, color: 'bg-emerald-500' },
  { id: 'auth', label: '账号问题', icon: ShieldCheck, color: 'bg-violet-500' },
  { id: 'live', label: '直播问题', icon: MessageCircle, color: 'bg-amber-500' },
  { id: 'creator', label: '创作者', icon: User, color: 'bg-pink-500' },
]

const FAKE_ANSWERS: Record<string, string> = {
  order: '您可以在「我的 → 订单」中查看所有订单, 包括待付款/待发货/已完成状态。每个订单支持取消、申请退款、查看物流等操作。',
  refund: '收到货 7 天内支持无理由退换, 质量问题 15 天内可换货。请在「订单详情」点击「申请退款」上传凭证, 24h 内审核。',
  shipping: '普通快递 3-5 天到达, 顺丰次日达。订单物流可在「我的 → 物流」中查看, 实时更新。',
  auth: '账号问题包括: 修改密码、绑定手机号、注销账号等。请在「设置 → 账号安全」中操作。',
  live: '直播相关问题: 1) 直播间卡顿: 切换网络 2) 礼物没到账: 联系客服 3) 直播预告错过: 在「直播」关注主播。',
  creator: '创作者可发布图文/视频/直播, 申请条件: 通过实名认证 + 至少 5 篇内容 + 100 粉丝。提交后 3-7 天审核。',
}

const STORAGE_KEY = 'versa:assistant-history'

function loadMsgs(): Msg[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return [{ id: uid(), role: 'assistant', text: '你好! 我是 Versa AI 助手, 可以帮你解答订单、退换货、直播等问题。', at: Date.now() }]
}

function saveMsgs(m: Msg[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m.slice(-30))) } catch {}
}

export function VersaAssistant() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMsgs(loadMsgs())
  }, [])

  useEffect(() => {
    if (msgs.length) saveMsgs(msgs)
  }, [msgs])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [open, msgs])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setMsgs((m) => [...m, { id: uid(), role: 'user', text: content, at: Date.now() }])
    setLoading(true)
    try {
      let answer: string
      if (isAIEnabled()) {
        answer = await aiComplete(
          content,
          '你是 Versa 智能客服助手, 礼貌专业, 用中文回答, 80-200 字内, 适当使用表情'
        )
      } else {
        answer = '当前为离线模式。请配置 AI API Key 以启用智能对话。\n\n你也可以点击下方快捷问题查看常见解答。'
      }
      setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: answer, at: Date.now() }])
    } catch (e: any) {
      toast(e?.message || '回复失败', 'error')
      setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: '抱歉, 暂时无法回复, 请稍后再试。', at: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const onQuickTopic = (id: string) => {
    if (FAKE_ANSWERS[id]) {
      setMsgs((m) => [
        ...m,
        { id: uid(), role: 'user', text: QUICK_TOPICS.find((t) => t.id === id)?.label || id, at: Date.now() },
        { id: uid(), role: 'assistant', text: FAKE_ANSWERS[id], at: Date.now() },
      ])
    }
  }

  const clear = () => {
    if (confirm('清空对话?')) {
      const fresh = [{ id: uid(), role: 'assistant', text: '已清空对话。有什么可以帮助你?', at: Date.now() }] as Msg[]
      setMsgs(fresh)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 text-white shadow-lg hover:scale-110 transition flex items-center justify-center"
        title="Versa AI 助手"
      >
        <Bot className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-[90vw] max-w-sm h-[70vh] max-h-[600px] bg-white dark:bg-ink-900 rounded-2xl shadow-2xl border border-ink-200 dark:border-ink-800 flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-ink-200 dark:border-ink-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">Versa 助手</p>
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />在线
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clear} className="text-[10px] text-ink-500 hover:text-rose-500 px-2 h-6 rounded">清空</button>
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                    m.role === 'user' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800'
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-ink-100 dark:bg-ink-800 rounded-2xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-3 py-2 border-t border-ink-200 dark:border-ink-800">
              <div className="flex gap-1 overflow-x-auto pb-1.5">
                {QUICK_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onQuickTopic(t.id)}
                    className="px-2 h-6 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px] font-medium flex items-center gap-1 flex-shrink-0 hover:bg-nova-100 dark:hover:bg-nova-900/40"
                  >
                    <t.icon className="w-2.5 h-2.5" />{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5 p-2 border-t border-ink-200 dark:border-ink-800">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="输入问题..."
                className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-nova-500 to-pink-500 text-white flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
