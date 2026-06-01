import { useNavigate, Link } from 'react-router-dom'
import { products } from '../data/products'
import { compareStore, useCompare, COMPARE_LIMIT } from '../store/compare'
import { useVersa, versa } from '../store/versa'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { toast } from '../components/ui/Toaster'
import {
  Scale, X, Plus, Star, Heart, ShoppingCart, Trash2, GitCompare, ChevronRight,
  Check, Minus, Award, Shield, Truck, Sparkles
} from 'lucide-react'
import { formatCurrency, cn } from '../lib/utils'

const COMPARE_FIELDS = [
  { key: 'cover', label: '商品图', type: 'image' },
  { key: 'price', label: '售价', type: 'price' },
  { key: 'originalPrice', label: '原价', type: 'originalPrice' },
  { key: 'discount', label: '折扣', type: 'discount' },
  { key: 'rating', label: '评分', type: 'rating' },
  { key: 'reviewCount', label: '评价数', type: 'number' },
  { key: 'sales', label: '销量', type: 'number' },
  { key: 'stock', label: '库存', type: 'stock' },
  { key: 'brand', label: '品牌', type: 'text' },
  { key: 'category', label: '类目', type: 'text' },
  { key: 'isFlagship', label: '官方旗舰', type: 'badge' },
  { key: 'isExclusive', label: '独家', type: 'badge' },
  { key: 'flashSale', label: '限时秒杀', type: 'badge' },
  { key: 'specs', label: '规格参数', type: 'specs' },
  { key: 'tags', label: '标签', type: 'tags' },
  { key: 'shipping', label: '物流', type: 'shipping' },
]

const CATEGORY_LABEL: Record<string, string> = {
  tech: '数码', fashion: '服饰', home: '家居', books: '图书', food: '食品', sports: '运动', beauty: '美妆',
}

