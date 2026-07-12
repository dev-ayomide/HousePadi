'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateVirtualAccount, checkTransactionStatus, isAlatPaySuccessful, isAlatPayConfigured } from '@/lib/payments/alatpay'
import crypto from 'node:crypto'

export interface ApiKeyData {
  id: string
  name: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
  tier_name: string
  included_calls: number
  current_period_calls_count: number
  owner_email?: string
  allowed_domain?: string | null
}

export interface BillingTier {
  id: string
  name: string
  base_monthly_price: number
  included_calls: number
  overage_call_fee: number
  created_at: string
  updated_at: string
}

/**
 * Helper: Hashes API keys using SHA-256 for secure storage
 */
function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Gets all API keys created by the currently logged-in Developer
 */
export async function getDeveloperApiKeys() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required.' }
    }

    const adminClient = createAdminClient()

    // Query keys belonging to the developer, joining billing_tiers details
    const { data, error } = await adminClient
      .from('api_keys')
      .select(`
        id,
        name,
        is_active,
        created_at,
        last_used_at,
        current_period_calls_count,
        allowed_domain,
        billing_tiers (
          name,
          included_calls
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const mappedKeys: ApiKeyData[] = (data || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      is_active: k.is_active,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      current_period_calls_count: k.current_period_calls_count || 0,
      tier_name: k.billing_tiers?.name || 'Free',
      included_calls: k.billing_tiers?.included_calls || 1000,
      allowed_domain: k.allowed_domain
    }))

    return { success: true, data: mappedKeys }
  } catch (err: any) {
    console.error('Get Developer API Keys Error:', err)
    return { success: false, error: err.message || 'Failed to retrieve keys.' }
  }
}

/**
 * Gets all API keys in the platform (Moderator view)
 */
export async function getAdminApiKeys() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized.' }
    }

    // Verify moderator role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'MODERATOR' && profile.role !== 'SUPER_ADMIN')) {
      return { success: false, error: 'Forbidden: Platform moderator access only.' }
    }

    const adminClient = createAdminClient()

    // Fetch keys, user profiles, and billing tiers
    const { data, error } = await adminClient
      .from('api_keys')
      .select(`
        id,
        name,
        user_id,
        is_active,
        created_at,
        last_used_at,
        current_period_calls_count,
        allowed_domain,
        billing_tiers (
          name,
          included_calls
        ),
        profiles:user_id (
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const mappedKeys: ApiKeyData[] = (data || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      is_active: k.is_active,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      current_period_calls_count: k.current_period_calls_count || 0,
      tier_name: k.billing_tiers?.name || 'Free',
      included_calls: k.billing_tiers?.included_calls || 1000,
      owner_email: k.profiles?.email || 'unknown@developer.com',
      allowed_domain: k.allowed_domain
    }))

    return { success: true, data: mappedKeys }
  } catch (err: any) {
    console.error('Get Admin API Keys Error:', err)
    return { success: false, error: err.message || 'Failed to retrieve admin key metrics.' }
  }
}

/**
 * Generates a new API Key for a developer
 */
export async function generateApiKey(clientName: string, tierId?: string, allowedDomain?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required.' }
    }

    const adminClient = createAdminClient()

    // Resolve tierId. If not provided, fetch 'Free' tier ID.
    let targetTierId = tierId
    if (!targetTierId) {
      const { data: freeTier, error: tierError } = await adminClient
        .from('billing_tiers')
        .select('id')
        .eq('name', 'Free')
        .single()

      if (tierError || !freeTier) {
        throw new Error('Billing tiers not seeded. Free tier missing.')
      }
      targetTierId = freeTier.id
    }

    // Generate raw key: e.g., hp_dev_8a7d...
    const rawKey = 'hp_dev_' + crypto.randomBytes(24).toString('hex')
    const keyHash = hashApiKey(rawKey)

    const domain = allowedDomain ? allowedDomain.trim().toLowerCase() : null

    // Save key details
    const { error: insertError } = await adminClient
      .from('api_keys')
      .insert([
        {
          user_id: user.id,
          key_hash: keyHash,
          name: clientName,
          tier_id: targetTierId,
          is_active: true,
          current_period_calls_count: 0,
          allowed_domain: domain
        }
      ])

    if (insertError) throw insertError

    revalidatePath('/developer/keys')
    revalidatePath('/admin/keys')

    return { success: true, rawKey }
  } catch (err: any) {
    console.error('Generate API Key Error:', err)
    return { success: false, error: err.message || 'Failed to generate key.' }
  }
}

