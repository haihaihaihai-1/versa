import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  Newspaper, Scale, ShoppingBag, Sparkles, Code, Heart, Star, Zap, Globe, ArrowRight, ArrowDown,
  Users, BookOpen, MessageSquare, Award, Infinity as InfinityIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { GithubIcon } from '../components/ui/BrandIcons'
import { authors } from '../data'

export function AboutPage() {
  return (
    <div className="overflow-hidden">
      {/* HERO — 苹果风 full-bleed */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-gradient-to-b from-ink-50 to-white dark:from-ink-950 dark:to-ink-900">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(115,68,255,0.15),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.12),_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(249,115,22,0.10),_transparent_50%)]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge variant="nova" className="mb-6"><Sparkles className="w-3 h-3" /> Versa 1.0</Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tighter"
          >
            <span className="block">读。辩。</span>
            <span className="block gradient-text-aurora">然后买。</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 text-xl sm:text-2xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Versa 把资讯、辩论、购物编织成一个回路。<br />
            让每一个消费决定都从思考中诞生。
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })} rightIcon={<ArrowDown className="w-4 h-4" />}>
              了解更多
            </Button>
            <Link to="/">
              <Button size="lg" variant="ghost">进入 Versa</Button>
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-ink-400 text-xs tracking-widest uppercase animate-bounce">
          scroll
        </div>
      </section>

      {/* Mission — 苹果风大段文字 */}
      <section id="mission" className="py-32 sm:py-40">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm uppercase tracking-widest text-ink-500 mb-6">Our Mission</p>
            <h2 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight text-balance">
              消费<span className="gradient-text"> 不应是冲动</span>，<br />
              而应是<span className="gradient-text">回路的终点</span>。
            </h2>
            <p className="mt-10 text-xl text-ink-600 dark:text-ink-300 leading-relaxed max-w-2xl mx-auto">
              我们相信：当你读一篇文章、参与一场辩论、做出一次消费选择时，
              这三件事应当形成一个完整的回路。
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* 三大支柱 — 大图 + 文字 苹果风 */}
      <section className="pb-20 sm:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          <Pillar
            tag="01"
            color="news"
            icon={Newspaper}
            title="资讯激发思考"
            subtitle="News That Matters"
            description="深度新闻、独家视角、跨领域观察。我们不只告诉你发生了什么，更解释为什么重要。"
            points={['编辑精选 · 30+ 篇深度长文', '7×24 快讯流 · 持续更新', '多视角作者阵容 · 100+ 签约作者']}
            image="https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1400&q=80&auto=format&fit=crop"
            cta={{ label: '进入资讯', to: '/news' }}
          />
          <Pillar
            tag="02"
            color="debate"
            icon={Scale}
            title="辩论构建判断"
            subtitle="Think Through Disagreement"
            description="正反方观点交锋、理性投票、共识构建。让你的判断力在交锋中形成。"
            points={['10+ 场进行中辩论', '圆桌直播 · 嘉宾深度参与', '证据链系统 · 不止于立场']}
            image="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1400&q=80&auto=format&fit=crop"
            cta={{ label: '加入辩论', to: '/debates' }}
            reverse
          />
          <Pillar
            tag="03"
            color="shop"
            icon={ShoppingBag}
            title="购物验证决策"
            subtitle="Buy With Conviction"
            description="真实评价、编辑选品、理性消费。让购买行为从消费冲动变成决策完成。"
            points={['12+ 精选品牌 · 200+ SKU', '30 天深度评测 · 真实数据', '完整售后保障 · 7 天无理由']}
            image="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=80&auto=format&fit=crop"
            cta={{ label: '开始购物', to: '/shop' }}
          />
        </div>
      </section>

      {/* 数字 */}
      <section className="py-24 sm:py-32 bg-ink-50/60 dark:bg-ink-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-widest text-ink-500 mb-4">By the Numbers</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">用数字说话</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
            {[
              { v: '12+', label: '深度资讯', sub: '篇 / 月', color: 'text-news-500' },
              { v: '10+', label: '进行中辩论', sub: '场 / 月', color: 'text-debate-500' },
              { v: '12+', label: '精选商品', sub: '款 / 季', color: 'text-shop-500' },
              { v: '∞', label: '思想回路', sub: '持续生成', color: 'text-nova-500' },
            ].map((s) => (
              <ScrollReveal key={s.label}>
                <div className="text-center">
                  <div className={cn('text-6xl sm:text-7xl font-bold tracking-tighter', s.color)}>{s.v}</div>
                  <div className="mt-3 text-base font-semibold text-ink-900 dark:text-white">{s.label}</div>
                  <div className="text-xs text-ink-500 mt-1">{s.sub}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 团队 — 苹果风 big face */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-widest text-ink-500 mb-4">The People</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">背后的撰稿人</h2>
              <p className="mt-4 text-ink-500 max-w-2xl mx-auto">来自科技、财经、文化、科学、国际、生活方式六大领域的专业作者阵容</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.values(authors).slice(0, 7).map((a) => (
              <ScrollReveal key={a.id}>
                <div className="text-center group">
                  <div className="aspect-square rounded-3xl overflow-hidden bg-ink-100 dark:bg-ink-800 mb-3 ring-1 ring-ink-200 dark:ring-ink-800 group-hover:ring-nova-500/40 transition-all">
                    <img src={a.avatar} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="font-bold text-sm flex items-center justify-center gap-1">
                    {a.name}
                    {a.verified && <Sparkles className="w-3 h-3 text-news-500" />}
                  </div>
                  <div className="text-xs text-ink-500 mt-0.5">{a.bio?.split('·')[0] || '特约撰稿人'}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 技术栈 — 苹果风克制列表 */}
      <section className="py-24 sm:py-32 bg-ink-50/60 dark:bg-ink-950/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-widest text-ink-500 mb-4">Under the Hood</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">精心选择的技术栈</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'React 19', desc: '最新版本的 React，更快的渲染和更好的并发模式', icon: Code },
              { name: 'Vite 8', desc: '极速的开发服务器，毫秒级 HMR', icon: Zap },
              { name: 'Tailwind CSS 4', desc: '原子化 CSS + 设计 Token', icon: Sparkles },
              { name: 'React Router 7', desc: '稳定的客户端路由，支持嵌套布局', icon: Globe },
              { name: 'Framer Motion', desc: '流畅的微动效，让交互有质感', icon: Heart },
              { name: 'PocketBase', desc: '轻量级自托管 BaaS，自动降级到 localStorage', icon: Star },
            ].map((t) => (
              <ScrollReveal key={t.name}>
                <div className="p-5 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nova-500/15 to-shop-500/10 flex items-center justify-center text-nova-600 flex-shrink-0">
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base">{t.name}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{t.desc}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 开源 CTA — 苹果风全宽 */}
      <section className="py-32 sm:py-40 bg-gradient-to-b from-ink-900 to-black text-white">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <GithubIcon className="w-12 h-12 mx-auto mb-8 opacity-90" />
            <h2 className="text-5xl sm:text-7xl font-bold leading-[0.95] tracking-tighter">
              <span className="block">完全开源。</span>
              <span className="block text-ink-400">欢迎 Fork。</span>
            </h2>
            <p className="mt-8 text-lg sm:text-xl text-ink-300 max-w-2xl mx-auto leading-relaxed">
              Versa 的所有代码都以 MIT 协议开源。<br />
              欢迎 fork、star、提 PR，或者把它部署到自己的域名下。
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a href="https://github.com/haihaihaihai-1/versa" target="_blank" rel="noopener">
                <Button size="lg" leftIcon={<GithubIcon className="w-4 h-4" />}>GitHub 仓库</Button>
              </a>
              <a href="https://github.com/haihaihaihai-1/versa/issues" target="_blank" rel="noopener">
                <Button size="lg" variant="outline" className="!text-white !border-white/30 hover:!bg-white/10">提 Issue</Button>
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer links */}
      <section className="py-20 border-t border-ink-200 dark:border-ink-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ModuleLink to="/news" icon={Newspaper} label="浏览资讯" color="news" />
          <ModuleLink to="/debates" icon={Scale} label="参与辩论" color="debate" />
          <ModuleLink to="/shop" icon={ShoppingBag} label="开始购物" color="shop" />
        </div>
      </section>
    </div>
  )
}

function Pillar({ tag, color, icon: Icon, title, subtitle, description, points, image, cta, reverse }: any) {
  return (
    <ScrollReveal>
      <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center', reverse && 'lg:[&>*:first-child]:order-2')}>
        <div>
          <div className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: `var(--color-${color}-500)` }}>{tag} · {subtitle}</div>
          <h3 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6">{title}</h3>
          <p className="text-lg text-ink-600 dark:text-ink-300 leading-relaxed mb-6">{description}</p>
          <ul className="space-y-2.5 mb-8">
            {points.map((p: string) => (
              <li key={p} className="flex items-start gap-2.5 text-sm">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `var(--color-${color}-500)20`, color: `var(--color-${color}-500)` }}>
                  <Star className="w-3 h-3" fill="currentColor" />
                </div>
                <span className="text-ink-700 dark:text-ink-200">{p}</span>
              </li>
            ))}
          </ul>
          <Link to={cta.to}>
            <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              {cta.label}
            </Button>
          </Link>
        </div>
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-ink-100 dark:bg-ink-800">
          <img src={image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 to-transparent" />
          <div className="absolute top-6 left-6 w-12 h-12 rounded-2xl bg-white/95 dark:bg-ink-900/90 backdrop-blur flex items-center justify-center shadow-xl" style={{ color: `var(--color-${color}-500)` }}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}

function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const ob = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            ob.disconnect()
          }
        })
      },
      { threshold: 0.15 }
    )
    if (ref.current) ob.observe(ref.current)
    return () => ob.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  )
}

function ModuleLink({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) {
  return (
    <Link to={to} className="group p-6 rounded-2xl bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 flex items-center justify-between card-hover">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" style={{ color: `var(--color-${color}-500)` }} />
        <span className="font-semibold">{label}</span>
      </div>
      <ArrowRight className="w-4 h-4 text-ink-400 group-hover:translate-x-1 transition-transform" />
    </Link>
  )
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(' ')
}
