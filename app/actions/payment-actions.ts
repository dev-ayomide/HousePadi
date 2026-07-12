'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentConsumer } from './consumer-auth-actions'
import { revalidatePath } from 'next/cache'
import { getConsumerProfile } from './consumer-actions'
import { checkTransactionStatus, isAlatPaySuccessful, isAlatPayConfigured } from '@/lib/payments/alatpay'

/**
 * Gets agent contact details for a listing if the fee is 0 OR if the consumer has paid for it.
 */
export async function getListingContactInfo(listingId: string, categorySlug: string) {
  try {
    const adminClient = createAdminClient()
    
    // 1. Get current listing type details (check fee)
    const { data: registryItem, error: registryError } = await adminClient
      .from('listing_type_registry')
      .select('contact_fee')
      .eq('slug', categorySlug)
      .maybeSingle()

    if (registryError || !registryItem) {
      return { success: false, error: 'Listing category not registered.' }
    }

    const fee = Number(registryItem.contact_fee) || 0

    // 2. Fetch the listing to find the agent_id
    const { data: listing, error: listingError } = await adminClient
      .from('unified_listings')
      .select('agent_id, phone_number')
      .eq('id', listingId)
      .maybeSingle()

    if (listingError || !listing) {
      return { success: false, error: 'Listing not found.' }
    }

    // 3. Verify if payment is required
    let isPermitted = false
    let currentConsumerId = ''
    let consumerEmail = ''

    const sessionRes = await getCurrentConsumer()
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (sessionRes.success && sessionRes.consumer) {
      currentConsumerId = sessionRes.consumer.id
      consumerEmail = sessionRes.consumer.email
    } else if (user) {
      currentConsumerId = user.id
      consumerEmail = user.email || ''
    }

    if (user && user.id === listing.agent_id) {
      isPermitted = true
    }

    let availableCredits = 0
    if (consumerEmail) {
      const { data: creditRec } = await adminClient
        .from('consumer_credits')
        .select('credits')
        .eq('email', consumerEmail)
        .maybeSingle()
      if (creditRec) {
        availableCredits = creditRec.credits
      }
    }

    if (!isPermitted) {
      if (fee === 0) {
        isPermitted = true
      } else {
        if (!currentConsumerId) {
          return { success: false, requiresAuth: true, fee }
        }
        
        // Use the new checkContactAccess gating logic
        isPermitted = await checkContactAccess(currentConsumerId, listingId)
      }
    }

    if (!isPermitted) {
      return { 
        success: false, 
        requiresPayment: true, 
        fee,
        hasCredits: availableCredits > 0,
        availableCredits
      }
    }

    // 4. Retrieve Agent contact information from profiles table
    const { data: agentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('full_name, phone_number, email, agency_id')
      .eq('id', listing.agent_id)
      .maybeSingle()

    if (profileError || !agentProfile) {
      return { success: false, error: 'Agent profile not found.' }
    }

    let agencyName = ''
    if (agentProfile.agency_id) {
      const { data: agencyProfile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', agentProfile.agency_id)
        .maybeSingle()
      if (agencyProfile) {
        agencyName = agencyProfile.full_name || ''
      }
    }

    return {
      success: true,
      contactInfo: {
        name: agentProfile.full_name || 'Agent',
        phone: agentProfile.phone_number || listing.phone_number || 'No phone number listed',
        email: agentProfile.email || 'No email listed',
        agency: agencyName || 'Independent Agent'
      }
    }
  } catch (err: any) {
    console.error('Get Listing Contact Info Error:', err)
    return { success: false, error: err.message || 'Failed to retrieve agent details.' }
  }
}

/**
 * Gets all viewing requests for listings belonging to the currently logged in Agent.
 */
export async function getViewingRequestsForAgent() {
  try {
    const supabase = await createClient()
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required.' }
    }

    // 2. Verify agent role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'AGENT') {
      return { success: false, error: 'Forbidden: Only agents can access viewing requests.' }
    }

    const adminClient = createAdminClient()

    // 3. Get all listings of this agent
    const { data: listings, error: listingsError } = await adminClient
      .from('unified_listings')
      .select('id, name, address, listing_type_slug')
      .eq('agent_id', user.id)

    if (listingsError) throw listingsError
    if (!listings || listings.length === 0) {
      return { success: true, data: [] }
    }

    const listingIds = listings.map(l => l.id)

    // 4. Fetch viewing requests for these listings
    const { data: requests, error: requestsError } = await adminClient
      .from('viewing_requests')
      .select('*')
      .in('listing_id', listingIds)
      .order('requested_date', { ascending: true })

    if (requestsError) throw requestsError
    if (!requests || requests.length === 0) {
      return { success: true, data: [] }
    }

    // 5. Gather consumer emails & map full objects
    const consumerIds = Array.from(new Set(requests.map(r => r.consumer_id)))
    const { data: consumers, error: consumersError } = await adminClient
      .from('profiles')
      .select('id, email')
      .in('id', consumerIds)

    if (consumersError) throw consumersError

    const consumersMap = new Map(consumers?.map(c => [c.id, c.email]))
    const listingsMap = new Map(listings.map(l => [l.id, l]))

    const result = requests.map(req => {
      const listing = listingsMap.get(req.listing_id)
      return {
        id: req.id,
        consumerId: req.consumer_id,
        consumerEmail: consumersMap.get(req.consumer_id) || 'unknown@consumer.com',
        listingId: req.listing_id,
        listingName: listing?.name || 'Unknown Space',
        listingAddress: listing?.address || 'Unknown Address',
        listingType: listing?.listing_type_slug || 'apartment',
        requestedDate: req.requested_date,
        status: req.status,
        paymentReference: req.payment_reference,
        createdAt: req.created_at
      }
    })

    return { success: true, data: result }
  } catch (err: any) {
    console.error('Get Agent Viewing Requests Error:', err)
    return { success: false, error: err.message || 'Failed to retrieve viewing requests.' }
  }
}

