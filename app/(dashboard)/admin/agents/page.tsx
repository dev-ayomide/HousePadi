'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Search, 
  Filter, 
  UserCircle,
  CheckCircle2,
  MoreHorizontal,
  Loader2,
  Ban,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toggleAgencyStatus as toggleUserStatus, deleteAgency as deleteUser } from '@/app/actions/agency-actions'
import { useToast } from '@/components/ui/use-toast'

interface AgentData {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
  agency_id: string | null
  agency_name?: string
  property_count: number
  suspended: boolean
}

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const fetchAgents = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    
    try {
      const { data: agentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'AGENT')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      if (agentProfiles) {
        const enrichedAgents = await Promise.all(agentProfiles.map(async (agent) => {
          let agencyName = 'Independent'
          
          if (agent.agency_id) {
            const { data: agencyData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', agent.agency_id)
              .single()
            
            if (agencyData?.full_name) {
              agencyName = agencyData.full_name
            }
          }

          const { count: propertyCount } = await supabase
            .from('unified_listings')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)

          return {
            ...agent,
            agency_name: agencyName,
            property_count: propertyCount || 0
          }
        }))

        setAgents(enrichedAgents)
      }
    } catch (err) {
      console.error('Error fetching agents:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleToggleStatus = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'reactivate' : 'suspend'
    if (!confirm(`Are you sure you want to ${action} ${name}?`)) return;
    
    const result = await toggleUserStatus(id, currentStatus)
    if (result.success) {
      setAgents(agents.map(a => a.id === id ? { ...a, suspended: result.newStatus } : a))
      toast({ 
        title: result.newStatus ? "Agent Suspended" : "Agent Reactivated", 
        description: `${name} status has been updated.` 
      })
    } else {
      toast({ title: "Operation Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${name}? This action cannot be undone.`)) return;
    
    const result = await deleteUser(id)
    if (result.success) {
      toast({ title: "Agent Deleted", description: `${name} has been removed from the platform.` })
      setAgents(agents.filter(a => a.id !== id))
    } else {
      toast({ title: "Deletion Failed", description: result.error, variant: "destructive" })
    }
  }

  const filteredAgents = agents.filter(agent => 
    (agent.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Agent Network</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Platform-wide Personnel Management
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-900/40 p-4 border border-neutral-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input 
            placeholder="Search personnel..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black border-neutral-800 text-white placeholder:text-neutral-600 rounded-none h-10 focus-visible:ring-1 focus-visible:ring-neutral-700"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button variant="outline" className="border-neutral-800 bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-none h-10 px-4 text-xs tracking-wider uppercase">
            <Filter className="w-3 h-3 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-neutral-800 bg-neutral-900/20 overflow-hidden min-h-[400px] relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Retrieving Agent Directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-black/50">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Agent Details</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Assigned Agency</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Listings</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Provisioned</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {filteredAgents.length > 0 ? (
                  filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-neutral-900/40 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                            <UserCircle className="w-5 h-5 text-neutral-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{agent.full_name || 'Unnamed Agent'}</p>
                            <p className="text-xs text-neutral-500">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">
                        {agent.agency_name}
                      </td>
                      <td className="p-4 text-sm text-neutral-400">{agent.property_count}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {agent.suspended ? (
                            <>
                              <Ban className="w-4 h-4 text-red-500" />
                              <span className="text-xs uppercase tracking-wider font-bold text-red-500">Suspended</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs uppercase tracking-wider font-bold text-emerald-500">Active</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-neutral-500 font-mono">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-neutral-800 rounded-none text-neutral-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-black border-neutral-800 rounded-none">
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(agent.id, agent.full_name || 'Agent', agent.suspended)}
                              className={`flex items-center gap-2 text-xs uppercase tracking-wider font-medium cursor-pointer rounded-none mt-2 border-t border-neutral-900 pt-2 ${agent.suspended ? 'text-emerald-500 focus:bg-emerald-950 focus:text-emerald-400' : 'text-orange-500 focus:bg-orange-950 focus:text-orange-400'}`}
                            >
                              <Ban className="w-3 h-3" /> {agent.suspended ? 'Reactivate Agent' : 'Suspend Agent'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(agent.id, agent.full_name || 'Agent')}
                              className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-red-500 focus:bg-red-950 focus:text-red-400 cursor-pointer rounded-none"
                            >
                              <Trash2 className="w-3 h-3" /> Delete Agent
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <p className="text-neutral-500 text-sm italic">No agents registered on the platform.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-black/30">
          <p className="text-xs text-neutral-500">Showing <span className="text-white">{filteredAgents.length}</span> personnel</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled className="h-8 rounded-none border-neutral-800 bg-transparent text-neutral-500 text-xs uppercase tracking-wider">Prev</Button>
            <Button variant="outline" disabled className="h-8 rounded-none border-neutral-800 bg-transparent text-neutral-500 text-xs uppercase tracking-wider">Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
