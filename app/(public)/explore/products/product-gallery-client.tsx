'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Box, Filter } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { getConsumerProductFavorites } from '@/app/actions/product-actions'

interface ProductGalleryClientProps {
  products: any[]
}

const CATEGORIES = [
  'All',
  'Furniture',
  'Lighting',
  'Bathroom Fixtures',
  'Kitchen Fixtures',
  'Electrical Appliance',
  'Doors',
  'Windows',
  'Flooring',
  'Decor'
]

export function ProductGalleryClient({ products }: ProductGalleryClientProps) {
  const [activeCategory, setActiveCategory] = useState('All')
  const { consumer } = useConsumerAuth()
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set())

  // Sync consumer product favorites list
  useEffect(() => {
    async function fetchFavorites() {
      if (!consumer) {
        setFavoriteProductIds(new Set())
        return
      }
      try {
        const res = await getConsumerProductFavorites(consumer.id)
        if (res.success && res.data) {
          setFavoriteProductIds(new Set(res.data.map((item: any) => item.id)))
        }
      } catch (err) {
        console.error('Failed to sync product favorites:', err)
      }
    }
    fetchFavorites()
  }, [consumer])

  const handleToggleFavoriteInList = (productId: string, favorited: boolean) => {
    setFavoriteProductIds(prev => {
      const next = new Set(prev)
      if (favorited) {
        next.add(productId)
      } else {
        next.delete(productId)
      }
      return next
    })
  }

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory)

  return (
    <div className="space-y-12">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 text-neutral-500">
          <Filter className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Filter by Category</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold border transition-colors ${
                activeCategory === category 
                  ? 'bg-emerald-500 text-black border-emerald-500' 
                  : 'bg-transparent text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-neutral-500 border border-dashed border-neutral-800">
          <Box className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-[10px] uppercase tracking-widest font-bold">No Products Found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id}
              product={product}
              isFavorited={favoriteProductIds.has(product.id)}
              onToggleFavorite={handleToggleFavoriteInList}
            />
          ))}
        </div>
      )}
    </div>
  )
}
