import Link from 'next/link'
import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductGalleryClient } from './product-gallery-client'
import { ArrowLeft, Compass, ChevronRight, Store } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Shop Premium 3D Products | HousePadi',
  description: 'Browse furniture, lighting, and interior fixtures optimized for immersive virtual spaces. Shop directly from verified vendors.',
}

export const revalidate = 0

export default async function ExploreProductsPage() {
  const adminClient = createAdminClient()
  
  const { data: products } = await adminClient
    .from('products')
    .select(`
      *,
      vendor:vendor_profiles (
        business_name
      )
    `)
    .eq('availability', true)
    .eq('approved', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Dynamic Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-12 relative z-10 space-y-10">
        
        {/* Navigation / Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 uppercase tracking-widest pt-6">
          <Link href="/explore" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Explore
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-700" />
          <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> Products
          </span>
        </div>

        {/* Action Header / Description */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div className="space-y-4 max-w-2xl">
            <Link 
              href="/explore" 
              className="inline-flex items-center gap-2 text-[10px] text-neutral-400 hover:text-white uppercase tracking-widest font-bold border border-white/10 px-3 py-1.5 bg-neutral-900/40 hover:bg-neutral-900 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Categories
            </Link>
            <h1 className="text-3xl lg:text-5xl font-light tracking-tight text-white leading-none">
              Premium <span className="font-semibold text-emerald-400">Products</span>
            </h1>
            <p className="text-xs lg:text-sm text-neutral-400 font-light leading-relaxed">
              Browse premium products for homes, public spaces, and event centers. Each product is fully optimized for our immersive 3D viewer and AR spatial calibration.
            </p>
          </div>
        </div>

        {/* Client Gallery Grid */}
        <ProductGalleryClient products={products || []} />

      </main>
    </div>
  )
}
