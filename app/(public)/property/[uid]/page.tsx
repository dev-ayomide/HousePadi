import { getUnifiedListings, getListingTypes } from '@/app/actions/registry-actions'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { PropertyClient } from './property-client'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

interface PropertyPageProps {
  params: Promise<{
    uid: string
  }>
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { uid } = await params
  const res = await getUnifiedListings({})
  const listing = res.success && res.data ? res.data.find(l => l.id === uid) : null

  if (!listing) {
    return {
      title: 'Property Not Found | HousePadi',
      description: 'The requested property could not be found.'
    }
  }

  return {
    title: `${listing.name} | HousePadi Explore Spaces`,
    description: `Immerse yourself inside high-fidelity 3D model files of ${listing.name}. Save favorites, check locations, and view space layouts instantly.`,
    openGraph: {
      title: `${listing.name} | HousePadi`,
      description: `Explore premium virtual space for ${listing.name} optimized for WebVR.`
    }
  }
}

export const revalidate = 0

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { uid } = await params
  
  const listingsRes = await getUnifiedListings({})
  const listing = listingsRes.success && listingsRes.data ? listingsRes.data.find(l => l.id === uid) : null

  if (!listing) {
    notFound()
  }

  // Get the category details for contact fee
  const typesRes = await getListingTypes()
  const activeType = typesRes.success && typesRes.data
    ? typesRes.data.find(t => t.slug === listing.listing_type_slug) 
    : null

  const contactFee = activeType ? Number(activeType.contact_fee) || 0 : 0

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    }>
      <PropertyClient listing={listing} contactFee={contactFee} />
    </Suspense>
  )
}
