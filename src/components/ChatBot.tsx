import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Sparkles, Loader2, Plus, Trash2, Send, Bot, User as UserIcon, ChevronRight, Mic, MicOff, History, BookOpen } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Msg {
  id: string
  role: 'user' | 'ai' | 'character'
  content: string
  character?: string
  characterAvatar?: string
  at: number
}

interface Character {
  id: string
  name: string
  avatar: string
  description: string
  greeting: string
  category: 'casual' | 'professional' | 'creative' | 'fictional'
}

const CHARACTERS: Character[] = [
  { id: 'c1', name: '苏格拉底', avatar: '🧔', description: '古希腊哲学家, 擅长反问和辩证', greeting: '你好, 朋友。让我们一起思考什么是真正的知识吧。', category: 'fictional' },
  { id: 'c2', name: '爱因斯坦', avatar: '🧑‍🔬', description: '理论物理学家, 解释复杂概念', greeting: '想象力比知识更重要。今天想探讨什么？', category: 'fictional' },
  { id: 'c3', name: '小助手', avatar: '🤖', description: '通用 AI 助手, 回答问题', greeting: '你好！我是 Versa 小助手, 有什么可以帮你的吗？', category: 'casual' },
  { id: 'c4', name: '编程教练', avatar: '👨‍💻', description: '资深程序员, 帮助解决代码问题', greeting: '准备好挑战下一个 bug 了吗？', category: 'professional' },
  { id: 'c5', name: '莎士比亚', avatar: '🎭', description: '英国剧作家, 诗意表达', greeting: '生存还是毁灭, 这是个问题。', category: 'fictional' },
  { id: 'c6', name: '健身教练', avatar: '💪', description: '专业健身指导', greeting: '没有借口, 只有汗水! 今天练什么？', category: 'professional' },
  { id: 'c7', name: '心理咨询师', avatar: '🛋️', description: '倾听与陪伴', greeting: '我在这里, 请慢慢说。', category: 'professional' },
  { id: 'c8', name: '创意作家', avatar: '✍️', description: '激发创作灵感', greeting: '每一个故事都在等待被讲述。', category: 'creative' },
]

const STORAGE_KEY = 'versa:chat'

interface Session { id: string; character: string; messages: Msg[]; at: number }

function load(): Session[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Session[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function ChatBot() {
  const [sessions, setSessions] = useState<Session[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [charactersOpen, setCharactersOpen] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { save(sessions) }, [sessions])

  const active = sessions.find((s) => s.id === activeId)
  const character = active ? CHARACTERS.find((c) => c.id === active.character) : null

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [active?.messages.length])

  const startNew = (charId: string) => {
    const c = CHARACTERS.find((x) => x.id === charId)
    if (!c) return
    const s: Session = { id: uid(), character: charId, messages: [{ id: uid(), role: 'character', content: c.greeting, character: c.name, characterAvatar: c.avatar, at: Date.now() }], at: Date.now() }
    setSessions([s, ...sessions])
    setActiveId(s.id)
    setCharactersOpen(false)
  }

  const send = async () => {
    if (!input.trim() || !active || !character || !isAIEnabled()) {
      if (!isAIEnabled()) toast('请先配置 AI API Key', 'error')
      return
    }
    const userMsg: Msg = { id: uid(), role: 'user', content: input, at: Date.now() }
    setSessions(sessions.map((s) => s.id === active.id ? { ...s, messages: [...s.messages, userMsg] } : s))
    const userText = input
    setInput('')
    setAiLoading(true)
    try {
      const sys = systemPrompt || `你是 ${character.name}。${character.description}。请用中文回答, 保持角色特色, 回答简洁 30-80 字。`
      const result = await aiComplete(userText, sys)
      const aiMsg: Msg = { id: uid(), role: 'ai', content: result, character: character.name, characterAvatar: character.avatar, at: Date.now() }
      setSessions((prev) => prev.map((s) => s.id === active.id ? { ...s, messages: [...s.messages, aiMsg] } : s))
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally {
      setAiLoading(false)
    }
  }

  const remove = (id: string) => setSessions(sessions.filter((s) => s.id !== id))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-5 h-5" />
          <h2 className="text-lg font-bold">AI 角色对话</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 角色 · 多会话 · 角色扮演</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{CHARACTERS.length}</p>
            <p className="text-[10px] opacity-80">角色</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{sessions.length}</p>
            <p className="text-[10px] opacity-80">会话</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{sessions.reduce((s, x) => s + x.messages.length, 0)}</p>
            <p className="text-[10px] opacity-80">消息</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCharactersOpen(true)} className="px-3 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center gap-1 flex-shrink-0">
          <Plus className="w-3 h-3" />新角色
        </button>
        {sessions.slice(0, 6).map((s) => {
          const c = CHARACTERS.find((x) => x.id === s.character)
          return (
            <button key={s.id} onClick={() => setActiveId(s.id)} className={cn('px-2 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', activeId === s.id ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{c?.avatar}</span>{c?.name}
            </button>
          )
        })}
      </div>

      {active && character ? (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="p-2 border-b border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
            <span className="text-2xl">{character.avatar}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{character.name}</p>
              <p className="text-[10px] text-ink-500 truncate">{character.description}</p>
            </div>
            <button onClick={() => remove(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
          </div>
          <div ref={scrollRef} className="h-80 overflow-y-auto p-2 space-y-1.5">
            {active.messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-1.5', m.role === 'user' ? 'flex-row-reverse' : '')}
              >
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm', m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gradient-to-br from-violet-500 to-purple-500 text-white')}>
                  {m.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : m.characterAvatar || '🤖'}
                </div>
                <div className={cn('max-w-[75%] rounded-2xl px-2.5 py-1.5 text-xs', m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-ink-50 dark:bg-ink-800')}>
                  {m.content}
                </div>
              </motion.div>
            ))}
            {aiLoading && (
              <div className="flex gap-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-sm">{character.avatar}</div>
                <div className="bg-ink-50 dark:bg-ink-800 rounded-2xl px-3 py-1.5">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-2 border-t border-ink-200/60 dark:border-ink-800/60">
            <div className="flex gap-1">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="输入消息..." disabled={aiLoading} className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
              <button onClick={send} disabled={aiLoading || !input.trim()} className="px-3 h-9 rounded-lg bg-cyan-500 text-white flex items-center justify-center disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">选个角色开始对话</p>
        </div>
      )}

      <AnimatePresence>
        {charactersOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setCharactersOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold">选择 AI 角色</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {CHARACTERS.map((c) => (
                  <button key={c.id} onClick={() => startNew(c.id)} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800 text-left">
                    <p className="text-2xl mb-1">{c.avatar}</p>
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-[10px] text-ink-500 line-clamp-2">{c.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
