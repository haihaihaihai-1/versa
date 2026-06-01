import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Crown, Calendar, Clock, Users, Play, Heart, MessageCircle, Send, Sparkles, Bookmark, Share2, ChevronRight } from 'lucide-react'
import { featuredRoundtable, debates, moderators, panelists } from '../data/debates'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { cn, formatNumber, uid } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

interface Message {
  id: string
  author: { id?: string; name: string; avatar: string; title: string; stance?: 'pro' | 'con' | 'neutral' }
  content: string
  createdAt: string
  isHost?: boolean
  likes: number
}

const initialMessages: Message[] = [
  { id: 'm1', author: { ...moderators[2], title: '主持人' }, content: '欢迎大家来到 Versa 圆桌。今天我们讨论一个让所有人都焦虑的问题：AI 时代，人类到底还需要学习吗？', createdAt: '19:00', isHost: true, likes: 234 },
  { id: 'm2', author: { ...panelists[1] }, content: '我觉得学习的方式在变，但学习的本质没变。AI 改变了"获取信息"的方式，但"形成判断"的能力反而更稀缺。', createdAt: '19:01', likes: 312 },
  { id: 'm3', author: { ...panelists[2] }, content: '同意。但要警惕的是，我们让孩子"学习"的内容，可能 10 年后 80% 都不需要了。', createdAt: '19:02', likes: 198 },
  { id: 'm4', author: { ...panelists[3] }, content: '那培养"提问能力"是不是比"知识积累"重要？', createdAt: '19:03', likes: 256 },
  { id: 'm5', author: { ...panelists[0] }, content: '从生物学的角度，学习的本质是建立神经连接。这个过程 AI 替代不了。', createdAt: '19:05', likes: 187 },
]

