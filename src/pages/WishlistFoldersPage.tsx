import { WishlistFolders } from '../components/WishlistFolders'
import { Heart } from 'lucide-react'

export function WishlistFoldersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Heart className="w-6 h-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold">收藏夹</h1>
          <p className="text-sm text-ink-500">多分组管理收藏商品</p>
        </div>
      </div>
      <WishlistFolders />
    </div>
  )
}
