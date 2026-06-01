import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useVersa, versa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Star, Camera, X, CheckCircle2, Sparkles, Tag,
  Shield, Upload, Hash
} from 'lucide-react'

const TAG_OPTIONS: Record<string, string[]> = {
  tech: ['性能强劲', '外观漂亮', '续航持久', '手感好', '系统流畅', '性价比高'],
  fashion: ['尺码准确', '面料舒适', '版型正', '颜色正', '做工精细', '百搭'],
  home: ['做工扎实', '安装简单', '实用性强', '颜值高', '质感好', '性价比高'],
  beauty: ['保湿好', '吸收快', '不刺激', '香味好', '效果好', '包装精美'],
  food: ['新鲜', '味道好', '分量足', '包装好', '性价比高', '回购'],
  sports: ['透气', '减震好', '颜值高', '包裹性好', '耐磨', '轻便'],
  books: ['内容精彩', '装帧精美', '纸张好', '翻译好', '值得收藏', '干货多'],
}

export function ReviewPage() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { orders, user } = useVersa()
  const order = orders.find((o) => o.id === orderId)
  const defaultProductId = searchParams.get('productId') || order?.items[0]?.productId

  const [productId, setProductId] = useState(defaultProductId || '')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [anonymous, setAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const product = products.find((p) => p.id === productId)
  const tagOptions = product ? TAG_OPTIONS[product.category] || TAG_OPTIONS.tech : []

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">订单不存在</h2>
        <Button onClick={() => navigate('/profile/orders')}>返回订单列表</Button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-10 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">评价提交成功</h1>
          <p className="text-sm text-ink-500 mb-6">感谢你的分享，将获得 10 积分奖励 🎉</p>
          <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 text-left space-y-2 mb-6 max-w-md mx-auto">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={cn('w-4 h-4', i <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
              ))}
              <span className="text-sm font-bold ml-1">{rating === 5 ? '非常满意' : rating === 4 ? '满意' : rating === 3 ? '一般' : rating === 2 ? '不满意' : '差评'}</span>
            </div>
            <p className="text-sm text-ink-700 dark:text-ink-200 line-clamp-3">{content}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(`/orders/${order.id}`)}>查看订单</Button>
            <Button variant="outline" onClick={() => navigate('/shop')}>继续购物</Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = () => {
    if (!productId) { toast('请选择商品', 'error'); return }
    if (content.trim().length < 5) { toast('评价内容至少 5 个字', 'error'); return }
    versa.addReview({
      orderId: order.id,
      productId,
      rating,
      content: content.trim(),
      tags: tags.length > 0 ? tags : undefined,
      images: images.length > 0 ? images : undefined,
      anonymous,
    })
    setSubmitted(true)
  }

  const ratingLabel = ['', '差评', '不太满意', '一般', '满意', '非常满意'][rating]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 返回订单
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">评价晒单</h1>
        <p className="text-sm text-ink-500 mt-1">分享你的真实体验，帮助其他买家做决定</p>
      </div>

      {/* 选择商品 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3">选择要评价的商品</h2>
        <div className="space-y-2">
          {order.items.map((it) => {
            const reviewed = (order.reviewed || []).includes(it.productId)
            return (
              <button
                key={it.productId}
                onClick={() => !reviewed && setProductId(it.productId)}
                disabled={reviewed}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                  reviewed ? 'opacity-50 cursor-not-allowed border-ink-200/40' :
                  productId === it.productId
                    ? 'border-shop-500 bg-shop-500/5'
                    : 'border-ink-200/60 dark:border-ink-800/60 hover:border-ink-300'
                )}
              >
                <img src={it.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                  <div className="text-xs text-ink-500 mt-0.5">× {it.quantity}</div>
                </div>
                {reviewed && <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">已评价</span>}
                {!reviewed && (
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', productId === it.productId ? 'border-shop-500 bg-shop-500' : 'border-ink-300')}>
                    {productId === it.productId && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 评分 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3">商品评分</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setRating(i)}
                className="transition-transform hover:scale-110"
                aria-label={`评分 ${i} 星`}
              >
                <Star className={cn('w-9 h-9', i <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
              </button>
            ))}
          </div>
          <span className="text-base font-bold text-amber-600">{ratingLabel}</span>
        </div>
      </div>

      {/* 评价内容 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-shop-500" />评价内容
        </h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          placeholder="宝贝满足你的期待吗？说说它的优点和小缺点，给其他买家参考~"
          rows={5}
          className="w-full px-3 py-2.5 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500 resize-none"
        />
        <div className="text-[10px] text-ink-400 text-right mt-1">{content.length} / 500</div>
      </div>

      {/* 标签 */}
      {tagOptions.length > 0 && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-news-500" />描述标签（最多选 3 个）</h2>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((t) => (
              <button
                key={t}
                onClick={() => {
                  if (tags.includes(t)) setTags(tags.filter((x) => x !== t))
                  else if (tags.length < 3) setTags([...tags, t])
                  else toast('最多选 3 个', 'info')
                }}
                className={cn(
                  'px-3 h-8 rounded-full text-sm transition-colors',
                  tags.includes(t)
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-ink-100/60 dark:bg-ink-800/60 hover:bg-ink-200 dark:hover:bg-ink-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 晒图 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Camera className="w-4 h-4 text-nova-500" />晒图晒视频（最多 9 张）</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-ink-100">
              <img src={img} className="w-full h-full object-cover" alt="" />
              <button
                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 9 && (
            <button
              onClick={() => {
                const mock = `https://picsum.photos/seed/r${Date.now()}/300/300`
                setImages([...images, mock])
              }}
              className="aspect-square rounded-xl border-2 border-dashed border-ink-300 dark:border-ink-700 flex flex-col items-center justify-center gap-1 text-ink-400 hover:border-shop-500 hover:text-shop-500 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="text-[10px]">上传图片</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-ink-500 mt-2">晒图可获 5 积分/张，晒视频可获 10 积分</p>
      </div>

      {/* 匿名 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => setAnonymous(!anonymous)}
            className={cn('w-11 h-6 rounded-full transition-colors flex-shrink-0', anonymous ? 'bg-shop-500' : 'bg-ink-300 dark:bg-ink-700')}
          >
            <div className={cn('w-5 h-5 rounded-full bg-white shadow-md transition-transform', anonymous ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
          <div className="flex-1">
            <div className="text-sm font-medium">匿名评价</div>
            <div className="text-[11px] text-ink-500 mt-0.5">开启后商家和其他用户将看不到你的昵称</div>
          </div>
        </label>
      </div>

      {/* 奖励提示 */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/8 to-orange-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2 text-xs text-ink-700 dark:text-ink-200">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-700 dark:text-amber-400">评价奖励</div>
            <div>· 文字评价：+10 积分</div>
            <div>· 晒图：+5 积分/张</div>
            <div>· 高质量评价（≥50 字 + 图）：额外 +20 积分</div>
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-ink-200 dark:border-ink-800">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} className="flex-[2]" leftIcon={<Star className="w-4 h-4" />}>提交评价</Button>
        </div>
      </div>
    </div>
  )
}
