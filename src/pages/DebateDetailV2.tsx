import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, Scale, ShoppingBag, Newspaper, Send, Sparkles, Flame, Eye, MessageCircle, ChevronRight,
  Tv, Crown, Calendar, Quote, Users, BookOpen, TrendingUp, ArrowUpRight, ThumbsUp
} from 'lucide-react'
import { debates, news, products } from '../data'
import { useVersa, versa } from '../store/versa'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { NewsCard } from '../components/news/NewsCard'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { DebateCard } from '../components/debate/DebateCard'
import { DebateArena } from '../components/debate/DebateArena'
import { ExpertPanel } from '../components/debate/ExpertPanel'
import { ArgumentList } from '../components/debate/ArgumentList'
import { cn, formatNumber, formatTimeAgo, uid } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export function DebateDetailV2() {
  const { id } = useParams()
  const navigate = useNavigate()
  const debate = debates.find((d) => d.id === id)
  const { user } = useVersa()
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

  const linkedNews = debate.linkedNewsId ? news.find((n) => n.id === debate.linkedNewsId) : null
  const linkedProduct = debate.linkedProductId ? products.find((p) => p.id === debate.linkedProductId) : null
  const relatedDebates = debates.filter((d) => d.id !== debate.id && d.category === debate.category).slice(0, 3)
  const total = debate.pros + debate.cons
  const proPct = total > 0 ? Math.round((debate.pros / total) * 100) : 50

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
    <div className="space-y-6">
      {/* Hero 标题区 - 杂志封面 */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="absolute inset-0 overflow-hidden">
          {debate.cover && (
            <img src={debate.cover} alt="" className="w-full h-full object-cover opacity-20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ink-50/95 via-ink-50/85 to-ink-50 dark:from-ink-950/95 dark:via-ink-950/85 dark:to-ink-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-nova-500/5 via-transparent to-debate-500/5" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Badge variant="debate" icon={<Scale className="w-3 h-3" />}>{debate.category.toUpperCase()}</Badge>
            {debate.format === 'roundtable' && (
              <Badge variant="news" icon={<Crown className="w-3 h-3" />}>圆桌</Badge>
            )}
            {debate.format === 'oxford' && (
              <Badge variant="news" icon={<BookOpen className="w-3 h-3" />}>牛津</Badge>
            )}
            {debate.hot > 80 && <Badge variant="nova" icon={<Flame className="w-3 h-3" />}>HOT</Badge>}
            {debate.status === 'live' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {debate.status === 'upcoming' && <Badge variant="outline" icon={<Calendar className="w-3 h-3" />}>即将开始</Badge>}
            {debate.tags?.slice(0, 4).map((t) => <Badge key={t} variant="outline" size="sm">#{t}</Badge>)}
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight text-balance max-w-4xl">
            {debate.title}
          </h1>
          <p className="text-ink-600 dark:text-ink-300 mt-4 text-base sm:text-lg max-w-3xl leading-relaxed">{debate.description}</p>

          {/* 实时数据条 */}
          <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-ink-500 dark:text-ink-400">
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{formatNumber(debate.views)} 浏览</span>
            <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />{extraArgs.length} 观点</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{formatNumber(total)} 已投票</span>
            <span>·</span>
            <span>{formatTimeAgo(debate.createdAt)}</span>
          </div>

          {/* PRO vs CON 大对比条 */}
          <div className="mt-6 grid grid-cols-2 gap-3 max-w-2xl">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-nova-500/15 to-nova-500/5 border border-nova-500/30">
              <div className="flex items-center gap-1.5 text-[10px] text-nova-700 font-bold uppercase tracking-wider mb-1.5">
                <Quote className="w-3 h-3" />正方支持
              </div>
              <div className="text-3xl font-bold text-nova-600">{proPct}%</div>
              <div className="text-xs text-nova-600/80 mt-0.5">{formatNumber(debate.pros)} 票</div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-debate-500/15 to-debate-500/5 border border-debate-500/30">
              <div className="flex items-center gap-1.5 text-[10px] text-debate-700 font-bold uppercase tracking-wider mb-1.5 justify-end">
                反方支持<Quote className="w-3 h-3 scale-x-[-1]" />
              </div>
              <div className="text-3xl font-bold text-debate-600 text-right">{100 - proPct}%</div>
              <div className="text-xs text-debate-600/80 mt-0.5 text-right">{formatNumber(debate.cons)} 票</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容：左侧辩论/观点，右侧专家/相关 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        <div className="lg:col-span-2 space-y-6">
          {/* 投票区 */}
          <DebateArena debate={debate} />

          {/* 圆桌嘉宾（如果有） */}
          {(debate.moderator || debate.panelists) && <ExpertPanel debate={debate} />}

          {/* 跨模块融合：相关资讯 / 商品 */}
          {(linkedNews || linkedProduct) && (
            <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-news-500/8 via-white/40 to-shop-500/8 dark:from-news-500/5 dark:via-ink-900/40 dark:to-shop-500/5 border border-ink-200/60 dark:border-ink-800/60">
              <h3 className="font-bold mb-4 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-news-500" />
                跨模块关联
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedNews && (
                  <Link to={`/news/${linkedNews.id}`} className="group relative flex items-center gap-3 p-4 rounded-2xl bg-news-500/5 border border-news-500/20 hover:border-news-500/50 transition-all hover:shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-news-500/20 to-transparent rounded-full blur-2xl" />
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-news-500/20 relative">
                      <img src={linkedNews.cover} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <div className="text-[10px] text-news-600 font-bold flex items-center gap-1 mb-0.5"><Newspaper className="w-3 h-3" />来自资讯</div>
                      <div className="text-sm font-semibold line-clamp-2">{linkedNews.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-1 transition-transform relative" />
                  </Link>
                )}
                {linkedProduct && (
                  <Link to={`/shop/${linkedProduct.id}`} className="group relative flex items-center gap-3 p-4 rounded-2xl bg-shop-500/5 border border-shop-500/20 hover:border-shop-500/50 transition-all hover:shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-shop-500/20 to-transparent rounded-full blur-2xl" />
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-shop-500/20 relative">
                      <img src={linkedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <div className="text-[10px] text-shop-600 font-bold flex items-center gap-1 mb-0.5"><ShoppingBag className="w-3 h-3" />相关商品</div>
                      <div className="text-sm font-semibold line-clamp-1">{linkedProduct.name}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-1 transition-transform relative" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* 观点交锋列表 */}
          <div className="rounded-3xl p-5 sm:p-6 bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <ArgumentList debate={debate} arguments={extraArgs} />
          </div>

          {/* 发表观点 */}
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-ink-100/60 to-white/60 dark:from-ink-900/60 dark:to-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nova-500 to-debate-500 flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm">发表你的观点</div>
                  <div className="text-[10px] text-ink-500">用数据和引用增加说服力</div>
                </div>
              </div>
              <div className="flex gap-1 bg-white dark:bg-ink-800 p-1 rounded-xl border border-ink-200/60 dark:border-ink-700/60">
                <button
                  onClick={() => setInputSide('pro')}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                    inputSide === 'pro'
                      ? 'bg-gradient-to-r from-nova-500 to-nova-600 text-white shadow-lg shadow-nova-500/30'
                      : 'text-ink-500 hover:text-nova-600'
                  )}
                >站正方</button>
                <button
                  onClick={() => setInputSide('con')}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                    inputSide === 'con'
                      ? 'bg-gradient-to-r from-debate-500 to-debate-600 text-white shadow-lg shadow-debate-500/30'
                      : 'text-ink-500 hover:text-debate-600'
                  )}
                >站反方</button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`从${inputSide === 'pro' ? '正方' : '反方'}的视角阐述你的论点，可以附上数据/引用...`}
              rows={4}
              className={cn(
                'w-full px-4 py-3 rounded-2xl bg-white dark:bg-ink-800/60 border-2 outline-none text-sm resize-none transition-colors',
                inputSide === 'pro'
                  ? 'border-nova-200 dark:border-nova-800/60 focus:border-nova-500'
                  : 'border-debate-200 dark:border-debate-800/60 focus:border-debate-500'
              )}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-ink-500">💡 提示：附上数据/引用会增加说服力</div>
              <Button
                onClick={handlePost}
                leftIcon={<Send className="w-4 h-4" />}
                disabled={!text.trim()}
                className={cn(
                  inputSide === 'pro'
                    ? 'bg-gradient-to-r from-nova-500 to-nova-600 hover:from-nova-600 hover:to-nova-700'
                    : 'bg-gradient-to-r from-debate-500 to-debate-600 hover:from-debate-600 hover:to-debate-700',
                  'text-white shadow-lg'
                )}
              >
                发布观点
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧栏：相关辩论/商品 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 实时热度排行 */}
          <div className="rounded-3xl p-5 bg-gradient-to-br from-debate-500/8 via-nova-500/5 to-transparent border border-debate-200/40 dark:border-debate-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-debate-500/15 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-debate-500 to-nova-500 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-white" />
                </div>
                辩论热榜
              </h3>
              <div className="space-y-2">
                {[...debates].sort((a, b) => b.hot - a.hot).slice(0, 5).map((d, i) => (
                  <Link
                    key={d.id}
                    to={`/debates/${d.id}`}
                    className={cn(
                      'group flex items-start gap-2.5 p-2 rounded-lg text-xs hover:bg-white/60 dark:hover:bg-ink-900/40 transition-colors',
                      d.id === debate.id && 'opacity-50'
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm',
                      i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                      i === 1 ? 'bg-gradient-to-br from-ink-300 to-ink-400 text-white' :
                      i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                      'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'
                    )}>
                      {i + 1}
                    </span>
                    <span className="line-clamp-2 group-hover:text-debate-600 font-medium">{d.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 相关辩论 */}
          {relatedDebates.length > 0 && (
            <div className="rounded-3xl p-5 bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-debate-500" />
                同分类辩论
              </h3>
              <div className="space-y-1">
                {relatedDebates.map((d) => <DebateCard key={d.id} debate={d} variant="compact" />)}
              </div>
            </div>
          )}

          {/* 圆桌入口 */}
          <Link
            to="/debates"
            className="block rounded-3xl p-5 bg-gradient-to-br from-amber-500/15 via-news-500/10 to-amber-500/5 border border-amber-200/40 dark:border-amber-800/40 hover:border-amber-500/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span className="font-bold">圆桌辩论</span>
              </div>
              <p className="text-xs text-ink-600 dark:text-ink-300 mb-3">3-6 位专家同台，主持人引导</p>
              <div className="inline-flex items-center gap-1 text-xs text-amber-600 group-hover:gap-2 transition-all font-bold">
                查看全部 <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
