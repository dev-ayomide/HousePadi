'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getConsumerProfile } from './consumer-actions'

export interface ListingType {
  id: string
  name: string
  slug: string
  contact_fee: number
  viewing_fee: number
  icon_url: string | null
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: string
  consumer_id: string
  listing_id: string
  listing_type: string
  created_at: string
}

export interface PaymentTransaction {
  id: string
  paystack_reference: string
  consumer_id: string
  listing_id: string
  listing_type: string
  amount: number
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED'
  created_at: string
  updated_at: string
}

export interface UnifiedListing {
  id: string
  name: string
  price: number
  address: string
  state: string
  thumbnail_path: string | null
  model_url: string | null
  agent_id: string
  agency_id: string
  phone_number: string | null
  status: string
  file_size: number
  listing_type: string
  rent_interval: string | null
  created_at: string
  updated_at: string
  listing_type_slug: string
  features: Record<string, any>
  favorite_count: number
  gallery?: { url: string; note: string }[]
}

/**
 * Registry Service: Adds a new space type dynamically (Option A)
 * 1. Checks if the caller is an authorized moderator.
 * 2. Inserts the new type definition into ListingTypeRegistry.
 * 3. Safely triggers DB schema generation (creates table and updates SQL view).
 */
export async function addListingType(payload: {
  name: string
  slug: string
  contactFee: number
  viewingFee: number
  iconUrl?: string
}) {
  try {
    const { name, slug, contactFee, viewingFee, iconUrl } = payload
    
    // Normalize slug (lowercase, alphanumeric and underscores only)
    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!sanitizedSlug) {
      return { success: false, error: 'Invalid slug. Must contain alphanumeric characters or underscores.' }
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Authenticate caller and verify MODERATOR role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || '').toUpperCase()
    if (userRole !== 'MODERATOR' && userRole !== 'SUPER_ADMIN') {
      return { success: false, error: 'Forbidden: Only platform moderators can register new space types' }
    }

    // 2. Insert metadata row into ListingTypeRegistry
    const { data: registryItem, error: registryError } = await adminClient
      .from('listing_type_registry')
      .insert([
        {
          name,
          slug: sanitizedSlug,
          contact_fee: contactFee,
          viewing_fee: 0,
          icon_url: iconUrl || null
        }
      ])
      .select()
      .single()

    if (registryError) {
      throw registryError
    }

    // 3. Create the physical database table for the new space type
    const { error: tableError } = await adminClient.rpc('create_dynamic_listing_table', {
      p_slug: sanitizedSlug
    })

    if (tableError) {
      console.error('Failed to create dynamic space table, rolling back metadata registry...')
      // Rollback registry entry
      await adminClient.from('listing_type_registry').delete().eq('slug', sanitizedSlug)
      throw tableError
    }

    // 4. Rebuild the SQL View to include the new table in unified queries
    const { error: viewError } = await adminClient.rpc('rebuild_unified_listings_view')
    if (viewError) {
      console.error('Failed to rebuild unified listings view, rolling back schema alterations...')
      // Clean up table and registry entry
      await adminClient.rpc('execute_ddl', { ddl_query: `DROP TABLE IF EXISTS public.${sanitizedSlug};` })
      await adminClient.from('listing_type_registry').delete().eq('slug', sanitizedSlug)
      throw viewError
    }

    revalidatePath('/admin/moderation')
    revalidatePath('/explore')
    return { success: true, data: registryItem }
  } catch (err: any) {
    console.error('Add Listing Type Error:', err)
    return { success: false, error: err.message || 'Failed to add listing type' }
  }
}

/**
 * Retrieves all registered space types
 */
