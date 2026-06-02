import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Folder, Trash2, X, Edit } from 'lucide-react'
import { Link } from 'react-router-dom'
import { products } from '../data/products'
import { cn, formatCurrency, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:wishlist-folders'

interface WishlistFolder {
  id: string
  name: string
  emoji: string
  productIds: string[]
  createdAt: number
}

function load(): WishlistFolder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return [
    { id: 'w1', name: '618 心愿单', emoji: '🎁', productIds: ['p1', 'p5', 'p7'], createdAt: Date.now() - 86400000 * 5 },
    { id: 'w2', name: '家居升级', emoji: '🏠', productIds: ['p2', 'p8'], createdAt: Date.now() - 86400000 * 3 },
    { id: 'w3', name: '穿搭灵感', emoji: '👗', productIds: ['p3'], createdAt: Date.now() - 86400000 * 1 },
  ]
}

function save(w: WishlistFolder[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)) } catch {}
}

export function WishlistFolders() {
  const [folders, setFolders] = useState<WishlistFolder[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💖')

  useEffect(() => {
    setFolders(load())
  }, [])

  useEffect(() => {
    if (folders.length > 0) save(folders)
  }, [folders])

  const create = () => {
    if (!name.trim()) { toast('请输入名称', 'error'); return }
    const f: WishlistFolder = { id: uid('w'), name, emoji, productIds: [], createdAt: Date.now() }
    setFolders((arr) => [f, ...arr])
    setName('')
    setEmoji('💖')
    setCreateOpen(false)
    setActive(f.id)
    toast('已创建', 'success')
  }

  const remove = (id: string) => {
    setFolders((arr) => arr.filter((f) => f.id !== id))
    if (active === id) setActive(null)
    toast('已删除', 'info')
  }

  const addProduct = (productId: string) => {
    if (!active) return
    setFolders((arr) => arr.map((f) => (f.id === active && !f.productIds.includes(productId) ? { ...f, productIds: [...f.productIds, productId] } : f)))
    toast('已加入心愿单', 'success')
  }

  const removeProduct = (productId: string) => {
    if (!active) return
    setFolders((arr) => arr.map((f) => (f.id === active ? { ...f, productIds: f.productIds.filter((p) => p !== productId) } : f)))
  }

  const activeFolder = folders.find((f) => f.id === active)
  const activeProducts = activeFolder ? activeFolder.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <Heart className="w-5 h-5 text-rose-500" />
          收藏夹
          <span className="text-xs text-ink-500 font-normal">{folders.length} 个分组</span>
        </h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="text-xs px-3 h-7 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />新建
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            className={cn(
              'p-3 rounded-2xl border-2 text-left transition relative group',
              active === f.id
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-ink-200 dark:border-ink-800 bg-white/60 dark:bg-ink-900/40 hover:border-rose-300'
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xl">{f.emoji}</span>
              <p className="font-semibold text-sm truncate flex-1">{f.name}</p>
            </div>
            <p className="text-[10px] text-ink-500">{f.productIds.length} 件商品</p>
            <button
              onClick={(e) => { e.stopPropagation(); remove(f.id) }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded transition"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
            </button>
          </button>
        ))}
      </div>

      {activeFolder && (
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <span>{activeFolder.emoji}</span>
            {activeFolder.name}
            <span className="text-xs text-ink-500 font-normal">({activeProducts.length} 件)</span>
          </h3>

          {activeProducts.length === 0 ? (
            <div className="text-center py-8 text-ink-500 bg-white/60 dark:bg-ink-900/30 rounded-2xl">
              <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">收藏夹是空的</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeProducts.map((p) => p && (
                <div key={p.id} className="bg-white/80 dark:bg-ink-900/40 rounded-xl p-2 relative group">
                  <Link to={`/shop/product/${p.id}`}>
                    <div className="aspect-square rounded-md overflow-hidden bg-ink-100">
                      <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs mt-1 line-clamp-1">{p.name}</p>
                    <p className="text-sm text-rose-500 font-bold">¥{p.price}</p>
                  </Link>
                  <button
                    onClick={() => removeProduct(p.id)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 bg-rose-500 text-white rounded-full transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-1.5"><Folder className="w-4 h-4" />新建收藏夹</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-12 h-9 text-center text-2xl rounded-lg bg-ink-50 dark:bg-ink-800 outline-none"
                maxLength={2}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="收藏夹名称"
                className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {['💖', '🎁', '🏠', '👗', '💄', '🍔', '📱', '📚', '🎮', '✈️'].map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn('w-9 h-9 text-xl rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800', emoji === e && 'bg-rose-100 dark:bg-rose-900/40')}
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              onClick={create}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold"
            >
              创建
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
