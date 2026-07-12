'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Box, Heart } from 'lucide-react'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { ProtectedAction } from '@/components/explore/protected-action'
import { toggleProductFavorite, getConsumerProductFavorites } from '@/app/actions/product-actions'
import { toast } from 'sonner'

interface ProductCardProps {
  product: {
    id: string
    name: string
    category: string
    price: number | string
    thumbnail_path?: string | null
    is_sold_out?: boolean
    has_store_link?: boolean
    vendor?: {
      business_name: string
    }
  }
  isFavorited?: boolean
  onToggleFavorite?: (productId: string, favorited: boolean) => void
}

export function ProductCard({ 
  product, 
  isFavorited: propIsFavorited, 
  onToggleFavorite 
}: ProductCardProps) {
  const { consumer } = useConsumerAuth()
  const [localIsFavorited, setLocalIsFavorited] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Use prop if provided, otherwise fallback to local state
  const isCurrentlyFavorited = propIsFavorited !== undefined ? propIsFavorited : localIsFavorited

  // Fetch favorite status locally if not managed by parent
  useEffect(() => {
    if (propIsFavorited !== undefined || !consumer) {
      return
    }

    async function checkFavorite() {
      try {
        const res = await getConsumerProductFavorites(consumer!.id)
        if (res.success && res.data) {
          const favorited = res.data.some((p: any) => p.id === product.id)
          setLocalIsFavorited(favorited)
        }
      } catch (err) {
        console.error('Error syncing favorite status for product card:', err)
      }
    }

    checkFavorite()
  }, [consumer, product.id, propIsFavorited])

  const handleToggleFavorite = async () => {
    if (!consumer) return // Handled by ProtectedAction
    setSyncing(true)
    try {
      const res = await toggleProductFavorite(consumer.id, product.id)
      if (res.success) {
        const newFavStatus = !!res.favorited
        if (onToggleFavorite) {
          onToggleFavorite(product.id, newFavStatus)
        } else {
          setLocalIsFavorited(newFavStatus)
        }
        toast.success(newFavStatus ? 'Added to favorites.' : 'Removed from favorites.')
      } else {
        toast.error(res.error || 'Failed to update favorites.')
      }
    } catch (err) {
      toast.error('Could not connect to database.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="group relative flex flex-col justify-between h-full bg-neutral-950/20 border border-neutral-800/40 hover:border-neutral-700/60 transition-all duration-500 font-sans">
      <Link href={`/product/${product.id}`} className="block flex-1">
        <div className="aspect-square bg-neutral-900/40 border-b border-neutral-800 relative overflow-hidden mb-6 transition-colors group-hover:border-neutral-700">
          {product.thumbnail_path ? (
            <img 
              src={product.thumbnail_path} 
              alt={product.name} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Box className="w-12 h-12 text-neutral-800" />
            </div>
          )}
          
          {/* Overlay Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
            <span className="bg-black/80 backdrop-blur border border-neutral-800 px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold text-white">
              {product.category}
            </span>
            {product.is_sold_out && (
              <span className="bg-red-900/80 backdrop-blur border border-red-800 text-red-100 px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold">
                Sold Out
              </span>
            )}
          </div>
          
          {product.has_store_link && (
            <div className="absolute top-4 right-4 bg-emerald-500/20 backdrop-blur border border-emerald-500/50 text-emerald-400 px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold pointer-events-none z-10">
              Store Link
            </div>
          )}
        </div>

        <div className="px-5 pb-6 space-y-2">
          <h3 className="text-lg font-medium text-white tracking-tight group-hover:text-emerald-400 transition-colors truncate">
            {product.name}
          </h3>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 truncate">
            by {product.vendor?.business_name || 'Unknown Vendor'}
          </p>
          <p className="text-sm font-bold text-emerald-400 pt-1">
            ₦{Number(product.price).toLocaleString()}
          </p>
        </div>
      </Link>

      {/* Favorite heart overlay positioned on the thumbnail but interactive */}
      <div className="absolute bottom-[108px] right-4 z-20">
        <ProtectedAction onClick={handleToggleFavorite} isFavorite>
          <button 
            disabled={syncing}
            className={`p-2.5 backdrop-blur-md border transition-all rounded-full hover:scale-110 active:scale-95 flex items-center justify-center shadow-md cursor-pointer ${
              isCurrentlyFavorited 
                ? 'bg-red-500/15 border-red-500/40 text-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]' 
                : 'bg-black/60 border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
            }`}
            title={isCurrentlyFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Heart className={`w-4 h-4 ${isCurrentlyFavorited ? 'fill-current' : ''}`} />
          </button>
        </ProtectedAction>
      </div>
    </div>
  )
}