export async function getListingTypes() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('listing_type_registry')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data as ListingType[] }
  } catch (err: any) {
    console.error('Get Listing Types Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Queries the unified listings view with filters
 */
export async function getUnifiedListings(filters?: {
  type?: string
  state?: string
  minPrice?: number
  maxPrice?: number
  status?: string
}) {
  try {
    const adminClient = createAdminClient()
    let query = adminClient.from('unified_listings').select('*')

    if (filters?.type) {
      query = query.eq('listing_type_slug', filters.type)
    }

    if (filters?.state) {
      query = query.eq('state', filters.state)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      // Default to returning only approved listings for the consumer portal
      query = query.eq('status', 'APPROVED')
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice)
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data as UnifiedListing[] }
  } catch (err: any) {
    console.error('Get Unified Listings Error:', err)
    return { success: false, error: err.message }
  }
}



/**
 * Toggles a listing in the consumer's favorites
 */
export async function toggleFavorite(consumerId: string, listingId: string, listingType: string) {
  try {
    await getConsumerProfile(consumerId)
    const adminClient = createAdminClient()

    // 1. Resolve listing_type_id from listingType slug
    let typeSlug = listingType.toLowerCase().replace('_', '-');
    if (typeSlug === 'apartments') typeSlug = 'apartment';
    if (typeSlug === 'event-centers') typeSlug = 'event-center';
    if (typeSlug === 'public-spaces') typeSlug = 'public-space';

    const { data: typeRegistry, error: registryError } = await adminClient
      .from('listing_type_registry')
      .select('id')
      .eq('slug', typeSlug)
      .maybeSingle()

    if (registryError) throw registryError
    if (!typeRegistry) {
      return { success: false, error: `Listing type '${listingType}' not recognized in registry.` }
    }

    // 2. Check if favorite exists
    const { data: existing, error: checkError } = await adminClient
      .from('favorites')
      .select('*')
      .eq('user_id', consumerId)
      .eq('listing_id', listingId)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      // Remove favorite
      const { error: deleteError } = await adminClient
        .from('favorites')
        .delete()
        .eq('user_id', consumerId)
        .eq('listing_id', listingId)

      if (deleteError) throw deleteError
      return { success: true, favorited: false }
    } else {
      // Add favorite
      const { error: insertError } = await adminClient
        .from('favorites')
        .insert([
          {
            user_id: consumerId,
            listing_id: listingId,
            listing_type_id: typeRegistry.id
          }
        ])

      if (insertError) throw insertError
      return { success: true, favorited: true }
    }
  } catch (err: any) {
    console.error('Toggle Favorite Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Retrieves all listings favorited by a consumer
 */
export async function getConsumerFavorites(consumerId: string) {
  try {
    await getConsumerProfile(consumerId)
    const adminClient = createAdminClient()

    // 1. Get favorite relations
    const { data: favorites, error: favsError } = await adminClient
      .from('favorites')
      .select('listing_id')
      .eq('user_id', consumerId)

    if (favsError) throw favsError

    if (!favorites || favorites.length === 0) {
      return { success: true, data: [] }
    }

    const listingIds = favorites.map(f => f.listing_id)

    // 2. Fetch corresponding unified listings
    const { data: listings, error: listingsError } = await adminClient
      .from('unified_listings')
      .select('*')
      .in('id', listingIds)

    if (listingsError) throw listingsError
    return { success: true, data: listings as UnifiedListing[] }
  } catch (err: any) {
    console.error('Get Consumer Favorites Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Initializes a new payment transaction (ALATPay virtual account)
 */
export async function createPaymentTransaction(payload: {
  transactionReference: string
  consumerId: string
  listingId: string
  listingType: string
  amount: number
}) {
  try {
    const { transactionReference, consumerId, listingId, listingType, amount } = payload
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('payment_transaction')
      .insert([
        {
          paystack_reference: transactionReference,
          consumer_id: consumerId,
          listing_id: listingId,
          listing_type: listingType,
          amount,
          status: 'PENDING'
        }
      ])
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as PaymentTransaction }
  } catch (err: any) {
    console.error('Create Payment Transaction Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Updates the status of a payment transaction (Webhook handler)
 */
export async function updatePaymentTransactionStatus(
  transactionReference: string,
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED'
) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('payment_transaction')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('paystack_reference', transactionReference)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as PaymentTransaction }
  } catch (err: any) {
    console.error('Update Payment Transaction Status Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Collections CRUD Actions
 */
export async function getConsumerCollections(userId: string) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('favorite_collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('getConsumerCollections error:', err)
    return { success: false, error: err.message }
  }
}

export async function createCollection(userId: string, name: string) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('favorite_collections')
      .insert([{ user_id: userId, name }])
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('createCollection error:', err)
    return { success: false, error: err.message }
  }
}

export async function renameCollection(userId: string, collectionId: string, name: string) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('favorite_collections')
      .update({ name })
      .eq('id', collectionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('renameCollection error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteCollection(userId: string, collectionId: string) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('favorite_collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', userId)

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('deleteCollection error:', err)
    return { success: false, error: err.message }
  }
}

export async function addListingToCollection(
  userId: string,
  collectionId: string,
  listingId: string,
  listingType: string
) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()

    // 1. Verify ownership
    const { data: collection, error: collError } = await adminClient
      .from('favorite_collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (collError) throw collError
    if (!collection) {
      return { success: false, error: 'Collection not found or access denied.' }
    }

    // 2. Resolve listing_type_id
    let typeSlug = listingType.toLowerCase().replace('_', '-');
    if (typeSlug === 'apartments') typeSlug = 'apartment';
    if (typeSlug === 'event-centers') typeSlug = 'event-center';
    if (typeSlug === 'public-spaces') typeSlug = 'public-space';

    const { data: typeRegistry, error: registryError } = await adminClient
      .from('listing_type_registry')
      .select('id')
      .eq('slug', typeSlug)
      .maybeSingle()

    if (registryError) throw registryError
    if (!typeRegistry) {
      return { success: false, error: `Listing type '${listingType}' not recognized.` }
    }

    // 3. Insert collection item
    const { data, error } = await adminClient
      .from('collection_items')
      .insert([
        {
          collection_id: collectionId,
          listing_id: listingId,
          listing_type_id: typeRegistry.id
        }
      ])
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('addListingToCollection error:', err)
    return { success: false, error: err.message }
  }
}

export async function removeListingFromCollection(
  userId: string,
  collectionId: string,
  listingId: string
) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()

    // 1. Verify ownership
    const { data: collection, error: collError } = await adminClient
      .from('favorite_collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (collError) throw collError
    if (!collection) {
      return { success: false, error: 'Collection not found or access denied.' }
    }

    // 2. Delete item
    const { error } = await adminClient
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('listing_id', listingId)

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('removeListingFromCollection error:', err)
    return { success: false, error: err.message }
  }
}

export async function getCollectionDetails(userId: string, collectionId: string) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()

    // 1. Verify ownership & fetch collection info
    const { data: collection, error: collError } = await adminClient
      .from('favorite_collections')
      .select('*')
      .eq('id', collectionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (collError) throw collError
    if (!collection) {
      return { success: false, error: 'Collection not found or access denied.' }
    }

    // 2. Fetch collection items
    const { data: items, error: itemsError } = await adminClient
      .from('collection_items')
      .select('listing_id')
      .eq('collection_id', collectionId)

    if (itemsError) throw itemsError

    if (!items || items.length === 0) {
      return { success: true, collection, data: [] }
    }

    const listingIds = items.map(i => i.listing_id)

    // 3. Fetch corresponding listings
    const { data: listings, error: listingsError } = await adminClient
      .from('unified_listings')
      .select('*')
      .in('id', listingIds)

    if (listingsError) throw listingsError
    return { success: true, collection, data: listings as UnifiedListing[] }
  } catch (err: any) {
    console.error('getCollectionDetails error:', err)
    return { success: false, error: err.message }
  }
}

export async function getCollectionsForListing(userId: string, listingId: string) {
  try {
    await getConsumerProfile(userId)
    const adminClient = createAdminClient()
    
    // Fetch all collections owned by user
    const { data: collections, error: collError } = await adminClient
      .from('favorite_collections')
      .select('id')
      .eq('user_id', userId)
      
    if (collError) throw collError
    if (!collections || collections.length === 0) {
      return { success: true, data: [] }
    }
    
    const collectionIds = collections.map(c => c.id)
    
    // Fetch collection items matching the listing inside user's collections
    const { data: items, error } = await adminClient
      .from('collection_items')
      .select('collection_id')
      .in('collection_id', collectionIds)
      .eq('listing_id', listingId)
      
    if (error) throw error
    return { success: true, data: items.map(i => i.collection_id) }
  } catch (err: any) {
    console.error('getCollectionsForListing error:', err)
    return { success: false, error: err.message }
  }
}
