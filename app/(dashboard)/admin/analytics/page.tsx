'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  BarChart3, 
  UploadCloud, 
  CheckSquare, 
  HardDrive,
  TrendingUp,
  Building2,
  Users,
  Loader2,
  RefreshCw,
  UserCircle,
  CreditCard
} from 'lucide-react'
import { getPlatformAnalytics } from '@/app/actions/analytics-actions'
import { Button } from '@/components/ui/button'

export default function PlatformAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    const result = await getPlatformAnalytics()
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading && !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-neutral-500 animate-spin" />
      </div>
    )
  }

  const stats = data || {
    totalUploads: 0,
    approvalRate: 0,
    activeSubscriptions: 0,
    storageUsage: 0,
    storagePercent: 0,
    supabaseUsage: 0,
    r2Usage: 0,
    mostActiveAgencies: [],
    topPerformingAgents: []
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Platform Analytics</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            System Metrics & Performance
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-neutral-500 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Data Stream
          </div>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 border border-neutral-800 bg-neutral-900/20 space-y-4">
          <div className="flex items-center justify-between text-neutral-400">
            <UploadCloud className="w-4 h-4" />
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-1">Total Uploads</p>
            <p className="text-3xl font-light text-white">{stats.totalUploads.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-6 border border-neutral-800 bg-neutral-900/20 space-y-4">
          <div className="flex items-center justify-between text-neutral-400">
            <CheckSquare className="w-4 h-4" />
            <span className="text-xs text-neutral-500">Real-time</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-1">Approval Rate</p>
            <p className="text-3xl font-light text-white">{stats.approvalRate}%</p>
          </div>
        </div>

        <div className="p-6 border border-neutral-800 bg-neutral-900/20 space-y-4">
          <div className="flex items-center justify-between text-neutral-400">
            <BarChart3 className="w-4 h-4" />
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-1">Active Subscriptions</p>
            <p className="text-3xl font-light text-white">{stats.activeSubscriptions}</p>
          </div>
        </div>

        <div className="p-6 border border-neutral-800 bg-neutral-900/20 space-y-4 relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
            <div className="h-full bg-white transition-all duration-1000" style={{ width: `${stats.storagePercent}%` }} />
          </div>
          <div className="flex items-center justify-between text-neutral-400">
            <HardDrive className="w-4 h-4" />
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-neutral-600 uppercase tracking-tighter">Total Capacity</span>
              <span className="text-xs text-neutral-500">{stats.storagePercent}% Used</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-1">Combined Storage</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-light text-white">{stats.totalUsage}</p>
              <span className="text-lg text-neutral-500 font-light">GB</span>
            </div>
            
            {/* Split View */}
            <div className="mt-4 pt-4 border-t border-neutral-800/50 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] text-neutral-600 uppercase font-bold tracking-widest">Supabase</p>
                <p className="text-xs text-white font-medium">{stats.supabaseUsage} GB</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-neutral-600 uppercase font-bold tracking-widest">Cloudflare R2</p>
                <p className="text-xs text-white font-medium">{stats.r2Usage} GB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active Agencies */}
        <div className="border border-neutral-800 bg-neutral-900/20 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-black border border-neutral-800">
              <Building2 className="w-4 h-4 text-neutral-400" />
            </div>
            <h2 className="text-sm font-medium text-white uppercase tracking-wider">Most Active Agencies</h2>
          </div>
          
          <div className="space-y-6">
            {stats.mostActiveAgencies.length > 0 ? stats.mostActiveAgencies.map((agency: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-300">{agency.name}</span>
                  <span className="text-white font-mono">{agency.count} uploads</span>
                </div>
                <div className="h-1 w-full bg-neutral-900 overflow-hidden">
                  <div 
                    className="h-full bg-neutral-500 transition-all duration-1000" 
                    style={{ width: `${(agency.count / (stats.totalUploads || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-neutral-600 italic">No agency data available yet.</p>
            )}
          </div>
        </div>

        {/* Most Active Agents */}
        <div className="border border-neutral-800 bg-neutral-900/20 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-black border border-neutral-800">
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <h2 className="text-sm font-medium text-white uppercase tracking-wider">Top Performing Agents</h2>
          </div>
          
          <div className="space-y-6">
            {stats.topPerformingAgents.length > 0 ? stats.topPerformingAgents.map((agent: any, i: number) => (
              <div key={i} className="flex items-center justify-between pb-4 border-b border-neutral-800/50 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm text-neutral-300">{agent.name}</p>
                  <p className="text-xs text-neutral-500">{agent.agency}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-light text-white">{agent.count}</p>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-600">Listings</p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-neutral-600 italic">No agent data available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Consumer Signups */}
      <div className="border border-neutral-800 bg-neutral-900/20 p-8 mt-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black border border-neutral-800">
            <UserCircle className="w-4 h-4 text-neutral-400" />
          </div>
          <h2 className="text-sm font-medium text-white uppercase tracking-wider">Recent Consumer Signups</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.normalUsers && stats.normalUsers.length > 0 ? stats.normalUsers.map((user: any, i: number) => (
            <div key={i} className="flex flex-col p-4 border border-neutral-800/50 bg-black/20 rounded-md">
              <p className="text-sm text-neutral-300 font-medium">{user.name}</p>
              <p className="text-xs text-neutral-500 truncate mt-1">{user.email}</p>
              <p className="text-[10px] text-neutral-600 font-mono mt-3 uppercase tracking-wider">
                Joined: {new Date(user.joinedAt).toLocaleDateString()}
              </p>
            </div>
          )) : (
            <p className="text-xs text-neutral-600 italic col-span-full">No consumer signups yet.</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="border border-neutral-800 bg-neutral-900/20 p-8 mt-6 overflow-x-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-black border border-neutral-800">
            <CreditCard className="w-4 h-4 text-neutral-400" />
          </div>
          <h2 className="text-sm font-medium text-white uppercase tracking-wider">Recent Transactions</h2>
        </div>
        
        <div className="min-w-[800px]">
          <div className="grid grid-cols-5 text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-800 pb-4 mb-4">
            <div>Type</div>
            <div>User / Agency</div>
            <div>Amount (₦)</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.recentTransactions && stats.recentTransactions.length > 0 ? stats.recentTransactions.map((tx: any, i: number) => (
              <div key={i} className="grid grid-cols-5 items-center text-sm py-2 border-b border-neutral-800/50 last:border-0">
                <div className="text-neutral-300 font-medium">{tx.type}</div>
                <div className="text-neutral-500 truncate pr-4">{tx.user}</div>
                <div className="text-white font-mono">₦{tx.amount.toLocaleString()}</div>
                <div>
                  <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${
                    tx.status === 'SUCCESSFUL' || tx.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    tx.status === 'FAILED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {tx.status}
                  </span>
                </div>
                <div className="text-neutral-600 font-mono text-xs">{new Date(tx.date).toLocaleString()}</div>
              </div>
            )) : (
              <p className="text-xs text-neutral-600 italic">No transactions found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
