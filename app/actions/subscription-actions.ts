'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateVirtualAccount, checkTransactionStatus, isAlatPaySuccessful, isAlatPayConfigured } from '@/lib/payments/alatpay'
import crypto from 'node:crypto'

export interface SubscriptionPlan {
  id: string
  name: string
  monthly_price: number
  storage_limit_mb: number
  agent_limit: number
  listing_limit: number
  supported_listing_types: string[]
  has_product_placement: boolean
  featured_listing_allowance: number
  upgrade_price: number
  display_order: number
  is_contact_sales: boolean
  is_active: boolean
  is_recommended: boolean
  plan_type?: 'agency' | 'agent' | 'consumer'
}

/**
 * Get all active subscription plans ordered by display_order
 */
export async function getSubscriptionPlans(planType: 'agency' | 'agent' | 'consumer' = 'agency') {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('subscription_plans')
      .select('*')
      .eq('plan_type', planType)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data as SubscriptionPlan[] }
  } catch (err: any) {
    console.error('getSubscriptionPlans error:', err)
    return { success: false, error: err.message || 'Failed to fetch subscription plans.' }
  }
}

/**
 * Update a subscription plan (Admin Only)
 */
export async function updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'MODERATOR' && profile?.role !== 'super_admin') {
      return { success: false, error: 'Forbidden' }
    }

    const { id, created_at, updated_at, ...cleanUpdates } = updates as any

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('subscription_plans')
      .update(cleanUpdates)
      .eq('id', planId)

    if (error) throw error
    
    revalidatePath('/admin/plans')
    revalidatePath('/admin/cms/pricing')
    revalidatePath('/agency/subscription')
    return { success: true }
  } catch (err: any) {
    console.error('updateSubscriptionPlan error:', err)
    return { success: false, error: err.message || 'Failed to update plan.' }
  }
}

/**
 * Create a new subscription plan (Admin Only)
 */
export async function createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'MODERATOR' && profile?.role !== 'super_admin') {
      return { success: false, error: 'Forbidden' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('subscription_plans')
      .insert(plan)
      .select()
      .single()

    if (error) throw error
    
    revalidatePath('/admin/plans')
    revalidatePath('/admin/cms/pricing')
    revalidatePath('/agency/subscription')
    return { success: true, data: data as SubscriptionPlan }
  } catch (err: any) {
    console.error('createSubscriptionPlan error:', err)
    return { success: false, error: err.message || 'Failed to create plan.' }
  }
}

/**
 * Get the current subscription and usage for the logged in agency
 */
export async function getAgencySubscriptionUsage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    
    // 1. Get the organization ID for this user
    const { data: userRecord, error: userError } = await adminClient
      .from('profiles')
      .select('id, role, agency_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return { success: false, error: 'User profile not found.' }
    }

    if (userRecord.role !== 'AGENCY' && userRecord.role !== 'AGENT') {
      return { success: false, error: 'Forbidden: Only agencies or agents can view this.' }
    }
    const agencyId = userRecord.role === 'AGENCY' ? userRecord.id : userRecord.agency_id;

    // Get if this agency is personal
    const { data: agencyProfile } = await adminClient
      .from('profiles')
      .select('is_personal')
      .eq('id', agencyId)
      .single()
    const isPersonal = agencyProfile?.is_personal || false

    // 2. Get the current subscription and plan
    const { data: subData, error: subError } = await adminClient
      .from('agency_subscriptions')
      .select(`
        id, status, current_period_end,
        custom_listing_limit, custom_agent_limit, custom_storage_limit_mb,
        plan:subscription_plans (*)
      `)
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (subError) throw subError

    // If no subscription exists, default to 'Freelancer' (for agents) or 'Spatial' (for agencies)
    let currentPlan = subData?.plan as SubscriptionPlan | undefined
    if (subData && currentPlan) {
      // Override with custom limits if they exist
      currentPlan = {
        ...currentPlan,
        listing_limit: subData.custom_listing_limit ?? currentPlan.listing_limit,
        agent_limit: subData.custom_agent_limit ?? currentPlan.agent_limit,
        storage_limit_mb: subData.custom_storage_limit_mb ?? currentPlan.storage_limit_mb,
      }
    }

    if (!subData) {
      const defaultPlanName = isPersonal ? 'Freelancer' : 'Spatial'
      const defaultPlanType = isPersonal ? 'agent' : 'agency'
      const { data: defaultPlan } = await adminClient
        .from('subscription_plans')
        .select('*')
        .eq('name', defaultPlanName)
        .eq('plan_type', defaultPlanType)
        .maybeSingle()
      
      currentPlan = defaultPlan
      
      if (currentPlan) {
        // Auto assign default
        await adminClient.from('agency_subscriptions').insert({
          agency_id: agencyId,
          plan_id: currentPlan.id,
          current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString()
        })
      }
    }

    if (!currentPlan) {
      return { success: false, error: 'No active plan found.' }
    }

    // 3. Calculate usages
    // Agents (count profiles where agency_id is this agency, plus the agency itself. If personal, only count agent profiles under it)
    let agentsCount = 0
    if (isPersonal) {
      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('role', 'AGENT')
      agentsCount = count || 0
    } else {
      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or(`id.eq.${agencyId},agency_id.eq.${agencyId}`)
        .in('role', ['AGENT', 'AGENCY'])
      agentsCount = count || 0
    }

    // Listings & Storage
    const tables = ['apartments', 'event_centers', 'public_space']
    let totalListingsCount = 0
    let totalStorageBytes = 0

    for (const table of tables) {
      const { count } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
      
      totalListingsCount += count || 0

      const { data } = await adminClient
        .from(table)
        .select('file_size')
        .eq('agency_id', agencyId)
      
      if (data) {
        totalStorageBytes += data.reduce((acc, curr) => acc + (Number(curr.file_size) || 0), 0)
      }
    }

    return {
      success: true,
      data: {
        subscription: subData || { status: 'active', current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
        plan: currentPlan,
        usage: {
          agents: agentsCount || 0,
          listings: totalListingsCount || 0,
          storageBytes: totalStorageBytes
        }
      }
    }
  } catch (err: any) {
    console.error('getAgencySubscriptionUsage error:', err)
    return { success: false, error: err.message || 'Failed to retrieve subscription usage.' }
  }
}

