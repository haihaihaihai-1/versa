import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, Scale, ShoppingBag, Newspaper, Send, Sparkles, Flame, Eye, MessageCircle, ChevronRight,
  Tv, Crown, Calendar, Quote, Users, BookOpen
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 返回 */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* 标题区 */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant="debate" icon={<Scale className="w-3 h-3" />}>{debate.category.toUpperCase()}</Badge>
          {debate.format === 'roundtable' && (
            <Badge variant="news" icon={<Crown className="w-3 h-3" />}>圆桌</Badge>
          )}
          {debate.format === 'oxford' && (
            <Badge variant="news" icon={<BookOpen className="w-3 h-3" />}>牛津</Badge>
          )}
          {debate.hot > 80 && <Badge variant="nova" icon={<Flame className="w-3 h-3" />}>HOT</Badge>}
          {debate.status === 'upcoming' && <Badge variant="outline" icon={<Calendar className="w-3 h-3" />}>即将开始</Badge>}
          {debate.tags?.map((t) => <Badge key={t} variant="outline" size="sm">#{t}</Badge>)}
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold leading-tight tracking-tight text-balance">
          {debate.title}
        </h1>
        <p className="text-ink-600 dark:text-ink-300 mt-3 text-base sm:text-lg">{debate.description}</p>
        <div className="flex items-center gap-4 mt-4 text-xs text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(debate.views)} 浏览</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{extraArgs.length} 观点</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{formatNumber(debate.pros + debate.cons)} 已投票</span>
          <span>{formatTimeAgo(debate.createdAt)}</span>
        </div>
      </div>

      {/* 主内容：左侧辩论/观点，右侧专家/相关 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 投票区 */}
          <DebateArena debate={debate} />

          {/* 圆桌嘉宾（如果有） */}
          {(debate.moderator || debate.panelists) && <ExpertPanel debate={debate} />}

          {/* 跨模块融合：相关资讯 / 商品 */}
          {(linkedNews || linkedProduct) && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-news-500/5 to-shop-500/5 border border-ink-200/60 dark:border-ink-800/60">
              <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-news-500" />
                跨模块关联
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedNews && (
                  <Link to={`/news/${linkedNews.id}`} className="group flex items-center gap-3 p-3 rounded-xl bg-news-500/5 border border-news-500/20 hover:border-news-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={linkedNews.cover} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-news-600 font-semibold flex items-center gap-1 mb-0.5"><Newspaper className="w-3 h-3" />来自资讯</div>
                      <div className="text-sm font-medium line-clamp-2">{linkedNews.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {linkedProduct && (
                  <Link to={`/shop/${linkedProduct.id}`} className="group flex items-center gap-3 p-3 rounded-xl bg-shop-500/5 border border-shop-500/20 hover:border-shop-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={linkedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-shop-600 font-semibold flex items-center gap-1 mb-0.5"><ShoppingBag className="w-3 h-3" />相关商品</div>
                      <div className="text-sm font-medium line-clamp-1">{linkedProduct.name}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* 观点交锋列表 */}
          <div className="rounded-3xl p-5 sm:p-6 bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <ArgumentList debate={debate} arguments={extraArgs} />
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
              placeholder={`从${inputSide === 'pro' ? '正方' : '反方'}的视角阐述你的论点，可以附上数据/引用...`}
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 focus:border-nova-500 outline-none text-sm resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-ink-500">提示：附上数据/引用会增加说服力</div>
              <Button onClick={handlePost} leftIcon={<Send className="w-4 h-4" />} disabled={!text.trim()}>
                发布
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧栏：相关辩论/商品 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 实时热度排行 */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-debate-500/5 to-nova-500/5 border border-debate-200/40 dark:border-debate-800/40">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-debate-500" />辩论热榜
            </h3>
            <div className="space-y-2">
              {[...debates].sort((a, b) => b.hot - a.hot).slice(0, 5).map((d, i) => (
                <Link
                  key={d.id}
                  to={`/debates/${d.id}`}
                  className={cn(
                    'group flex items-start gap-2 text-xs',
                    d.id === debate.id && 'opacity-50'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-bold text-[10px]',
                    i < 3 ? 'bg-debate-500 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-300'
                  )}>
                    {i + 1}
                  </span>
                  <span className="line-clamp-2 group-hover:text-debate-600">{d.title}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 相关辩论 */}
          {relatedDebates.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-3">同分类辩论</h3>
              <div className="space-y-2">
                {relatedDebates.map((d) => <DebateCard key={d.id} debate={d} variant="compact" />)}
              </div>
            </div>
          )}

          {/* 圆桌入口 */}
          <Link
            to="/debates"
            className="block rounded-2xl p-4 bg-gradient-to-br from-news-500/10 to-amber-500/10 border border-news-200/40 dark:border-news-800/40 hover:border-news-500/50 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-news-600" />
              <span className="font-bold text-sm">圆桌辩论</span>
            </div>
            <p className="text-xs text-ink-600 dark:text-ink-300 mb-2">3-6 位专家同台，主持人引导</p>
            <div className="text-xs text-news-600 group-hover:underline">查看全部 →</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
