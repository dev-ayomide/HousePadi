'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getTopAgents() {
  try {
    const supabase = createAdminClient()
    
    // 1. Get agencies on paid plans
    const { data: agencies, error: agencyError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        agency_subscriptions (
          subscription_plans (
            display_order
          )
        )
      `)
      .eq('role', 'AGENCY')

    if (agencyError) throw agencyError

    const paidAgencyMap: Record<string, string> = {}
    agencies.forEach((a: any) => {
      const sub = Array.isArray(a.agency_subscriptions) ? a.agency_subscriptions[0] : a.agency_subscriptions
      if (sub && sub.subscription_plans) {
        const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
        if (plan.display_order > 0) {
          paidAgencyMap[a.id] = a.full_name || 'Elite Agency'
        }
      }
    })

    const paidAgencyIds = Object.keys(paidAgencyMap)
    if (paidAgencyIds.length === 0) return { success: true, data: [] }

    // 2. Get agents from these agencies
    const { data: agents, error: agentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'AGENT')
      .in('agency_id', paidAgencyIds)
      .limit(6)

    if (agentError) throw agentError
    if (!agents || agents.length === 0) return { success: true, data: [] }

    // 3. Get listing counts for each agent
    const topAgents = await Promise.all(agents.map(async (agent: any) => {
      const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
        supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('agent_id', agent.id),
        supabase.from('event_centers').select('*', { count: 'exact', head: true }).eq('agent_id', agent.id),
        supabase.from('public_space').select('*', { count: 'exact', head: true }).eq('agent_id', agent.id)
      ])
      const totalCount = (c1 || 0) + (c2 || 0) + (c3 || 0)

      return {
        id: agent.id,
        name: agent.full_name || 'HousePadi Agent',
        role: agent.tagline || 'Expert Consultant',
        agency: paidAgencyMap[agent.agency_id] || 'Elite Partner',
        listings: totalCount,
        bio: agent.bio || 'Dedicated to the curation of significant architectural legacies.',
        image: agent.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80'
      }
    }))

    return { success: true, data: topAgents }
  } catch (err: any) {
    console.error('Get Top Agents Error:', err)
    return { success: false, error: err.message }
  }
}
