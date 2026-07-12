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
  CheckCircle2,
  Clock,
  Send,
  Plus
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
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { updateListingStatus, deleteListing, updateListingDetails, updateListingAvailability } from '@/app/actions/agent-listing-actions'
import Link from 'next/link'
import { ModelViewer } from '@/components/model-viewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface PropertyData {
  id: string
  name: string
  status: string
  created_at: string
  location?: string
  price?: number
  model_url?: string
  availability?: string
  listing_type?: string
  model_scale?: number
  scale_factor?: number
  transform_metadata?: number
  state?: string
  [key: string]: any
}

const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Federal Capital Territory (FCT)'
]

export default function AgentListingsPage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<PropertyData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [viewingModel, setViewingModel] = useState<PropertyData | null>(null)
  const [editingListing, setEditingListing] = useState<PropertyData | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isUpdatingListing, setIsUpdatingListing] = useState(false)
  
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
      const { data, error } = await supabase
        .from(activeTab)
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedData = (data || []).map((d: any) => ({ ...d, location: d.address }))
      setProperties(mappedData)
    } catch (err) {
      console.error('Error fetching listings:', err)
    } finally {
      setLoading(false)
    }
  }, [user, activeTab])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

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

  const handleListingUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingListing) return
    
    setIsUpdatingListing(true)
    
    const payload = { ...editFormData }
    delete payload.id
    delete payload.created_at
    delete payload.updated_at
    delete payload.agent_id
    delete payload.agency_id
    delete payload.status
    delete payload.model_url
    delete payload.thumbnail_path
    delete payload.location
    
    if (payload.price) payload.price = parseFloat(payload.price)
    
    if (activeTab === 'event_centers') {
      payload.listing_type = 'SALE'
      payload.rent_interval = null
    } else if (payload.listing_type !== 'RENTAL') {
      payload.rent_interval = null
    } else {
      payload.rent_interval = payload.rent_interval || 'monthly'
    }

    if (Array.isArray(payload.other_features)) {
      payload.other_features = payload.other_features.filter((f: string) => f && typeof f === 'string' && f.trim() !== '')
    }
    
    const result = await updateListingDetails(editingListing.id, payload, activeTab)
    
    if (result.success) {
      toast({ title: "Listing Updated", description: `${editingListing.name} details have been updated.` })
      setEditingListing(null)
      fetchListings()
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" })
    }
    setIsUpdatingListing(false)
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

  const filteredProps = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    
    if (statusFilter === 'ALL') return true
    
    if (statusFilter === 'PENDING') {
      return ['PENDING', 'PENDING_AGENCY', 'PENDING_MODERATION'].includes(p.status?.toUpperCase())
    }
    
    return p.status?.toUpperCase() === statusFilter
  })

  const formatPrice = (price: number | undefined, listingType?: string, rentInterval?: string) => {
    if (!price) return 'N/A'
    const formatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)
    if (activeTab !== 'event_centers' && listingType?.toUpperCase() === 'RENTAL' && rentInterval) {
      const suffix = rentInterval.toLowerCase() === 'yearly' ? '/yr' : '/mo'
      return `${formatted}${suffix}`
    }
    return formatted
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">My Listings</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Property Inventory Management
          </p>
        </div>
        <div>
          <Button asChild className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all">
            <Link href="/agent/listings/upload">
              <Plus className="w-4 h-4 mr-2" /> Create Listing
            </Link>
          </Button>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-neutral-800 bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-none h-10 px-4 text-xs tracking-wider uppercase">
                <Filter className="w-3 h-3 mr-2" />
                {statusFilter === 'ALL' ? 'Filter Status' : statusFilter.replace('_', ' ')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-black border-neutral-800 rounded-none">
              {['ALL', 'APPROVED', 'PENDING', 'DRAFT', 'REJECTED', 'SUSPENDED'].map((status) => (
                <DropdownMenuItem 
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-xs uppercase tracking-wider font-medium cursor-pointer rounded-none ${statusFilter === status ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-white focus:bg-neutral-900'}`}
                >
                  {status === 'ALL' ? 'All Statuses' : status.replace('_', ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-6 relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10 border border-neutral-800 bg-neutral-900/20">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Retrieving Inventory...</p>
          </div>
        )}

        {!loading && (
          <div className="border border-neutral-800 bg-neutral-900/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800/50 bg-neutral-950">
                    <th className="p-4 pl-8 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Property</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Price</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Location</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">State</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Created Date</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/30">
                  {filteredProps.length > 0 ? (
                    filteredProps.map(prop => (
                      <tr key={prop.id} className="hover:bg-neutral-900/30 transition-colors group/row">
                        <td className="p-4 pl-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                              <Box className="w-5 h-5 text-neutral-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-neutral-300 font-medium line-clamp-1">{prop.name}</span>
                              <div className="flex gap-1.5 mt-1.5">
                                {activeTab !== 'event_centers' && getListingTypeDisplay(prop.listing_type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-mono text-neutral-400">
                          {formatPrice(prop.price, prop.listing_type, prop.rent_interval)}
                        </td>
                        <td className="p-4 text-xs text-neutral-400">
                          {prop.location || 'N/A'}
                        </td>
                        <td className="p-4 text-xs font-medium">
                          <div className="flex flex-col gap-1.5 items-start">
                            {getStatusDisplay(prop.status)}
                            {getAvailabilityDisplay(prop.availability)}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-neutral-500 font-mono">
                          {new Date(prop.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-neutral-800 rounded-none text-neutral-500 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-black border-neutral-800 rounded-none">
                              {prop.model_url && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => setViewingModel(prop)}
                                    className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-emerald-500 focus:bg-emerald-950 focus:text-emerald-400 cursor-pointer rounded-none"
                                  >
                                    <Box className="w-3 h-3" /> View 3D Asset
                                  </DropdownMenuItem>
                                  <Link href={`/agent/listings/editor?id=${prop.id}`} className="block">
                                    <DropdownMenuItem 
                                      className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none"
                                    >
                                      <Box className="w-3 h-3 text-neutral-500" /> Spatial Editor
                                    </DropdownMenuItem>
                                  </Link>
                                </>
                              )}
                              {(prop.status === 'DRAFT' || prop.status === 'REJECTED') && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(prop.id, prop.name, 'PENDING_AGENCY')}
                                  className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-blue-500 focus:bg-blue-950 focus:text-blue-400 cursor-pointer rounded-none"
                                >
                                  <Send className="w-3 h-3" /> Submit for Approval
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
                              <DropdownMenuItem 
                                onClick={() => {
                                  setEditingListing(prop)
                                  setEditFormData({ ...prop })
                                }}
                                className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-amber-500 focus:bg-amber-950 focus:text-amber-400 cursor-pointer rounded-none"
                              >
                                <Plus className="w-3 h-3" /> Edit Details
                              </DropdownMenuItem>
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
                      <td colSpan={6} className="p-12 text-center border-t border-neutral-800">
                        <Box className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                        <p className="text-neutral-500 text-xs tracking-widest uppercase mb-4">No listings found</p>
                        <Button asChild variant="outline" className="border-neutral-800 hover:bg-neutral-800 rounded-none">
                          <Link href="/agent/listings/upload">
                            Create First Listing
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
      
      {/* Listing Edit Modal */}
      <Dialog open={!!editingListing} onOpenChange={(open) => !open && setEditingListing(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-neutral-950 border-neutral-900 text-white rounded-none p-0 custom-scrollbar">
          <div className="bg-amber-500 h-1.5 w-full shrink-0" />
          <form onSubmit={handleListingUpdate} className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light tracking-tight">Edit Details</DialogTitle>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mt-2">
                {activeTab.replace('_', ' ')}
              </p>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Property Name</label>
                  <Input 
                    required
                    value={editFormData.name || ''}
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                    className="bg-black border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Price (₦)</label>
                  <Input 
                    required type="number" step="0.01"
                    value={editFormData.price || ''}
                    onChange={e => setEditFormData({...editFormData, price: e.target.value})}
                    className="bg-black border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Address</label>
                <Input 
                  required
                  value={editFormData.address || ''}
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                  className="bg-black border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">State</label>
                <select
                  required
                  value={editFormData.state || ''}
                  onChange={e => setEditFormData({...editFormData, state: e.target.value})}
                  className="w-full bg-black border border-neutral-800 text-white rounded-none h-12 px-3 text-sm focus:border-neutral-700 outline-none"
                >
                  <option value="" disabled>Select a state</option>
                  {NIGERIA_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Contact Phone Number (Compulsory)</label>
                <Input 
                  required
                  type="tel"
                  value={editFormData.phone_number || ''}
                  onChange={e => setEditFormData({...editFormData, phone_number: e.target.value})}
                  className="bg-black border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
                <p className="text-[9px] text-neutral-500 tracking-wider">
                  This number will be used to contact you when someone decides to get your listing.
                </p>
              </div>

              {activeTab !== 'event_centers' && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Listing Type</label>
                  <select 
                    value={editFormData.listing_type || 'SALE'}
                    onChange={e => {
                      const nextVal = e.target.value
                      setEditFormData({
                        ...editFormData,
                        listing_type: nextVal,
                        ...(nextVal === 'RENTAL' ? { rent_interval: editFormData.rent_interval || 'monthly' } : { rent_interval: null })
                      })
                    }}
                    className="w-full bg-black border border-neutral-800 text-white rounded-none h-12 px-3 text-sm focus:border-neutral-700 outline-none"
                  >
                    <option value="SALE">For Sale</option>
                    <option value="RENTAL">For Rent</option>
                  </select>
                </div>
              )}

              {activeTab !== 'event_centers' && editFormData.listing_type === 'RENTAL' && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Rental Interval</label>
                  <select 
                    value={editFormData.rent_interval || 'monthly'}
                    onChange={e => setEditFormData({...editFormData, rent_interval: e.target.value})}
                    className="w-full bg-black border border-neutral-800 text-white rounded-none h-12 px-3 text-sm focus:border-neutral-700 outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

              {/* Dynamic Fields */}
              {activeTab === 'apartments' && (
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Land Size</label>
                    <Input value={editFormData.land_size || ''} onChange={e => setEditFormData({...editFormData, land_size: e.target.value})} className="bg-black border-neutral-800 text-white h-12 rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Bedrooms</label>
                    <Input type="number" value={editFormData.num_bedrooms || ''} onChange={e => setEditFormData({...editFormData, num_bedrooms: e.target.value})} className="bg-black border-neutral-800 text-white h-12 rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Bathrooms</label>
                    <Input type="number" value={editFormData.num_bathrooms || ''} onChange={e => setEditFormData({...editFormData, num_bathrooms: e.target.value})} className="bg-black border-neutral-800 text-white h-12 rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Water Available</label>
                    <select value={editFormData.has_water ? 'true' : 'false'} onChange={e => setEditFormData({...editFormData, has_water: e.target.value === 'true'})} className="w-full bg-black border border-neutral-800 text-white h-12 px-3 rounded-none">
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'event_centers' && (
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Capacity</label>
                    <Input value={editFormData.sitting_capacity || ''} onChange={e => setEditFormData({...editFormData, sitting_capacity: e.target.value})} className="bg-black border-neutral-800 text-white h-12 rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Parking</label>
                    <Input value={editFormData.parking_yard || ''} onChange={e => setEditFormData({...editFormData, parking_yard: e.target.value})} className="bg-black border-neutral-800 text-white h-12 rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Generator</label>
                    <select value={editFormData.generator ? 'true' : 'false'} onChange={e => setEditFormData({...editFormData, generator: e.target.value === 'true'})} className="w-full bg-black border border-neutral-800 text-white h-12 px-3 rounded-none">
                      <option value="true">Provided</option>
                      <option value="false">Not Provided</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Security</label>
                    <select value={editFormData.security ? 'true' : 'false'} onChange={e => setEditFormData({...editFormData, security: e.target.value === 'true'})} className="w-full bg-black border border-neutral-800 text-white h-12 px-3 rounded-none">
                      <option value="true">Provided</option>
                      <option value="false">Not Provided</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'public_space' && (
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Floor Area</label>
                    <Input value={editFormData.floor_area || ''} onChange={e => setEditFormData({...editFormData, floor_area: e.target.value})} className="bg-black border-neutral-800 text-white h-12 rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Power Supply</label>
                    <select value={editFormData.power_supply ? 'true' : 'false'} onChange={e => setEditFormData({...editFormData, power_supply: e.target.value === 'true'})} className="w-full bg-black border border-neutral-800 text-white h-12 px-3 rounded-none">
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Parking</label>
                    <select value={editFormData.parking ? 'true' : 'false'} onChange={e => setEditFormData({...editFormData, parking: e.target.value === 'true'})} className="w-full bg-black border border-neutral-800 text-white h-12 px-3 rounded-none">
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Internet</label>
                    <select value={editFormData.internet ? 'true' : 'false'} onChange={e => setEditFormData({...editFormData, internet: e.target.value === 'true'})} className="w-full bg-black border border-neutral-800 text-white h-12 px-3 rounded-none">
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Other Features Edit */}
              <div className="pt-6 border-t border-neutral-900 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">Other Features</label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-[10px] bg-transparent border-neutral-800 text-neutral-400 hover:text-white"
                    onClick={() => {
                      const features = Array.isArray(editFormData.other_features) ? [...editFormData.other_features] : []
                      features.push('')
                      setEditFormData({...editFormData, other_features: features})
                    }}
                  >
                    + Add Feature
                  </Button>
                </div>
                <div className="space-y-3">
                  {(Array.isArray(editFormData.other_features) && editFormData.other_features.length > 0 ? editFormData.other_features : ['']).map((feature: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const features = Array.isArray(editFormData.other_features) ? [...editFormData.other_features] : ['']
                          features[idx] = e.target.value
                          setEditFormData({...editFormData, other_features: features})
                        }}
                        placeholder="e.g. Swimming Pool, Fully Furnished"
                        className="bg-black border-neutral-800 text-white h-10 rounded-none"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 shrink-0 rounded-none"
                        onClick={() => {
                          const features = Array.isArray(editFormData.other_features) ? [...editFormData.other_features] : ['']
                          features.splice(idx, 1)
                          setEditFormData({...editFormData, other_features: features})
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-neutral-900">
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setEditingListing(null)}
                className="flex-1 rounded-none text-[10px] uppercase tracking-widest font-bold hover:bg-neutral-900"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdatingListing}
                className="flex-1 bg-white text-black hover:bg-neutral-200 rounded-none text-[10px] uppercase tracking-widest font-bold"
              >
                {isUpdatingListing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </form>
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
