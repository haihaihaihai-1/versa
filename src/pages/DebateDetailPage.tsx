import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Scale, ShoppingBag, Newspaper, ThumbsUp, ThumbsDown, Send, Sparkles, Flame, Eye, MessageCircle, ChevronRight } from 'lucide-react'
import { debates, news, products } from '../data'
import { useVersa, versa } from '../store/versa'
import { DivergingBar, ProgressBar } from '../components/ui/Progress'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { NewsCard } from '../components/news/NewsCard'
import { ProductCard } from '../components/shop/ProductCard'
import { DebateCard } from '../components/debate/DebateCard'
import { cn, formatNumber, formatTimeAgo, uid } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

type Filter = 'all' | 'pro' | 'con' | 'hot'

export function DebateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const debate = debates.find((d) => d.id === id)
  const { votedDebates, user } = useVersa()
  const [filter, setFilter] = useState<Filter>('all')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [inputSide, setInputSide] = useState<'pro' | 'con'>('pro')
  const [text, setText] = useState('')
  const [extraArgs, setExtraArgs] = useState(debate?.arguments || [])

  useEffect(() => { versa.visitModule('debate') }, [id])
  useEffect(() => { if (debate) setExtraArgs(debate.arguments) }, [debate?.id])

  if (!debate) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">辩论不存在</h2>
        <Button onClick={() => navigate('/debates')}>返回辩论列表</Button>
      </div>
    )
  }

  const myVote = votedDebates[debate.id]
  const total = debate.pros + debate.cons
  const linkedNews = debate.linkedNewsId ? news.find((n) => n.id === debate.linkedNewsId) : null
  const linkedProduct = debate.linkedProductId ? products.find((p) => p.id === debate.linkedProductId) : null

  const filteredArgs = useMemo(() => {
    let r = extraArgs
    if (filter === 'pro') r = r.filter((a) => a.side === 'pro')
    if (filter === 'con') r = r.filter((a) => a.side === 'con')
    if (filter === 'hot') r = [...r].sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
    return r
  }, [extraArgs, filter])

  const handleVote = (side: 'pro' | 'con') => {
    versa.voteDebate(debate.id, side)
    toast(side === 'pro' ? '已为正方投票' : '已为反方投票', 'success')
  }

  const handlePost = () => {
    if (!text.trim()) return
    const newArg = {
      id: uid('arg'),
      side: inputSide,
      authorId: user.id,
      authorName: user.displayName,
      authorAvatar: user.avatar,
      content: text.trim(),
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toISOString(),
    }
    setExtraArgs([newArg, ...extraArgs])
    versa.postArgument(debate.id, inputSide, text)
    setText('')
    toast('观点已发布', 'success')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="debate" icon={<Scale className="w-3 h-3" />}>{debate.category.toUpperCase()}</Badge>
          {debate.hot > 80 && <Badge variant="nova" icon={<Flame className="w-3 h-3" />}>HOT</Badge>}
          {debate.tags?.map((t) => <Badge key={t} variant="outline" size="sm">#{t}</Badge>)}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-balance">
          {debate.title}
        </h1>
        <p className="text-ink-600 dark:text-ink-300 mt-4 text-lg">{debate.description}</p>
        <div className="flex items-center gap-4 mt-4 text-xs text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(debate.views)} 浏览</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{extraArgs.length} 观点</span>
          <span>{formatTimeAgo(debate.createdAt)}</span>
        </div>
      </div>

      {/* 投票区 */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-nova-500/10 via-white/40 to-debate-500/10 dark:from-nova-500/10 dark:via-ink-900/40 dark:to-debate-500/10 border border-ink-200/60 dark:border-ink-800/60 mb-8">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="font-semibold text-nova-600">正方 <span className="font-bold text-base ml-1">{formatNumber(debate.pros + (myVote === 'pro' ? 1 : 0))}</span></span>
          <span className="text-xs text-ink-500">{formatNumber(debate.pros + debate.cons)} 票</span>
          <span className="font-semibold text-debate-600">反方 <span className="font-bold text-base ml-1">{formatNumber(debate.cons + (myVote === 'con' ? 1 : 0))}</span></span>
        </div>
        <DivergingBar
          left={debate.pros + (myVote === 'pro' ? 1 : 0)}
          right={debate.cons + (myVote === 'con' ? 1 : 0)}
          leftColor="bg-nova-500"
          rightColor="bg-debate-500"
          className="h-3"
        />
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            onClick={() => handleVote('pro')}
            className={cn(
              'h-12 rounded-xl font-semibold text-sm transition-all',
              myVote === 'pro'
                ? 'bg-nova-500 text-white shadow-lg shadow-nova-500/30'
                : 'border border-ink-300 dark:border-ink-700 hover:border-nova-500 hover:bg-nova-50 dark:hover:bg-nova-900/20'
            )}
          >
            我站正方 {myVote === 'pro' && '✓'}
          </button>
          <button
            onClick={() => handleVote('con')}
            className={cn(
              'h-12 rounded-xl font-semibold text-sm transition-all',
              myVote === 'con'
                ? 'bg-debate-500 text-white shadow-lg shadow-debate-500/30'
                : 'border border-ink-300 dark:border-ink-700 hover:border-debate-500 hover:bg-debate-50 dark:hover:bg-debate-900/20'
            )}
          >
            我站反方 {myVote === 'con' && '✓'}
          </button>
        </div>
      </div>

      {/* 跨模块融合：相关资讯 / 商品 */}
      {(linkedNews || linkedProduct) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {linkedNews && (
            <Link to={`/news/${linkedNews.id}`} className="flex items-center gap-3 p-3 rounded-2xl bg-news-500/5 border border-news-500/20 hover:border-news-500/50 transition-colors">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img src={linkedNews.cover} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-news-600 font-semibold flex items-center gap-1"><Newspaper className="w-3 h-3" />来自资讯</div>
                <div className="font-medium text-sm line-clamp-2 mt-0.5">{linkedNews.title}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-400" />
            </Link>
          )}
          {linkedProduct && (
            <Link to={`/shop/${linkedProduct.id}`} className="flex items-center gap-3 p-3 rounded-2xl bg-shop-500/5 border border-shop-500/20 hover:border-shop-500/50 transition-colors">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img src={linkedProduct.images[0]} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-shop-600 font-semibold flex items-center gap-1"><ShoppingBag className="w-3 h-3" />相关商品</div>
                <div className="font-medium text-sm line-clamp-1 mt-0.5">{linkedProduct.name}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-400" />
            </Link>
          )}
        </div>
      )}

      {/* 观点列表 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">观点交锋 · {extraArgs.length}</h2>
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-0.5 rounded-lg">
          {([
            { v: 'all', label: '全部' },
            { v: 'pro', label: '正方' },
            { v: 'con', label: '反方' },
            { v: 'hot', label: '最热' },
          ] as { v: Filter, label: string }[]).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filter === f.v
                  ? 'bg-white dark:bg-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900 dark:hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {filteredArgs.map((a) => <ArgumentCard key={a.id} arg={a} />)}
      </div>

      {/* 发表观点 */}
      <div className="rounded-2xl p-5 bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm">发表你的观点</div>
          <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-0.5 rounded-lg">
            <button
              onClick={() => setInputSide('pro')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium', inputSide === 'pro' ? 'bg-nova-500 text-white' : 'text-ink-500')}
            >站正方</button>
            <button
              onClick={() => setInputSide('con')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium', inputSide === 'con' ? 'bg-debate-500 text-white' : 'text-ink-500')}
            >站反方</button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`从${inputSide === 'pro' ? '正方' : '反方'}的视角阐述你的论点...`}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 focus:border-nova-500 outline-none text-sm resize-none"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={handlePost} leftIcon={<Send className="w-4 h-4" />} disabled={!text.trim()}>
            发布
          </Button>
        </div>
      </div>

      {/* 相关辩论 */}
      <div className="mt-12">
        <h3 className="text-xl font-bold mb-4">相关辩论</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debates.filter((d) => d.id !== debate.id && d.category === debate.category).slice(0, 2).map((d) => <DebateCard key={d.id} debate={d} />)}
        </div>
      </div>
    </div>
  )
}

function ArgumentCard({ arg }: { arg: any }) {
  const [vote, setVote] = useState(0)
  return (
    <div className={cn(
      'rounded-2xl p-4 border bg-white/60 dark:bg-ink-900/40',
      arg.side === 'pro' ? 'border-nova-500/30' : 'border-debate-500/30'
    )}>
      <div className="flex items-start gap-3">
        <img src={arg.authorAvatar} alt="" className="w-9 h-9 rounded-full" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold">{arg.authorName}</span>
            <Badge size="sm" variant={arg.side === 'pro' ? 'nova' : 'debate'}>{arg.side === 'pro' ? '正方' : '反方'}</Badge>
            <span className="text-ink-400">· {formatTimeAgo(arg.createdAt)}</span>
          </div>
          <p className="text-sm mt-2 leading-relaxed text-ink-800 dark:text-ink-200">{arg.content}</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              onClick={() => setVote(vote === 1 ? 0 : 1)}
              className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors', vote === 1 ? 'bg-nova-500 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}
            >
              <ThumbsUp className="w-3 h-3" /> {arg.upvotes + (vote === 1 ? 1 : 0)}
            </button>
            <button
              onClick={() => setVote(vote === -1 ? 0 : -1)}
              className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors', vote === -1 ? 'bg-debate-500 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}
            >
              <ThumbsDown className="w-3 h-3" /> {arg.downvotes + (vote === -1 ? 1 : 0)}
            </button>
            <button className="px-2 py-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">回复</button>
          </div>
        </div>
      </div>
    </div>
  )
}
