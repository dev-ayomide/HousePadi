'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Box,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalAgents: number
  maxAgents: number
  totalListings: number
  maxListings: number
  pendingListings: number
  approvedListings: number
  suspendedListings: number
  storageUsed: number // in GB
  storageMax: number // in GB
  planName: string
}

export default function AgencyOverviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user) return
      const supabase = createClient()

      try {
        // 1. Get Agency Subscription
        const { data: sub } = await supabase
          .from('agency_subscriptions')
          .select('custom_agent_limit, custom_listing_limit, custom_storage_limit_mb, subscription_plans(*)')
          .eq('agency_id', user.id)
          .single()
        
        let maxAgents = 5
        let maxListings = 25
        let storageMax = 10
        let planName = 'No Active Plan'

        if (sub && sub.subscription_plans) {
          const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
          planName = plan.name
          maxAgents = sub.custom_agent_limit ?? plan.agent_limit
          maxListings = sub.custom_listing_limit ?? plan.listing_limit
          storageMax = (sub.custom_storage_limit_mb ?? plan.storage_limit_mb) / 1000
        }

        // 2. Get Agent Count
        const { count: agentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', user.id)
          .eq('role', 'AGENT')

        // 3. Get Listing Stats
        const [aptRes, evtRes, shpRes] = await Promise.all([
          supabase.from('apartments').select('status, file_size').eq('agency_id', user.id),
          supabase.from('event_centers').select('status, file_size').eq('agency_id', user.id),
          supabase.from('public_space').select('status, file_size').eq('agency_id', user.id)
        ])

        const props = [...(aptRes.data || []), ...(evtRes.data || []), ...(shpRes.data || [])]
        const totalListings = props.length
        const pendingListings = props.filter(p => p.status === 'PENDING_MODERATION').length
        const approvedListings = props.filter(p => p.status === 'APPROVED').length
        const suspendedListings = props.filter(p => p.status === 'SUSPENDED').length
        
        const storageUsedBytes = props.reduce((acc, p) => acc + (Number(p.file_size) || 0), 0)
        const storageUsedGB = storageUsedBytes / (1024 * 1024 * 1024)

        setStats({
          totalAgents: agentCount || 0,
          maxAgents,
          totalListings,
          maxListings,
          pendingListings,
          approvedListings,
          suspendedListings,
          storageUsed: parseFloat(storageUsedGB.toFixed(2)),
          storageMax,
          planName
        })
      } catch (err) {
        console.error('Failed to fetch agency stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const StatCard = ({ title, value, max, icon: Icon, alert = false, unit = "" }: any) => {
    const isNearingLimit = max && value >= max * 0.8
    const isAtLimit = max && value >= max

    return (
      <div className="bg-neutral-900/20 border border-neutral-800 p-6 flex flex-col justify-between group hover:border-neutral-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{title}</span>
          <Icon className={`w-4 h-4 ${alert || isAtLimit ? 'text-amber-500' : 'text-neutral-600 group-hover:text-neutral-400'} transition-colors`} />
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-light text-white tracking-tight">
            {value}{unit && <span className="text-2xl ml-1">{unit}</span>}
          </span>
          {max && (
            <span className="text-sm text-neutral-500 mb-1">
              / {max}{unit}
            </span>
          )}
        </div>
        {max && (
          <div className="mt-4">
            <div className="h-1 w-full bg-neutral-900 overflow-hidden">
              <div 
                className={`h-full ${isAtLimit ? 'bg-amber-500' : isNearingLimit ? 'bg-amber-500/50' : 'bg-white'}`} 
                style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
              />
            </div>
            {isNearingLimit && (
              <p className="text-[9px] uppercase tracking-widest text-amber-500 mt-2 font-bold">
                {isAtLimit ? 'Capacity Reached' : 'Nearing Capacity'}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Operations Overview</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Real-time Platform Telemetry
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-neutral-900/40 border border-neutral-800 px-4 py-2">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Current Plan:</span>
            <span className="text-xs uppercase tracking-widest text-white font-bold">{stats.planName}</span>
          </div>
          <Link
            href="/agency/subscription"
            className="bg-white text-black hover:bg-neutral-200 rounded-none text-[10px] uppercase tracking-widest font-bold h-[38px] px-4 flex items-center transition-all"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Agents" value={stats.totalAgents} max={stats.maxAgents} icon={Users} />
        <StatCard title="Active Listings" value={stats.totalListings} max={stats.maxListings} icon={Box} />
        <StatCard title="Storage Utilization" value={stats.storageUsed} max={stats.storageMax} icon={Activity} unit="GB" />
      </div>

      {/* Moderation Status */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-400 font-bold">Listing Moderation Queue</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-950/10 border border-emerald-900/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-bold mb-1">Approved & Live</p>
              <p className="text-3xl font-light text-emerald-500">{stats.approvedListings}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
          </div>
          
          <div className="bg-amber-950/10 border border-amber-900/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-500/70 font-bold mb-1">Pending Review</p>
              <p className="text-3xl font-light text-amber-500">{stats.pendingListings}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500/20" />
          </div>

          <div className="bg-red-950/10 border border-red-900/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-red-500/70 font-bold mb-1">Suspended / Rejected</p>
              <p className="text-3xl font-light text-red-500">{stats.suspendedListings}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500/20" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 border-t border-neutral-800 pt-12">
        <Link href="/agency/agents" className="group block bg-black border border-neutral-800 p-8 hover:bg-neutral-900/50 transition-colors">
          <Users className="w-6 h-6 text-neutral-500 mb-4 group-hover:text-white transition-colors" />
          <h3 className="text-lg text-white mb-2 font-medium">Manage Personnel</h3>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Provision new agent accounts, manage access limits, and oversee your organizational structure.
          </p>
        </Link>
        <Link href="/agency/listings" className="group block bg-black border border-neutral-800 p-8 hover:bg-neutral-900/50 transition-colors">
          <Box className="w-6 h-6 text-neutral-500 mb-4 group-hover:text-white transition-colors" />
          <h3 className="text-lg text-white mb-2 font-medium">Listing Inventory</h3>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Review agent uploads, approve drafts for moderation, and manage active property visibility.
          </p>
        </Link>
      </div>
    </div>
  )
}
