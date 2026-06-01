import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Clock, Eye, ArrowLeft, Heart, Lightbulb, ThumbsDown, Share2, Bookmark, Scale, ShoppingBag, MessageCircle, Sparkles, ChevronRight } from 'lucide-react'
import { news, debates, products } from '../data'
import { useVersa, versa } from '../store/versa'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { ProductCard } from '../components/shop/ProductCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const article = news.find((n) => n.id === id)
  const { reactedArticles, readArticles } = useVersa()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    versa.visitModule('news')
    if (!article) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && contentRef.current) {
            const rect = (e.target as HTMLElement).getBoundingClientRect()
            const containerRect = contentRef.current.getBoundingClientRect()
            const top = rect.top - containerRect.top
            const total = contentRef.current.scrollHeight
            const percent = Math.max(0, Math.min(95, Math.round((top / total) * 100)))
            versa.trackRead(article.id, percent)
          }
        })
      },
      { threshold: [0.2, 0.4, 0.6, 0.8] }
    )
    const headings = contentRef.current?.querySelectorAll('h2, p') || []
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [article?.id])

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">文章不存在</h2>
        <Button onClick={() => navigate('/news')}>返回资讯列表</Button>
      </div>
    )
  }

  const reaction = reactedArticles[article.id]
  const linkedDebate = article.linkedDebateId ? debates.find((d) => d.id === article.linkedDebateId) : null
  const linkedProducts = article.linkedProductIds?.map((id) => products.find((p) => p.id === id)).filter(Boolean) || []
  const related = news.filter((n) => n.id !== article.id && n.category === article.category).slice(0, 3)

  const reactTo = (r: 'like' | 'insightful' | 'disagree') => {
    versa.reactArticle(article.id, r)
    toast('已记录你的态度', 'success', 1500)
  }

  // simple markdown-ish render
  const renderContent = (text: string) => {
    return text.split('\n\n').map((block, i) => {
      if (block.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-10 mb-4 tracking-tight">{block.slice(3)}</h2>
      if (block.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-nova-500 pl-4 py-2 my-4 text-ink-700 dark:text-ink-200 italic">{block.slice(2)}</blockquote>
      if (/^\d+\. /.test(block)) {
        const items = block.split('\n').map((line) => line.replace(/^\d+\. /, ''))
        return <ol key={i} className="list-decimal pl-5 my-4 space-y-2 marker:text-nova-500 marker:font-bold">{items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(it) }} />)}</ol>
      }
      if (block.startsWith('|')) {
        const rows = block.split('\n').filter((r) => r.startsWith('|'))
        if (rows.length < 2) return null
        const header = rows[0].split('|').filter(Boolean).map((c) => c.trim())
        const body = rows.slice(2).map((r) => r.split('|').filter(Boolean).map((c) => c.trim()))
        return (
          <div key={i} className="my-6 rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 dark:bg-ink-900/60">
                <tr>{header.map((h, j) => <th key={j} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {body.map((row, j) => <tr key={j} className="border-t border-ink-200 dark:border-ink-800">{row.map((c, k) => <td key={k} className="px-4 py-2.5">{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        )
      }
      return <p key={i} className="my-4 text-base sm:text-lg leading-[1.85] text-ink-800 dark:text-ink-200" dangerouslySetInnerHTML={{ __html: formatInline(block) }} />
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="news">{article.category.toUpperCase()}</Badge>
          {article.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" size="sm">#{t}</Badge>)}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-balance">
          {article.title}
        </h1>
        <p className="text-lg text-ink-600 dark:text-ink-300 mt-4">{article.subtitle}</p>
      </div>

      <div className="flex items-center justify-between py-4 border-y border-ink-200 dark:border-ink-800 mb-8">
        <div className="flex items-center gap-3">
          <img src={article.author.avatar} alt="" className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-ink-800" />
          <div>
            <div className="font-semibold text-sm flex items-center gap-1">
              {article.author.name}
              {article.author.verified && <Sparkles className="w-3 h-3 text-nova-500" />}
            </div>
            <div className="text-xs text-ink-500 dark:text-ink-400 flex items-center gap-2">
              <span>{formatTimeAgo(article.publishedAt)}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} 分钟</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(article.views)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-ink-100 dark:bg-ink-800">
        <img src={article.cover} alt="" className="w-full h-full object-cover" />
      </div>

      <div ref={contentRef} className="prose-versa">
        {renderContent(article.content)}
      </div>

      {/* 跨模块融合：辩论 */}
      {linkedDebate && (
        <div className="mt-12 rounded-2xl p-6 bg-gradient-to-br from-debate-500/10 to-nova-500/10 border border-debate-500/20">
          <div className="flex items-center gap-2 mb-2 text-debate-600">
            <Scale className="w-4 h-4" />
            <span className="font-semibold text-sm">本报道延伸出辩论</span>
          </div>
          <h3 className="text-xl font-bold mb-2">{linkedDebate.title}</h3>
          <p className="text-sm text-ink-600 dark:text-ink-300 mb-4">{linkedDebate.description}</p>
          <Link to={`/debates/${linkedDebate.id}`}>
            <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />}>
              参与这场辩论
            </Button>
          </Link>
        </div>
      )}

      {/* 跨模块融合：商品 */}
      {linkedProducts.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4 text-shop-600">
            <ShoppingBag className="w-4 h-4" />
            <span className="font-semibold text-sm">文中提到的商品</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {linkedProducts.map((p) => p && <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* 互动栏 */}
      <div className="mt-12 rounded-2xl p-6 bg-ink-50/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
        <div className="text-sm font-semibold mb-3">你的态度</div>
        <div className="grid grid-cols-3 gap-3">
          <ReactionButton
            active={reaction === 'like'}
            onClick={() => reactTo('like')}
            icon={<Heart className={cn('w-5 h-5', reaction === 'like' && 'fill-current')} />}
            label="赞同"
            count={article.reactions.like}
            color="debate"
          />
          <ReactionButton
            active={reaction === 'insightful'}
            onClick={() => reactTo('insightful')}
            icon={<Lightbulb className="w-5 h-5" />}
            label="有启发"
            count={article.reactions.insightful}
            color="news"
          />
          <ReactionButton
            active={reaction === 'disagree'}
            onClick={() => reactTo('disagree')}
            icon={<ThumbsDown className="w-5 h-5" />}
            label="存疑"
            count={article.reactions.disagree}
            color="ink"
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span>阅读进度：{readArticles[article.id] || 0}%</span>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast('链接已复制', 'success') }} className="px-2 py-1 rounded hover:bg-ink-100 dark:hover:bg-ink-800 inline-flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />分享
            </button>
            <button onClick={() => toast('已加入书签', 'success')} className="px-2 py-1 rounded hover:bg-ink-100 dark:hover:bg-ink-800 inline-flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" />收藏
            </button>
          </div>
        </div>
      </div>

      {/* 相关 */}
      {related.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">相关阅读</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((a) => <NewsCard key={a.id} article={a} variant="compact" />)}
          </div>
        </div>
      )}
    </div>
  )
}

function ReactionButton({ active, onClick, icon, label, count, color }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number; color: 'debate' | 'news' | 'ink' }) {
  const colorMap = {
    debate: active ? 'bg-debate-500 text-white border-debate-500' : 'hover:bg-debate-500/10 hover:text-debate-600 hover:border-debate-500/30',
    news: active ? 'bg-news-500 text-white border-news-500' : 'hover:bg-news-500/10 hover:text-news-600 hover:border-news-500/30',
    ink: active ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900 border-ink-900' : 'hover:bg-ink-100 dark:hover:bg-ink-800',
  }
  return (
    <button
      onClick={onClick}
      className={cn('flex flex-col items-center justify-center py-4 rounded-xl border border-ink-200 dark:border-ink-800 transition-all', colorMap[color])}
    >
      <div className="mb-1.5">{icon}</div>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{formatNumber(count)}</div>
    </button>
  )
}

function formatInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, t, h) => `<a href="${h}" class="text-nova-600 hover:underline">${t}</a>`)
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-sm">$1</code>')
}
