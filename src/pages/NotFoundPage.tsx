import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="text-9xl font-bold gradient-text-aurora mb-4">404</div>
      <Compass className="w-12 h-12 mx-auto text-ink-300 mb-4" />
      <h1 className="text-2xl font-bold mb-2">页面在 Versa 三维中迷失了</h1>
      <p className="text-ink-500 dark:text-ink-400 mb-8">也许是链接失效了，或者这里从未存在过</p>
      <Link to="/"><Button leftIcon={<Home className="w-4 h-4" />}>返回首页</Button></Link>
    </div>
  )
}
