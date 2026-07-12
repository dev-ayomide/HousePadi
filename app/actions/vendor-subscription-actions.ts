'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateVirtualAccount, checkTransactionStatus, isAlatPaySuccessful, isAlatPayConfigured } from '@/lib/payments/alatpay'
import crypto from 'node:crypto'

export async function getVendorTiers() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('vendor_subscription_tiers')
      .select('*')
      .order('price', { ascending: true })

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createVendorTier(tier: any) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'MODERATOR' && profile?.role !== 'super_admin') return { success: false, error: 'Forbidden' }

    const { id, created_at, updated_at, ...cleanData } = tier
    const { data, error } = await adminClient.from('vendor_subscription_tiers').insert(cleanData).select().single()
    if (error) throw error

    revalidatePath('/admin/cms/pricing')
    revalidatePath('/vendor/subscription')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateVendorTier(tierId: string, updates: any) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'MODERATOR' && profile?.role !== 'super_admin') return { success: false, error: 'Forbidden' }

    const { id, created_at, updated_at, ...cleanData } = updates
    const { data, error } = await adminClient.from('vendor_subscription_tiers').update(cleanData).eq('id', tierId).select().single()
    if (error) throw error

    revalidatePath('/admin/cms/pricing')
    revalidatePath('/vendor/subscription')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getVendorSubscriptionUsage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    
    const { data: profile, error: profileError } = await adminClient
      .from('vendor_profiles')
      .select('current_tier_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return { success: false, error: 'Profile not found' }

    const { data: currentTier } = await adminClient
      .from('vendor_subscription_tiers')
      .select('*')
      .eq('id', profile.current_tier_id)
      .single()

    const { count: productsCount } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)

    const { data: products } = await adminClient
      .from('products')
      .select('model_size_bytes')
      .eq('vendor_id', user.id)

    const storageUsed = products?.reduce((acc, p) => acc + (Number(p.model_size_bytes) || 0), 0) || 0

    return {
      success: true,
      data: {
        tier: currentTier,
        usage: {
          products: productsCount || 0,
          storageBytes: storageUsed
        }
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function initializeVendorTierUpgrade(newTierId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('vendor_profiles')
      .select('current_tier_id')
      .eq('id', user.id)
      .single()

    const { data: newTier } = await adminClient
      .from('vendor_subscription_tiers')
      .select('*')
      .eq('id', newTierId)
      .single()

    if (!newTier) return { success: false, error: 'Tier not found.' }

    const cost = Number(newTier.price) || 0

    const { data: tx, error: txError } = await adminClient
      .from('vendor_transactions')
      .insert({
        vendor_id: user.id,
        previous_tier_id: profile?.current_tier_id,
        new_tier_id: newTierId,
        amount_paid: cost,
        status: 'PENDING'
      })
      .select('id')
      .single()

    if (txError) throw txError

    if (cost === 0) {
      await processVendorUpgrade(tx.id)
      return { success: true, instant: true }
    }

    if (!isAlatPayConfigured()) return { success: false, error: 'Payment gateway not configured.' }

    const orderId = 'HP_' + crypto.randomBytes(8).toString('hex').toUpperCase()
    let account
    try {
      account = await generateVirtualAccount({
        amount: cost,
        orderId,
        description: 'HousePadi vendor plan upgrade',
        customer: { email: user.email || '' }
      })
    } catch (alatpayErr: any) {
      console.error('Failed to generate ALATPay virtual account for vendor upgrade:', alatpayErr)
      return { success: false, error: 'Failed to initialize payment.' }
    }

    await adminClient
      .from('vendor_transactions')
      .update({ paystack_reference: account.transactionId })
      .eq('id', tx.id)

    const params = new URLSearchParams({
      flow: 'VENDOR_UPGRADE',
      txId: tx.id,
      amount: String(cost),
      accountNumber: account.virtualBankAccountNumber,
      bankName: account.bankName || '',
      expiresAt: account.expiredAt || '',
      returnTo: '/vendor/subscription'
    })

    return { success: true, authorization_url: `/explore/payment?${params.toString()}` }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function verifyVendorTierUpgrade(txId: string) {
  try {
    const adminClient = createAdminClient()
    const { data: tx } = await adminClient
      .from('vendor_transactions')
      .select('*')
      .eq('id', txId)
      .single()

    if (!tx) return { success: false, error: 'Transaction not found' }
    if (tx.status === 'SUCCESSFUL') return { success: true }
    if (tx.status === 'FAILED') return { success: false, error: 'Failed' }

    if (Number(tx.amount_paid) > 0 && tx.paystack_reference) {
      if (!isAlatPayConfigured()) return { success: false, error: 'Gateway misconfigured' }

      const result = await checkTransactionStatus(tx.paystack_reference)
      if (!isAlatPaySuccessful(result.status)) {
        return { success: false, error: 'Payment not successful on gateway' }
      }
    }

    await processVendorUpgrade(txId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function processVendorUpgrade(txId: string) {
  const adminClient = createAdminClient()
  const { data: tx } = await adminClient
    .from('vendor_transactions')
    .select('*')
    .eq('id', txId)
    .single()

  if (!tx) throw new Error('Transaction not found')

  await adminClient
    .from('vendor_transactions')
    .update({ status: 'SUCCESSFUL', updated_at: new Date().toISOString() })
    .eq('id', txId)

  await adminClient
    .from('vendor_profiles')
    .update({ current_tier_id: tx.new_tier_id, updated_at: new Date().toISOString() })
    .eq('id', tx.vendor_id)

  revalidatePath('/vendor/subscription')
}

export async function getVendorBillingHistory() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('vendor_transactions')
      .select(`
        id, amount_paid, status, created_at, paystack_reference,
        previous_tier:previous_tier_id (name),
        new_tier:new_tier_id (name)
      `)
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
