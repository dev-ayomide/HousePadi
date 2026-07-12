'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getElitePartners } from '@/app/actions/agency-actions'

export function FeaturedAgenciesSection() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(3)

  useEffect(() => {
    async function loadPartners() {
      const result = await getElitePartners()
      if (result.success) {
        setPartners(result.data || [])
      }
      setLoading(false)
    }
    loadPartners()
  }, [])

  const visiblePartners = partners.slice(0, displayCount)
  const hasMore = partners.length > displayCount

  if (loading) {
    return (
      <section className="py-32 px-6 lg:px-12 bg-[#050505] border-t border-neutral-900">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Scanning Network...</p>
        </div>
      </section>
    )
  }

  if (partners.length === 0) return null

  return (
    <section className="py-32 px-6 lg:px-12 bg-[#050505] border-t border-neutral-900">
      <div className="max-w-[90rem] mx-auto">
        <div className="text-center mb-24 space-y-4">
          <span className="text-[10px] tracking-[0.4em] uppercase text-neutral-600 font-bold">Network of Excellence</span>
          <h2 className="text-4xl lg:text-5xl font-light text-white tracking-tight">Elite Partners</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
          {visiblePartners.map((agency) => (
            <div 
              key={agency.id}
              className="group"
            >
              <div className="relative p-12 border border-neutral-800 bg-neutral-900/10 hover:bg-neutral-900/30 transition-all duration-700 overflow-hidden flex flex-col h-full min-h-[400px]">
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/[0.02] rounded-full blur-3xl" />
                
                <div className="relative z-10 flex flex-col h-full -m-12 mb-0">
                  <div className="aspect-video w-full bg-neutral-900 border-b border-neutral-800 overflow-hidden relative group-hover:border-neutral-700 transition-colors">
                    <img 
                      src={agency.image} 
                      alt={agency.name} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 md:grayscale md:group-hover:grayscale-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  </div>
                  
                  <div className="p-12 space-y-4 flex-1">
                    <h3 className="text-xl font-light text-white tracking-widest uppercase">{agency.name}</h3>
                    <p className="text-xs text-neutral-500 font-light italic leading-relaxed">"{agency.tagline}"</p>
                  </div>

                  <div className="mt-12 space-y-8 px-12 pb-12">
                    <div className="pt-6 border-t border-neutral-800 flex items-baseline justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Active Listings</span>
                      <span className="text-3xl font-light text-white">{agency.listings}</span>
                    </div>

                    <a 
                      href={agency.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button 
                        variant="outline" 
                        className="w-full h-14 border-neutral-800 bg-transparent text-white hover:bg-white hover:text-black rounded-none text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-500"
                      >
                        Explore Website
                        <ExternalLink className="w-3 h-3 ml-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-24 text-center">
            <Button 
              onClick={() => setDisplayCount(prev => prev + 3)}
              variant="ghost"
              className="text-neutral-500 hover:text-white group"
            >
              <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Discover More Partners</span>
                <ChevronDown className="w-5 h-5 animate-bounce group-hover:text-white transition-colors" />
              </div>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
