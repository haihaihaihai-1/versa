import { Link } from 'react-router-dom'
import { products } from '../data'
import { useVersa } from '../store/versa'
import { ProductCard } from '../components/shop/ProductCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Heart, ShoppingBag } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function WishlistPage() {
  const { wishlist } = useVersa()
  const items = products.filter((p) => wishlist.includes(p.id))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">我的收藏</h1>
      <p className="text-ink-500 dark:text-ink-400 mb-8">{items.length} 件好物</p>

      {items.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-7 h-7" />}
          title="还没有收藏任何商品"
          description="在商品页点击心形图标即可收藏"
          action={
            <Link to="/shop"><Button leftIcon={<ShoppingBag className="w-4 h-4" />}>去逛逛</Button></Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
