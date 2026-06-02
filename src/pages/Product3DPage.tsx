import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Product3D } from '../components/Product3D'
import { products } from '../data/products'

export function Product3DPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const product = products.find((p) => p.id === id) || products[0]
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="w-4 h-4" />返回
      </button>
      <Product3D productName={product.name} productImage={product.images?.[0] || ''} productCategory={product.category} />
    </div>
  )
}