/**
 * Updates a viewing request's status and optionally sets a rescheduled date.
 */
export async function updateViewingRequestStatus(
  requestId: string,
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESCHEDULED',
  newDate?: string
) {
  try {
    const supabase = await createClient()
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required.' }
    }

    const adminClient = createAdminClient()

    // 2. Fetch viewing request details to verify ownership of listing
    const { data: viewingRequest, error: reqError } = await adminClient
      .from('viewing_requests')
      .select('listing_id')
      .eq('id', requestId)
      .maybeSingle()

    if (reqError || !viewingRequest) {
      return { success: false, error: 'Viewing request not found.' }
    }

    // 3. Verify that the listing belongs to the current agent
    const { data: listing, error: listingError } = await adminClient
      .from('unified_listings')
      .select('agent_id')
      .eq('id', viewingRequest.listing_id)
      .maybeSingle()

    if (listingError || !listing || listing.agent_id !== user.id) {
      return { success: false, error: 'Forbidden: You do not own the listing associated with this request.' }
    }

    // 4. Update status and date
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'RESCHEDULED' && newDate) {
      updateData.requested_date = newDate
    }

    const { error: updateError } = await adminClient
      .from('viewing_requests')
      .update(updateData)
      .eq('id', requestId)

    if (updateError) throw updateError

    revalidatePath('/agent/viewings')
    return { success: true }
  } catch (err: any) {
    console.error('Update Viewing Request Error:', err)
    return { success: false, error: err.message || 'Failed to update viewing request.' }
  }
}

/**
 * Verifies a payment transaction status by checking the database and querying ALATPay if necessary.
 */
