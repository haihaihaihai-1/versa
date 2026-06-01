import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useVersa, versa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Package, RotateCcw, Upload, X, AlertCircle, CheckCircle2,
  RefreshCw, FileText, ChevronRight, Camera, Shield
} from 'lucide-react'
import type { AfterSalesType } from '../data/types'

const REFUND_REASONS = ['不想要了', '买多了', '商品质量有问题', '商品与描述不符', '收到破损/错发', '其他']
const RETURN_REASONS = ['商品质量有问题', '商品与描述不符', '收到破损/错发', '尺寸/型号不合适', '其他']
const EXCHANGE_REASONS = ['尺寸/型号不合适', '收到错发商品', '商品损坏', '其他']

const TYPES: { value: AfterSalesType; label: string; desc: string; icon: any; color: string }[] = [
  { value: 'refund_only', label: '仅退款', desc: '未收到货 / 不想要了', icon: RotateCcw, color: 'from-amber-500 to-orange-500' },
  { value: 'return_refund', label: '退货退款', desc: '已收货 · 商品需寄回', icon: Package, color: 'from-shop-500 to-pink-500' },
  { value: 'exchange', label: '换货', desc: '同款不同规格 / 颜色', icon: RefreshCw, color: 'from-nova-500 to-blue-500' },
]

