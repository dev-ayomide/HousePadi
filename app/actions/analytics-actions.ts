'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getR2BucketSize } from '@/app/actions/r2-actions'

export async function getPlatformAnalytics() {
  try {
    const supabase = createAdminClient()

    // 1 & 2. Total Uploads & Approval Rate
    let totalUploads = 0
    let approvedUploads = 0
    const tables = ['apartments', 'event_centers', 'public_space']

    for (const table of tables) {
      const { count: total } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (total) totalUploads += total

      const { count: approved } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('status', 'APPROVED')
      if (approved) approvedUploads += approved
    }

    const approvalRate = totalUploads > 0 ? (approvedUploads / totalUploads) * 100 : 0

    // 3. Active Subscriptions (Excluding 'Curator')
    const { data: curatorPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Curator')
      .single()

    const { count: activeSubscriptions } = await supabase
      .from('agency_subscriptions')
      .select('*', { count: 'exact', head: true })
      .neq('plan_id', curatorPlan?.id)
      .eq('status', 'active')

    // 4 & 5. Most Active Agencies & Top Performing Agents
    const agencyCountMap = new Map<string, number>()
    const agentCountMap = new Map<string, number>()

    for (const table of tables) {
      const { data: stats } = await supabase.from(table).select('agency_id, agent_id')
      if (stats) {
        stats.forEach((row: any) => {
          if (row.agency_id) {
            agencyCountMap.set(row.agency_id, (agencyCountMap.get(row.agency_id) || 0) + 1)
          }
          if (row.agent_id) {
            agentCountMap.set(row.agent_id, (agentCountMap.get(row.agent_id) || 0) + 1)
          }
        })
      }
    }

    // Process Top 3 Agencies
    const topAgencyIds = Array.from(agencyCountMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const mostActiveAgencies = []
    for (const [id, count] of topAgencyIds) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', id).maybeSingle()
      mostActiveAgencies.push({ name: profile?.full_name || 'Unknown Agency', count })
    }

    // Process Top 3 Agents
    const topAgentIds = Array.from(agentCountMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const topPerformingAgents = []
    for (const [id, count] of topAgentIds) {
      const { data: profile } = await supabase.from('profiles').select('full_name, agency_id').eq('id', id).maybeSingle()
      let agencyName = 'Direct'
      if (profile?.agency_id) {
        const { data: agProfile } = await supabase.from('profiles').select('full_name').eq('id', profile.agency_id).maybeSingle()
        if (agProfile) agencyName = agProfile.full_name
      }
      topPerformingAgents.push({ name: profile?.full_name || 'Unknown Agent', agency: agencyName, count })
    }

    // 6. Supabase Storage Usage
    const { data: storageData } = await supabase
      .from('storage.objects' as any)
      .select('metadata')
      .eq('bucket_id', 'property-assets')

    let supabaseSizeBytes = 0
    storageData?.forEach((obj: any) => {
      const size = obj.metadata?.size || 0
      supabaseSizeBytes += size
    })

    const supabaseUsageGB = supabaseSizeBytes / (1024 * 1024 * 1024)

    // 7. Cloudflare R2 Storage Usage
    const r2SizeBytes = await getR2BucketSize()
    const r2UsageGB = r2SizeBytes / (1024 * 1024 * 1024)

    const totalUsageGB = supabaseUsageGB + r2UsageGB
    const capacityGB = 100
    const totalPercent = Math.min((totalUsageGB / capacityGB) * 100, 100)

    // 8. Normal Users
    const { data: consumerAccounts } = await supabase
      .from('consumer_profiles')
      .select('created_at, full_name, profiles!user_id(email)')
      .order('created_at', { ascending: false })
      .limit(50)

    const normalUsers = consumerAccounts?.map((acc: any) => ({
      email: acc.profiles?.email || 'Unknown',
      name: acc.full_name || 'Anonymous User',
      joinedAt: acc.created_at
    })) || []

    // 9. Recent Transactions
    const { data: paymentTxs } = await supabase
      .from('payment_transaction')
      .select('amount, status, created_at, consumer_profiles!consumer_id(profiles!user_id(email))')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: subTxs } = await supabase
      .from('subscription_transactions')
      .select('amount_paid, status, created_at, profiles!agency_id(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    const recentTransactions = [
      ...(paymentTxs?.map((tx: any) => ({
        type: 'Listing Access',
        amount: Number(tx.amount),
        status: tx.status,
        date: tx.created_at,
        user: tx.consumer_profiles?.profiles?.email || tx.consumer_profiles?.[0]?.profiles?.email || 'Unknown User'
      })) || []),
      ...(subTxs?.map((tx: any) => ({
        type: 'Account Upgrade',
        amount: Number(tx.amount_paid),
        status: tx.status,
        date: tx.created_at,
        user: tx.profiles?.email || tx.profiles?.[0]?.email || tx.profiles?.full_name || tx.profiles?.[0]?.full_name || 'Unknown Agency'
      })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50)

    return {
      success: true,
      data: {
        totalUploads: totalUploads || 0,
        approvalRate: parseFloat(approvalRate.toFixed(1)),
        activeSubscriptions: activeSubscriptions || 0,
        supabaseUsage: parseFloat(supabaseUsageGB.toFixed(2)),
        r2Usage: parseFloat(r2UsageGB.toFixed(2)),
        totalUsage: parseFloat(totalUsageGB.toFixed(2)),
        storagePercent: parseFloat(totalPercent.toFixed(1)),
        mostActiveAgencies,
        topPerformingAgents,
        normalUsers,
        recentTransactions
      }
    }
  } catch (error: any) {
    console.error('Analytics Error:', error)
    return { success: false, error: error.message }
  }
}
