'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Search, 
  Filter, 
  Box,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  Maximize2
} from 'lucide-react'
import { ModelViewer } from '@/components/model-viewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { updatePropertyStatus } from '@/app/actions/property-actions'
import { useToast } from '@/components/ui/use-toast'

interface PropertyData {
  id: string
  name: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  model_url: string | null
  agency_id: string
  agent_id: string
  agency_name?: string
  agent_name?: string
  tableName?: string
  model_scale?: number
  scale_factor?: number
  transform_metadata?: number
}

export default function ModerationPage() {
  const [properties, setProperties] = useState<PropertyData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingModel, setViewingModel] = useState<PropertyData | null>(null)
  const [activeTab, setActiveTab] = useState<'apartments' | 'event_centers' | 'public_space'>('apartments')
  const itemsPerPage = 10
  const { toast } = useToast()

  const fetchProperties = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from(activeTab)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        // Enrich with profile names
        const enriched = await Promise.all(data.map(async (prop) => {
          const { data: agencyData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', prop.agency_id)
            .single()

          const { data: agentData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', prop.agent_id)
            .single()

          return {
            ...prop,
            agency_name: agencyData?.full_name || 'Unknown Agency',
            agent_name: agentData?.full_name || 'Unknown Agent',
            tableName: activeTab
          }
        }))
        setProperties(enriched)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties, activeTab])

  const handleStatusUpdate = async (id: string, newStatus: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const result = await updatePropertyStatus(id, newStatus, activeTab)
    if (result.success) {
      setProperties(properties.map(p => p.id === id ? { ...p, status: newStatus } : p))
      toast({ title: `Listing ${newStatus.toLowerCase()}`, description: "Status updated successfully." })
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" })
    }
  }

  const filteredProperties = properties.filter(prop => 
    prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.agency_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.agent_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredProperties.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || 'UNKNOWN'
    
    switch(s) {
      case 'APPROVED': 
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1"/> Approved
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1"/> Pending
          </span>
        )
      case 'REJECTED': 
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle className="w-3 h-3 mr-1"/> Rejected
          </span>
        )
      default: 
        return <span className="text-neutral-500 text-[10px] uppercase font-bold">{s}</span>
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Platform Content Moderation</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Review and Approve Global Listings
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-900/40 p-4 border border-neutral-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input 
            placeholder="Search listings..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
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

      {/* Data Table */}
      <div className="border border-neutral-800 bg-neutral-900/20 overflow-hidden min-h-[400px] relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Syncing Listing Registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-black/50">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Property Title</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Origin</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">3D Asset</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Submitted</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((prop) => (
                    <tr key={prop.id} className="hover:bg-neutral-900/40 transition-colors group">
                      <td className="p-4">
                        <p className="text-sm font-medium text-white">{prop.name}</p>
                        <p className="text-xs text-neutral-500 uppercase tracking-tighter">VR Listing</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-neutral-300">{prop.agency_name}</p>
                        <p className="text-xs text-neutral-500">by {prop.agent_name}</p>
                      </td>
                      <td className="p-4">
                        {prop.model_url ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1">
                            <Box className="w-3 h-3" />
                            Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-900 px-2 py-1 border border-neutral-800">
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(prop.status)}
                      </td>
                      <td className="p-4 text-xs text-neutral-500 font-mono">
                        {new Date(prop.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-neutral-800 bg-transparent hover:bg-neutral-800 rounded-none text-neutral-300 hover:text-white h-8 text-xs px-3">
                              Review
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-black border-neutral-800 rounded-none">
                            <DropdownMenuItem 
                              onClick={() => setViewingModel(prop)}
                              className="text-xs uppercase tracking-wider font-medium text-emerald-500 focus:bg-emerald-950 focus:text-emerald-400 cursor-pointer rounded-none"
                            >
                              <Maximize2 className="w-3 h-3 mr-2" /> Inspect 3D Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs uppercase tracking-wider font-medium text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none">
                              <Eye className="w-3 h-3 mr-2" /> View Details
                            </DropdownMenuItem>
                            {prop.model_url && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (prop.model_url) {
                                    window.open(prop.model_url, '_blank')
                                  }
                                }}
                                className="text-xs uppercase tracking-wider font-medium text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none"
                              >
                                <Download className="w-3 h-3 mr-2" /> Download Asset
                              </DropdownMenuItem>
                            )}
                            <div className="h-px bg-neutral-900 my-1" />
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(prop.id, 'APPROVED')}
                              className="text-xs uppercase tracking-wider font-medium text-emerald-500 focus:bg-emerald-950 focus:text-emerald-400 cursor-pointer rounded-none"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-2" /> Approve Listing
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(prop.id, 'PENDING')}
                              className="text-xs uppercase tracking-wider font-medium text-amber-500 focus:bg-amber-950 focus:text-amber-400 cursor-pointer rounded-none"
                            >
                              <Clock className="w-3 h-3 mr-2" /> Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(prop.id, 'REJECTED')}
                              className="text-xs uppercase tracking-wider font-medium text-red-500 focus:bg-red-950 focus:text-red-400 cursor-pointer rounded-none"
                            >
                              <XCircle className="w-3 h-3 mr-2" /> Reject Listing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <p className="text-neutral-500 text-sm italic">No properties found in the registry.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && filteredProperties.length > 0 && (
          <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-black/30">
            <p className="text-xs text-neutral-500">
              Showing <span className="text-white">{startIndex + 1}</span> to <span className="text-white">{Math.min(startIndex + itemsPerPage, filteredProperties.length)}</span> of <span className="text-white">{filteredProperties.length}</span> entries
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-8 rounded-none border-neutral-800 bg-transparent text-neutral-500 text-xs uppercase tracking-wider disabled:opacity-30"
              >
                Prev
              </Button>
              <Button 
                variant="outline" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-8 rounded-none border-neutral-800 bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs uppercase tracking-wider disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!viewingModel} onOpenChange={(open) => !open && setViewingModel(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] bg-black border-neutral-800 p-0 overflow-hidden rounded-none flex flex-col">
          <DialogHeader className="p-4 border-b border-neutral-800 shrink-0">
            <DialogTitle className="text-xl font-light tracking-tight text-white flex items-center gap-3">
              <Box className="w-5 h-5 text-neutral-500" />
              Inspecting Asset: {viewingModel?.name}
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
    </div>
  )
}