export async function verifyPaymentTransaction(reference: string) {
  try {
    const adminClient = createAdminClient()

    // 1. Fetch the transaction from database
    const { data: txRecord, error: txError } = await adminClient
      .from('payment_transaction')
      .select('*')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (txError) {
      console.error('Failed to fetch transaction record:', txError)
      return { success: false, error: 'Database error fetching transaction.' }
    }

    if (!txRecord) {
      return { success: false, error: 'Transaction reference not found.' }
    }

    // 2. If already successful, just return the details
    if (txRecord.status === 'SUCCESSFUL') {
      return {
        success: true,
        paymentType: txRecord.payment_type,
        listingId: txRecord.listing_id,
        status: 'SUCCESSFUL'
      }
    }

    // 3. If it's pending, verify with ALATPay (if configured)
    if (isAlatPayConfigured()) {
      try {
        const result = await checkTransactionStatus(reference)
        if (isAlatPaySuccessful(result.status)) {
          // Update transaction in database
          const { error: updateError } = await adminClient
            .from('payment_transaction')
            .update({
              status: 'SUCCESSFUL',
              updated_at: new Date().toISOString()
            })
            .eq('paystack_reference', reference)

          if (updateError) {
            console.error('Failed to update transaction status to SUCCESSFUL:', updateError)
            return { success: false, error: 'Failed to update transaction status.' }
          }

          // VIEWING type requests are no longer supported
          if (txRecord.payment_type === 'CONTACT') {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            const { error: permError } = await adminClient
              .from('contact_access_permissions')
              .upsert({
                user_id: txRecord.consumer_id,
                listing_id: txRecord.listing_id,
                payment_id: reference,
                expires_at: expiresAt
              }, {
                onConflict: 'user_id,listing_id'
              })

            if (permError) {
              console.error('Failed to insert/upsert contact_access_permissions in verify:', permError)
            }
          }

          return {
            success: true,
            paymentType: txRecord.payment_type,
            listingId: txRecord.listing_id,
            status: 'SUCCESSFUL'
          }
        }
      } catch (alatpayErr) {
        console.error('Failed to verify transaction via ALATPay API:', alatpayErr)
      }
    }

    return {
      success: false,
      status: txRecord.status,
      paymentType: txRecord.payment_type,
      listingId: txRecord.listing_id
    }
  } catch (err: any) {
    console.error('Verify Payment Transaction Action Error:', err)
    return { success: false, error: err.message || 'Internal verification error.' }
  }
}

/**
 * Utility to check if a consumer has valid contact access for a listing
 */
export async function checkContactAccess(userId: string, listingId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    
    // Ensure profile exists first (resolving foreign key dependency logic)
    await getConsumerProfile(userId)

    const { data, error } = await adminClient
      .from('contact_access_permissions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle()

    if (error || !data) return false

    const expiresAt = new Date(data.expires_at)
    return expiresAt > new Date()
  } catch (err) {
    console.error('Check Contact Access Error:', err)
    return false
  }
}

/**
 * Retrieves payment history with access status for the consumer dashboard
 */
