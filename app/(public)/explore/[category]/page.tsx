import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getListingTypes, getUnifiedListings } from '@/app/actions/registry-actions'
import { CategoryListingClient } from '@/components/explore/category-listing-client'
import { ArrowLeft, Compass, ChevronRight, HelpCircle, Loader2 } from 'lucide-react'
import { Suspense } from 'react'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
}

// 1. Dynamic SEO Metadata Generation
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params
  const typesRes = await getListingTypes()
  const activeType = typesRes.success && typesRes.data
    ? typesRes.data.find(t => t.slug === category) 
    : null

  if (!activeType) {
    return {
      title: 'Category Not Found | HousePadi',
      description: 'The requested spatial space category does not exist in the HousePadi registry.'
    }
  }

  return {
    title: `Browse ${activeType.name}s | HousePadi Explore Spaces`,
    description: `Immerse yourself inside high-fidelity 3D model files of verified ${activeType.name}s. Save favorites, check locations, and view space layouts instantly.`,
    openGraph: {
      title: `Verified Virtual ${activeType.name}s | HousePadi`,
      description: `Explore premium virtual ${activeType.name}s optimized for WebVR and real estate calibration.`
    }
  }
}

export const revalidate = 0 // Keep page dynamic to show real-time changes

export default async function CategoryExplorePage({ params }: CategoryPageProps) {
  const { category } = await params
  
  // 1. Resolve Category Details
  const typesRes = await getListingTypes()
  const activeType = typesRes.success && typesRes.data
    ? typesRes.data.find(t => t.slug === category) 
    : null

  if (!activeType) {
    notFound()
  }

  // 2. Fetch Listings for Category
  const listingsRes = await getUnifiedListings({ type: category })
  const listings = listingsRes.success && listingsRes.data ? listingsRes.data : []

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
          <span className="text-neutral-400 font-semibold">{activeType.name}s</span>
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
              Verified <span className="font-semibold">{activeType.name}s</span>
            </h1>
            <p className="text-xs lg:text-sm text-neutral-400 font-light leading-relaxed">
              Explore available virtual model portfolios. Connect directly with licensed spatial agents, verify dimensions, and purchase architectural templates.
            </p>
          </div>
        </div>

        {/* Hydrated Client Listing Catalog Grid */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-20 bg-black">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        }>
          <CategoryListingClient 
            listings={listings} 
            categorySlug={category} 
            categoryName={activeType.name} 
            contactFee={Number(activeType.contact_fee) || 0}
          />
        </Suspense>

      </main>
    </div>
  )
}
