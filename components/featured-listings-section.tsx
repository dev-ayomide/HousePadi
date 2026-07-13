'use client'

import { useEffect, useState } from 'react'
import { MapPin, ArrowUpRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getImmersiveMasterpieces } from '@/app/actions/listing-actions'
import { toast } from 'sonner'

export function FeaturedListingsSection() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadListings() {
      const result = await getImmersiveMasterpieces()
      if (result.success) {
        setListings(result.data || [])
      }
      setLoading(false)
    }
    loadListings()
  }, [])

  if (loading) {
    return (
      <section className="py-32 px-6 lg:px-12 bg-black border-t border-neutral-900">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Curating Masterpieces...</p>
        </div>
      </section>
    )
  }

  if (listings.length === 0) return null

  return (
    <section className="py-32 px-6 lg:px-12 bg-black border-t border-neutral-900 overflow-hidden">
      <div className="max-w-[90rem] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="space-y-6">
            <span className="text-[10px] tracking-[0.4em] uppercase text-neutral-500 font-bold">Curated Assets</span>
            <h2 className="text-5xl lg:text-7xl font-light text-white tracking-tight leading-[0.9]">
              Immersive <br /> 
              <span className="italic font-serif">Masterpieces</span>
            </h2>
          </div>
          <p className="max-w-md text-neutral-500 text-sm font-light leading-relaxed">
            A hand-selected gallery of the world&apos;s most significant architectural achievements, rendered in full immersive fidelity.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {listings.map((item) => (
            <div 
              key={item.id}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-neutral-900 border border-neutral-800">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                
                <div className="absolute top-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                  <div className="w-12 h-12 bg-white flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-black" />
                  </div>
                </div>
                
                <div className="absolute bottom-8 left-8 flex gap-2">
                  {item.tags?.map((tag: string) => (
                    <span key={tag} className="text-[9px] uppercase tracking-widest text-white/60 border border-white/10 bg-black/40 backdrop-blur-md px-3 py-1.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-2xl font-light text-white tracking-wide truncate">{item.name}</h3>
                    <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-widest">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>
                  <div className="text-xl font-medium text-white tracking-tighter whitespace-nowrap shrink-0">
                    {item.price}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (item.model_url) {
                      window.open(`/explore/viewer?url=${encodeURIComponent(item.model_url)}&title=${encodeURIComponent(item.name)}`, '_blank')
                    } else {
                      toast.error('This listing does not have a 3D asset file attached.')
                    }
                  }}
                  variant="outline"
                  className="w-full h-14 rounded-none border-neutral-800 bg-transparent text-white hover:bg-white hover:text-black text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500"
                >
                  Step In
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link href="/explore">
            <Button 
              variant="outline" 
              className="h-14 border-neutral-800 bg-transparent text-white hover:bg-white hover:text-black px-10 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500"
            >
              Explore More Listings
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
