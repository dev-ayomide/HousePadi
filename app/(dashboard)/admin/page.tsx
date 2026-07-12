'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Building2, 
  Users, 
  Home, 
  Clock, 
  Star, 
  CreditCard,
  ArrowUpRight
} from 'lucide-react'

interface DashboardStats {
  agencies: number
  agents: number
  activeListings: number
  pendingListingReviews: number
  pendingAgencyReviews: number
  activeSubscriptions: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    agencies: 0,
    agents: 0,
    activeListings: 0,
    pendingListingReviews: 0,
    pendingAgencyReviews: 0,
    activeSubscriptions: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()
      
      try {
        // Parallel fetching for performance
        const [
          agenciesRes,
          agentsRes,
          activeAptsRes,
          pendingAptsRes,
          activeEvtsRes,
          pendingEvtsRes,
          activePubsRes,
          pendingPubsRes,
          subscriptionsRes,
          pendingAgenciesRes
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'AGENCY'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'AGENT'),
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('event_centers').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
          supabase.from('event_centers').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('public_space').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
          supabase.from('public_space').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('agency_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'AGENCY').eq('agency_status', 'pending_review')
        ])

        const activeListingsCount = (activeAptsRes.count || 0) + (activeEvtsRes.count || 0) + (activePubsRes.count || 0)
        const pendingListingReviewsCount = (pendingAptsRes.count || 0) + (pendingEvtsRes.count || 0) + (pendingPubsRes.count || 0)

        setStats({
          agencies: agenciesRes.count || 0,
          agents: agentsRes.count || 0,
          activeListings: activeListingsCount,
          pendingListingReviews: pendingListingReviewsCount,
          pendingAgencyReviews: pendingAgenciesRes.count || 0,
          activeSubscriptions: subscriptionsRes.count || 0,
        })
      } catch (error) {
        console.error("Error fetching live dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Agencies', value: stats.agencies, icon: Building2 },
    { label: 'Total Agents', value: stats.agents, icon: Users },
    { label: 'Active Listings', value: stats.activeListings, icon: Home },
    { 
      label: 'Pending Listing Reviews', 
      value: stats.pendingListingReviews, 
      icon: Clock, 
      highlight: stats.pendingListingReviews > 0,
      href: '/admin/moderation' 
    },
    { 
      label: 'Pending Agency Reviews', 
      value: stats.pendingAgencyReviews, 
      icon: Star,
      highlight: stats.pendingAgencyReviews > 0,
      href: '/admin/agencies'
    },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard },
  ]

  return (
    <div className="p-6 lg:p-10 max-w-[1200px] mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Platform Overview</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Live System Metrics
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
            Sync Status
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-neutral-400">Connected to Database</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div 
              key={idx} 
              className={`relative p-8 bg-neutral-900/40 border transition-all duration-300 hover:bg-neutral-900/60 ${
                stat.highlight ? 'border-white/50' : 'border-neutral-800'
              }`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className={`p-3 border ${stat.highlight ? 'border-white bg-white/10' : 'border-neutral-800 bg-black'}`}>
                  <Icon className={`w-5 h-5 ${stat.highlight ? 'text-white' : 'text-neutral-400'}`} />
                </div>
              </div>
              
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-2">
                  {stat.label}
                </p>
                {loading ? (
                  <div className="h-10 w-24 bg-neutral-800 animate-pulse mt-1" />
                ) : (
                  <p className="text-4xl font-light text-white tracking-tight">
                    {stat.value}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Access Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
        <div className="p-8 border border-neutral-800 bg-neutral-900/20 group">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white font-bold mb-6 flex justify-between items-center">
            Moderation Queue
            {(stats.pendingListingReviews > 0 || stats.pendingAgencyReviews > 0) && (
              <span className="bg-white text-black px-2 py-0.5 text-[10px]">
                {stats.pendingListingReviews + stats.pendingAgencyReviews} New
              </span>
            )}
          </h3>
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-neutral-800 transition-colors group-hover:border-neutral-700">
            {(stats.pendingListingReviews > 0 || stats.pendingAgencyReviews > 0) ? (
              <>
                <p className="text-white text-sm mb-4">
                  There are {stats.pendingListingReviews} listings and {stats.pendingAgencyReviews} agencies awaiting your review.
                </p>
                <div className="flex gap-4">
                  {stats.pendingListingReviews > 0 && (
                    <button 
                      onClick={() => window.location.href = '/admin/moderation'}
                      className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-all underline underline-offset-4"
                    >
                      Review Listings
                    </button>
                  )}
                  {stats.pendingAgencyReviews > 0 && (
                    <button 
                      onClick={() => window.location.href = '/admin/agencies'}
                      className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-all underline underline-offset-4"
                    >
                      Review Agencies
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Clock className="w-8 h-8 text-neutral-800 mb-4" />
                <p className="text-neutral-500 text-sm italic tracking-wide">Queue Clear: All assets and agencies verified.</p>
              </>
            )}
          </div>
        </div>

        <div className="p-8 border border-neutral-800 bg-neutral-900/20">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white font-bold mb-6">Database Infrastructure</h3>
          <div className="space-y-6">
            {[
              { label: 'Agency Registry', status: 'Healthy', val: stats.agencies },
              { label: 'Property Index', status: 'Healthy', val: stats.activeListings },
              { label: 'Subscription Pipeline', status: 'Healthy', val: stats.activeSubscriptions },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center pb-6 border-b border-neutral-800 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm text-neutral-400">{item.label}</p>
                  <p className="text-[10px] text-neutral-600 uppercase font-bold mt-1">Status: {item.status}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-light text-white">{item.val}</span>
                  <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">Records</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
