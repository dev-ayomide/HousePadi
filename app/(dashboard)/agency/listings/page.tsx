'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Search, 
  Filter, 
  Box,
  MoreHorizontal,
  Loader2,
  Ban,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Send,
  Maximize2
} from 'lucide-react'
import { ModelViewer } from '@/components/model-viewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { updateListingStatus, deleteListing } from '@/app/actions/agency-listing-actions'
import { updateListingAvailability } from '@/app/actions/agent-listing-actions'

interface PropertyData {
  id: string
  name: string
  status: string
  created_at: string
  agent_id: string
  model_url?: string
  availability?: string
  listing_type?: string
  model_scale?: number
  scale_factor?: number
  transform_metadata?: number
}

interface AgentGroup {
  id: string
  full_name: string
  email: string
  properties: PropertyData[]
  expanded: boolean
}

export default function AgencyListingsPage() {
  const { user } = useAuth()
  const [agentGroups, setAgentGroups] = useState<AgentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingModel, setViewingModel] = useState<PropertyData | null>(null)
  const [updatingAvailabilityProp, setUpdatingAvailabilityProp] = useState<PropertyData | null>(null)
  const [selectedAvailability, setSelectedAvailability] = useState<string>('AVAILABLE')
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false)
  const [showSqlMigrationDialog, setShowSqlMigrationDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'apartments' | 'event_centers' | 'public_space'>('apartments')

  const { toast } = useToast()

  const fetchListings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    
    try {
      // 1. Fetch Agents
      const { data: agents, error: agentError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('agency_id', user.id)
        .eq('role', 'AGENT')
      
      if (agentError) throw agentError

      // 2. Fetch Properties
      const { data: properties, error: propError } = await supabase
        .from(activeTab)
        .select('id, name, status, created_at, agent_id, model_url, availability, listing_type, scale_factor, transform_metadata')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false })

      if (propError) throw propError

      // 3. Group Properties by Agent
      const groups: AgentGroup[] = (agents || []).map(agent => ({
        id: agent.id,
        full_name: agent.full_name || 'Unnamed Agent',
        email: agent.email,
        properties: (properties || []).filter(p => p.agent_id === agent.id),
        expanded: true
      }))

      // Also add an 'Unassigned / Direct' group
      const unassignedProps = (properties || []).filter(p => !p.agent_id || !agents?.find(a => a.id === p.agent_id))
      if (unassignedProps.length > 0) {
        groups.push({
          id: 'unassigned',
          full_name: 'Direct Agency Uploads',
          email: 'System',
          properties: unassignedProps,
          expanded: true
        })
      }

      setAgentGroups(groups)
    } catch (err) {
      console.error('Error fetching listings:', err)
    } finally {
      setLoading(false)
    }
  }, [user, activeTab])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const toggleGroup = (id: string) => {
    setAgentGroups(groups => groups.map(g => g.id === id ? { ...g, expanded: !g.expanded } : g))
  }

  const handleStatusChange = async (propertyId: string, name: string, newStatus: string) => {
    if (!confirm(`Change status of ${name} to ${newStatus}?`)) return
    
    const result = await updateListingStatus(propertyId, newStatus, activeTab)
    if (result.success) {
      toast({ title: "Status Updated", description: `${name} is now ${newStatus}.` })
      fetchListings()
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleDelete = async (propertyId: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${name}?`)) return
    
    const result = await deleteListing(propertyId, activeTab)
    if (result.success) {
      toast({ title: "Listing Deleted", description: `${name} has been removed.` })
      fetchListings()
    } else {
      toast({ title: "Deletion Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleAvailabilityUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updatingAvailabilityProp) return

    setIsUpdatingAvailability(true)
    const result = await updateListingAvailability(updatingAvailabilityProp.id, selectedAvailability, activeTab)

    if (result.success) {
      toast({
        title: "Availability Updated",
        description: `${updatingAvailabilityProp.name} is now marked as ${selectedAvailability.replace('_', ' ')}.`,
      })
      setUpdatingAvailabilityProp(null)
      fetchListings()
    } else if (result.error === 'MISSING_COLUMN') {
      setShowSqlMigrationDialog(true)
    } else {
      toast({
        title: "Update Failed",
        description: result.error,
        variant: "destructive"
      })
    }
    setIsUpdatingAvailability(false)
  }

  const getAvailabilityDisplay = (availability: string | undefined) => {
    const a = availability?.toUpperCase() || 'AVAILABLE'
    
    switch(a) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Available
          </span>
        )
      case 'UNAVAILABLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/20">
            Not Available
          </span>
        )
      default:
        return null
    }
  }
  const getListingTypeDisplay = (type: string | undefined) => {
    const t = type?.toUpperCase() || 'SALE'
    
    if (t === 'RENTAL') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Rental
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
        For Sale
      </span>
    )
  }

  const getStatusDisplay = (status: string) => {
    const s = status?.toUpperCase() || 'UNKNOWN'
    
    switch(s) {
      case 'APPROVED': 
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1"/> Live
          </span>
        )
      case 'PENDING':
      case 'PENDING_AGENCY': 
      case 'PENDING_MODERATION': 
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1"/> Pending
          </span>
        )
      case 'DRAFT': 
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
            Draft
          </span>
        )
      case 'SUSPENDED': 
      case 'REJECTED': 
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
            <Ban className="w-3 h-3 mr-1"/> {s === 'REJECTED' ? 'Rejected' : 'Suspended'}
          </span>
        )
      default: 
        return <span className="text-neutral-500 text-[10px] uppercase font-bold">{s}</span>
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Listing Inventory</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Property Moderation & Distribution Control
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 bg-neutral-900/40 p-1 border border-neutral-800 w-fit">
        {[
          { id: 'apartments', label: 'Apartments' },
          { id: 'event_centers', label: 'Event Centers' },
          { id: 'public_space', label: 'Other Public Space' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-black' 
                : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-900/40 p-4 border border-neutral-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input 
            placeholder="Search listings..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black border-neutral-800 text-white placeholder:text-neutral-600 rounded-none h-10 focus-visible:ring-1 focus-visible:ring-neutral-700"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button variant="outline" className="border-neutral-800 bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-none h-10 px-4 text-xs tracking-wider uppercase">
            <Filter className="w-3 h-3 mr-2" />
            Filter Status
          </Button>
        </div>
      </div>

      <div className="space-y-6 relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10 border border-neutral-800 bg-neutral-900/20">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Retrieving Inventory...</p>
          </div>
        )}

        {!loading && agentGroups.length === 0 && (
          <div className="border border-neutral-800 bg-neutral-900/20 p-20 text-center">
            <p className="text-neutral-500 text-sm italic">No agents or listings found in your organization.</p>
          </div>
        )}

        {!loading && agentGroups.map(group => {
          const filteredProps = group.properties.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          )

          if (searchQuery && filteredProps.length === 0) return null

          return (
            <div key={group.id} className="border border-neutral-800 bg-neutral-900/20 overflow-hidden">
              <div 
                className="p-4 bg-black/50 border-b border-neutral-800 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center gap-3">
                  {group.expanded ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}
                  <div>
                    <h3 className="text-sm font-medium text-white">{group.full_name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">{group.email}</p>
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                  {filteredProps.length} Listing{filteredProps.length !== 1 && 's'}
                </div>
              </div>

              {group.expanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800/50 bg-neutral-950">
                        <th className="p-3 pl-11 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Property Details</th>
                        <th className="p-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">State</th>
                        <th className="p-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Created Date</th>
                        <th className="p-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/30">
                      {filteredProps.length > 0 ? (
                        filteredProps.map(prop => (
                          <tr key={prop.id} className="hover:bg-neutral-900/30 transition-colors group/row">
                            <td className="p-3 pl-11">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                  <Box className="w-4 h-4 text-neutral-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm text-neutral-300 font-medium">{prop.name}</span>
                                  <div className="flex gap-1.5 mt-1">
                                    {activeTab !== 'event_centers' && getListingTypeDisplay(prop.listing_type)}
                                  </div>
                                </div>
                              </div>
                            </td>
                             <td className="p-3 text-xs font-medium">
                              <div className="flex flex-col gap-1.5 items-start">
                                {getStatusDisplay(prop.status)}
                                {getAvailabilityDisplay(prop.availability)}
                              </div>
                            </td>
                            <td className="p-3 text-xs text-neutral-500 font-mono">
                              {new Date(prop.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-neutral-800 rounded-none text-neutral-500 hover:text-white">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-black border-neutral-800 rounded-none">
                                  {prop.model_url && (
                                    <DropdownMenuItem 
                                      onClick={() => setViewingModel(prop)}
                                      className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-emerald-500 focus:bg-emerald-950 focus:text-emerald-400 cursor-pointer rounded-none"
                                    >
                                      <Maximize2 className="w-3 h-3" /> View 3D Asset
                                    </DropdownMenuItem>
                                  )}
                                  {(prop.status === 'DRAFT' || prop.status === 'SUSPENDED') && (
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusChange(prop.id, prop.name, 'PENDING_MODERATION')}
                                      className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-blue-500 focus:bg-blue-950 focus:text-blue-400 cursor-pointer rounded-none"
                                    >
                                      <Send className="w-3 h-3" /> Submit for Moderation
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setUpdatingAvailabilityProp(prop)
                                      setSelectedAvailability(prop.availability || 'AVAILABLE')
                                    }}
                                    className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-emerald-400 focus:bg-emerald-950/40 focus:text-emerald-400 cursor-pointer rounded-none"
                                  >
                                    <Filter className="w-3 h-3" /> Mark Availability
                                  </DropdownMenuItem>
                                  {(prop.status === 'APPROVED' || prop.status === 'PENDING_MODERATION') && (
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusChange(prop.id, prop.name, 'SUSPENDED')}
                                      className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-orange-500 focus:bg-orange-950 focus:text-orange-400 cursor-pointer rounded-none border-t border-neutral-900 pt-2 mt-2"
                                    >
                                      <Ban className="w-3 h-3" /> Suspend Visibility
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(prop.id, prop.name)}
                                    className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-red-500 focus:bg-red-950 focus:text-red-400 cursor-pointer rounded-none border-t border-neutral-900 pt-2 mt-2"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete Permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 pl-11 text-neutral-500 text-xs italic">
                            No listings match the current criteria for this agent.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={!!viewingModel} onOpenChange={(open) => !open && setViewingModel(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] bg-black border-neutral-800 p-0 overflow-hidden rounded-none flex flex-col">
          <DialogHeader className="p-4 border-b border-neutral-800 shrink-0">
            <DialogTitle className="text-xl font-light tracking-tight text-white flex items-center gap-3">
              <Box className="w-5 h-5 text-neutral-500" />
              Viewing Asset: {viewingModel?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-neutral-950">
            {viewingModel?.model_url && (
              <ModelViewer 
                url={viewingModel.model_url} 
                title={viewingModel.name} 
                scale={viewingModel.scale_factor || viewingModel.model_scale || 1.0}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Availability Edit Modal */}
      <Dialog open={!!updatingAvailabilityProp} onOpenChange={(open) => !open && setUpdatingAvailabilityProp(null)}>
        <DialogContent className="sm:max-w-[425px] bg-neutral-950 border-neutral-900 text-white rounded-none p-0 overflow-hidden">
          <div className="bg-emerald-500 h-1.5 w-full" />
          <form onSubmit={handleAvailabilityUpdate} className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light tracking-tight">Mark Availability</DialogTitle>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mt-2">
                Property: {updatingAvailabilityProp?.name}
              </p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Select Availability Status</label>
                <select 
                  value={selectedAvailability}
                  onChange={e => setSelectedAvailability(e.target.value)}
                  className="w-full bg-black border border-neutral-800 text-white rounded-none h-12 px-3 text-sm focus:border-neutral-700 outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="UNAVAILABLE">NOT AVAILABLE</option>
                </select>
              </div>
              <p className="text-[9px] text-neutral-600 uppercase tracking-widest leading-relaxed">
                Changes will adjust listing badges and visibility across the platform.
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-neutral-900">
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setUpdatingAvailabilityProp(null)}
                className="flex-1 rounded-none text-[10px] uppercase tracking-widest font-bold hover:bg-neutral-900"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdatingAvailability}
                className="flex-1 bg-white text-black hover:bg-neutral-200 rounded-none text-[10px] uppercase tracking-widest font-bold"
              >
                {isUpdatingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Status'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SQL Migration Instruction Dialog */}
      <Dialog open={showSqlMigrationDialog} onOpenChange={setShowSqlMigrationDialog}>
        <DialogContent className="sm:max-w-[500px] bg-neutral-950 border-neutral-900 text-white rounded-none p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light tracking-tight text-red-500">Database Migration Required</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs mt-2 leading-relaxed">
              The <strong>availability</strong> column does not exist yet in your Supabase database <strong>properties</strong> table.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              Please copy the SQL command below, navigate to your <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query</strong>, paste it, and click <strong>Run</strong>:
            </p>

            <pre className="bg-black border border-neutral-850 p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto rounded-none select-all">
              {`ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS availability VARCHAR DEFAULT 'AVAILABLE';`}
            </pre>

            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
              After running this script, close this modal and try marking the status again!
            </p>
          </div>

          <div className="pt-4 border-t border-neutral-900 flex justify-end">
            <Button 
              onClick={() => {
                setShowSqlMigrationDialog(false)
                setUpdatingAvailabilityProp(null)
              }}
              className="bg-white text-black hover:bg-neutral-200 rounded-none text-[10px] uppercase tracking-widest font-bold h-10 px-6"
            >
              Acknowledged
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