export function RoundTablePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [bookmarked, setBookmarked] = useState(false)

  const totalGuests = useMemo(() => {
    return [featuredRoundtable.host, ...featuredRoundtable.guests]
  }, [])

  const handleSend = () => {
    if (!input.trim()) return
    const newMsg: Message = {
      id: uid('m'),
      author: {
        id: 'me',
        name: '我',
        avatar: 'https://i.pravatar.cc/120?img=11',
        title: '观众',
      },
      content: input.trim(),
      createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      likes: 0,
    }
    setMessages([...messages, newMsg])
    setInput('')
    toast('已发送', 'success')
  }

  return (
    <div className="pb-20">
      {/* 顶部：返回 + 标题 */}
      <div className="sticky top-14 sm:top-16 z-30 bg-gradient-to-b from-ink-50 via-ink-50/95 to-ink-50/80 dark:from-ink-950 dark:via-ink-950/95 dark:to-ink-950/80 backdrop-blur-md -mx-4 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBookmarked((v) => !v); toast(bookmarked ? '已取消收藏' : '已收藏', 'success') }}
              className={cn('w-9 h-9 rounded-full flex items-center justify-center', bookmarked ? 'bg-news-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
            >
              <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-current')} />
            </button>
            <button className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center" onClick={() => navigator.share?.({ title: featuredRoundtable.title, url: window.location.href }).catch(() => toast('已复制链接', 'success'))}>
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Hero */}
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative">
          <div className="absolute inset-0">
            <img src={featuredRoundtable.cover} alt="" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/80 to-transparent" />
          </div>
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <Crown className="w-3 h-3" />圆桌
              </span>
              {featuredRoundtable.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-xs">#{t}</span>
              ))}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight">{featuredRoundtable.title}</h1>
            <p className="mt-3 text-sm sm:text-base text-white/80 max-w-2xl">{featuredRoundtable.description}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> 6月1日 19:00</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 90 分钟</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{formatNumber(featuredRoundtable.viewerCount)} 观看</span>
            </div>
          </div>
        </div>

        {/* 嘉宾列表 */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Crown className="w-5 h-5 text-news-500" />
            嘉宾阵容
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-news-500/10 to-amber-500/10 border-2 border-news-300 dark:border-news-700 text-center">
              <img src={featuredRoundtable.host.avatar} alt="" className="w-16 h-16 rounded-full mx-auto ring-2 ring-news-500" />
              <div className="font-bold text-sm mt-2">{featuredRoundtable.host.name}</div>
              <div className="text-[10px] text-news-600 font-bold mt-0.5">主持人</div>
              <div className="text-[10px] text-ink-500 mt-0.5">{featuredRoundtable.host.title}</div>
            </div>
            {featuredRoundtable.guests.map((g) => (
              <div key={g.id} className={cn(
                'p-3 rounded-2xl bg-white/60 dark:bg-ink-900/40 border-2 text-center',
                g.stance === 'pro' ? 'border-nova-200/60 dark:border-nova-800/60' :
                g.stance === 'con' ? 'border-debate-200/60 dark:border-debate-800/60' :
                'border-ink-200/60 dark:border-ink-800/60'
              )}>
                <img src={g.avatar} alt="" className="w-16 h-16 rounded-full mx-auto" />
                <div className="font-bold text-sm mt-2">{g.name}</div>
                <div className={cn(
                  'text-[10px] font-bold mt-0.5',
                  g.stance === 'pro' ? 'text-nova-600' :
                  g.stance === 'con' ? 'text-debate-600' :
                  'text-ink-500'
                )}>
                  {g.stance === 'pro' ? '正方' : g.stance === 'con' ? '反方' : '中立'}
                </div>
                <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">{g.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 议程 */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-nova-500" />
            议程安排
          </h2>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 divide-y divide-ink-200/60 dark:divide-ink-800/60">
            {featuredRoundtable.agenda.map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-news-500/20 to-amber-500/20 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-news-600 font-bold">R{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-ink-500">{a.time}</div>
                  <div className="text-sm font-medium mt-0.5">{a.topic}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 实时讨论 */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-debate-500" />
            实时讨论
            <span className="text-xs text-ink-500 font-normal">· 观众可参与</span>
          </h2>
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-2xl',
                  m.isHost
                    ? 'bg-gradient-to-r from-news-500/10 to-amber-500/5 border border-news-200/50 dark:border-news-800/50'
                    : 'bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60'
                )}
              >
                <img src={m.author.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{m.author.name}</span>
                    {m.isHost && (
                      <span className="px-1.5 py-0.5 rounded bg-news-500 text-white text-[10px] font-bold">主持人</span>
                    )}
                    <span className="text-[10px] text-ink-500">{m.author.title}</span>
                    <span className="text-[10px] text-ink-400 ml-auto">{m.createdAt}</span>
                  </div>
                  <p className="text-sm mt-1.5 leading-relaxed text-ink-800 dark:text-ink-200">{m.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
                    <button className="hover:text-debate-500 flex items-center gap-1">
                      <Heart className="w-3 h-3" />{m.likes}
                    </button>
                    <button className="hover:text-debate-500">回复</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 相关辩论 - 跨模块 */}
        <div>
          <h2 className="text-lg font-bold mb-3">相关辩论</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {debates.filter((d) => d.tags?.some((t) => ['AI', '教育', '开源'].includes(t))).slice(0, 2).map((d) => (
              <Link key={d.id} to={`/debates/${d.id}`} className="group flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-debate-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <Badge variant="debate" size="sm" className="mb-1">辩论</Badge>
                  <div className="text-sm font-medium line-clamp-2 group-hover:text-debate-600">{d.title}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 底部固定 - 发送框 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-ink-200 dark:border-ink-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="向嘉宾提问..."
            className="flex-1 px-4 py-2.5 rounded-full bg-ink-100 dark:bg-ink-800 text-sm focus:outline-none focus:ring-2 focus:ring-news-500"
          />
          <Button onClick={handleSend} leftIcon={<Send className="w-4 h-4" />} disabled={!input.trim()}>
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
