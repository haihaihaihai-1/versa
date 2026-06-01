import { Link } from 'react-router-dom'
import { Newspaper, Scale, ShoppingBag, Sparkles, Code, Heart, Star, Zap, Globe, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { GithubIcon } from '../components/ui/BrandIcons'

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="nova" className="mb-4"><Sparkles className="w-3 h-3" /> 关于 Versa</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          三体融合，<br />
          <span className="gradient-text-aurora">一站式思想消费</span>
        </h1>
        <p className="mt-6 text-lg text-ink-600 dark:text-ink-300">
          Versa 不是一个资讯站，不是一个辩论场，不是一个购物平台——它是这三者的有机融合。
          我们相信：当你读一篇文章、参与一场辩论、做出一次消费选择时，
          这三件事应当形成一个完整的回路。
        </p>
      </div>

      {/* 核心理念 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          { icon: Newspaper, title: '资讯激发思考', color: 'news', desc: '深度新闻、独家视角、跨领域观察。不只是告诉你发生了什么，更解释为什么重要。' },
          { icon: Scale, title: '辩论构建判断', color: 'debate', desc: '正反方观点交锋、理性投票、共识构建。让你的判断力在交锋中形成。' },
          { icon: ShoppingBag, title: '购物验证决策', color: 'shop', desc: '真实评价、编辑选品、理性消费。让购买行为从"消费冲动"变成"决策完成"。' },
        ].map((m) => (
          <div key={m.title} className="p-6 rounded-2xl bg-white/70 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${m.color}-500/10`} style={{ color: `var(--color-${m.color}-500)` }}>
              <m.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">{m.title}</h3>
            <p className="text-ink-600 dark:text-ink-300 text-sm leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </section>

      {/* 数据 */}
      <section className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-nova-500/10 via-debate-500/10 to-shop-500/10 border border-ink-200/60 dark:border-ink-800/60 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: '10+', label: '深度资讯' },
            { v: '8+', label: '进行中辩论' },
            { v: '12+', label: '精选商品' },
            { v: '∞', label: '思想回路' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-bold gradient-text-aurora">{s.v}</div>
              <div className="text-sm text-ink-500 dark:text-ink-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 技术栈 */}
      <section className="mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">技术架构</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'React 19', desc: '最新版本的 React，更快的渲染和更好的并发模式', icon: Code, color: 'nova' },
            { name: 'Vite 8', desc: '极速的开发服务器，毫秒级 HMR', icon: Zap, color: 'shop' },
            { name: 'Tailwind CSS 4', desc: '原子化 CSS + 设计 Token，快速构建一致的设计系统', icon: Sparkles, color: 'news' },
            { name: 'React Router 7', desc: '稳定的客户端路由，支持嵌套布局', icon: Globe, color: 'debate' },
            { name: 'Framer Motion', desc: '流畅的微动效，让交互有质感', icon: Heart, color: 'nova' },
            { name: 'Lucide Icons', desc: '精美的开源图标系统', icon: Star, color: 'shop' },
          ].map((t) => (
            <div key={t.name} className="p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nova-500/10 flex items-center justify-center text-nova-500 flex-shrink-0">
                <t.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-ink-500 mt-0.5">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 开源 */}
      <section className="rounded-3xl p-8 sm:p-10 bg-ink-900 text-white text-center">
        <GithubIcon className="w-10 h-10 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">完全开源</h2>
        <p className="text-ink-300 max-w-xl mx-auto mb-6">
          Versa 的所有代码都以 MIT 协议开源，欢迎 fork、star、提 PR。
          我们也欢迎你把它部署到自己的域名下——只需要改一行配置。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="https://github.com/haihaihaihai-1/versa" target="_blank" rel="noopener">
            <Button leftIcon={<GithubIcon className="w-4 h-4" />}>GitHub 仓库</Button>
          </a>
          <a href="https://github.com/haihaihaihai-1/versa/issues" target="_blank" rel="noopener">
            <Button variant="outline" className="!text-white !border-white/30 hover:!bg-white/10">提 Issue</Button>
          </a>
        </div>
      </section>

      {/* 链接到三大模块 */}
      <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ModuleLink to="/news" icon={Newspaper} label="浏览资讯" color="news" />
        <ModuleLink to="/debates" icon={Scale} label="参与辩论" color="debate" />
        <ModuleLink to="/shop" icon={ShoppingBag} label="开始购物" color="shop" />
      </section>
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
