'use client'

import { useEffect, useState } from 'react'
import { 
  Activity, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Box, 
  Database,
  ArrowUpRight,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

interface AnalyticsData {
  agentUsage: number
  agentLimit: number
  listingUsage: number
  listingLimit: number
  storageUsage: number
  storageLimit: number
  topAgents: { name: string; count: number }[]
  weeklyUploads: { day: string; count: number }[]
}

export default function AgencyAnalyticsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return
      const supabase = createClient()
      
      try {
        // 1. Fetch Agents (Need this for storage calculation)
        const { data: agents } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('agency_id', user.id)
          .eq('role', 'AGENT')

        const agentIds = [user.id, ...(agents?.map(a => a.id) || [])]

        // 2. Fetch Storage Usage (Sum of content_items for all agency members)
        const { data: storageData } = await supabase
          .from('content_items')
          .select('file_size')
          .in('user_id', agentIds)

        const totalSizeBytes = (storageData || []).reduce((acc, item) => acc + (item.file_size || 0), 0)
        const storageUsageGB = totalSizeBytes / (1024 * 1024 * 1024)

        // 3. Fetch Agency Limits & Subscription
        const { data: sub } = await supabase
          .from('agency_subscriptions')
          .select('custom_agent_limit, custom_listing_limit, custom_storage_limit_mb, subscription_plans(*)')
          .eq('agency_id', user.id)
          .single()

        let agentLimit = 5
        let listingLimit = 25
        let storageLimit = 5

        if (sub && sub.subscription_plans) {
          const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
          agentLimit = sub.custom_agent_limit ?? plan.agent_limit
          listingLimit = sub.custom_listing_limit ?? plan.listing_limit
          storageLimit = (sub.custom_storage_limit_mb ?? plan.storage_limit_mb) / 1000
        }

        // 4. Fetch Listing Stats
        const [aptRes, evtRes, shpRes] = await Promise.all([
          supabase.from('apartments').select('agent_id, created_at').eq('agency_id', user.id),
          supabase.from('event_centers').select('agent_id, created_at').eq('agency_id', user.id),
          supabase.from('public_space').select('agent_id, created_at').eq('agency_id', user.id)
        ])

        const props = [...(aptRes.data || []), ...(evtRes.data || []), ...(shpRes.data || [])]
        
        // Calculate Top Agents
        const agentListingMap: Record<string, number> = {}
        props.forEach(p => {
          if (p.agent_id) {
            agentListingMap[p.agent_id] = (agentListingMap[p.agent_id] || 0) + 1
          }
        })

        const topAgents = (agents || [])
          .map(a => ({
            name: a.full_name || 'Unnamed Agent',
            count: agentListingMap[a.id] || 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Weekly data placeholder
        const weeklyUploads = [
          { day: 'Mon', count: 4 },
          { day: 'Tue', count: 7 },
          { day: 'Wed', count: 5 },
          { day: 'Thu', count: 9 },
          { day: 'Fri', count: 12 },
          { day: 'Sat', count: 3 },
          { day: 'Sun', count: 2 },
        ]

        setData({
          agentUsage: agents?.length || 0,
          agentLimit,
          listingUsage: props.length,
          listingLimit,
          storageUsage: parseFloat(storageUsageGB.toFixed(2)),
          storageLimit,
          topAgents,
          weeklyUploads
        })
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const MetricCard = ({ title, value, max, unit, icon: Icon, trend }: any) => {
    const percentage = Math.min(100, (value / max) * 100)
    
    return (
      <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">{title}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light text-white tracking-tight">{value}</span>
              <span className="text-sm text-neutral-600">/ {max}{unit}</span>
            </div>
          </div>
          <div className="p-3 bg-neutral-900/50 border border-neutral-800">
            <Icon className="w-5 h-5 text-neutral-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="h-[2px] w-full bg-neutral-900 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-white'}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">{percentage.toFixed(1)}% Capacity</span>
            {trend && (
              <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {trend}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-2 border-b border-neutral-800 pb-8">
        <h1 className="text-3xl font-medium text-white tracking-tight">Usage Analytics</h1>
        <p className="text-neutral-500 text-[10px] uppercase tracking-[0.3em] font-bold">
          Organizational Throughput & Resource Consumption
        </p>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard title="Personnel Deployment" value={data.agentUsage} max={data.agentLimit} unit=" Agents" icon={Users} trend="+12% MoM" />
        <MetricCard title="Inventory Volume" value={data.listingUsage} max={data.listingLimit} unit=" Units" icon={Box} trend="+24% MoM" />
        <MetricCard title="Cloud Storage" value={data.storageUsage} max={data.storageLimit} unit=" GB" icon={Database} trend="+5% MoM" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart Placeholder */}
        <div className="bg-black border border-neutral-800 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold flex items-center gap-3">
              <BarChart3 className="w-4 h-4" /> Weekly Ingest Frequency
            </h3>
            <span className="text-[9px] uppercase tracking-widest text-neutral-600">Last 7 Cycles</span>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-4">
            {data.weeklyUploads.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-4 group">
                <div 
                  className="w-full bg-neutral-900 group-hover:bg-white transition-all duration-500"
                  style={{ height: `${(item.count / 15) * 100}%` }}
                />
                <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-black border border-neutral-800 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold flex items-center gap-3">
              <Users className="w-4 h-4" /> Personnel Efficiency
            </h3>
            <span className="text-[9px] uppercase tracking-widest text-neutral-600">Top Producers</span>
          </div>

          <div className="space-y-6">
            {data.topAgents.map((agent, i) => (
              <div key={agent.name} className="flex items-center justify-between group border-b border-neutral-900 pb-4 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-neutral-600 font-mono">0{i + 1}</span>
                  <div>
                    <p className="text-sm text-white font-medium tracking-tight group-hover:translate-x-1 transition-transform">{agent.name}</p>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-500 mt-1">Senior Associate</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-white font-light">{agent.count}</p>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-600">Listings</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-700 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
