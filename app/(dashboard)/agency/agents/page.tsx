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
  Trash2,
  Plus,
  Mail,
  User,
  Copy,
  AlertTriangle,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { provisionAgent } from '@/app/actions/agent-actions'
import { toggleAgentSuspension, deleteAgent } from '@/app/actions/agency-agent-actions'

interface AgentData {
  id: string
  full_name: string | null
  email: string
  created_at: string
  property_count: number
  suspended: boolean
}

export default function AgencyAgentManagementPage() {
  const { user } = useAuth()
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAgent, setNewAgent] = useState({ full_name: '', email: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProvisionSuccess, setIsProvisionSuccess] = useState<boolean>(false)
  const [copied, setCopied] = useState(false)
  
  const [agencyLimits, setAgencyLimits] = useState<any>(null)
  const { toast } = useToast()

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: "Copied", description: "Password saved to clipboard." })
    setTimeout(() => setCopied(false), 2000)
  }

  const fetchAgentsAndLimits = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    
    try {
      if (user) {
        // Fetch Agency Profile
        const { data: sub } = await supabase
          .from('agency_subscriptions')
          .select('custom_agent_limit, subscription_plans(*)')
          .eq('agency_id', user.id)
          .single()

        let maxAgents = 5
        let planTitle = 'No Active Plan'

        if (sub && sub.subscription_plans) {
          const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
          planTitle = plan.name
          maxAgents = sub.custom_agent_limit ?? plan.agent_limit
        }

        setAgencyLimits({
          title: planTitle,
          maxAgents: maxAgents
        })
      }

      // Fetch Agents
      const { data: agentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('agency_id', user.id)
        .eq('role', 'AGENT')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      if (agentProfiles) {
        const enrichedAgents = await Promise.all(agentProfiles.map(async (agent) => {
          const { count: propertyCount } = await supabase
            .from('unified_listings')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)

          return {
            ...agent,
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
  }, [user])

  useEffect(() => {
    fetchAgentsAndLimits()
  }, [fetchAgentsAndLimits])

  const handleToggleStatus = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'reactivate' : 'suspend'
    if (!confirm(`Are you sure you want to ${action} ${name}?`)) return;
    
    const result = await toggleAgentSuspension(id, currentStatus)
    if (result.success) {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, suspended: result.newStatus ?? false } : a))
      toast({ 
        title: result.newStatus ? "Agent Suspended" : "Agent Reactivated", 
        description: `${name}'s access has been updated.` 
      })
    } else {
      toast({ title: "Operation Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${name}? All associated active listings must be reassigned or deleted first.`)) return;
    
    const result = await deleteAgent(id)
    if (result.success) {
      toast({ title: "Agent Deleted", description: `${name} has been removed from your organization.` })
      setAgents(prev => prev.filter(a => a.id !== id))
    } else {
      toast({ title: "Deletion Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    const result = await provisionAgent({ ...newAgent, agency_id: user.id })
    if (result.success) {
      setIsProvisionSuccess(true)
      toast({ title: "Agent Provisioned", description: "An email has been sent with login credentials." })
      fetchAgentsAndLimits()
    } else {
      toast({ title: "Provisioning Failed", description: result.error, variant: "destructive" })
    }
    setIsSubmitting(false)
  }

  const resetAddDialog = () => {
    setIsAddDialogOpen(false)
    setIsProvisionSuccess(false)
    setNewAgent({ full_name: '', email: '' })
  }

  const filteredAgents = agents.filter(agent => 
    (agent.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAtLimit = agencyLimits && agents.length >= agencyLimits.maxAgents

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Agent Directory</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Personnel & Access Management
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => !open && resetAddDialog()}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                if (isAtLimit) {
                  toast({ title: "Capacity Reached", description: "You must upgrade your plan to add more agents.", variant: "destructive" })
                } else {
                  setIsAddDialogOpen(true)
                }
              }} 
              className={`${isAtLimit ? 'bg-neutral-800 text-neutral-500 hover:bg-neutral-800' : 'bg-white text-black hover:bg-neutral-200'} rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Provision Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-neutral-800 text-white rounded-none max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-tight">
                {isProvisionSuccess ? 'Provisioning Complete' : 'Provision New Agent'}
              </DialogTitle>
              <DialogDescription className="text-neutral-500 text-xs uppercase tracking-widest mt-2">
                {isProvisionSuccess ? 'Agent has been successfully onboarded.' : 'Create an organizational profile.'}
              </DialogDescription>
            </DialogHeader>

            {isProvisionSuccess ? (
              <div className="space-y-8 py-6">
                <div className="bg-emerald-950/10 border border-emerald-900/30 p-6 space-y-6">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Registry Updated</span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      The agent profile for <strong>{newAgent.full_name}</strong> has been successfully created.
                    </p>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      An invitation email has been sent to <strong>{newAgent.email}</strong> with their login credentials and a temporary password. They will be prompted to change their password upon their first login.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={resetAddDialog}
                  className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Finalize Provisioning
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAddAgent} className="space-y-6 py-6">
                {isAtLimit && (
                  <div className="bg-amber-950/20 border border-amber-900/50 p-4 mb-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] uppercase tracking-widest text-amber-500 leading-relaxed">
                      Agent capacity reached. You cannot create more agents until you upgrade your subscription tier.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <Input 
                      required
                      placeholder="Agent Name"
                      value={newAgent.full_name}
                      onChange={(e) => setNewAgent({ ...newAgent, full_name: e.target.value })}
                      disabled={isAtLimit}
                      className="pl-10 rounded-none bg-neutral-900/50 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <Input 
                      required
                      type="email"
                      placeholder="agent@agency.com"
                      value={newAgent.email}
                      onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                      disabled={isAtLimit}
                      className="pl-10 rounded-none bg-neutral-900/50 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 disabled:opacity-50"
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || isAtLimit}
                    className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Provision Profile'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

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
          {agencyLimits && (
            <div className="flex items-center gap-2 px-4 border-r border-neutral-800">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Capacity:</span>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${isAtLimit ? 'text-amber-500' : 'text-white'}`}>
                {agents.length} / {agencyLimits.maxAgents}
              </span>
            </div>
          )}
          <Button variant="outline" className="border-neutral-800 bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-none h-10 px-4 text-xs tracking-wider uppercase">
            <Filter className="w-3 h-3 mr-2" />
            Filter
          </Button>
        </div>
      </div>

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
                              <Ban className="w-3 h-3" /> {agent.suspended ? 'Reactivate Access' : 'Suspend Access'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(agent.id, agent.full_name || 'Agent')}
                              className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-red-500 focus:bg-red-950 focus:text-red-400 cursor-pointer rounded-none"
                            >
                              <Trash2 className="w-3 h-3" /> Terminate Agent
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <p className="text-neutral-500 text-sm italic">No agents provisioned in your organization.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
