'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { deleteFromR2 } from '@/app/actions/r2-actions'

export type ListingTable = 'apartments' | 'event_centers' | 'public_space'
const VALID_TABLES: ListingTable[] = ['apartments', 'event_centers', 'public_space']

function validateTable(table: string): ListingTable {
  if (VALID_TABLES.includes(table as ListingTable)) return table as ListingTable
  return 'apartments'
}

// Update listing status (Agent side)
export async function updateListingStatus(listingId: string, newStatus: string, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabase = await createClient()
    
    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: listing } = await supabase
      .from(tableName)
      .select('agent_id, status')
      .eq('id', listingId)
      .single()

    if (!listing || listing.agent_id !== user.id) {
      throw new Error('Unauthorized: Cannot modify this listing')
    }

    // Only allow specific transitions from agent side
    // Agent can only submit drafts for approval, or maybe pull back pending to draft.
    const allowedStatuses = ['DRAFT', 'PENDING_AGENCY']
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error('Invalid state transition requested.')
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from(tableName)
      .update({ status: newStatus })
      .eq('id', listingId)

    if (error) throw error

    revalidatePath('/agent/listings')
    return { success: true }
  } catch (err: any) {
    console.error('Update Listing Status Error:', err)
    return { success: false, error: err.message }
  }
}

// Delete listing (Agent side)
export async function deleteListing(listingId: string, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabase = await createClient()
    
    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: listing } = await supabase
      .from(tableName)
      .select('agent_id, model_url, thumbnail_path')
      .eq('id', listingId)
      .single()

    if (!listing || listing.agent_id !== user.id) {
      throw new Error('Unauthorized: Cannot delete this listing')
    }

    // Delete files from Cloudflare R2 if they exist
    const deletePromises = []
    
    if (listing.model_url) {
      deletePromises.push(deleteFromR2(listing.model_url))
    }
    
    if (listing.thumbnail_path) {
      deletePromises.push(deleteFromR2(listing.thumbnail_path))
    }
    
    if (deletePromises.length > 0) {
      const results = await Promise.all(deletePromises)
      results.forEach(res => {
        if (!res.success) {
          console.warn('Failed to delete file from R2 bucket during listing deletion:', res.error)
        }
      })
    }

    const adminClient = createAdminClient()
    
    const { error } = await adminClient
      .from(tableName)
      .delete()
      .eq('id', listingId)

    if (error) throw error

    revalidatePath('/agent/listings')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Listing Error:', err)
    return { success: false, error: err.message }
  }
}

// Update listing details (Agent side)
export async function updateListingDetails(listingId: string, payload: any, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabase = await createClient()
    
    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: listing } = await supabase
      .from(tableName)
      .select('agent_id')
      .eq('id', listingId)
      .single()

    if (!listing || listing.agent_id !== user.id) {
      throw new Error('Unauthorized: Cannot modify this listing')
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from(tableName)
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId)

    if (error) throw error

    revalidatePath('/agent/listings')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Update Listing Details Error:', err)
    return { success: false, error: err.message }
  }
}

// Update listing availability (Agent or Agency side)
export async function updateListingAvailability(listingId: string, newAvailability: string, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch the property
    const { data: listing } = await supabase
      .from(tableName)
      .select('agent_id, agency_id')
      .eq('id', listingId)
      .single()

    if (!listing) {
      throw new Error('Listing not found')
    }

    // Verify authorized ownership (must be either the listing's agent or listing's agency)
    if (listing.agent_id !== user.id && listing.agency_id !== user.id) {
      throw new Error('Unauthorized: Cannot modify availability for this listing')
    }

    const allowedAvailabilities = ['AVAILABLE', 'UNAVAILABLE']
    if (!allowedAvailabilities.includes(newAvailability.toUpperCase())) {
      throw new Error('Invalid availability status requested.')
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from(tableName)
      .update({ availability: newAvailability.toUpperCase() })
      .eq('id', listingId)

    if (error) {
      // Catch missing column error specifically
      if (error.message?.includes('availability') || error.message?.includes('column')) {
        return { success: false, error: 'MISSING_COLUMN' }
      }
      throw error
    }

    revalidatePath('/agent/listings')
    revalidatePath('/agency/listings')
    revalidatePath('/')
    
    return { success: true }
  } catch (err: any) {
    console.error('Update Listing Availability Error:', err)
    return { success: false, error: err.message }
  }
}