export function AfterSalesPage() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { orders, user } = useVersa()
  const order = orders.find((o) => o.id === orderId)
  const defaultProductId = searchParams.get('productId') || order?.items[0]?.productId

  const [productId, setProductId] = useState(defaultProductId || '')
  const [type, setType] = useState<AfterSalesType>('refund_only')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [submitted, setSubmitted] = useState(false)

  const item = order?.items.find((i) => i.productId === productId)
  const product = products.find((p) => p.id === productId)
  const reasons = type === 'refund_only' ? REFUND_REASONS : type === 'return_refund' ? RETURN_REASONS : EXCHANGE_REASONS

  const maxRefund = useMemo(() => {
    if (!item) return 0
    return item.price * item.quantity
  }, [item])

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
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-shop-500 to-pink-500 flex items-center justify-center shadow-2xl mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">售后申请已提交</h1>
          <p className="text-sm text-ink-500 mb-6">商家将在 24 小时内审核你的申请，请耐心等待</p>
          <div className="rounded-2xl p-4 bg-ink-50/50 dark:bg-ink-900/40 text-left space-y-2 mb-6 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">售后类型</span>
              <span className="font-medium">{type === 'refund_only' ? '仅退款' : type === 'return_refund' ? '退货退款' : '换货'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">申请原因</span>
              <span className="font-medium">{reason}</span>
            </div>
            {refundAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">退款金额</span>
                <span className="font-bold text-debate-600">{formatCurrency(refundAmount)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(`/orders/${order.id}`)}>查看订单详情</Button>
            <Button variant="outline" onClick={() => navigate('/profile/orders')}>返回订单列表</Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = () => {
    if (!productId) { toast('请选择商品', 'error'); return }
    if (!reason) { toast('请选择原因', 'error'); return }
    if (type === 'return_refund' && images.length === 0) { toast('请上传凭证图片', 'error'); return }
    if (type === 'refund_only' || type === 'return_refund') {
      if (refundAmount <= 0 || refundAmount > maxRefund) {
        toast(`退款金额应在 ¥1 - ¥${maxRefund}`, 'error')
        return
      }
    }

    versa.applyAfterSales({
      orderId: order.id,
      productId,
      type,
      reason,
      description: description || undefined,
      images: images.length > 0 ? images : undefined,
      refundAmount: type === 'exchange' ? undefined : refundAmount,
    })
    setSubmitted(true)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 返回订单
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">申请售后</h1>
        <p className="text-sm text-ink-500 mt-1">订单号：<span className="font-mono">{order.id}</span></p>
      </div>

      {/* 选择商品 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-shop-500" />选择商品</h2>
        <div className="space-y-2">
          {order.items.map((it) => (
            <button
              key={it.productId}
              onClick={() => setProductId(it.productId)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                productId === it.productId
                  ? 'border-shop-500 bg-shop-500/5'
                  : 'border-ink-200/60 dark:border-ink-800/60 hover:border-ink-300'
              )}
            >
              <img src={it.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                <div className="text-xs text-ink-500 mt-0.5">× {it.quantity} · {formatCurrency(it.price * it.quantity)}</div>
              </div>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', productId === it.productId ? 'border-shop-500 bg-shop-500' : 'border-ink-300')}>
                {productId === it.productId && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 选择类型 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-news-500" />售后类型</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setType(t.value); setReason('') }}
              className={cn(
                'relative p-4 rounded-2xl border-2 transition-all text-left',
                type === t.value
                  ? 'border-shop-500 bg-shop-500/5'
                  : 'border-ink-200/60 dark:border-ink-800/60 hover:border-ink-300'
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2', t.color)}>
                <t.icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-sm">{t.label}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{t.desc}</div>
              {type === t.value && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-shop-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 选择原因 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3">申请原因</h2>
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                'px-3.5 h-9 rounded-full text-sm font-medium transition-colors',
                reason === r
                  ? 'bg-shop-500 text-white'
                  : 'bg-ink-100/60 dark:bg-ink-800/60 hover:bg-ink-200 dark:hover:bg-ink-700'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 退款金额 */}
      {type !== 'exchange' && item && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h2 className="text-sm font-bold mb-3">退款金额</h2>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">¥</span>
              <input
                type="number"
                min={1}
                max={maxRefund}
                value={refundAmount || ''}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-12 pl-7 pr-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-lg font-bold outline-none focus:border-shop-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setRefundAmount(maxRefund)} className="text-xs text-shop-600 hover:underline">申请全额</button>
              <button onClick={() => setRefundAmount(Math.round(maxRefund * 0.5))} className="text-xs text-ink-500 hover:underline">申请一半</button>
            </div>
          </div>
          <p className="text-[11px] text-ink-500 mt-2">最多可退 ¥{maxRefund.toFixed(2)}（含运费）</p>
        </div>
      )}

      {/* 凭证图片 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3">凭证 {type === 'return_refund' && <span className="text-debate-500">*</span>}</h2>
        <p className="text-xs text-ink-500 mb-3">建议上传商品问题照片，最多 6 张</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
          {images.length < 6 && (
            <button
              onClick={() => {
                // Mock 上传 - 使用占位图
                const mock = `https://picsum.photos/seed/${Date.now()}/300/300`
                setImages([...images, mock])
              }}
              className="aspect-square rounded-xl border-2 border-dashed border-ink-300 dark:border-ink-700 flex flex-col items-center justify-center gap-1 text-ink-400 hover:border-shop-500 hover:text-shop-500 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px]">上传</span>
            </button>
          )}
        </div>
      </div>

      {/* 问题描述 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-sm font-bold mb-3">问题描述（选填）</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder="详细描述问题有助于加快审核..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500 resize-none"
        />
        <div className="text-[10px] text-ink-400 text-right mt-1">{description.length} / 200</div>
      </div>

      {/* 温馨提示 */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/8 to-orange-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2 text-xs text-ink-700 dark:text-ink-200">
          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-700 dark:text-amber-400">售后保障</div>
            <div>· 仅退款：商家 24 小时内处理，审核通过后原路退回</div>
            <div>· 退货退款：审核通过后请寄回商品，运费由责任方承担</div>
            <div>· 换货：审核通过后重新发货，预计 1-3 天内送达</div>
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-ink-200 dark:border-ink-800">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} className="flex-[2]" leftIcon={<FileText className="w-4 h-4" />}>提交申请</Button>
        </div>
      </div>
    </div>
  )
}
