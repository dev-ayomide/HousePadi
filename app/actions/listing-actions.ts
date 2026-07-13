'use server'

import { createAdminClient } from '@/lib/supabase/admin'

// Always shown first on the homepage's featured section (demo showcase listing)
const PINNED_LISTING_ID = '693ad0ba-4766-4b0d-b2c8-8eab39d4abbf'

function formatListing(l: any) {
  let displayPrice = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(l.price)
  if (l.listing_type === 'RENTAL' && l.rent_interval) {
    const suffix = l.rent_interval.toLowerCase() === 'yearly' ? '/yr' : '/mo'
    displayPrice = `${displayPrice}${suffix}`
  }
  return {
    id: l.id,
    name: l.name,
    location: l.address || 'Global Hub',
    price: displayPrice,
    image: l.thumbnail_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80',
    tags: ['Elite Portfolio', 'Architectural'], // Fallback tags
    model_url: l.model_url || null
  }
}

export async function getImmersiveMasterpieces() {
  try {
    const supabase = createAdminClient()

    // 0. Always feature the pinned showcase listing first, if it exists
    const { data: pinned } = await supabase
      .from('unified_listings')
      .select('*')
      .eq('id', PINNED_LISTING_ID)
      .maybeSingle()

    // 1. Get agencies on paid plans
    const { data: agencies, error: agencyError } = await supabase
      .from('profiles')
      .select(`
        id,
        agency_subscriptions (
          subscription_plans (
            display_order
          )
        )
      `)
      .eq('role', 'AGENCY')

    if (agencyError) throw agencyError

    const paidAgencyIds = agencies
      .filter((a: any) => {
        const sub = Array.isArray(a.agency_subscriptions) ? a.agency_subscriptions[0] : a.agency_subscriptions
        if (!sub || !sub.subscription_plans) return false
        const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
        return plan.display_order > 0
      })
      .map(a => a.id)

    if (paidAgencyIds.length === 0) {
      return { success: true, data: pinned ? [formatListing(pinned)] : [] }
    }

    // 2. Fetch approved listings from these agencies
    const [aptRes, evtRes, shpRes] = await Promise.all([
      supabase.from('apartments').select('*').in('agency_id', paidAgencyIds).eq('status', 'APPROVED'),
      supabase.from('event_centers').select('*').in('agency_id', paidAgencyIds).eq('status', 'APPROVED'),
      supabase.from('public_space').select('*').in('agency_id', paidAgencyIds).eq('status', 'APPROVED')
    ])

    const listings = [...(aptRes.data || []), ...(evtRes.data || []), ...(shpRes.data || [])]
      .filter(l => l.id !== PINNED_LISTING_ID)

    if (!listings || listings.length === 0) {
      return { success: true, data: pinned ? [formatListing(pinned)] : [] }
    }

    // 3. Selection Logic: Rotating every 8 hours
    // Create a deterministic seed based on 8-hour blocks
    const eightHoursInMs = 8 * 60 * 60 * 1000
    const timeSeed = Math.floor(Date.now() / eightHoursInMs)
    
    // Group listings by agency for balanced selection
    const groupedByAgency: Record<string, any[]> = {}
    listings.forEach(listing => {
      if (!groupedByAgency[listing.agency_id]) groupedByAgency[listing.agency_id] = []
      groupedByAgency[listing.agency_id].push(listing)
    })

    const agencyIds = Object.keys(groupedByAgency)
    let selectedListings: any[] = []

    // Pinned listing takes one of the 3 featured slots, so only rotate the rest
    const remainingSlots = pinned ? 2 : 3

    // Attempt to pick at least one from each agency if possible
    // Use the seed to pick which agency starts first and which listing from each
    for (let i = 0; i < remainingSlots; i++) {
      const agencyIdx = (timeSeed + i) % agencyIds.length
      const targetAgencyId = agencyIds[agencyIdx]
      const agencyListings = groupedByAgency[targetAgencyId]

      const listingIdx = (timeSeed + Math.floor(i / agencyIds.length)) % agencyListings.length
      const chosen = agencyListings[listingIdx]

      // Avoid duplicates if we have enough variety
      if (!selectedListings.find(l => l.id === chosen.id)) {
        selectedListings.push(chosen)
      } else if (listings.length > selectedListings.length) {
        // Find any other listing not already selected
        const other = listings.find(l => !selectedListings.find(sl => sl.id === l.id))
        if (other) selectedListings.push(other)
      }

      if (selectedListings.length >= remainingSlots) break
    }

    const formatted = [
      ...(pinned ? [formatListing(pinned)] : []),
      ...selectedListings.map(formatListing)
    ]

    return { success: true, data: formatted }
  } catch (err: any) {
    console.error('Get Immersive Masterpieces Error:', err)
    return { success: false, error: err.message }
  }
}
