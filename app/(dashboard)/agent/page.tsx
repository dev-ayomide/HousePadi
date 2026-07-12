'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAgencyStorageUsage } from '@/app/actions/r2-actions'
import {
  Box,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  HardDrive,
  Upload
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  agencyListingsUsed: number
  agencyListingsMax: number
  agencyStorageUsed: number // bytes
  agencyStorageMax: number // bytes
  agentPendingListings: number
  agentApprovedListings: number
  agentRejectedListings: number
  agentDraftListings: number
}

export default function AgentOverviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user) return
      const supabase = createClient()

      try {
        // 1. Get Agent Profile & Agency ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .single()

        if (!profile?.agency_id) return

        // 2. Get Agency Tier & Limits
        const { data: sub } = await supabase
          .from('agency_subscriptions')
          .select('custom_listing_limit, custom_storage_limit_mb, subscription_plans(*)')
          .eq('agency_id', profile.agency_id)
          .single()

        let maxListings = 25
        let maxStorageBytes = 10 * 1000 * 1000 * 1000 // 10GB

        if (sub && sub.subscription_plans) {
          const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
          maxListings = sub.custom_listing_limit ?? plan.listing_limit
          maxStorageBytes = (sub.custom_storage_limit_mb ?? plan.storage_limit_mb) * 1000 * 1000
        }

        // 3. Get Agency-Wide Properties Usage
        const [agencyApt, agencyEvt, agencyShp] = await Promise.all([
          supabase.from('apartments').select('id, file_size').eq('agency_id', profile.agency_id),
          supabase.from('event_centers').select('id, file_size').eq('agency_id', profile.agency_id),
          supabase.from('public_space').select('id, file_size').eq('agency_id', profile.agency_id)
        ])

        const agencyProps = [...(agencyApt.data || []), ...(agencyEvt.data || []), ...(agencyShp.data || [])]
        const agencyListingsUsed = agencyProps.length
        
        // Calculate storage accurately from the database to account for moved baked files
        const agencyStorageUsed = agencyProps.reduce((acc, p) => acc + (Number(p.file_size) || 0), 0)

        // 4. Get Agent's Own Listings Status
        const [agentApt, agentEvt, agentShp] = await Promise.all([
          supabase.from('apartments').select('status').eq('agent_id', user.id),
          supabase.from('event_centers').select('status').eq('agent_id', user.id),
          supabase.from('public_space').select('status').eq('agent_id', user.id)
        ])

        const agentProps = [...(agentApt.data || []), ...(agentEvt.data || []), ...(agentShp.data || [])]
        
        // Match live database enums: PENDING, APPROVED, REJECTED
        const agentDraftListings = 0 // Database currently doesn't support DRAFT state
        const agentPendingListings = agentProps.filter(p => p.status === 'PENDING').length
        const agentApprovedListings = agentProps.filter(p => p.status === 'APPROVED').length
        const agentRejectedListings = agentProps.filter(p => p.status === 'REJECTED').length

        setStats({
          agencyListingsUsed,
          agencyListingsMax: maxListings,
          agencyStorageUsed,
          agencyStorageMax: maxStorageBytes,
          agentPendingListings,
          agentApprovedListings,
          agentRejectedListings,
          agentDraftListings
        })
      } catch (err) {
        console.error('Failed to fetch agent stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Realtime listener for cross-agency updates
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setupRealtime() {
      const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user?.id).single()
      if (profile?.agency_id) {
        channel = supabase
          .channel(`agent_overview_sync_${Math.random()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'properties',
              filter: `agency_id=eq.${profile.agency_id}`
            },
            () => {
              fetchStats()
            }
          )
          .subscribe()
      }
    }

    if (user) setupRealtime()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 GB'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const StatCard = ({ title, value, max, icon: Icon, alert = false, formatter = (v: number) => v }: any) => {
    const isNearingLimit = max && value >= max * 0.8
    const isAtLimit = max && value >= max

    return (
      <div className="bg-neutral-900/20 border border-neutral-800 p-6 flex flex-col justify-between group hover:border-neutral-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{title}</span>
          <Icon className={`w-4 h-4 ${alert || isAtLimit ? 'text-amber-500' : 'text-neutral-600 group-hover:text-neutral-400'} transition-colors`} />
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-light text-white tracking-tight">{formatter(value)}</span>
          {max && (
            <span className="text-sm text-neutral-500 mb-1">/ {formatter(max)}</span>
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
          <h1 className="text-3xl font-medium text-white tracking-tight">Agent Dashboard</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Listing Operations & Telemetry
          </p>
        </div>
      </div>

      {/* Primary Stats: Shared Agency Usage */}
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-400 font-bold">Agency Resource Utilization</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          title="Listings Consumed" 
          value={stats.agencyListingsUsed} 
          max={stats.agencyListingsMax} 
          icon={Box} 
        />
        <StatCard 
          title="Storage Consumed" 
          value={stats.agencyStorageUsed} 
          max={stats.agencyStorageMax} 
          icon={HardDrive} 
          formatter={formatBytes}
        />
      </div>

      {/* Moderation Status (Agent's Own Listings) */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-400 font-bold">My Listings Status</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-950/10 border border-emerald-900/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-bold mb-1">Approved</p>
              <p className="text-3xl font-light text-emerald-500">{stats.agentApprovedListings}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
          </div>
          
          <div className="bg-amber-950/10 border border-amber-900/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-500/70 font-bold mb-1">Pending Approval</p>
              <p className="text-3xl font-light text-amber-500">{stats.agentPendingListings}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500/20" />
          </div>

          <div className="bg-red-950/10 border border-red-900/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-red-500/70 font-bold mb-1">Rejected</p>
              <p className="text-3xl font-light text-red-500">{stats.agentRejectedListings}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500/20" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 border-t border-neutral-800 pt-12">
        <Link href="/agent/listings/upload" className="group block bg-black border border-neutral-800 p-8 hover:bg-neutral-900/50 transition-colors">
          <Upload className="w-6 h-6 text-neutral-500 mb-4 group-hover:text-white transition-colors" />
          <h3 className="text-lg text-white mb-2 font-medium">Upload Listing</h3>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Create a new property listing and upload its corresponding 3D architectural model.
          </p>
        </Link>
        <Link href="/agent/listings" className="group block bg-black border border-neutral-800 p-8 hover:bg-neutral-900/50 transition-colors">
          <Box className="w-6 h-6 text-neutral-500 mb-4 group-hover:text-white transition-colors" />
          <h3 className="text-lg text-white mb-2 font-medium">Manage My Inventory</h3>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Review your uploaded properties, edit draft details, and monitor approval status.
          </p>
        </Link>
      </div>
    </div>
  )
}