/**
 * Initialize payment to upgrade to a new plan
 */
export async function initializePlanUpgrade(newPlanId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()

    // 1. Get user profile
    const { data: userRecord } = await adminClient
      .from('profiles')
      .select('email, id, role, agency_id')
      .eq('id', user.id)
      .single()

    if (!userRecord) {
      return { success: false, error: 'User profile not found.' }
    }

    let agencyId = ''
    let isPersonal = false
    if (userRecord.role === 'AGENCY') {
      agencyId = userRecord.id
      const { data: agencyRecord } = await adminClient
        .from('profiles')
        .select('is_personal')
        .eq('id', agencyId)
        .single()
      isPersonal = agencyRecord?.is_personal || false
    } else if (userRecord.role === 'AGENT') {
      if (!userRecord.agency_id) {
        return { success: false, error: 'Agent is not associated with any agency.' }
      }
      const { data: agencyRecord } = await adminClient
        .from('profiles')
        .select('id, is_personal')
        .eq('id', userRecord.agency_id)
        .single()
      
      if (!agencyRecord || !agencyRecord.is_personal) {
        return { success: false, error: 'Only agencies or independent agents can upgrade plans.' }
      }
      agencyId = agencyRecord.id
      isPersonal = true
    } else {
      return { success: false, error: 'Only agencies or independent agents can upgrade plans.' }
    }

    // 2. Get current plan
    const { data: currentSub } = await adminClient
      .from('agency_subscriptions')
      .select('plan_id')
      .eq('agency_id', agencyId)
      .maybeSingle()

    // 3. Get new plan details
    const { data: newPlan, error: newPlanError } = await adminClient
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single()

    if (newPlanError || !newPlan) {
      return { success: false, error: 'Target plan not found.' }
    }

    const expectedPlanType = isPersonal ? 'agent' : 'agency'
    if (newPlan.plan_type !== expectedPlanType) {
      return { success: false, error: `Invalid plan type for this account.` }
    }

    if (newPlan.is_contact_sales) {
      return { success: false, error: 'This plan requires contacting sales.' }
    }

    // 4. Determine cost
    const cost = Number(newPlan.monthly_price) || 0

    // 5. Create a PENDING transaction record
    const { data: tx, error: txError } = await adminClient
      .from('subscription_transactions')
      .insert({
        agency_id: agencyId,
        previous_plan_id: currentSub?.plan_id,
        new_plan_id: newPlanId,
        amount_paid: cost,
        status: 'PENDING'
      })
      .select('id')
      .single()

    if (txError) throw txError

    // 6. If cost is 0, upgrade immediately without a gateway call
    if (cost === 0) {
      await processSuccessfulUpgrade(tx.id)
      return { success: true, instant: true }
    }

    // 7. Generate an ALATPay virtual account for the upgrade cost
    const dashboardPath = isPersonal ? '/agent/subscription' : '/agency/subscription'

    if (!isAlatPayConfigured()) {
      return { success: false, error: 'Payment gateway not configured.' }
    }

    const orderId = 'HP_' + crypto.randomBytes(8).toString('hex').toUpperCase()
    let account
    try {
      account = await generateVirtualAccount({
        amount: cost,
        orderId,
        description: `HousePadi ${isPersonal ? 'agent' : 'agency'} plan upgrade`,
        customer: { email: userRecord.email }
      })
    } catch (alatpayErr: any) {
      console.error('Failed to generate ALATPay virtual account for plan upgrade:', alatpayErr)
      return { success: false, error: 'Failed to initialize payment.' }
    }

    // Update tx with the ALATPay transaction reference
    await adminClient
      .from('subscription_transactions')
      .update({ paystack_reference: account.transactionId })
      .eq('id', tx.id)

    const params = new URLSearchParams({
      flow: isPersonal ? 'AGENT_UPGRADE' : 'AGENCY_UPGRADE',
      txId: tx.id,
      amount: String(cost),
      accountNumber: account.virtualBankAccountNumber,
      bankName: account.bankName || '',
      expiresAt: account.expiredAt || '',
      returnTo: dashboardPath
    })

    return { success: true, authorization_url: `/explore/payment?${params.toString()}` }

  } catch (err: any) {
    console.error('initializePlanUpgrade error:', err)
    return { success: false, error: err.message || 'Failed to start upgrade process.' }
  }
}

