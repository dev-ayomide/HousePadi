import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Box, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'

export async function FeaturedVendorProducts() {
  const adminClient = createAdminClient()
  
  // We need products from vendors whose current_tier_id points to a tier with is_featured_tier = true
  const { data: featuredProducts } = await adminClient
    .from('products')
    .select(`
      *,
      vendor:vendor_id (
        business_name,
        current_tier:current_tier_id (
          is_featured_tier
        )
      )
    `)
    .eq('availability', true)
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (!featuredProducts) return null

  // Filter products where vendor is on a featured tier
  const filteredProducts = featuredProducts.filter(p => p.vendor?.current_tier?.is_featured_tier)

  if (filteredProducts.length === 0) return null

  // Limit to 4 for the homepage
  const displayProducts = filteredProducts.slice(0, 4)

  return (
    <section className="py-32 px-6 lg:px-12 max-w-[1600px] mx-auto border-t border-neutral-900">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-light text-white tracking-tight">
            Featured Products
          </h2>
          <p className="text-neutral-500 max-w-xl font-light leading-relaxed">
            Discover premium furniture and spatial fixtures curated from our top verified vendors. Available in 3D & AR.
          </p>
        </div>
        <Link 
          href="/explore/products" 
          className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View Storefront <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {displayProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-20 text-center">
        <Link href="/explore/products">
          <Button 
            variant="outline" 
            className="h-14 border-neutral-800 bg-transparent text-white hover:bg-white hover:text-black px-10 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500"
          >
            Show More Products
          </Button>
        </Link>
      </div>
    </section>
  )
}
