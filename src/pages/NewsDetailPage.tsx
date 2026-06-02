import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Eye, ArrowLeft, Heart, Lightbulb, ThumbsDown, Share2, Bookmark,
  Scale, ShoppingBag, Sparkles, ChevronRight, FileText, MessageSquare,
  Wand2, Loader2, Languages, X
} from 'lucide-react'
import { news, debates, products } from '../data'
import { useVersa, versa } from '../store/versa'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ReadingProgress } from '../components/news/ReadingProgress'
import { TableOfContents } from '../components/news/TableOfContents'
import { AuthorBio } from '../components/news/AuthorBio'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import { useAI } from '../hooks/useAI'
import { PROMPTS } from '../data/prompts'
import { AIBadge, AIErrorBanner, AIIndicator } from '../components/ai/AIIndicator'

export function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const article = news.find((n) => n.id === id)
  const { reactedArticles, readArticles } = useVersa()
  const contentRef = useRef<HTMLDivElement>(null)
  const ai = useAI()
  const [summary, setSummary] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)

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
  const tocSections = article.toc || extractToc(article.content)

  const reactTo = (r: 'like' | 'insightful' | 'disagree') => {
    versa.reactArticle(article.id, r)
    toast('已记录你的态度', 'success', 1500)
  }

  // 渲染文章正文（支持内联 h2 id 跳转）
  const renderContent = (text: string) => {
    return text.split('\n\n').map((block, i) => {
      const h2Match = block.match(/^## (.+)$/)
      if (h2Match) {
        // 用 heading 文本生成 anchor (与 extractToc 逻辑一致)
        const anchor = slugify(h2Match[1])
        return (
          <h2
            key={i}
            id={anchor}
            className="text-2xl font-bold mt-12 mb-5 tracking-tight scroll-mt-24 relative group"
          >
            <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 bg-news-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            {h2Match[1]}
          </h2>
        )
      }
      const h2HtmlMatch = block.match(/^<h2 id="(.+?)">(.+?)<\/h2>$/)
      if (h2HtmlMatch) {
        return (
          <h2
            key={i}
            id={h2HtmlMatch[1]}
            className="text-2xl font-bold mt-12 mb-5 tracking-tight scroll-mt-24 relative group"
          >
            <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 bg-news-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            {h2HtmlMatch[2]}
          </h2>
        )
      }
      if (block.startsWith('> ')) {
        return (
          <blockquote
            key={i}
            className="relative my-8 pl-6 py-3 text-xl text-ink-800 dark:text-ink-100 italic font-medium leading-relaxed"
          >
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-news-500 to-news-400 rounded-full" />
            {block.slice(2)}
          </blockquote>
        )
      }
      if (/^\d+\. /.test(block)) {
        const items = block.split('\n').map((line) => line.replace(/^\d+\. /, ''))
        return (
          <ol key={i} className="list-decimal pl-5 my-5 space-y-2.5 marker:text-news-500 marker:font-bold">
            {items.map((it, j) => (
              <li key={j} className="text-base sm:text-lg leading-[1.85] text-ink-800 dark:text-ink-200" dangerouslySetInnerHTML={{ __html: formatInline(it) }} />
            ))}
          </ol>
        )
      }
      if (block.startsWith('|')) {
        const rows = block.split('\n').filter((r) => r.startsWith('|'))
        if (rows.length < 2) return null
        const header = rows[0].split('|').filter(Boolean).map((c) => c.trim())
        const body = rows.slice(2).map((r) => r.split('|').filter(Boolean).map((c) => c.trim()))
        return (
          <div key={i} className="my-8 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-news-500/5">
                <tr>
                  {header.map((h, j) => (
                    <th key={j} className="px-5 py-3 text-left font-bold text-news-700 dark:text-news-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, j) => (
                  <tr key={j} className="border-t border-ink-200/60 dark:border-ink-800/60 hover:bg-ink-50/40 dark:hover:bg-ink-900/30">
                    {row.map((c, k) => (
                      <td key={k} className="px-5 py-3 text-ink-700 dark:text-ink-200">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      if (block.startsWith('- ')) {
        const items = block.split('\n').map((line) => line.replace(/^- /, ''))
        return (
          <ul key={i} className="list-none my-5 space-y-2.5 pl-1">
            {items.map((it, j) => (
              <li key={j} className="text-base sm:text-lg leading-[1.85] text-ink-800 dark:text-ink-200 flex gap-2.5" dangerouslySetInnerHTML={{ __html: formatInline(it) }} />
            ))}
          </ul>
        )
      }
      return (
        <p
          key={i}
          className="my-5 text-base sm:text-lg leading-[1.85] text-ink-800 dark:text-ink-200"
          dangerouslySetInnerHTML={{ __html: formatInline(block) }}
        />
      )
    })
  }

  return (
    <>
      <ReadingProgress />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left TOC sidebar (sticky) */}
          <aside className="hidden lg:block lg:col-span-2">
            <div className="sticky top-20">
              <TableOfContents sections={tocSections} />
            </div>
          </aside>

          {/* Main article body */}
          <article className="lg:col-span-7 max-w-3xl">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="news">{article.category.toUpperCase()}</Badge>
              {article.isLongForm && <Badge variant="nova" size="sm" icon={<FileText className="w-3 h-3" />}>深度</Badge>}
              {article.isFeatured && <Badge variant="outline" size="sm" className="border-news-500 text-news-600">编辑精选</Badge>}
              {article.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" size="sm">#{t}</Badge>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-balance">
              {article.title}
            </h1>
            <p className="text-lg sm:text-xl text-ink-600 dark:text-ink-300 mt-5 leading-relaxed text-balance">
              {article.subtitle}
            </p>

            {/* AI Action bar */}
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <button
                onClick={async () => {
                  setShowSummary(!showSummary)
                  if (!summary && !ai.loading) {
                    const plain = (article.content || '').slice(0, 3000)
                    const r = await ai.stream(`标题：${article.title}\n副标题：${article.subtitle || ''}\n\n正文：\n${plain}`, PROMPTS.newsSummary, { maxTokens: 600 })
                    if (r) setSummary(r)
                  }
                }}
                disabled={ai.loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-nova-500/15 to-purple-500/15 text-nova-600 dark:text-nova-300 hover:from-nova-500/25 hover:to-purple-500/25 transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                AI 一键摘要
                <AIBadge className="ml-0.5" />
              </button>
              <button
                onClick={async () => {
                  setShowTranslation(!showTranslation)
                  if (!translation && !ai.loading) {
                    const r = await ai.run(`请将以下文章标题和副标题翻译成英文：\n\n标题：${article.title}\n副标题：${article.subtitle || ''}`, PROMPTS.translation, { temperature: 0.3 })
                    if (r) setTranslation(r)
                  }
                }}
                disabled={ai.loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200 transition"
              >
                <Languages className="w-3.5 h-3.5" />
                译为英文
              </button>
            </div>

            {/* AI Summary Card */}
            <AnimatePresence>
              {showSummary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 rounded-2xl bg-gradient-to-br from-nova-50 via-purple-50 to-pink-50 dark:from-nova-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-nova-200/50 dark:border-nova-800/50 p-5 relative overflow-hidden"
                >
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-nova-500/10 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AIBadge />
                        <h3 className="font-bold text-sm">AI 摘要</h3>
                      </div>
                      <button onClick={() => setShowSummary(false)} className="p-1 rounded-full hover:bg-white/40">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {ai.loading && !summary && (
                      <AIIndicator loading text="AI 正在提炼要点…" />
                    )}
                    {ai.error && <AIErrorBanner message={ai.error} />}
                    {summary && (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed text-ink-800 dark:text-ink-100">
                        {summary}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Translation Card */}
            <AnimatePresence>
              {showTranslation && translation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300 flex items-center gap-1">
                      <Languages className="w-3 h-3" />
                      English
                    </span>
                    <button onClick={() => setShowTranslation(false)} className="p-1 rounded-full hover:bg-white/40">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-ink-700 dark:text-ink-200 whitespace-pre-wrap leading-relaxed">
                    {translation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Author byline */}
            <div className="flex items-center justify-between py-5 border-y border-ink-200/60 dark:border-ink-800/60 my-8">
              <div className="flex items-center gap-3">
                <img src={article.author.avatar} alt="" className="w-11 h-11 rounded-full ring-2 ring-white dark:ring-ink-900" />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1">
                    {article.author.name}
                    {article.author.verified && <Sparkles className="w-3.5 h-3.5 text-news-500" />}
                  </div>
                  <div className="text-xs text-ink-500 dark:text-ink-400 flex items-center gap-2 mt-0.5">
                    <span>{article.source || 'Versa 编辑部'}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} 分钟</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(article.views)}</span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast('链接已复制', 'success') }} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors" aria-label="分享">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={() => toast('已加入书签', 'success')} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors" aria-label="收藏">
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cover */}
            <div className="aspect-[16/9] rounded-3xl overflow-hidden mb-10 bg-ink-100 dark:bg-ink-800 shadow-xl shadow-ink-900/5">
              <img src={article.cover} alt="" className="w-full h-full object-cover" />
            </div>

            <div ref={contentRef} data-article-body className="prose-versa">
              {renderContent(article.content)}
            </div>

            {/* Reactions bar */}
            <div className="mt-12 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-news-500/8 via-nova-500/5 to-transparent border border-news-500/20">
              <div className="text-center mb-4">
                <div className="text-sm font-bold text-news-600">这篇文章对你有启发吗？</div>
                <div className="text-[11px] text-ink-500 mt-1">阅读进度：{readArticles[article.id] || 0}%</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <ReactionButton active={reaction === 'like'} onClick={() => reactTo('like')} icon={<Heart className={cn('w-5 h-5', reaction === 'like' && 'fill-current')} />} label="赞同" count={article.reactions.like} color="debate" />
                <ReactionButton active={reaction === 'insightful'} onClick={() => reactTo('insightful')} icon={<Lightbulb className="w-5 h-5" />} label="有启发" count={article.reactions.insightful} color="news" />
                <ReactionButton active={reaction === 'disagree'} onClick={() => reactTo('disagree')} icon={<ThumbsDown className="w-5 h-5" />} label="存疑" count={article.reactions.disagree} color="ink" />
              </div>
            </div>

            {/* 跨模块融合：辩论 */}
            {linkedDebate && (
              <div className="mt-10 rounded-3xl overflow-hidden border border-debate-500/20 bg-gradient-to-br from-debate-500/8 to-nova-500/5">
                <div className="p-6 sm:p-8 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-debate-500/15 text-debate-600 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-debate-600">本报道延伸出辩论</span>
                      <Badge variant="debate" size="sm">开放中</Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{linkedDebate.title}</h3>
                    <p className="text-sm text-ink-600 dark:text-ink-300 mb-4 line-clamp-2">{linkedDebate.description}</p>
                    <Link to={`/debates/${linkedDebate.id}`}>
                      <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />}>
                        参与这场辩论
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 跨模块融合：商品 */}
            {linkedProducts.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-4 text-shop-600">
                  <ShoppingBag className="w-4 h-4" />
                  <h3 className="font-semibold text-sm">文中提到的商品</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {linkedProducts.map((p) => p && <ProductCardV2 key={p.id} product={p} />)}
                </div>
              </div>
            )}

            {/* 评论入口（占位） */}
            <div className="mt-10 rounded-3xl p-6 sm:p-8 bg-ink-50/40 dark:bg-ink-900/30 border border-ink-200/40 dark:border-ink-800/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> 读者讨论 (42)
                </h3>
                <button className="text-xs text-news-600 hover:underline">查看全部</button>
              </div>
              <div className="text-sm text-ink-500 text-center py-6">
                登录后即可参与讨论
              </div>
            </div>

            {/* 相关阅读 */}
            {related.length > 0 && (
              <div className="mt-10">
                <h3 className="text-xl font-bold mb-5">相关阅读</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {related.map((a) => <NewsCard key={a.id} article={a} variant="compact" />)}
                </div>
              </div>
            )}
          </article>

          {/* Right sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="sticky top-20 space-y-6">
              <AuthorBio
                author={article.author}
                articleCount={news.filter((n) => n.author.id === article.author.id).length}
                totalReads={news.filter((n) => n.author.id === article.author.id).reduce((s, n) => s + n.views, 0)}
              />

              {/* 延伸：相关辩论 */}
              {linkedDebate && (
                <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 p-4">
                  <div className="text-xs font-bold text-debate-600 mb-2">延伸阅读 · 辩论</div>
                  <DebateCard debate={linkedDebate} variant="compact" />
                </div>
              )}

              {/* 延伸：相关商品 */}
              {linkedProducts.length > 0 && (
                <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 p-4">
                  <div className="text-xs font-bold text-shop-600 mb-2">延伸阅读 · 商品</div>
                  <div className="space-y-2">
                    {linkedProducts.slice(0, 3).map((p) => p && (
                      <Link
                        key={p.id}
                        to={`/shop/${p.id}`}
                        className="flex gap-3 p-2 rounded-xl hover:bg-ink-50/60 dark:hover:bg-ink-900/40 transition-colors group"
                      >
                        <img src={p.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-2 group-hover:text-shop-600">{p.name}</div>
                          <div className="text-xs text-shop-600 font-bold mt-1">¥{p.price}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

function ReactionButton({ active, onClick, icon, label, count, color }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number; color: 'debate' | 'news' | 'ink' }) {
  const colorMap = {
    debate: active ? 'bg-debate-500 text-white border-debate-500 shadow-lg shadow-debate-500/20' : 'hover:bg-debate-500/10 hover:text-debate-600 hover:border-debate-500/30',
    news: active ? 'bg-news-500 text-white border-news-500 shadow-lg shadow-news-500/20' : 'hover:bg-news-500/10 hover:text-news-600 hover:border-news-500/30',
    ink: active ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900 border-ink-900' : 'hover:bg-ink-100 dark:hover:bg-ink-800',
  }
  return (
    <button
      onClick={onClick}
      className={cn('flex flex-col items-center justify-center py-4 rounded-2xl border border-ink-200 dark:border-ink-800 transition-all', colorMap[color])}
    >
      <div className="mb-1.5">{icon}</div>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] opacity-60 mt-0.5 tabular-nums">{formatNumber(count)}</div>
    </button>
  )
}

function formatInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-ink-900 dark:text-white">$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, t, h) => `<a href="${h}" class="text-news-600 hover:underline font-medium">${t}</a>`)
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-sm">$1</code>')
}

function slugify(s: string): string {
  return 'section-' + Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
}

function extractToc(content: string): { heading: string; anchor: string }[] {
  const headings: { heading: string; anchor: string }[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)
    if (h2Match) {
      headings.push({ heading: h2Match[1], anchor: slugify(h2Match[1]) })
    }
  }
  return headings
}