/**
 * Toggles an API key active state
 */
export async function toggleApiKeyStatus(id: string, active: boolean) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('api_keys')
      .update({ is_active: active })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/developer/keys')
    revalidatePath('/admin/keys')
    return { success: true }
  } catch (err: any) {
    console.error('Toggle API Key Status Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Revokes and deletes an API Key
 */
export async function deleteApiKey(id: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('api_keys')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/developer/keys')
    revalidatePath('/admin/keys')
    return { success: true }
  } catch (err: any) {
    console.error('Delete API Key Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Retrieves all billing configuration tiers
 */
export async function getBillingTiers() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('billing_tiers')
      .select('*')
      .order('base_monthly_price', { ascending: true })

    if (error) throw error
    return { success: true, data: data as BillingTier[] }
  } catch (err: any) {
    console.error('Get Billing Tiers Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Updates dynamic pricing parameters for an API billing tier
 */
export async function updateBillingTierConfig(tierId: string, payload: {
  base_monthly_price: number
  included_calls: number
  overage_call_fee: number
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Verify moderator role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'MODERATOR' && profile.role !== 'SUPER_ADMIN')) {
      throw new Error('Forbidden')
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('billing_tiers')
      .update({
        base_monthly_price: payload.base_monthly_price,
        included_calls: payload.included_calls,
        overage_call_fee: payload.overage_call_fee,
        updated_at: new Date().toISOString()
      })
      .eq('id', tierId)

    if (error) throw error

    revalidatePath('/admin/pricing')
    revalidatePath('/developer/keys')
    return { success: true }
  } catch (err: any) {
    console.error('Update Billing Tier Config Error:', err)
    return { success: false, error: err.message || 'Failed to update billing configurations.' }
  }
}

/**
 * Upgrades an API Key to a different billing tier
 */
export async function upgradeApiKeyTier(keyId: string, tierId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const adminClient = createAdminClient()
    
    // Verify ownership of the key
    const { data: keyData } = await adminClient
      .from('api_keys')
      .select('user_id')
      .eq('id', keyId)
      .single()

    if (!keyData || keyData.user_id !== user.id) {
      throw new Error('Forbidden')
    }

    const { error } = await adminClient
      .from('api_keys')
      .update({
        tier_id: tierId,
        current_period_calls_count: 0
      })
      .eq('id', keyId)

    if (error) throw error

    revalidatePath('/developer/keys')
    return { success: true }
  } catch (err: any) {
    console.error('Upgrade API Key Tier Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Updates domain restriction for an API key
 */
export async function updateApiKeyDomain(keyId: string, allowedDomain: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const adminClient = createAdminClient()
    
    // Verify ownership of the key
    const { data: keyData } = await adminClient
      .from('api_keys')
      .select('user_id')
      .eq('id', keyId)
      .single()

    if (!keyData || keyData.user_id !== user.id) {
      throw new Error('Forbidden')
    }

    const domain = allowedDomain ? allowedDomain.trim().toLowerCase() : null

    const { error } = await adminClient
      .from('api_keys')
      .update({
        allowed_domain: domain
      })
      .eq('id', keyId)

    if (error) throw error

    revalidatePath('/developer/keys')
    return { success: true }
  } catch (err: any) {
    console.error('Update API Key Domain Error:', err)
    return { success: false, error: err.message || 'Failed to update domain restriction.' }
  }
}

/**
 * Initializes an ALATPay transaction to upgrade an API Key to a paid tier
 */
export async function initializeApiKeyUpgradePayment(keyId: string, tierId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required.' }
    }

    const adminClient = createAdminClient()

    // 1. Verify key ownership
    const { data: keyData, error: keyError } = await adminClient
      .from('api_keys')
      .select('user_id, name')
      .eq('id', keyId)
      .single()

    if (keyError || !keyData || keyData.user_id !== user.id) {
      return { success: false, error: 'Forbidden: You do not own this API Key.' }
    }

    // 2. Get billing tier details
    const { data: tierData, error: tierError } = await adminClient
      .from('billing_tiers')
      .select('*')
      .eq('id', tierId)
      .single()

    if (tierError || !tierData) {
      return { success: false, error: 'Target billing tier not found.' }
    }

    const cost = Number(tierData.base_monthly_price) || 0
    if (cost <= 0) {
      // Free upgrade can be done directly
      const upgradeRes = await upgradeApiKeyTier(keyId, tierId)
      return { success: true, instant: true }
    }

    // 3. Generate an ALATPay virtual account for the upgrade cost
    if (!isAlatPayConfigured()) {
      return { success: false, error: 'Payment gateway not configured on server.' }
    }

    const orderId = 'HP_' + crypto.randomBytes(8).toString('hex').toUpperCase()
    let account
    try {
      account = await generateVirtualAccount({
        amount: cost,
        orderId,
        description: 'HousePadi developer API key upgrade',
        customer: { email: user.email || '' }
      })
    } catch (alatpayErr: any) {
      console.error('Failed to generate ALATPay virtual account for API key upgrade:', alatpayErr)
      return { success: false, error: 'Failed to initialize payment.' }
    }

    const params = new URLSearchParams({
      flow: 'DEVELOPER_KEY_UPGRADE',
      reference: account.transactionId,
      keyId,
      tierId,
      amount: String(cost),
      accountNumber: account.virtualBankAccountNumber,
      bankName: account.bankName || '',
      expiresAt: account.expiredAt || '',
      returnTo: '/developer/keys'
    })

    return { success: true, authorization_url: `/explore/payment?${params.toString()}` }

  } catch (err: any) {
    console.error('Initialize API Key Upgrade error:', err)
    return { success: false, error: err.message || 'Failed to start payment process.' }
  }
}

/**
 * Verifies the ALATPay reference and upgrades the API Key
 */
export async function verifyApiKeyUpgradePayment(reference: string, keyId: string, tierId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized.' }
    }

    const adminClient = createAdminClient()

    // 1. Verify key ownership
    const { data: keyData } = await adminClient
      .from('api_keys')
      .select('user_id')
      .eq('id', keyId)
      .single()

    if (!keyData || keyData.user_id !== user.id) {
      return { success: false, error: 'Forbidden.' }
    }

    // 2. Prevent replay attacks (check if this reference has already been claimed)
    const { data: existingClaim } = await adminClient
      .from('api_keys')
      .select('id')
      .eq('paystack_subscription_id', reference)
      .maybeSingle()

    if (existingClaim) {
      return { success: false, error: 'This payment reference has already been claimed.' }
    }

    // 3. Verify payment with ALATPay
    if (!isAlatPayConfigured()) {
      return { success: false, error: 'Payment gateway not configured.' }
    }

    const result = await checkTransactionStatus(reference)
    if (!isAlatPaySuccessful(result.status)) {
      return { success: false, error: 'Payment not successful on gateway.' }
    }

    // 4. Update the key's tier
    const { error: updateError } = await adminClient
      .from('api_keys')
      .update({
        tier_id: tierId,
        current_period_calls_count: 0,
        paystack_subscription_id: reference
      })
      .eq('id', keyId)

    if (updateError) throw updateError

    revalidatePath('/developer/keys')
    return { success: true }

  } catch (err: any) {
    console.error('Verify API Key Payment error:', err)
    return { success: false, error: err.message || 'Failed to verify payment.' }
  }
}
