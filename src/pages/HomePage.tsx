import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Newspaper, Scale, ShoppingBag, Sparkles, ArrowRight,
  TrendingUp, MessageCircle, Flame, Award, ChevronRight, Zap, Eye, Clock, Users, Heart, Package,
} from 'lucide-react'
import { news, debates, products, breakingNews, moduleMeta } from '../data'
import { versa, useVersa, levelFor, levelTitle, levelProgress } from '../store/versa'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { BreakingTicker } from '../components/news/BreakingTicker'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar, ScorePill } from '../components/ui/Progress'
import { formatNumber, formatTimeAgo, cn } from '../lib/utils'
import { StoriesBar } from '../components/social/StoriesBar'
import { CountUp, StaggerContainer, StaggerItem } from '../components/StaggerContainer'

export function HomePage() {
  const { user, visitedModules } = useVersa()
  const navigate = useNavigate()
  const featured = useMemo(() => news.filter((a) => a.isFeatured).slice(0, 4), [])
  const mainFeatured = featured[0]
  const sideFeatured = featured.slice(1, 4)
  const longForm = useMemo(() => news.filter((a) => a.isLongForm), [])
  const today = useMemo(() => [...news].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)), [])
  const trendingDebates = useMemo(() => [...debates].sort((a, b) => b.hot - a.hot).slice(0, 4), [])
  const editorPicks = useMemo(() => products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 4), [])
  const rep = levelProgress(user.reputation)

  useEffect(() => {
    versa.visitModule('news')
  }, [])

  return (
    <div>
      {/* HERO Dashboard Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg-hero opacity-30 dark:opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(115,68,255,0.15),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          {/* Greeting + identity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6 flex-wrap gap-3"
          >
            <div>
              <div className="text-sm text-ink-500 dark:text-ink-400">
                {greeting()}，{user.displayName || '探索者'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                今天有 <span className="text-news-500">{today.length}</span> 篇新文章 ·{' '}
                <span className="text-debate-500">{trendingDebates.length}</span> 场辩论 ·{' '}
                <span className="text-shop-500">{editorPicks.length}</span> 件好物
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="nova" className="text-xs">
                <Sparkles className="w-3 h-3" /> Lv.{user.level} · {levelTitle(user.level)}
              </Badge>
              <Badge variant="outline" className="text-xs">{user.reputation} 声誉</Badge>
            </div>
          </motion.div>

          {/* 快讯 ticker */}
          <div className="mb-5">
            <BreakingTicker />
          </div>

          {/* Hero featured news grid */}
          {mainFeatured && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Link
                to={`/news/${mainFeatured.id}`}
                className="lg:col-span-3 group relative rounded-3xl overflow-hidden bg-ink-900 aspect-[16/10] lg:aspect-[21/10]"
              >
                <img src={mainFeatured.cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
                <div className="relative h-full p-6 sm:p-10 flex flex-col justify-end text-white">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="nova" size="sm" icon={<Sparkles className="w-3 h-3" />}>头条</Badge>
                    <Badge variant="news" size="sm">{categoryLabel(mainFeatured.category)}</Badge>
                    {mainFeatured.isLongForm && <Badge variant="outline" size="sm" className="bg-white/10 border-white/30 text-white">深度</Badge>}
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight max-w-2xl text-balance">
                    {mainFeatured.title}
                  </h2>
                  <p className="text-sm sm:text-base text-ink-200 mt-3 max-w-xl line-clamp-2">{mainFeatured.subtitle}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-ink-300">
                    <img src={mainFeatured.author.avatar} alt="" className="w-5 h-5 rounded-full ring-1 ring-white/40" />
                    <span className="font-medium">{mainFeatured.author.name}</span>
                    <span>·</span>
                    <span>{mainFeatured.readTime} 分钟</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatNumber(mainFeatured.views)}</span>
                  </div>
                </div>
              </Link>
              <div className="lg:col-span-2 flex flex-col gap-3">
                {sideFeatured.map((a) => (
                  <Link
                    key={a.id}
                    to={`/news/${a.id}`}
                    className="group relative rounded-2xl overflow-hidden bg-ink-900 flex-1 min-h-[120px]"
                  >
                    <img src={a.cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
                    <div className="relative h-full p-4 flex flex-col justify-end text-white">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge variant="news" size="sm">{categoryLabel(a.category)}</Badge>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold leading-snug line-clamp-2">{a.title}</h3>
                      <div className="mt-1.5 text-[10px] text-ink-300 flex items-center gap-2">
                        <span>{a.readTime} 分钟</span>
                        <span>·</span>
                        <span>{formatNumber(a.views)} 阅读</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 平台数据 stat strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-6">
        <StaggerContainer stagger={0.08} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Users, value: 128000, suffix: '+', label: '活跃创作者', gradient: 'from-cyan-500 to-blue-500' },
            { icon: Package, value: products.length * 320, suffix: '+', label: '在售好物', gradient: 'from-rose-500 to-pink-500' },
            { icon: MessageCircle, value: debates.length * 1200, suffix: '+', label: '精彩辩论', gradient: 'from-violet-500 to-purple-500' },
            { icon: Heart, value: 5_280_000, suffix: ' 喜爱', label: '用户收藏', gradient: 'from-amber-500 to-orange-500' },
          ].map((s, i) => (
            <StaggerItem key={i}>
              <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/40 dark:border-ink-800/40 p-4 hover:scale-[1.02] transition-transform cursor-default">
                <div className={cn('absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30 bg-gradient-to-br', s.gradient)} />
                <div className="relative flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.gradient)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black tracking-tight">
                      <CountUp to={s.value} />
                      {s.suffix}
                    </div>
                    <p className="text-[10px] text-ink-500">{s.label}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Stories 24h 故事 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        <StoriesBar />
      </section>

      {/* 模块入口 - 紧凑条 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
        <div className="grid grid-cols-3 gap-3">
          {([
            { k: 'news' as const, ...moduleMeta.news, icon: Newspaper, to: '/news', color: 'news' },
            { k: 'debate' as const, ...moduleMeta.debate, icon: Scale, to: '/debates', color: 'debate' },
            { k: 'shop' as const, ...moduleMeta.shop, icon: ShoppingBag, to: '/shop', color: 'shop' },
          ]).map((m) => (
            <Link
              key={m.k}
              to={m.to}
              className="group flex items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 hover:border-current transition-colors"
              style={{ color: m.color === 'news' ? '#0EA5E9' : m.color === 'debate' ? '#F97316' : '#10B981' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'currentColor', color: 'white', opacity: 0.9 }}>
                <m.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-ink-900 dark:text-white">{m.name}</div>
                <div className="text-[10px] text-ink-500">已访问 {visitedModules[m.k]} 次</div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </section>

      {/* 今日要闻列表 + 侧栏 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <SectionHeader title="今日要闻" subtitle="今日最新更新" icon={Newspaper} accentColor="news" link="/news" />
            <div className="mt-6 space-y-0 divide-y divide-ink-100 dark:divide-ink-800">
              {today.slice(0, 6).map((a) => (
                <Link
                  key={a.id}
                  to={`/news/${a.id}`}
                  className="group flex gap-4 py-4 first:pt-0 hover:opacity-90"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-800 flex-shrink-0">
                    <img src={a.cover} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge variant={categoryColor(a.category)} size="sm">{categoryLabel(a.category)}</Badge>
                      {a.isLongForm && <Badge variant="nova" size="sm">深度</Badge>}
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-news-600 transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-sm text-ink-500 dark:text-ink-400 line-clamp-2 mt-1 hidden sm:block">{a.subtitle}</p>
                    <div className="mt-auto pt-2 text-[11px] text-ink-500 flex items-center gap-2">
                      <span>{a.author.name}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(a.publishedAt)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatNumber(a.views)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            {/* 今日辩论 */}
            <div className="rounded-2xl border border-debate-500/20 bg-gradient-to-br from-debate-500/5 to-transparent overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-debate-500/15">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-debate-500" />
                  <h3 className="font-bold text-sm">今日辩论</h3>
                </div>
                <Link to="/debates" className="text-xs text-debate-600 hover:underline">全部 ›</Link>
              </div>
              <div className="p-3 space-y-1.5">
                {trendingDebates.slice(0, 3).map((d) => (
                  <Link
                    key={d.id}
                    to={`/debates/${d.id}`}
                    className="block p-3 rounded-xl hover:bg-white/60 dark:hover:bg-ink-900/40 transition-colors"
                  >
                    <div className="text-sm font-medium line-clamp-2 leading-snug">{d.title}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-500">
                      <MessageCircle className="w-3 h-3" />
                      <span>{d.arguments.length} 论点</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatNumber(d.views)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 24h 热读榜 */}
            <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink-200/60 dark:border-ink-800/60">
                <Flame className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm">24h 热读</h3>
              </div>
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {today.slice(0, 6).sort((a, b) => b.views - a.views).map((a, i) => (
                  <Link
                    key={a.id}
                    to={`/news/${a.id}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-ink-50/60 dark:hover:bg-ink-900/40 transition-colors group"
                  >
                    <span className={cn('text-2xl font-bold leading-none flex-shrink-0 w-7 tabular-nums', i < 3 ? 'text-red-500' : 'text-ink-300')}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium line-clamp-2 group-hover:text-news-600">{a.title}</h4>
                      <div className="text-[10px] text-ink-500 mt-1 flex items-center gap-2">
                        <Eye className="w-3 h-3" />
                        <span className="tabular-nums">{formatNumber(a.views)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* 深度阅读 - 大图卡片 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeader title="深度阅读" subtitle="值得花一个下午读完的" icon={Sparkles} accentColor="nova" link="/news" />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {longForm.slice(0, 3).map((a) => <NewsCard key={a.id} article={a} />)}
        </div>
      </section>

      {/* 选品 + 跨模块 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <SectionHeader title="编辑选品" subtitle="本周值得入手的好物" icon={ShoppingBag} accentColor="shop" link="/shop" />
            <div className="mt-6 grid grid-cols-2 gap-4">
              {editorPicks.map((p) => <ProductCardV2 key={p.id} product={p} compact />)}
            </div>
          </div>
          <div>
            <SectionHeader title="三体融合 · 真实案例" subtitle="看三个模块如何自然连接" icon={Flame} accentColor="nova" />
            <div className="mt-6 space-y-3">
              <FusionCard
                color="news"
                icon={Newspaper}
                title="资讯 → 辩论"
                desc="读完一篇 AI 深度文章 → 直接参与 'AI 应该主动提问吗' 的正反辩论"
              />
              <FusionCard
                color="debate"
                icon={Scale}
                title="辩论 → 商品"
                desc="在 '传统车企能否翻盘' 辩论中看到大家讨论的车款 → 跳转到评测页购买"
              />
              <FusionCard
                color="shop"
                icon={ShoppingBag}
                title="商品 → 资讯"
                desc="商品详情页附带 30 天深度评测、媒体报道、用户真实使用笔记"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 跨模块成就/积分 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl p-6 sm:p-10 bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="nova" className="mb-3">
                <Award className="w-3 h-3" /> Versa 声誉系统
              </Badge>
              <h2 className="text-3xl font-bold">在 Versa 积累你的<span className="gradient-text"> 思想货币</span></h2>
              <p className="mt-3 text-ink-600 dark:text-ink-300">
                读资讯、参与辩论、收藏商品都会获得声誉值。声誉代表你对三个领域的参与深度。
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Lv.{user.level} {levelTitle(user.level)}</span>
                  <span className="text-ink-500">{user.reputation} 声誉</span>
                </div>
                <ProgressBar value={rep.percent} variant="gradient" height="lg" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <ScorePill variant="news" label="读完文章" value={user.stats.articlesRead} />
                <ScorePill variant="debate" label="加入辩论" value={user.stats.debatesJoined} />
                <ScorePill variant="shop" label="购买商品" value={user.stats.productsPurchased} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {user.badges.slice(0, 4).map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-gradient-to-br from-nova-500/10 to-shop-500/10 border border-ink-200/60 dark:border-ink-800/60 text-center">
                  <div className="w-12 h-12 rounded-full bg-nova-500/20 flex items-center justify-center mx-auto mb-2">
                    <Award className="w-6 h-6 text-nova-500" />
                  </div>
                  <div className="font-semibold text-sm">{b.name}</div>
                  <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{b.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function categoryLabel(c: string) {
  return { tech: '科技', finance: '财经', culture: '文化', science: '科学', world: '国际', lifestyle: '生活' }[c] || c
}
function categoryColor(c: string): any {
  return ({ tech: 'nova', finance: 'shop', culture: 'news', science: 'nova', world: 'debate', lifestyle: 'default' } as any)[c] || 'default'
}

function SectionHeader({ title, subtitle, icon: Icon, accentColor = 'nova', link }: { title: string; subtitle?: string; icon: any; accentColor?: 'nova' | 'debate' | 'shop' | 'news'; link?: string }) {
  const colorMap: any = { nova: 'text-nova-500', debate: 'text-debate-500', shop: 'text-shop-500', news: 'text-news-500' }
  return (
    <div className="flex items-end justify-between flex-wrap gap-2">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={cn('w-4 h-4', colorMap[accentColor])} />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="text-sm text-nova-600 font-medium hover:underline inline-flex items-center gap-1">
          查看全部 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

function FusionCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: 'news' | 'debate' | 'shop' }) {
  const colorMap: any = {
    news: { bg: 'bg-news-500/10', text: 'text-news-600' },
    debate: { bg: 'bg-debate-500/10', text: 'text-debate-600' },
    shop: { bg: 'bg-shop-500/10', text: 'text-shop-600' },
  }
  return (
    <div className="rounded-2xl p-4 bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-current transition-colors" style={{ color: color === 'news' ? '#0EA5E9' : color === 'debate' ? '#F97316' : '#10B981' }}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colorMap[color].bg, colorMap[color].text)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-ink-900 dark:text-white">{title}</h3>
          <p className="text-xs text-ink-600 dark:text-ink-300 mt-1 line-clamp-2">{desc}</p>
        </div>
      </div>
    </div>
  )
}