/**
 * Verify a completed upgrade transaction and apply it
 */
export async function verifyPlanUpgrade(txId: string) {
  try {
    const adminClient = createAdminClient()
    const { data: tx, error: txError } = await adminClient
      .from('subscription_transactions')
      .select('*')
      .eq('id', txId)
      .single()

    if (txError || !tx) return { success: false, error: 'Transaction not found.' }

    if (tx.status === 'SUCCESSFUL') {
      return { success: true } // Already processed
    }

    if (tx.status === 'FAILED') {
      return { success: false, error: 'Transaction was marked as failed.' }
    }

    // Verify with ALATPay if not amount = 0
    if (Number(tx.amount_paid) > 0 && tx.paystack_reference) {
      if (!isAlatPayConfigured()) return { success: false, error: 'Gateway misconfigured.' }

      const result = await checkTransactionStatus(tx.paystack_reference)
      if (!isAlatPaySuccessful(result.status)) {
        return { success: false, error: 'Payment not successful on gateway.' }
      }
    }

    // Process the upgrade
    await processSuccessfulUpgrade(txId)
    return { success: true }
  } catch (err: any) {
    console.error('verifyPlanUpgrade error:', err)
    return { success: false, error: err.message || 'Failed to verify upgrade.' }
  }
}

/**
 * Internal logic to apply the upgrade to the agency
 */
export async function processSuccessfulUpgrade(txId: string) {
  const adminClient = createAdminClient()
  
  // 1. Get transaction
  const { data: tx } = await adminClient
    .from('subscription_transactions')
    .select('*')
    .eq('id', txId)
    .single()

  if (!tx) throw new Error('Transaction not found')

  // 2. Mark tx as SUCCESSFUL
  await adminClient
    .from('subscription_transactions')
    .update({ status: 'SUCCESSFUL', updated_at: new Date().toISOString() })
    .eq('id', txId)

  // 3. Update agency_subscriptions
  await adminClient
    .from('agency_subscriptions')
    .upsert({
      agency_id: tx.agency_id,
      plan_id: tx.new_plan_id,
      status: 'active',
      current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'agency_id'
    })

  // 4. Create Notification for Agency
  const { data: previousPlan } = tx.previous_plan_id 
    ? await adminClient.from('subscription_plans').select('name').eq('id', tx.previous_plan_id).single() 
    : { data: null }
  const { data: newPlan } = await adminClient.from('subscription_plans').select('name').eq('id', tx.new_plan_id).single()

  const previousPlanName = previousPlan?.name || 'Previous Plan'
  const newPlanName = newPlan?.name || 'New Plan'
  await adminClient
    .from('agency_notifications')
    .insert({
      agency_id: tx.agency_id,
      message: `Your account has been upgraded to ${newPlanName}.`,
      type: 'upgrade'
    })

  // 5. Notify Admins (For now we'll just log it or add an admin notification if such table exists.
  // We'll leave it in logs for now, or add to a central admin notification table)
  console.log(`[Admin Notice] Agency ${tx.agency_id} upgraded from ${previousPlanName} to ${newPlanName}`)

  revalidatePath('/agency/subscription')
  revalidatePath('/agent/subscription')
}

/**
 * Get Billing History
 */
export async function getAgencyBillingHistory() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    const { data: userRecord } = await adminClient
      .from('profiles')
      .select('id, role, agency_id')
      .eq('id', user.id)
      .single()

    if (!userRecord) return { success: false, error: 'User not found' }

    let agencyId = ''
    if (userRecord.role === 'AGENCY') {
      agencyId = userRecord.id
    } else if (userRecord.role === 'AGENT') {
      if (!userRecord.agency_id) {
        return { success: false, error: 'Agent is not associated with any agency.' }
      }
      const { data: agencyRecord } = await adminClient
        .from('profiles')
        .select('id, is_personal')
        .eq('id', userRecord.agency_id)
        .single()
      
      if (!agencyRecord || !agencyRecord.is_personal) {
        return { success: false, error: 'Not an agency' }
      }
      agencyId = agencyRecord.id
    } else {
      return { success: false, error: 'Not authorized' }
    }

    const { data, error } = await adminClient
      .from('subscription_transactions')
      .select(`
        id, amount_paid, status, created_at, paystack_reference,
        previous_plan:previous_plan_id (name),
        new_plan:new_plan_id (name)
      `)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    console.error('getAgencyBillingHistory error:', err)
    return { success: false, error: err.message || 'Failed to retrieve billing history.' }
  }
}
