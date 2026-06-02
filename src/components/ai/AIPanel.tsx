import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Bot, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { useAI } from '../../hooks/useAI'
import { AIThinkingDots, AIErrorBanner } from './AIIndicator'
import { VoiceInputButton } from '../VoiceInputButton'
import type { ChatMessage } from '../../lib/ai'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  systemPrompt: string
  initialMessage?: string
  placeholder?: string
  className?: string
}

export function AIPanel({
  open,
  onClose,
  title = 'AI 助手',
  systemPrompt,
  initialMessage,
  placeholder = '问 AI 任何问题…',
  className,
}: Props) {
  const ai = useAI()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && initialMessage && ai.history.length === 0) {
      ai.run(initialMessage, systemPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [ai.history, ai.loading, ai.result])

  const send = () => {
    if (!input.trim() || ai.loading) return
    ai.run(input.trim(), systemPrompt)
    setInput('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            'fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-4rem)]',
            'flex flex-col rounded-2xl overflow-hidden',
            'bg-white dark:bg-ink-900 shadow-2xl border border-ink-200 dark:border-ink-800',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-nova-500 via-purple-500 to-pink-500 text-white">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="font-semibold text-sm flex-1">{title}</p>
            <button onClick={ai.reset} className="p-1 rounded hover:bg-white/20" title="清空">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-nova-50/30 to-white dark:from-nova-950/20 dark:to-ink-950"
          >
            {!ai.enabled && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">AI 未配置</p>
                  <p>本地开发：在 <code className="px-1 bg-amber-100 dark:bg-amber-900/50 rounded">.env.local</code> 设置 <code className="px-1 bg-amber-100 dark:bg-amber-900/50 rounded">VITE_MIMO_API_KEY</code></p>
                </div>
              </div>
            )}

            {ai.history.length === 0 && !ai.loading && ai.enabled && (
              <div className="text-center py-8 text-ink-400 text-sm">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>开始对话吧 ✨</p>
              </div>
            )}

            {ai.history.map((m, i) => (
              <Message key={i} msg={m} />
            ))}

            {ai.loading && ai.result === '' && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nova-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="px-3 py-2 rounded-2xl bg-white dark:bg-ink-800 border border-ink-200/40 dark:border-ink-700/40">
                  <AIThinkingDots />
                </div>
              </div>
            )}

            {ai.error && <AIErrorBanner message={ai.error} />}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900">
            <div className="flex items-center gap-2">
              <VoiceInputButton onResult={(t) => setInput((p) => (p ? p + ' ' + t : t))} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={placeholder}
                className="flex-1 px-3 h-9 rounded-full bg-ink-50 dark:bg-ink-800 text-sm outline-none border border-transparent focus:border-nova-500"
                disabled={!ai.enabled || ai.loading}
              />
              <Button
                onClick={send}
                size="sm"
                className="w-9 h-9 rounded-full p-0"
                disabled={!ai.enabled || !input.trim() || ai.loading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'system') return null
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nova-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap',
          isUser
            ? 'bg-nova-500 text-white rounded-tr-sm'
            : 'bg-white dark:bg-ink-800 text-ink-800 dark:text-ink-100 rounded-tl-sm border border-ink-200/40 dark:border-ink-700/40'
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  )
}
