import { Link } from 'react-router-dom'
import { Mail, Heart, Sparkles } from 'lucide-react'
import { GithubIcon, XIcon } from '../ui/BrandIcons'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-200 dark:border-ink-800 bg-gradient-to-b from-transparent to-ink-50/40 dark:to-ink-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nova-400 via-debate-500 to-shop-500 flex items-center justify-center text-white font-bold">
                V
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-base">Versa</span>
                <span className="text-[10px] text-ink-500">三体融合平台</span>
              </div>
            </Link>
            <p className="text-sm text-ink-600 dark:text-ink-400 max-w-sm leading-relaxed">
              在 Versa，<span className="text-news-500 font-medium">资讯</span> 激发 <span className="text-debate-500 font-medium">辩论</span>，
              辩论推荐 <span className="text-shop-500 font-medium">商品</span>，商品成为新闻。三位一体，构建完整的消费决策回路。
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a href="https://github.com/haihaihaihai-1/versa" target="_blank" rel="noopener" className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center hover:bg-nova-100 dark:hover:bg-nova-900/40 transition-colors">
                <GithubIcon className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center hover:bg-nova-100 dark:hover:bg-nova-900/40 transition-colors">
                <XIcon className="w-4 h-4" />
              </a>
              <a href="mailto:hi@versa.app" className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center hover:bg-nova-100 dark:hover:bg-nova-900/40 transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">三大模块</h4>
            <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-400">
              <li><Link to="/news" className="hover:text-nova-600">资讯 News</Link></li>
              <li><Link to="/debates" className="hover:text-nova-600">辩论 Debate</Link></li>
              <li><Link to="/shop" className="hover:text-nova-600">购物 Shop</Link></li>
              <li><Link to="/profile" className="hover:text-nova-600">个人中心</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">了解 Versa</h4>
            <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-400">
              <li><Link to="/about" className="hover:text-nova-600">关于平台</Link></li>
              <li><a href="https://github.com/haihaihaihai-1/versa" className="hover:text-nova-600">开源仓库</a></li>
              <li><a href="#" className="hover:text-nova-600">API 文档</a></li>
              <li><a href="#" className="hover:text-nova-600">开发者中心</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">其他</h4>
            <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-400">
              <li><a href="#" className="hover:text-nova-600">用户协议</a></li>
              <li><a href="#" className="hover:text-nova-600">隐私政策</a></li>
              <li><a href="#" className="hover:text-nova-600">品牌资源</a></li>
              <li><a href="#" className="hover:text-nova-600">联系我们</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-ink-200 dark:border-ink-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-500 dark:text-ink-400">
          <p>© 2026 Versa. Build with <Heart className="inline w-3 h-3 text-debate-500" /> on the internet.</p>
          <p className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-nova-500" />
            Powered by ideas, shipped with code.
          </p>
        </div>
      </div>
    </footer>
  )
}
