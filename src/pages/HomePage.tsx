import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Newspaper, Scale, ShoppingBag, Sparkles, ArrowRight,
  TrendingUp, MessageCircle, Flame, Award, ChevronRight,
} from 'lucide-react'
import { news, debates, products, moduleMeta } from '../data'
import { versa, useVersa, levelFor, levelTitle, levelProgress } from '../store/versa'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { ProductCard } from '../components/shop/ProductCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar, ScorePill } from '../components/ui/Progress'
import { formatNumber, cn } from '../lib/utils'

export function HomePage() {
  const { user, visitedModules } = useVersa()
  const navigate = useNavigate()
  const trendingNews = news.slice(0, 3)
  const featureNews = news[0]
  const trendingDebates = [...debates].sort((a, b) => b.hot - a.hot).slice(0, 3)
  const trendingProducts = products.slice(0, 4)
  const rep = levelProgress(user.reputation)

  useEffect(() => {
    versa.visitModule('news')
  }, [])

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg-hero opacity-30 dark:opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(115,68,255,0.15),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 sm:pt-20 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="nova" className="mb-5">
              <Sparkles className="w-3 h-3" /> 三体融合平台 · 重新定义消费决策
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              新闻激发辩论<br />
              <span className="gradient-text-aurora">辩论推荐商品</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Versa 把资讯、辩论、购物编织成一个有机整体。
              读一篇深度文章、参与一场思想碰撞、做出更明智的购买决定——一个回路完成。
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => navigate('/news')} leftIcon={<Newspaper className="w-4 h-4" />}>
                开始阅读
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/debates')} leftIcon={<Scale className="w-4 h-4" />}>
                加入辩论
              </Button>
            </div>
          </motion.div>

          {/* 模块入口卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
          >
            {([
              { k: 'news' as const, ...moduleMeta.news, icon: Newspaper, to: '/news', gradient: 'from-news-500/20 to-news-500/0' },
              { k: 'debate' as const, ...moduleMeta.debate, icon: Scale, to: '/debates', gradient: 'from-debate-500/20 to-debate-500/0' },
              { k: 'shop' as const, ...moduleMeta.shop, icon: ShoppingBag, to: '/shop', gradient: 'from-shop-500/20 to-shop-500/0' },
            ]).map((m, i) => (
              <Link
                key={m.k}
                to={m.to}
                className="group relative rounded-2xl p-6 sm:p-8 bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden card-hover"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={cn('absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br opacity-50 blur-2xl group-hover:opacity-80 transition-opacity', m.gradient)} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: m.color + '20', color: m.color }}>
                      <m.icon className="w-6 h-6" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{m.name} <span className="text-sm font-normal text-ink-500">{m.nameEn}</span></h3>
                  <p className="text-sm text-ink-600 dark:text-ink-300">{m.description}</p>
                  <div className="mt-5 text-xs text-ink-500 dark:text-ink-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                    您已访问 {visitedModules[m.k]} 次
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 特性新闻 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeader title="编辑精选" subtitle="本周最值得花时间阅读的深度内容" icon={Sparkles} />
        <div className="mt-6">
          <NewsCard article={featureNews} variant="feature" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingNews.slice(1).map((a) => (
            <NewsCard key={a.id} article={a} />
          ))}
        </div>
      </section>

      {/* 融合：跨模块关联 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-nova-500/10 via-debate-500/10 to-shop-500/10 border border-ink-200/60 dark:border-ink-800/60">
          <SectionHeader
            title="三体融合 · 案例"
            subtitle="看资讯、辩论、购物如何在 Versa 真实地连接"
            icon={Flame}
            variant="aurora"
          />
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <FusionCard
              color="news"
              icon={Newspaper}
              title="资讯 → 辩论"
              description="读完一篇关于 AI 的深度文章，一键进入正反双方观点交锋"
              example="《生成式 AI 进入协作时代》 → 辩论：AI 该主动向用户提问吗？"
            />
            <FusionCard
              color="debate"
              icon={Scale}
              title="辩论 → 商品"
              description="在辩论中看到大家讨论的产品，直接跳转购买"
              example="辩论：传统车企还能翻盘吗？ → BYD Atto 3 升级版"
            />
            <FusionCard
              color="shop"
              icon={ShoppingBag}
              title="商品 → 资讯"
              description="商品详情页附带相关资讯、评测和媒体报道"
              example="Versa Smart Hub X1 → 30 天深度评测报道"
            />
          </div>
        </div>
      </section>

      {/* 辩论 + 购物并排 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <SectionHeader title="热议话题" subtitle="当下最值得参与的观点交锋" icon={Scale} accentColor="debate" />
            <div className="mt-6 space-y-4">
              {trendingDebates.map((d) => (
                <DebateCard key={d.id} debate={d} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/debates" className="text-sm text-nova-600 font-medium hover:underline inline-flex items-center gap-1">
                查看全部辩论 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div>
            <SectionHeader title="编辑选品" subtitle="来自 Versa 编辑部的好物推荐" icon={ShoppingBag} accentColor="shop" />
            <div className="mt-6 grid grid-cols-2 gap-4">
              {trendingProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/shop" className="text-sm text-nova-600 font-medium hover:underline inline-flex items-center gap-1">
                浏览全部商品 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 跨模块成就/积分 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl p-6 sm:p-10 bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="nova" className="mb-3">
                <Award className="w-3 h-3" /> Versa 声誉系统
              </Badge>
              <h2 className="text-3xl font-bold">在 Versa 积累你的<span className="gradient-text"> 思想货币</span></h2>
              <p className="mt-3 text-ink-600 dark:text-ink-300">
                读资讯、参与辩论、收藏商品都会获得声誉值。声誉代表你对三个领域的参与深度，跨模块活跃的用户将获得专属勋章。
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Lv.{user.level} {levelTitle(user.level)}</span>
                  <span className="text-ink-500">{user.reputation} / {rep.next + user.reputation - rep.current} 声誉</span>
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
                  <div className="text-xs text-ink-500 mt-0.5">{b.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  accentColor = 'nova',
  variant = 'default',
}: {
  title: string
  subtitle?: string
  icon: any
  accentColor?: 'nova' | 'debate' | 'shop' | 'news'
  variant?: 'default' | 'aurora'
}) {
  const colorMap = {
    nova: 'text-nova-500',
    debate: 'text-debate-500',
    shop: 'text-shop-500',
    news: 'text-news-500',
  }
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={cn('w-4 h-4', colorMap[accentColor])} />
          <h2 className={cn('text-2xl sm:text-3xl font-bold tracking-tight', variant === 'aurora' && 'gradient-text-aurora')}>
            {title}
          </h2>
        </div>
        {subtitle && <p className="text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function FusionCard({ icon: Icon, title, description, example, color }: { icon: any; title: string; description: string; example: string; color: 'news' | 'debate' | 'shop' }) {
  const colorMap = {
    news: { bg: 'bg-news-500/10', text: 'text-news-600' },
    debate: { bg: 'bg-debate-500/10', text: 'text-debate-600' },
    shop: { bg: 'bg-shop-500/10', text: 'text-shop-600' },
  }
  return (
    <div className="rounded-2xl p-5 bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colorMap[color].bg, colorMap[color].text)}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-ink-600 dark:text-ink-300 mb-3">{description}</p>
      <div className="text-xs text-ink-500 dark:text-ink-400 italic border-l-2 border-ink-200 dark:border-ink-800 pl-3">
        {example}
      </div>
    </div>
  )
}
