'use client'

import { useState, useEffect } from 'react'
import { HousePadiProductViewer } from '@/components/housepadi-product-viewer'
import { Box, Phone, Mail, Globe, MapPin, Store, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/share-button'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { ProtectedAction } from '@/components/explore/protected-action'
import { toggleProductFavorite, getConsumerProductFavorites } from '@/app/actions/product-actions'
import { toast } from 'sonner'

interface ProductClientProps {
  product: any
  vendor: any
}

export function ProductClient({ product, vendor }: ProductClientProps) {
  const { consumer } = useConsumerAuth()
  const [isFavorited, setIsFavorited] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Sync initial favorite status on mount
  useEffect(() => {
    async function checkFavoriteStatus() {
      if (!consumer) {
        setIsFavorited(false)
        return
      }
      try {
        const res = await getConsumerProductFavorites(consumer.id)
        if (res.success && res.data) {
          const favorited = res.data.some((item: any) => item.id === product.id)
          setIsFavorited(favorited)
        }
      } catch (err) {
        console.error('Failed to load product favorite status:', err)
      }
    }
    checkFavoriteStatus()
  }, [consumer, product.id])

  const handleToggleFavorite = async () => {
    if (!consumer) return // ProtectedAction prevents this
    setSyncing(true)
    try {
      const res = await toggleProductFavorite(consumer.id, product.id)
      if (res.success) {
        setIsFavorited(!!res.favorited)
        toast.success(res.favorited ? 'Product added to favorites.' : 'Product removed from favorites.')
      } else {
        toast.error(res.error || 'Failed to update favorites.')
      }
    } catch (err) {
      toast.error('Could not communicate with the database.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 flex flex-col font-sans">
      {!product.approved && (
        <div className="bg-red-950/40 border-b border-red-900/50 py-3 px-6 text-center mb-8 w-full max-w-7xl mx-auto">
          <p className="text-red-400 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
            <Store className="w-4 h-4" /> This product has been suspended
          </p>
        </div>
      )}
      <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[4/3] bg-neutral-900 border border-neutral-800 relative overflow-hidden">
            {product.model_url ? (
              <HousePadiProductViewer url={product.model_url} title={product.name} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                <Box className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-[10px] uppercase tracking-widest font-bold">No 3D Model Available</p>
              </div>
            )}
            
            {/* Overlay Badges */}
            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none z-10">
              <span className="bg-black/80 backdrop-blur border border-neutral-800 text-white px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold">
                {product.category}
              </span>
              {product.is_sold_out && (
                <span className="bg-red-900/80 backdrop-blur border border-red-800 text-red-100 px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold">
                  Sold Out
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-4xl font-light text-white tracking-tight">{product.name}</h1>
              
              <div className="flex items-center gap-2 mt-2 shrink-0">
                {/* Product Favorite Heart Button */}
                <ProtectedAction onClick={handleToggleFavorite} isFavorite>
                  <button 
                    disabled={syncing}
                    className={`h-10 px-4 text-xs bg-transparent border transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest cursor-pointer ${
                      isFavorited 
                        ? 'border-red-500/40 text-red-500 bg-red-500/10' 
                        : 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                    title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                    <span>Favorite</span>
                  </button>
                </ProtectedAction>

                <ShareButton 
                  title={`Check out ${product.name} on HousePadi`} 
                  className="bg-transparent border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900" 
                />
              </div>
            </div>
            <p className="text-2xl font-medium text-emerald-400 font-mono">₦{Number(product.price).toLocaleString()}</p>
          </div>
        </div>

        {/* Right Column: Vendor & Actions */}
        <div className="space-y-8">
          {/* Purchase/Action Card */}
          <div className="bg-neutral-900/40 border border-neutral-800 p-8 space-y-6">
            <h3 className="text-lg font-light text-white tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              Purchase Details
            </h3>
            
            {product.is_sold_out ? (
              <div className="space-y-4">
                <div className="p-4 border border-red-900/30 bg-red-950/20 text-center">
                  <p className="text-sm text-red-400 font-bold uppercase tracking-widest leading-relaxed">
                    Sold Out
                  </p>
                  <p className="text-[10px] text-neutral-500 font-light uppercase tracking-widest mt-1">
                    Currently Unavailable
                  </p>
                </div>
              </div>
            ) : product.has_store_link && product.store_link ? (
              <div className="space-y-4">
                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                  This product is sold externally. Click the button below to proceed to the vendor's store.
                </p>
                <Button 
                  asChild
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black rounded-none h-14 uppercase tracking-widest text-xs font-bold transition-all"
                >
                  <a href={product.store_link} target="_blank" rel="noopener noreferrer">
                    Proceed to Store
                  </a>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                  Contact the vendor directly to arrange payment and delivery for this item.
                </p>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-neutral-300">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-emerald-400" />
                    </div>
                    <a href={`tel:${vendor.phone_number}`} className="text-sm font-medium hover:text-white transition-colors">
                      {vendor.phone_number || 'N/A'}
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-3 text-neutral-300">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-emerald-400" />
                    </div>
                    <a href={`mailto:${vendor.email}`} className="text-sm font-medium hover:text-white transition-colors">
                      {vendor.email || 'N/A'}
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800">
                  <Button 
                    asChild
                    className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-14 uppercase tracking-widest text-xs font-bold transition-all"
                  >
                    <a href={`mailto:${vendor.email}?subject=Inquiry about ${product.name}`}>
                      Send Message
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Vendor Profile Card */}
          <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">About the Vendor</h3>
            
            <div className="space-y-4">
              <p className="text-lg font-light text-white">{vendor.business_name}</p>
              
              <div className="space-y-2">
                {vendor.business_address && (
                  <div className="flex items-start gap-2 text-sm text-neutral-400">
                    <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <span className="font-light leading-relaxed">{vendor.business_address}</span>
                  </div>
                )}
                
                {vendor.website_url && (
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Globe className="w-4 h-4 text-neutral-500 shrink-0" />
                    <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className="font-light hover:text-white hover:underline transition-colors">
                      {(() => {
                        try {
                          return new URL(vendor.website_url).hostname
                        } catch (e) {
                          return vendor.website_url
                        }
                      })()}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
