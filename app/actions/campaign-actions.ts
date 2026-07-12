'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'node:crypto'

export async function createCampaign(data: {
  campaign_code: string;
  campaign_type: 'USERS_COUNT' | 'TIME_BASED';
  max_users?: number;
  expires_at?: string;
}) {
  try {
    const adminClient = createAdminClient()
    const { data: campaign, error } = await adminClient
      .from('campaigns')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return { success: true, data: campaign }
  } catch (err: any) {
    console.error('createCampaign error:', err)
    return { success: false, error: err.message }
  }
}

export async function getCampaigns() {
  try {
    const adminClient = createAdminClient()
    const { data: campaigns, error } = await adminClient
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: campaigns }
  } catch (err: any) {
    console.error('getCampaigns error:', err)
    return { success: false, error: err.message }
  }
}

export async function toggleCampaignActive(id: string, is_active: boolean) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('campaigns')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('toggleCampaignActive error:', err)
    return { success: false, error: err.message }
  }
}

export async function claimCoupon(code: string, email: string) {
  try {
    const adminClient = createAdminClient()
    
    // 1. Find campaign
    const { data: campaign, error: campErr } = await adminClient
      .from('campaigns')
      .select('*')
      .eq('campaign_code', code)
      .single()

    if (campErr || !campaign) {
      return { success: false, reason: 'NOT_FOUND' }
    }

    if (!campaign.is_active) {
      return { success: false, reason: 'EXPIRED' }
    }

    // 2. Check limits/expiration
    if (campaign.campaign_type === 'TIME_BASED') {
      if (campaign.expires_at && new Date() > new Date(campaign.expires_at)) {
        // Automatically set inactive
        await adminClient.from('campaigns').update({ is_active: false }).eq('id', campaign.id)
        return { success: false, reason: 'EXPIRED' }
      }
    } else if (campaign.campaign_type === 'USERS_COUNT') {
      const { count, error: countErr } = await adminClient
        .from('coupon_claims')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        
      if (countErr) throw countErr
      
      if (campaign.max_users && (count || 0) >= campaign.max_users) {
        await adminClient.from('campaigns').update({ is_active: false }).eq('id', campaign.id)
        return { success: false, reason: 'EXPIRED' }
      }
    }

    // 3. Attempt claim
    const { error: claimErr } = await adminClient
      .from('coupon_claims')
      .insert([{ campaign_id: campaign.id, email }])

    if (claimErr) {
      if (claimErr.code === '23505') { // Unique violation
        return { success: false, reason: 'ALREADY_CLAIMED' }
      }
      throw claimErr
    }

    // 4. Update credits
    // Check if user exists in credits
    const { data: creditRec } = await adminClient
      .from('consumer_credits')
      .select('credits')
      .eq('email', email)
      .maybeSingle()

    if (creditRec) {
      await adminClient
        .from('consumer_credits')
        .update({ credits: creditRec.credits + 1 })
        .eq('email', email)
    } else {
      await adminClient
        .from('consumer_credits')
        .insert([{ email, credits: 1 }])
    }

    return { success: true }
  } catch (err: any) {
    console.error('claimCoupon error:', err)
    return { success: false, error: err.message }
  }
}

export async function getConsumerCredits(email: string) {
  if (!email) return { success: true, data: 0 }
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('consumer_credits')
      .select('credits')
      .eq('email', email)
      .maybeSingle()
      
    if (error) throw error
    return { success: true, data: data?.credits || 0 }
  } catch (err: any) {
    console.error('getConsumerCredits error:', err)
    return { success: false, error: err.message, data: 0 }
  }
}

export async function redeemCreditForContact(listingId: string, userId: string, email: string) {
  try {
    const adminClient = createAdminClient()
    
    // 1. Get current credits
    const { data: creditRec, error: creditErr } = await adminClient
      .from('consumer_credits')
      .select('credits')
      .eq('email', email)
      .maybeSingle()

    if (creditErr || !creditRec || creditRec.credits <= 0) {
      return { success: false, error: 'No available credits.' }
    }

    // 2. Deduct credit
    const { error: updateErr } = await adminClient
      .from('consumer_credits')
      .update({ credits: creditRec.credits - 1 })
      .eq('email', email)

    if (updateErr) throw updateErr

    // 3. Ensure consumer_profile exists to satisfy foreign key constraints
    const { data: existingProfile } = await adminClient
      .from('consumer_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingProfile) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } }))
      const userEmail = authUser?.user?.email || `dummy_${userId.substring(0,8)}@housepadi.internal`
      
      // Ensure global profile exists
      await adminClient.from('profiles').upsert({
        id: userId,
        email: userEmail.toLowerCase(),
        full_name: userEmail.split('@')[0],
        role: 'CONSUMER',
        is_approved: true
      }, { onConflict: 'id' })

      const { error: insErr } = await adminClient.from('consumer_profiles').insert({
        user_id: userId,
        full_name: userEmail.split('@')[0],
        is_verified: true
      })
      if (insErr) throw insErr
    }

    // 4. Add contact access permission
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: permError } = await adminClient
      .from('contact_access_permissions')
      .upsert({
        user_id: userId,
        listing_id: listingId,
        payment_id: `CREDIT_${Date.now()}`,
        expires_at: expiresAt
      }, {
        onConflict: 'user_id,listing_id'
      })

    if (permError) throw permError

    return { success: true }
  } catch (err: any) {
    console.error('redeemCreditForContact error:', err)
    return { success: false, error: err.message }
  }
}
