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

// Update listing status (Agency side)
export async function updateListingStatus(listingId: string, newStatus: string, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabase = await createClient()
    
    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: listing } = await supabase
      .from(tableName)
      .select('agency_id')
      .eq('id', listingId)
      .single()

    if (!listing || listing.agency_id !== user.id) {
      throw new Error('Unauthorized: Cannot modify this listing')
    }

    // Only allow specific transitions from agency side
    const allowedStatuses = ['DRAFT', 'PENDING_MODERATION', 'SUSPENDED']
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error('Invalid state transition requested.')
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from(tableName)
      .update({ status: newStatus })
      .eq('id', listingId)

    if (error) throw error

    revalidatePath('/agency/listings')
    return { success: true }
  } catch (err: any) {
    console.error('Update Listing Status Error:', err)
    return { success: false, error: err.message }
  }
}

// Delete listing (Agency side)
export async function deleteListing(listingId: string, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabase = await createClient()
    
    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: listing } = await supabase
      .from(tableName)
      .select('agency_id, model_url, thumbnail_path')
      .eq('id', listingId)
      .single()

    if (!listing || listing.agency_id !== user.id) {
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

    revalidatePath('/agency/listings')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Listing Error:', err)
    return { success: false, error: err.message }
  }
}
