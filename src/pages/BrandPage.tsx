import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Award, Package, TrendingUp } from 'lucide-react'
import { products, brands } from '../data/products'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Button } from '../components/ui/Button'

export function BrandPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const brand = brands.find((b) => b.id === id)
  const brandProducts = products.filter((p) => p.brand.toLowerCase().replace(/\s+/g, '-') === id)

  if (!brand || brandProducts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">品牌不存在</h2>
        <Button onClick={() => navigate('/shop')}>返回商城</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* 品牌 hero */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-shop-500/20 via-nova-500/10 to-debate-500/20 p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden bg-white shadow-lg flex-shrink-0">
            <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{brand.name}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-news-500 to-news-600 text-white text-xs font-bold">
                <Award className="w-3 h-3" />官方旗舰
              </span>
            </div>
            <p className="text-sm text-ink-600 dark:text-ink-300 mt-1">{brand.story}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-shop-600" />
                <span><strong>{brand.productCount}</strong> 款商品</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-news-600" />
                <span>累计销量 <strong>{(brand.totalSales / 10000).toFixed(1)}</strong> 万</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div>
        <h2 className="text-xl font-bold mb-4">全部商品</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {brandProducts.map((p) => <ProductCardV2 key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  )
}