export async function getConsumerPaymentHistory(userId: string) {
  try {
    const adminClient = createAdminClient()

    // Ensure consumer profile exists to prevent foreign key errors
    await getConsumerProfile(userId)

    // 1. Fetch consumer transactions
    const { data: txs, error: txsError } = await adminClient
      .from('payment_transaction')
      .select('*')
      .eq('consumer_id', userId)
      .order('created_at', { ascending: false })

    if (txsError) throw txsError
    if (!txs || txs.length === 0) {
      return { success: true, data: [] }
    }

    // 2. Fetch all listing IDs associated with these transactions
    const listingIds = Array.from(new Set(txs.map(tx => tx.listing_id).filter(Boolean)))

    // Fetch listing details (names and types) from unified_listings
    const { data: listings, error: listingsError } = await adminClient
      .from('unified_listings')
      .select('id, name, listing_type_slug')
      .in('id', listingIds)

    if (listingsError) throw listingsError
    const listingsMap = new Map(listings?.map(l => [l.id, l]))

    // 3. Fetch contact access permissions to resolve access expiration status
    const { data: permissions, error: permError } = await adminClient
      .from('contact_access_permissions')
      .select('listing_id, expires_at')
      .eq('user_id', userId)

    if (permError) throw permError
    const permissionsMap = new Map(permissions?.map(p => [p.listing_id, p.expires_at]))

    // 4. Map transactions to UI representation
    const result = txs.map(tx => {
      const listing = listingsMap.get(tx.listing_id)
      const expiresAtStr = permissionsMap.get(tx.listing_id)
      
      let status: 'Active' | 'Expired' | 'Pending' | 'Failed' = 'Pending'
      if (tx.status === 'SUCCESSFUL') {
        if (expiresAtStr) {
          const expiresAt = new Date(expiresAtStr)
          status = expiresAt > new Date() ? 'Active' : 'Expired'
        } else {
          // If transaction succeeded but no contact access record is found, default to Active if within 30 days
          const paymentDate = new Date(tx.created_at)
          const thirtyDaysLater = new Date(paymentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          status = thirtyDaysLater > new Date() ? 'Active' : 'Expired'
        }
      } else {
        // If the transaction is PENDING but older than 15 minutes, mark it as Failed (expired)
        const createdDate = new Date(tx.created_at)
        const isExpiredPending = (Date.now() - createdDate.getTime()) > 15 * 60 * 1000
        if (isExpiredPending || tx.status === 'FAILED') {
          status = 'Failed'
        } else {
          status = 'Pending'
        }
      }

      return {
        id: tx.id,
        listingId: tx.listing_id,
        listingName: listing?.name || 'Unknown Space',
        listingType: listing?.listing_type_slug || tx.listing_type || 'apartment',
        amount: Number(tx.amount) || 0,
        paymentDate: tx.created_at,
        expiresAt: expiresAtStr || new Date(new Date(tx.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status
      }
    })

    return { success: true, data: result }
  } catch (err: any) {
    console.error('Get Consumer Payment History Error:', err)
    return { success: false, error: err.message || 'Failed to retrieve payment history.' }
  }
}

/**
 * Retrieves all contact details for listings in a category that the consumer has active access to
 */
export async function getUnlockedContactsForConsumer(userId: string, categorySlug: string) {
  try {
    const adminClient = createAdminClient()
    
    // Ensure consumer profile exists to prevent foreign key errors
    await getConsumerProfile(userId)

    // 1. Get all active permission records
    const { data: permissions, error: permError } = await adminClient
      .from('contact_access_permissions')
      .select('listing_id')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())

    if (permError) throw permError
    if (!permissions || permissions.length === 0) {
      return { success: true, data: {} }
    }

    const listingIds = permissions.map(p => p.listing_id)

    // 2. Fetch the listings in this category to verify
    const { data: listings, error: listingsError } = await adminClient
      .from('unified_listings')
      .select('id, agent_id, phone_number')
      .in('id', listingIds)
      .eq('listing_type_slug', categorySlug)

    if (listingsError) throw listingsError
    if (!listings || listings.length === 0) {
      return { success: true, data: {} }
    }

    const agentIds = Array.from(new Set(listings.map(l => l.agent_id)))

    // 3. Fetch agent profiles and their agencies
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, phone_number, email, agency_id')
      .in('id', agentIds)

    if (profilesError) throw profilesError
    
    const profilesMap = new Map(profiles?.map(p => [p.id, p]))

    // Gather agency IDs
    const agencyIds = Array.from(new Set(profiles.map(p => p.agency_id).filter(Boolean)))
    let agenciesMap = new Map()
    if (agencyIds.length > 0) {
      const { data: agencies } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .in('id', agencyIds)
      if (agencies) {
        agenciesMap = new Map(agencies.map(a => [a.id, a.full_name]))
      }
    }

    // 4. Construct the return payload mapping listingId to contact info
    const contactMap: Record<string, { name: string; phone: string; email: string; agency: string }> = {}
    for (const listing of listings) {
      const agentProfile = profilesMap.get(listing.agent_id)
      if (agentProfile) {
        const agencyName = agentProfile.agency_id ? agenciesMap.get(agentProfile.agency_id) : ''
        contactMap[listing.id] = {
          name: agentProfile.full_name || 'Agent',
          phone: agentProfile.phone_number || listing.phone_number || 'No phone number listed',
          email: agentProfile.email || 'No email listed',
          agency: agencyName || 'Independent Agent'
        }
      }
    }

    return { success: true, data: contactMap }
  } catch (err: any) {
    console.error('getUnlockedContactsForConsumer error:', err)
    return { success: false, error: err.message || 'Failed to retrieve unlocked contacts.' }
  }
}
