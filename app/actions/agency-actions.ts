'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getElitePartners() {
  try {
    const supabase = createAdminClient()
    
    // 1. Fetch agencies joined with their subscription tier
    const { data: agencies, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        website_url,
        tagline,
        agency_subscriptions (
          subscription_plans (
            name,
            display_order
          )
        )
      `)
      .eq('role', 'AGENCY')

    if (error) throw error

    // 2. Filter for Elite tiers (above Curator/0)
    const eliteAgencies = (agencies || []).filter((a: any) => {
      const sub = Array.isArray(a.agency_subscriptions) ? a.agency_subscriptions[0] : a.agency_subscriptions
      if (!sub || !sub.subscription_plans) return false
      const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
      return plan.display_order > 0
    })

    // 3. Get actual listing counts for each agency
    const partners = await Promise.all(eliteAgencies.map(async (agency: any) => {
      const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
        supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id),
        supabase.from('event_centers').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id),
        supabase.from('public_space').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id)
      ])
      const totalCount = (c1 || 0) + (c2 || 0) + (c3 || 0)

      return {
        id: agency.id,
        name: agency.full_name || 'Elite Partner',
        tagline: agency.tagline || 'Leading the spatial evolution.',
        listings: totalCount,
        image: agency.avatar_url || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80',
        website: agency.website_url || '#'
      }
    }))

    // 4. Randomize the pool
    const randomized = partners.sort(() => Math.random() - 0.5)

    return { success: true, data: randomized }
  } catch (err: any) {
    console.error('Get Elite Partners Error:', err)
    return { success: false, error: err.message }
  }
}

export async function toggleAgencyStatus(id: string, currentStatus: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ suspended: !currentStatus })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/agencies')
    revalidatePath('/admin/agents')
    return { success: true, newStatus: !currentStatus }
  } catch (err: any) {
    console.error('Toggle Status Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteAgency(id: string) {
  try {
    const supabase = createAdminClient()
    
    // First, delete from auth.users (this will cascade to profiles)
    const { error } = await supabase.auth.admin.deleteUser(id)

    if (error) {
      // Fallback: Try delete from profiles directly if auth delete fails
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
      if (profileError) throw profileError
    }

    revalidatePath('/admin/agencies')
    revalidatePath('/admin/agents')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Action Error:', err)
    return { success: false, error: err.message }
  }
}