export function ComparePage() {
  const compareIds = useCompare()
  const { wishlist } = useVersa()
  const navigate = useNavigate()
  const compared = products.filter((p) => compareIds.includes(p.id))
  const recommendedAdd = products.filter((p) => !compareIds.includes(p.id)).slice(0, 4)

  if (compared.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon={<Scale className="w-8 h-8" />}
          title="还没有对比任何商品"
          description={'在商品页点击「对比」按钮即可加入，最多对比 4 件'}
          action={
            <div className="flex gap-2">
              <Link to="/shop"><Button leftIcon={<GitCompare className="w-4 h-4" />}>去逛逛</Button></Link>
            </div>
          }
        />
      </div>
    )
  }

  const cheapest = compared.reduce((a, b) => (a.price < b.price ? a : b))
  const bestRating = compared.reduce((a, b) => (a.rating > b.rating ? a : b))
  const mostSold = compared.reduce((a, b) => ((a.sales || 0) > (b.sales || 0) ? a : b))

  const getVal = (p: typeof products[0], field: typeof COMPARE_FIELDS[0]): any => {
    switch (field.key) {
      case 'cover': return p.images[0]
      case 'price': return p.price
      case 'originalPrice': return p.originalPrice
      case 'discount': return p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
      case 'rating': return p.rating
      case 'reviewCount': return p.reviewCount
      case 'sales': return p.sales || 0
      case 'stock': return p.stock
      case 'brand': return p.brand
      case 'category': return CATEGORY_LABEL[p.category]
      case 'isFlagship': return p.isFlagship
      case 'isExclusive': return p.isExclusive
      case 'flashSale': return !!p.flashSale
      case 'specs': return p.specs
      case 'tags': return p.tags
      case 'shipping': return p.shipping
      default: return ''
    }
  }

  const renderCell = (p: typeof products[0], field: typeof COMPARE_FIELDS[0], isBest: boolean) => {
    const val = getVal(p, field)
    switch (field.type) {
      case 'image':
        return (
          <Link to={`/shop/${p.id}`} className="block aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-ink-100 to-ink-50 dark:from-ink-800 dark:to-ink-900">
            <img src={val} alt={p.name} className="w-full h-full object-cover" />
          </Link>
        )
      case 'price':
        return (
          <div className={cn('text-2xl font-bold', isBest ? 'text-shop-600' : 'text-ink-700 dark:text-ink-200')}>
            {formatCurrency(val)}
            {isBest && <span className="ml-1.5 text-[10px] text-shop-600 font-bold align-top">💰最便宜</span>}
          </div>
        )
      case 'originalPrice':
        return val ? <span className="text-sm text-ink-400 line-through">{formatCurrency(val)}</span> : <Minus className="w-4 h-4 text-ink-300 mx-auto" />
      case 'discount':
        return val > 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-xs font-bold">{val}% OFF</span>
        ) : <Minus className="w-4 h-4 text-ink-300 mx-auto" />
      case 'rating':
        return (
          <div className={cn('flex items-center justify-center gap-1', isBest && 'text-shop-600 font-bold')}>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-base font-bold">{val}</span>
            {isBest && <Award className="w-3.5 h-3.5 text-amber-500" />}
          </div>
        )
      case 'number':
        return <span className={cn('text-sm', isBest && 'text-shop-600 font-bold')}>{val.toLocaleString()}</span>
      case 'stock':
        return val > 0 ? (
          <span className="text-sm text-shop-600 font-medium">有货 ({val})</span>
        ) : <span className="text-sm text-debate-600 font-medium">缺货</span>
      case 'text':
        return <span className="text-sm">{val}</span>
      case 'badge':
        if (field.key === 'isFlagship' || field.key === 'isExclusive' || field.key === 'flashSale') {
          return val ? (
            <span className={cn(
              'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white',
              field.key === 'isFlagship' ? 'bg-gradient-to-r from-news-500 to-news-600' :
              field.key === 'isExclusive' ? 'bg-gradient-to-r from-nova-500 to-purple-500' :
              'bg-gradient-to-r from-debate-500 to-orange-500'
            )}>
              {field.key === 'isFlagship' ? <><Award className="w-3 h-3" />官方旗舰</> :
               field.key === 'isExclusive' ? <><Sparkles className="w-3 h-3" />独家</> :
               <><span>⚡秒杀</span></>}
            </span>
          ) : <Minus className="w-4 h-4 text-ink-300 mx-auto" />
        }
        return null
      case 'specs':
        return (
          <div className="text-xs text-ink-600 dark:text-ink-300 text-left space-y-0.5">
            {Object.entries(val).slice(0, 4).map(([k, v]: [string, any]) => (
              <div key={k} className="line-clamp-1"><span className="text-ink-400">{k}:</span> {v}</div>
            ))}
          </div>
        )
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1 justify-center">
            {val.slice(0, 3).map((t: string) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500/10 text-shop-600">{t}</span>
            ))}
          </div>
        )
      case 'shipping':
        if (!val) return <Minus className="w-4 h-4 text-ink-300 mx-auto" />
        return (
          <div className="text-xs text-ink-600 dark:text-ink-300 space-y-0.5">
            <div className="flex items-center gap-1 justify-center"><Truck className="w-3 h-3" />从 {val.from} 发</div>
            <div>{val.estimatedDays === 1 ? '次日达' : `${val.estimatedDays}天送达`}</div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-shop-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            商品对比
          </h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-2">
            正在对比 <strong className="text-shop-600">{compared.length}</strong> / {COMPARE_LIMIT} 件商品
            {compared.length >= 2 && (
              <span className="ml-3">
                🏆 性价比最高：<strong className="text-shop-600">{cheapest.name}</strong>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compared.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { compareStore.clear(); toast('已清空对比', 'success') }} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
              清空
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/shop')} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            添加商品
          </Button>
        </div>
      </div>

      {/* 主对比表格 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 px-4 py-4 text-left text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                  项目
                </th>
                {compared.map((p) => (
                  <th key={p.id} className="px-4 py-4 text-left min-w-[200px] relative">
                    <button
                      onClick={() => { compareStore.remove(p.id); toast(`已移除 ${p.name}`, 'success') }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-debate-500 hover:text-white flex items-center justify-center text-ink-500 transition-colors z-10"
                      aria-label="移除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100/60 dark:divide-ink-800/60">
              {/* 商品图 + 标题 */}
              <tr>
                <td className="sticky left-0 z-10 px-4 py-4 text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                  商品
                </td>
                {compared.map((p) => (
                  <td key={p.id} className="px-4 py-4">
                    {renderCell(p, COMPARE_FIELDS[0], false)}
                    <Link to={`/shop/${p.id}`} className="block mt-3 font-semibold text-sm line-clamp-2 hover:text-shop-600">{p.name}</Link>
                    <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{p.tagline}</p>
                  </td>
                ))}
              </tr>
              {/* 价格 - 高亮最优 */}
              <tr className="bg-shop-50/40 dark:bg-shop-900/10">
                <td className="sticky left-0 z-10 px-4 py-4 text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                  售价
                </td>
                {compared.map((p) => (
                  <td key={p.id} className="px-4 py-4 text-center">
                    {renderCell(p, COMPARE_FIELDS[1], p.id === cheapest.id)}
                  </td>
                ))}
              </tr>
              {/* 操作按钮 */}
              <tr>
                <td className="sticky left-0 z-10 px-4 py-4 text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                  操作
                </td>
                {compared.map((p) => {
                  const inW = wishlist.includes(p.id)
                  return (
                    <td key={p.id} className="px-4 py-4">
                      <div className="space-y-1.5">
                        <button
                          onClick={() => { versa.addToCart(p.id, 1); toast(`已加入购物车`, 'success') }}
                          className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-shop-500 text-white text-xs font-bold hover:bg-shop-600 transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />加入购物车
                        </button>
                        <button
                          onClick={() => { versa.toggleWishlist(p.id); toast(inW ? '已取消收藏' : '已加入收藏 💚', 'success') }}
                          className={cn(
                            'w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border-2 transition-colors',
                            inW ? 'border-debate-500 text-debate-600 bg-debate-500/10' : 'border-ink-200 dark:border-ink-700 hover:border-shop-500'
                          )}
                        >
                          <Heart className={cn('w-3.5 h-3.5', inW && 'fill-current')} />{inW ? '已收藏' : '收藏'}
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
              {/* 评分 - 高亮最高 */}
              <tr>
                <td className="sticky left-0 z-10 px-4 py-4 text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                  评分
                </td>
                {compared.map((p) => (
                  <td key={p.id} className="px-4 py-4 text-center">
                    {renderCell(p, COMPARE_FIELDS[4], p.id === bestRating.id)}
                  </td>
                ))}
              </tr>
              {/* 销量 - 高亮最高 */}
              <tr>
                <td className="sticky left-0 z-10 px-4 py-4 text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                  销量
                </td>
                {compared.map((p) => (
                  <td key={p.id} className="px-4 py-4 text-center">
                    {renderCell(p, COMPARE_FIELDS[6], p.id === mostSold.id)}
                  </td>
                ))}
              </tr>
              {/* 其他字段 */}
              {COMPARE_FIELDS.slice(8).map((f) => (
                <tr key={f.key} className="hover:bg-ink-50/40 dark:hover:bg-ink-900/40">
                  <td className="sticky left-0 z-10 px-4 py-3 text-xs font-bold text-ink-500 bg-ink-50/80 dark:bg-ink-900/80 backdrop-blur-md uppercase tracking-wider">
                    {f.label}
                  </td>
                  {compared.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center">
                      {renderCell(p, f, false)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 推荐添加 */}
      {compared.length < COMPARE_LIMIT && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-shop-500" />
            <h2 className="text-lg font-bold">推荐加入对比</h2>
            <span className="text-xs text-ink-500">还可以添加 {COMPARE_LIMIT - compared.length} 件</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recommendedAdd.map((p) => (
              <div key={p.id} className="relative group">
                <ProductCardV2 product={p} />
                <button
                  onClick={() => {
                    const r = compareStore.add(p.id)
                    if (r.ok) toast(`已加入对比：${p.name}`, 'success')
                    else toast(r.reason || '添加失败', 'error')
                  }}
                  className="absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-shop-500 text-white text-[10px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <Plus className="w-3 h-3" />加入对比
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
