'use client'

import { useEffect, useState } from 'react'
import { 
  Search, 
  Filter, 
  Building2,
  CheckCircle2,
  MoreHorizontal,
  Loader2,
  Ban,
  Trash2,
  Edit
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
import { OnboardAgencyModal } from '@/components/modals/onboard-agency-modal'
import { ReviewAgencyModal } from '@/components/modals/review-agency-modal'
import { toggleAgencyStatus, deleteAgency } from '@/app/actions/agency-actions'
import { useToast } from '@/components/ui/use-toast'

interface AgencyData {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
  agent_count: number
  property_count: number
  subscription_tier_id: string | null
  suspended: boolean
  agency_status?: string
  verification_document_url?: string | null
  agency_subscriptions?: {
    subscription_plans?: {
      name: string
    }
  }[]
}

interface Plan {
  id: string
  name: string
  is_contact_sales: boolean
}

export default function AgencyManagementPage() {
  const [agencies, setAgencies] = useState<AgencyData[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState<AgencyData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const { toast } = useToast()

  const fetchData = async () => {
    const supabase = createClient()
    setLoading(true)
    
    try {
      // Fetch Current User
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        setCurrentUserId(userData.user.id)
      }

      // Fetch Agencies and Plans concurrently
      const [profilesRes, plansRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, agency_subscriptions(subscription_plans(name))')
          .eq('role', 'AGENCY')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('id, name, is_contact_sales')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      ])

      if (profilesRes.error) throw profilesRes.error
      if (plansRes.error) throw plansRes.error

      if (plansRes.data) {
        setPlans(plansRes.data)
      }

      if (profilesRes.data) {
        const enrichedAgencies = await Promise.all(profilesRes.data.map(async (agency: any) => {
          const { count: agentCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('agency_id', agency.id)

          const { count: propertyCount } = await supabase
            .from('unified_listings')
            .select('*', { count: 'exact', head: true })
            .eq('agency_id', agency.id)

          return {
            ...agency,
            agent_count: agentCount || 0,
            property_count: propertyCount || 0
          }
        }))

        setAgencies(enrichedAgencies)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleStatus = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'reactivate' : 'suspend'
    if (!confirm(`Are you sure you want to ${action} ${name}?`)) return;
    
    const result = await toggleAgencyStatus(id, currentStatus)
    if (result.success) {
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, suspended: result.newStatus } : a))
      toast({ 
        title: result.newStatus ? "Agency Suspended" : "Agency Reactivated", 
        description: `${name} status has been updated.` 
      })
    } else {
      toast({ title: "Operation Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY delete ${name}? This will remove all associated agents and listings.`)) return;
    
    const result = await deleteAgency(id)
    if (result.success) {
      toast({ title: "Agency Deleted", description: `${name} has been permanently removed.` })
      setAgencies(prev => prev.filter(a => a.id !== id))
    } else {
      toast({ title: "Deletion Failed", description: result.error, variant: "destructive" })
    }
  }

  const filteredAgencies = agencies.filter(agency => 
    (agency.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    agency.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Agency Management</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Organization Portfolio Oversight
          </p>
        </div>
        
        <OnboardAgencyModal plans={plans} onSuccess={fetchData} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-900/40 p-4 border border-neutral-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input 
            placeholder="Search organizations..." 
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
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Accessing Database Registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-black/50">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Organization</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Tier</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Agents</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Listings</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Onboarded</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {filteredAgencies.length > 0 ? (
                  filteredAgencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-neutral-900/40 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-800 flex items-center justify-center border border-neutral-700">
                            <Building2 className="w-4 h-4 text-neutral-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{agency.full_name || 'Unnamed Agency'}</p>
                            <p className="text-xs text-neutral-500">{agency.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-neutral-300 px-2 py-1 bg-neutral-800 border border-neutral-700">
                          {agency.agency_subscriptions?.[0]?.subscription_plans?.name || 'None'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-400">{agency.agent_count}</td>
                      <td className="p-4 text-sm text-neutral-400">{agency.property_count}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {agency.agency_status === 'pending_review' ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span className="text-xs uppercase tracking-wider font-bold text-yellow-500">
                                Pending
                              </span>
                            </>
                          ) : agency.agency_status === 'revoked' ? (
                            <>
                              <Ban className="w-4 h-4 text-red-500" />
                              <span className="text-xs uppercase tracking-wider font-bold text-red-500">
                                Revoked
                              </span>
                            </>
                          ) : agency.suspended ? (
                            <>
                              <Ban className="w-4 h-4 text-orange-500" />
                              <span className="text-xs uppercase tracking-wider font-bold text-orange-500">
                                Suspended
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs uppercase tracking-wider font-bold text-emerald-500">
                                Approved
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-neutral-500 font-mono">
                        {new Date(agency.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {agency.agency_status === 'pending_review' && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedAgency(agency)
                                setReviewModalOpen(true)
                              }}
                              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase tracking-widest font-bold rounded-none px-4 border-0"
                            >
                              Review
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-neutral-800 rounded-none text-neutral-400 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-black border-neutral-800 rounded-none">
                              {agency.agency_status === 'pending_review' && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedAgency(agency)
                                    setReviewModalOpen(true)
                                  }}
                                  className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-blue-500 focus:bg-blue-950 focus:text-blue-400 cursor-pointer rounded-none"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Review Agency
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(agency.id, agency.full_name || 'Agency', agency.suspended)}
                                className={`flex items-center gap-2 text-xs uppercase tracking-wider font-medium cursor-pointer rounded-none ${agency.agency_status === 'pending_review' ? 'mt-2 border-t border-neutral-900 pt-2' : ''} ${agency.suspended ? 'text-emerald-500 focus:bg-emerald-950 focus:text-emerald-400' : 'text-orange-500 focus:bg-orange-950 focus:text-orange-400'}`}
                              >
                                <Ban className="w-3 h-3" /> {agency.suspended ? 'Reactivate Agency' : 'Suspend Agency'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(agency.id, agency.full_name || 'Agency')}
                                className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-red-500 focus:bg-red-950 focus:text-red-400 cursor-pointer rounded-none"
                              >
                                <Trash2 className="w-3 h-3" /> Delete Agency
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                      <p className="text-neutral-500 text-sm italic">No agencies found in the registry.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-black/30">
          <p className="text-xs text-neutral-500">
            Showing <span className="text-white">{filteredAgencies.length}</span> entities
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled className="h-8 rounded-none border-neutral-800 bg-transparent text-neutral-500 text-xs uppercase tracking-wider">Prev</Button>
            <Button variant="outline" disabled className="h-8 rounded-none border-neutral-800 bg-transparent text-neutral-500 text-xs uppercase tracking-wider">Next</Button>
          </div>
        </div>
      </div>

      <ReviewAgencyModal 
        isOpen={reviewModalOpen} 
        onClose={() => {
          setReviewModalOpen(false)
          setSelectedAgency(null)
        }} 
        agency={selectedAgency}
        moderatorId={currentUserId}
        onSuccess={fetchData}
      />
    </div>
  )
}

