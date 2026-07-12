'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  GripVertical,
  Pencil,
  Trash2,
  Star,
  Loader2,
  Check,
  Save,
  X,
  PlusCircle,
  Tags,
  DollarSign,
  Briefcase,
  Layers,
  HardDrive,
  Users,
  CheckSquare,
  Box,
  Store,
  Sparkles,
  BarChart2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { updateRegistryFees } from '@/app/actions/pricing-actions'
import { getSubscriptionPlans, updateSubscriptionPlan, createSubscriptionPlan, SubscriptionPlan } from '@/app/actions/subscription-actions'
import { getVendorTiers, createVendorTier, updateVendorTier } from '@/app/actions/vendor-subscription-actions'
import { getBillingTiers, updateBillingTierConfig } from '@/app/actions/api-key-actions'
import { useToast } from '@/components/ui/use-toast'

interface RegistryItem {
  id: string
  name: string
  slug: string
  contact_fee: number
  viewing_fee: number
  created_at: string
  updated_at: string
}

export default function PricingCMSPage() {
  const [activeTab, setActiveTab] = useState<'tiers' | 'agent_tiers' | 'vendor_tiers' | 'registry' | 'consumer_plans' | 'developer_tiers'>('tiers')
  
  // Agency Plans State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({})

  // Agent Plans State
  const [agentPlans, setAgentPlans] = useState<SubscriptionPlan[]>([])
  const [agentLoading, setAgentLoading] = useState(true)

  // Consumer Plans State
  const [consumerPlans, setConsumerPlans] = useState<SubscriptionPlan[]>([])
  const [consumerLoading, setConsumerLoading] = useState(true)

  // Developer Tiers State
  const [developerTiers, setDeveloperTiers] = useState<any[]>([])
  const [developerLoading, setDeveloperLoading] = useState(true)
  const [editingDeveloperId, setEditingDeveloperId] = useState<string | null>(null)
  const [savingDeveloperId, setSavingDeveloperId] = useState<string | null>(null)
  const [editDeveloperForm, setEditDeveloperForm] = useState({
    base_monthly_price: 0,
    included_calls: 0,
    overage_call_fee: 0
  })

  // Vendor Tiers State
  const [vendorTiers, setVendorTiers] = useState<any[]>([])
  const [vendorLoading, setVendorLoading] = useState(true)
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [savingVendorId, setSavingVendorId] = useState<string | null>(null)
  const [editVendorForm, setEditVendorForm] = useState<any>({})

  // Registry Pricing State
  const [registryItems, setRegistryItems] = useState<RegistryItem[]>([])
  const [registryLoading, setRegistryLoading] = useState(false)
  const [editingRegistrySlug, setEditingRegistrySlug] = useState<string | null>(null)
  const [registryForm, setRegistryForm] = useState({ contact_fee: 0, viewing_fee: 0 })
  const [savingRegistry, setSavingRegistry] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    fetchPlans()
    fetchAgentPlans()
    fetchVendorTiers()
    fetchRegistryItems()
    fetchConsumerPlans()
    fetchDeveloperTiers()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    const res = await getSubscriptionPlans('agency')
    if (res.success && res.data) {
      setPlans(res.data)
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to load subscription plans.', variant: 'destructive' })
    }
    setLoading(false)
  }

  async function fetchAgentPlans() {
    setAgentLoading(true)
    const res = await getSubscriptionPlans('agent')
    if (res.success && res.data) {
      setAgentPlans(res.data)
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to load agent plans.', variant: 'destructive' })
    }
    setAgentLoading(false)
  }

  async function fetchConsumerPlans() {
    setConsumerLoading(true)
    const res = await getSubscriptionPlans('consumer')
    if (res.success && res.data) {
      setConsumerPlans(res.data)
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to load consumer plans.', variant: 'destructive' })
    }
    setConsumerLoading(false)
  }

  async function fetchDeveloperTiers() {
    setDeveloperLoading(true)
    try {
      const res = await getBillingTiers()
      if (res.success && res.data) {
        setDeveloperTiers(res.data)
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to load billing tiers.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load developer tiers.', variant: 'destructive' })
    } finally {
      setDeveloperLoading(false)
    }
  }

  async function fetchVendorTiers() {
    setVendorLoading(true)
    const res = await getVendorTiers()
    if (res.success && res.data) {
      setVendorTiers(res.data)
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to load vendor tiers.', variant: 'destructive' })
    }
    setVendorLoading(false)
  }

  async function fetchRegistryItems() {
    setRegistryLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('listing_type_registry')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data) {
      setRegistryItems(data)
    }
    setRegistryLoading(false)
  }

  // --- Agency/Agent/Consumer Methods ---
  const toggleRecommended = async (plan: SubscriptionPlan, type: 'agency' | 'agent' | 'consumer' = 'agency') => {
    const isRecommended = !plan.is_recommended;
    const res = await updateSubscriptionPlan(plan.id, { is_recommended: isRecommended });
    if (res.success) {
      if (type === 'agency') {
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_recommended: isRecommended } : p));
      } else if (type === 'agent') {
        setAgentPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_recommended: isRecommended } : p));
      } else {
        setConsumerPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_recommended: isRecommended } : p));
      }
      toast({ title: "Status Updated", description: "Recommended status updated." });
    } else {
      toast({ title: "Update Failed", description: res.error, variant: "destructive" });
    }
  }

  const moveTier = async (index: number, direction: 'left' | 'right', type: 'agency' | 'agent' | 'consumer' = 'agency') => {
    const list = type === 'agency' ? plans : type === 'agent' ? agentPlans : consumerPlans
    const newPlans = [...list]
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= list.length) return

    const temp = newPlans[index]
    newPlans[index] = newPlans[targetIndex]
    newPlans[targetIndex] = temp

    const plansToSync = newPlans.map((t, i) => ({ ...t, display_order: i }))
    if (type === 'agency') {
      setPlans(plansToSync)
    } else if (type === 'agent') {
      setAgentPlans(plansToSync)
    } else {
      setConsumerPlans(plansToSync)
    }

    await Promise.all(plansToSync.map(t => updateSubscriptionPlan(t.id, { display_order: t.display_order })))
    toast({ title: "Order Updated", description: "Tier display sequence has been saved." })
  }

  // --- Developer Methods ---
  const startDeveloperEdit = (tier: any) => {
    setEditingDeveloperId(tier.id)
    setEditDeveloperForm({
      base_monthly_price: Number(tier.base_monthly_price),
      included_calls: Number(tier.included_calls),
      overage_call_fee: Number(tier.overage_call_fee)
    })
  }

  const cancelDeveloperEdit = () => {
    setEditingDeveloperId(null)
  }

  const handleSaveDeveloperConfig = async (tierId: string) => {
    setSavingDeveloperId(tierId)
    try {
      const res = await updateBillingTierConfig(tierId, editDeveloperForm)
      if (res.success) {
        toast({ title: 'Success', description: 'Developer billing tier updated successfully.' })
        setDeveloperTiers(prev => prev.map(t => t.id === tierId ? { ...t, ...editDeveloperForm } : t))
        setEditingDeveloperId(null)
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to save configuration.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update pricing.', variant: 'destructive' })
    } finally {
      setSavingDeveloperId(null)
    }
  }

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id)
    setEditForm({ ...plan })
  }

  const createNewPlan = (type: 'agency' | 'agent' | 'consumer') => {
    const list = type === 'agency' ? plans : type === 'agent' ? agentPlans : consumerPlans
    if (list.some(p => p.id === 'new')) {
      toast({ title: 'Alert', description: 'Please complete or cancel the new plan first.', variant: 'destructive' })
      return
    }
    const newPlanDefault: SubscriptionPlan = {
      id: 'new',
      name: 'New Plan',
      monthly_price: 0,
      storage_limit_mb: 1000,
      agent_limit: type === 'agency' ? 5 : 1,
      listing_limit: 10,
      supported_listing_types: ['apartment', 'event_center', 'public_space'],
      has_product_placement: false,
      featured_listing_allowance: 0,
      upgrade_price: 0,
      display_order: list.length + 1,
      is_contact_sales: false,
      is_active: true,
      is_recommended: false,
      plan_type: type
    }
    if (type === 'agency') {
      setPlans(prev => [...prev, newPlanDefault])
    } else if (type === 'agent') {
      setAgentPlans(prev => [...prev, newPlanDefault])
    } else {
      setConsumerPlans(prev => [...prev, newPlanDefault])
    }
    setEditingId('new')
    setEditForm({ ...newPlanDefault })
  }

  const cancelEdit = (type: 'agency' | 'agent' | 'consumer') => {
    if (editingId === 'new') {
      if (type === 'agency') {
        setPlans(prev => prev.filter(p => p.id !== 'new'))
      } else if (type === 'agent') {
        setAgentPlans(prev => prev.filter(p => p.id !== 'new'))
      } else {
        setConsumerPlans(prev => prev.filter(p => p.id !== 'new'))
      }
    }
    setEditingId(null)
    setEditForm({})
  }

  const handleSave = async (planId: string, type: 'agency' | 'agent' | 'consumer') => {
    setSavingId(planId)
    try {
      if (planId === 'new') {
        const { id, _storageInput, ...newPlanData } = editForm as any
        newPlanData.plan_type = type
        const res = await createSubscriptionPlan(newPlanData)
        if (res.success && res.data) {
          toast({ title: 'Success', description: 'Subscription plan created successfully.' })
          if (type === 'agency') {
            setPlans(prev => prev.map(p => p.id === 'new' ? res.data! : p))
          } else if (type === 'agent') {
            setAgentPlans(prev => prev.map(p => p.id === 'new' ? res.data! : p))
          } else {
            setConsumerPlans(prev => prev.map(p => p.id === 'new' ? res.data! : p))
          }
          setEditingId(null)
          setEditForm({})
        } else {
          toast({ title: 'Error', description: res.error || 'Failed to create plan.', variant: 'destructive' })
        }
      } else {
        const { _storageInput, ...updateData } = editForm as any
        const res = await updateSubscriptionPlan(planId, updateData)
        if (res.success) {
          toast({ title: 'Success', description: 'Subscription plan updated successfully.' })
          if (type === 'agency') {
            setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updateData } : p))
          } else if (type === 'agent') {
            setAgentPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updateData } : p))
          } else {
            setConsumerPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updateData } : p))
          }
          setEditingId(null)
          setEditForm({})
        } else {
          toast({ title: 'Error', description: res.error || 'Failed to update plan.', variant: 'destructive' })
        }
      }
    } catch (err: any) {
      toast({ title: 'System Error', description: err.message, variant: 'destructive' })
    } finally {
      setSavingId(null)
    }
  }

  // --- Vendor Methods ---
  const startVendorEdit = (tier: any) => {
    setEditingVendorId(tier.id)
    const isGb = tier.max_storage_mb >= 1024 && tier.max_storage_mb % 1024 === 0
    setEditVendorForm({ 
      ...tier, 
      _storageInput: isGb ? tier.max_storage_mb / 1024 : tier.max_storage_mb,
      _storageUnit: isGb ? 'GB' : 'MB'
    })
  }

  const createNewVendorTier = () => {
    if (vendorTiers.some(p => p.id === 'new')) {
      toast({ title: 'Alert', description: 'Please complete or cancel the new tier first.', variant: 'destructive' })
      return
    }
    const newTierDefault = {
      id: 'new',
      name: 'New Tier',
      price: 0,
      max_storage_mb: 500,
      max_products: 50,
      is_active: true,
      is_featured_tier: false
    }
    setVendorTiers(prev => [...prev, newTierDefault])
    setEditingVendorId('new')
    setEditVendorForm({ ...newTierDefault, _storageInput: 500, _storageUnit: 'MB' })
  }

  const cancelVendorEdit = () => {
    if (editingVendorId === 'new') {
      setVendorTiers(prev => prev.filter(p => p.id !== 'new'))
    }
    setEditingVendorId(null)
    setEditVendorForm({})
  }

  const handleVendorSave = async (tierId: string) => {
    setSavingVendorId(tierId)
    try {
      if (tierId === 'new') {
        const { id, _storageInput, ...newTierData } = editVendorForm as any
        const res = await createVendorTier(newTierData)
        if (res.success && res.data) {
          toast({ title: 'Success', description: 'Vendor tier created successfully.' })
          setVendorTiers(prev => prev.map(p => p.id === 'new' ? res.data : p))
          setEditingVendorId(null)
          setEditVendorForm({})
        } else {
          toast({ title: 'Error', description: res.error || 'Failed to create tier.', variant: 'destructive' })
        }
      } else {
        const { _storageInput, _storageUnit, id, created_at, updated_at, ...updateData } = editVendorForm as any
        const res = await updateVendorTier(tierId, updateData)
        if (res.success && res.data) {
          toast({ title: 'Success', description: 'Vendor tier updated successfully.' })
          setVendorTiers(prev => prev.map(p => p.id === tierId ? res.data : p))
          setEditingVendorId(null)
          setEditVendorForm({})
        } else {
          toast({ title: 'Error', description: res.error || 'Failed to update tier.', variant: 'destructive' })
        }
      }
    } catch (err: any) {
      toast({ title: 'System Error', description: err.message, variant: 'destructive' })
    } finally {
      setSavingVendorId(null)
    }
  }


  // --- Registry Methods ---
  const startRegistryEdit = (item: RegistryItem) => {
    setEditingRegistrySlug(item.slug)
    setRegistryForm({
      contact_fee: Number(item.contact_fee) || 0,
      viewing_fee: 0
    })
  }

  const cancelRegistryEdit = () => {
    setEditingRegistrySlug(null)
  }

  const handleRegistrySave = async (slug: string) => {
    setSavingRegistry(true)
    try {
      const result = await updateRegistryFees(slug, registryForm.contact_fee, 0)
      if (result.success) {
        toast({ title: "Registry Pricing Synced", description: `Fees updated for category: ${slug}` })
        setRegistryItems(prev => prev.map(item => item.slug === slug ? { ...item, contact_fee: registryForm.contact_fee, viewing_fee: 0 } : item))
        setEditingRegistrySlug(null)
      } else {
        toast({ title: "Registry Update Failed", description: result.error, variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, variant: "destructive" })
    } finally {
      setSavingRegistry(false)
    }
  }

  if (loading || agentLoading || vendorLoading || consumerLoading || developerLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Platform Pricing Setup</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Configure system-wide subscriptions and transaction-based fees
          </p>
        </div>
        {activeTab === 'tiers' && (
          <Button 
            onClick={() => createNewPlan('agency')}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Agency Plan
          </Button>
        )}
        {activeTab === 'agent_tiers' && (
          <Button 
            onClick={() => createNewPlan('agent')}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Agent Plan
          </Button>
        )}
        {activeTab === 'consumer_plans' && (
          <Button 
            onClick={() => createNewPlan('consumer')}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Consumer Plan
          </Button>
        )}
        {activeTab === 'vendor_tiers' && (
          <Button 
            onClick={createNewVendorTier}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vendor Tier
          </Button>
        )}
      </div>

      {/* Glassmorphic Tabs Navigation */}
      <div className="flex border-b border-neutral-900 pb-1 gap-8 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold pb-3 border-b-2 transition-all duration-300 whitespace-nowrap ${
            activeTab === 'tiers' 
              ? 'border-white text-white' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Agency Plans
        </button>
        <button
          onClick={() => setActiveTab('agent_tiers')}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold pb-3 border-b-2 transition-all duration-300 whitespace-nowrap ${
            activeTab === 'agent_tiers' 
              ? 'border-white text-white' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Agent Subscriptions
        </button>
        <button
          onClick={() => setActiveTab('consumer_plans')}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold pb-3 border-b-2 transition-all duration-300 whitespace-nowrap ${
            activeTab === 'consumer_plans' 
              ? 'border-white text-white' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Consumer Plans
        </button>
        <button
          onClick={() => setActiveTab('developer_tiers')}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold pb-3 border-b-2 transition-all duration-300 whitespace-nowrap ${
            activeTab === 'developer_tiers' 
              ? 'border-white text-white' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
          Developer API Tiers
        </button>
        <button
          onClick={() => setActiveTab('vendor_tiers')}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold pb-3 border-b-2 transition-all duration-300 whitespace-nowrap ${
            activeTab === 'vendor_tiers' 
              ? 'border-white text-white' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4" />
          Vendor Tiers
        </button>
        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold pb-3 border-b-2 transition-all duration-300 whitespace-nowrap ${
            activeTab === 'registry' 
              ? 'border-white text-white' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Tags className="w-4 h-4" />
          Space Registry Fees
        </button>
      </div>

      {activeTab === 'tiers' ? (
        /* ==================== AGENCY PLANS TAB ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isEditing = editingId === plan.id
            const isSaving = savingId === plan.id

            return (
              <div 
                key={plan.id}
                className={`group relative flex flex-col p-8 border transition-all duration-500 ${
                  isEditing 
                  ? 'bg-neutral-900 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
                  : 'bg-neutral-900/20 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Action Bar */}
                <div className="absolute top-0 left-0 right-0 h-12 border-b border-neutral-800/50 bg-black/40 flex items-center justify-between px-4">
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => moveTier(plans.indexOf(plan), 'left', 'agency')}
                      disabled={plans.indexOf(plan) === 0}
                      className="h-8 w-8 text-neutral-500 hover:text-white rounded-none disabled:opacity-20"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => moveTier(plans.indexOf(plan), 'right', 'agency')}
                      disabled={plans.indexOf(plan) === plans.length - 1}
                      className="h-8 w-8 text-neutral-500 hover:text-white rounded-none disabled:opacity-20"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => toggleRecommended(plan, 'agency')}
                      className={`h-8 w-8 rounded-none transition-colors ${plan.is_recommended ? 'text-amber-400' : 'text-neutral-500 hover:text-white'}`}
                    >
                      <Star className="w-4 h-4" fill={plan.is_recommended ? "currentColor" : "none"} />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => startEdit(plan)}
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                    <div>
                      {plan.is_recommended && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-2 block">
                          Recommended Plan
                        </span>
                      )}
                      <h3 className="text-3xl font-light text-white tracking-tight">{isEditing ? (editForm.name || 'New Plan') : plan.name}</h3>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                        {plan.is_contact_sales ? 'Custom Pricing' : `₦${Number(isEditing ? (editForm.monthly_price || 0) : plan.monthly_price).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 text-sm flex-1">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Plan Name</label>
                        <Input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="space-y-2 flex-1">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Tier Price (₦)</label>
                          <Input
                            type="number"
                            value={editForm.monthly_price || 0}
                            onChange={(e) => setEditForm({ ...editForm, monthly_price: Number(e.target.value) })}
                            disabled={editForm.is_contact_sales || false}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2 h-11 pb-2 sm:pb-3">
                          <input 
                            type="checkbox"
                            id="is_contact_sales"
                            checked={editForm.is_contact_sales || false}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEditForm({ 
                                ...editForm, 
                                is_contact_sales: checked,
                                monthly_price: checked ? 0 : (editForm.monthly_price || 0)
                              })
                            }}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                          <label htmlFor="is_contact_sales" className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold cursor-pointer select-none">
                            Contact for Price
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Storage Limit (GB)</label>
                        <Input
                          type="number"
                          step="any"
                          value={(editForm as any)._storageInput ?? (editForm.storage_limit_mb !== undefined ? editForm.storage_limit_mb / 1000 : 0)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditForm({ 
                              ...editForm, 
                              _storageInput: val,
                              storage_limit_mb: val === '' ? 0 : Math.round(Number(val) * 1000) 
                            } as any)
                          }}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Agent Limit</label>
                        <Input
                          type="number"
                          value={editForm.agent_limit || 0}
                          onChange={(e) => setEditForm({ ...editForm, agent_limit: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Listing Limit</label>
                        <Input
                          type="number"
                          value={editForm.listing_limit || 0}
                          onChange={(e) => setEditForm({ ...editForm, listing_limit: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Featured Listing Allowance</label>
                        <Input
                          type="number"
                          value={editForm.featured_listing_allowance || 0}
                          onChange={(e) => setEditForm({ ...editForm, featured_listing_allowance: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800">
                        <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Product Placement</span>
                        <input 
                          type="checkbox"
                          checked={editForm.has_product_placement || false}
                          onChange={(e) => setEditForm({ ...editForm, has_product_placement: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-3 p-3 bg-neutral-950 border border-neutral-800">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Supported Categories</label>
                        <div className="flex flex-col gap-2">
                          {['apartment', 'event_center', 'public_space'].map(type => (
                            <label key={type} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={(editForm.supported_listing_types || []).includes(type)}
                                onChange={(e) => {
                                  const current = editForm.supported_listing_types || [];
                                  if (e.target.checked) {
                                    setEditForm({ ...editForm, supported_listing_types: [...current, type] });
                                  } else {
                                    setEditForm({ ...editForm, supported_listing_types: current.filter(t => t !== type) });
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              {type === 'apartment' ? 'Apartments' : type === 'event_center' ? 'Public Spaces' : 'Event Centers'}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button onClick={() => handleSave(plan.id, 'agency')} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
                        </Button>
                        <Button onClick={() => cancelEdit('agency')} disabled={isSaving} variant="outline" className="border-neutral-800 text-neutral-400 hover:bg-neutral-800 rounded-none">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-none">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><HardDrive className="w-3.5 h-3.5"/> Storage</span>
                          <span className="text-neutral-300 font-bold">{plan.storage_limit_mb < 1000 ? `${plan.storage_limit_mb} MB` : `${plan.storage_limit_mb / 1000} GB`}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> Agents</span>
                          <span className="text-neutral-300 font-bold">{plan.agent_limit}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5"/> Listings</span>
                          <span className="text-neutral-300 font-bold">{plan.listing_limit}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-neutral-900 pt-2">
                          <span className="text-neutral-500">Product Placement</span>
                          <span className={plan.has_product_placement ? 'text-emerald-400 font-bold' : 'text-neutral-600'}>
                            {plan.has_product_placement ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Featured Listings</span>
                          <span className="text-neutral-300 font-bold">{plan.featured_listing_allowance}</span>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-neutral-900 pt-2">
                          <span className="text-neutral-500 text-xs">Supported Categories</span>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.supported_listing_types?.map(t => (
                              <span key={t} className="text-[9px] uppercase tracking-wider bg-neutral-900 text-neutral-300 px-2 py-1">
                                {t.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`} />
                      <span className="text-[9px] uppercase tracking-widest font-bold text-neutral-500">
                        {plan.is_active ? 'Production Ready' : 'Development'}
                      </span>
                    </div>
                    <span className="text-[9px] text-neutral-600 font-mono">ID: {plan.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : activeTab === 'agent_tiers' ? (
        /* ==================== AGENT PLANS TAB ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
          {agentPlans.map((plan) => {
            const isEditing = editingId === plan.id
            const isSaving = savingId === plan.id

            return (
              <div 
                key={plan.id}
                className={`group relative flex flex-col p-8 border transition-all duration-500 ${
                  isEditing 
                  ? 'bg-neutral-900 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
                  : 'bg-neutral-900/20 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Action Bar */}
                <div className="absolute top-0 left-0 right-0 h-12 border-b border-neutral-800/50 bg-black/40 flex items-center justify-between px-4">
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => moveTier(agentPlans.indexOf(plan), 'left', 'agent')}
                      disabled={agentPlans.indexOf(plan) === 0}
                      className="h-8 w-8 text-neutral-500 hover:text-white rounded-none disabled:opacity-20"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => moveTier(agentPlans.indexOf(plan), 'right', 'agent')}
                      disabled={agentPlans.indexOf(plan) === agentPlans.length - 1}
                      className="h-8 w-8 text-neutral-500 hover:text-white rounded-none disabled:opacity-20"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => toggleRecommended(plan, 'agent')}
                      className={`h-8 w-8 rounded-none transition-colors ${plan.is_recommended ? 'text-amber-400' : 'text-neutral-500 hover:text-white'}`}
                    >
                      <Star className="w-4 h-4" fill={plan.is_recommended ? "currentColor" : "none"} />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => startEdit(plan)}
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                    <div>
                      {plan.is_recommended && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-2 block">
                          Recommended Plan
                        </span>
                      )}
                      <h3 className="text-3xl font-light text-white tracking-tight">{isEditing ? (editForm.name || 'New Plan') : plan.name}</h3>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                        {plan.is_contact_sales ? 'Custom Pricing' : `₦${Number(isEditing ? (editForm.monthly_price || 0) : plan.monthly_price).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 text-sm flex-1">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Plan Name</label>
                        <Input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="space-y-2 flex-1">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Tier Price (₦)</label>
                          <Input
                            type="number"
                            value={editForm.monthly_price || 0}
                            onChange={(e) => setEditForm({ ...editForm, monthly_price: Number(e.target.value) })}
                            disabled={editForm.is_contact_sales || false}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2 h-11 pb-2 sm:pb-3">
                          <input 
                            type="checkbox"
                            id="is_contact_sales"
                            checked={editForm.is_contact_sales || false}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEditForm({ 
                                ...editForm, 
                                is_contact_sales: checked,
                                monthly_price: checked ? 0 : (editForm.monthly_price || 0)
                              })
                            }}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                          <label htmlFor="is_contact_sales" className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold cursor-pointer select-none">
                            Contact for Price
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Storage Limit (GB)</label>
                        <Input
                          type="number"
                          step="any"
                          value={(editForm as any)._storageInput ?? (editForm.storage_limit_mb !== undefined ? editForm.storage_limit_mb / 1000 : 0)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditForm({ 
                              ...editForm, 
                              _storageInput: val,
                              storage_limit_mb: val === '' ? 0 : Math.round(Number(val) * 1000) 
                            } as any)
                          }}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Agent Limit</label>
                        <Input
                          type="number"
                          value={editForm.agent_limit || 0}
                          onChange={(e) => setEditForm({ ...editForm, agent_limit: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Listing Limit</label>
                        <Input
                          type="number"
                          value={editForm.listing_limit || 0}
                          onChange={(e) => setEditForm({ ...editForm, listing_limit: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Featured Listing Allowance</label>
                        <Input
                          type="number"
                          value={editForm.featured_listing_allowance || 0}
                          onChange={(e) => setEditForm({ ...editForm, featured_listing_allowance: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800">
                        <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Product Placement</span>
                        <input 
                          type="checkbox"
                          checked={editForm.has_product_placement || false}
                          onChange={(e) => setEditForm({ ...editForm, has_product_placement: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-3 p-3 bg-neutral-950 border border-neutral-800">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Supported Categories</label>
                        <div className="flex flex-col gap-2">
                          {['apartment', 'event_center', 'public_space'].map(type => (
                            <label key={type} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={(editForm.supported_listing_types || []).includes(type)}
                                onChange={(e) => {
                                  const current = editForm.supported_listing_types || [];
                                  if (e.target.checked) {
                                    setEditForm({ ...editForm, supported_listing_types: [...current, type] });
                                  } else {
                                    setEditForm({ ...editForm, supported_listing_types: current.filter(t => t !== type) });
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              {type === 'apartment' ? 'Apartments' : type === 'event_center' ? 'Public Spaces' : 'Event Centers'}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button onClick={() => handleSave(plan.id, 'agent')} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
                        </Button>
                        <Button onClick={() => cancelEdit('agent')} disabled={isSaving} variant="outline" className="border-neutral-800 text-neutral-400 hover:bg-neutral-800 rounded-none">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-none">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><HardDrive className="w-3.5 h-3.5"/> Storage</span>
                          <span className="text-neutral-300 font-bold">{plan.storage_limit_mb < 1000 ? `${plan.storage_limit_mb} MB` : `${plan.storage_limit_mb / 1000} GB`}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> Agents</span>
                          <span className="text-neutral-300 font-bold">{plan.agent_limit}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5"/> Listings</span>
                          <span className="text-neutral-300 font-bold">{plan.listing_limit}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-neutral-900 pt-2">
                          <span className="text-neutral-500">Product Placement</span>
                          <span className={plan.has_product_placement ? 'text-emerald-400 font-bold' : 'text-neutral-600'}>
                            {plan.has_product_placement ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Featured Listings</span>
                          <span className="text-neutral-300 font-bold">{plan.featured_listing_allowance}</span>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-neutral-900 pt-2">
                          <span className="text-neutral-500 text-xs">Supported Categories</span>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.supported_listing_types?.map(t => (
                              <span key={t} className="text-[9px] uppercase tracking-wider bg-neutral-900 text-neutral-300 px-2 py-1">
                                {t.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`} />
                      <span className="text-[9px] uppercase tracking-widest font-bold text-neutral-500">
                        {plan.is_active ? 'Production Ready' : 'Development'}
                      </span>
                    </div>
                    <span className="text-[9px] text-neutral-600 font-mono">ID: {plan.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : activeTab === 'vendor_tiers' ? (
        /* ==================== VENDOR TIERS TAB ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
          {vendorTiers.map((tier) => {
            const isEditing = editingVendorId === tier.id
            const isSaving = savingVendorId === tier.id

            return (
              <div 
                key={tier.id}
                className={`group relative flex flex-col p-8 border transition-all duration-500 ${
                  isEditing 
                  ? 'bg-neutral-900 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
                  : 'bg-neutral-900/20 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-12 border-b border-neutral-800/50 bg-black/40 flex items-center justify-end px-4">
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => startVendorEdit(tier)}
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                    <div>
                      {tier.is_featured_tier && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-400 mb-2 block flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" /> Featured Placements
                        </span>
                      )}
                      <h3 className="text-3xl font-light text-white tracking-tight">{isEditing ? (editVendorForm.name || 'New Tier') : tier.name}</h3>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                        ₦{Number(isEditing ? (editVendorForm.price || 0) : tier.price).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 text-sm flex-1">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Tier Name</label>
                        <Input
                          type="text"
                          value={editVendorForm.name || ''}
                          onChange={(e) => setEditVendorForm({ ...editVendorForm, name: e.target.value })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2 flex-1">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Price (₦)</label>
                        <Input
                          type="number"
                          value={editVendorForm.price || 0}
                          onChange={(e) => setEditVendorForm({ ...editVendorForm, price: Number(e.target.value) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                        
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Storage Limit</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editVendorForm._storageInput || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setEditVendorForm({ 
                                ...editVendorForm, 
                                _storageInput: val,
                                max_storage_mb: editVendorForm._storageUnit === 'GB' ? val * 1024 : val
                              })
                            }}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm flex-1"
                          />
                          <select
                            value={editVendorForm._storageUnit || 'MB'}
                            onChange={(e) => {
                              const unit = e.target.value as 'MB' | 'GB'
                              const val = editVendorForm._storageInput || 0
                              setEditVendorForm({
                                ...editVendorForm,
                                _storageUnit: unit,
                                max_storage_mb: unit === 'GB' ? val * 1024 : val
                              })
                            }}
                            className="bg-black border border-neutral-800 rounded-none h-11 px-3 text-white text-sm focus:outline-none"
                          >
                            <option value="MB">MB</option>
                            <option value="GB">GB</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Max Products</label>
                        <Input
                          type="number"
                          value={editVendorForm.max_products || 0}
                          onChange={(e) => setEditVendorForm({ ...editVendorForm, max_products: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800">
                        <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Active Status</span>
                        <input 
                          type="checkbox"
                          checked={editVendorForm.is_active || false}
                          onChange={(e) => setEditVendorForm({ ...editVendorForm, is_active: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800">
                        <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Featured Tier (Allows Featured Placements)</span>
                        <input 
                          type="checkbox"
                          checked={editVendorForm.is_featured_tier || false}
                          onChange={(e) => setEditVendorForm({ ...editVendorForm, is_featured_tier: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button onClick={() => handleVendorSave(tier.id)} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
                        </Button>
                        <Button onClick={cancelVendorEdit} disabled={isSaving} variant="outline" className="border-neutral-800 text-neutral-400 hover:bg-neutral-800 rounded-none">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-none">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><HardDrive className="w-3.5 h-3.5"/> Storage Limit</span>
                          <span className="text-neutral-300 font-bold">{tier.max_storage_mb >= 1024 && tier.max_storage_mb % 1024 === 0 ? `${tier.max_storage_mb / 1024} GB` : `${tier.max_storage_mb} MB`}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><Box className="w-3.5 h-3.5"/> Products</span>
                          <span className="text-neutral-300 font-bold">{tier.max_products}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-neutral-900 pt-2">
                          <span className="text-neutral-500">Featured Tier Status</span>
                          <span className={tier.is_featured_tier ? 'text-emerald-400 font-bold' : 'text-neutral-600'}>
                            {tier.is_featured_tier ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${tier.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`} />
                      <span className="text-[9px] uppercase tracking-widest font-bold text-neutral-500">
                        {tier.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <span className="text-[9px] text-neutral-600 font-mono">ID: {tier.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : activeTab === 'consumer_plans' ? (
        /* ==================== CONSUMER PLANS TAB ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
          {consumerPlans.map((plan) => {
            const isEditing = editingId === plan.id
            const isSaving = savingId === plan.id

            return (
              <div 
                key={plan.id}
                className={`group relative flex flex-col p-8 border transition-all duration-500 ${
                  isEditing 
                  ? 'bg-neutral-900 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
                  : 'bg-neutral-900/20 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Action Bar */}
                <div className="absolute top-0 left-0 right-0 h-12 border-b border-neutral-800/50 bg-black/40 flex items-center justify-between px-4">
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => moveTier(consumerPlans.indexOf(plan), 'left', 'consumer')}
                      disabled={consumerPlans.indexOf(plan) === 0}
                      className="h-8 w-8 text-neutral-500 hover:text-white rounded-none disabled:opacity-20"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => moveTier(consumerPlans.indexOf(plan), 'right', 'consumer')}
                      disabled={consumerPlans.indexOf(plan) === consumerPlans.length - 1}
                      className="h-8 w-8 text-neutral-500 hover:text-white rounded-none disabled:opacity-20"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => toggleRecommended(plan, 'consumer')}
                      className={`h-8 w-8 rounded-none transition-colors ${plan.is_recommended ? 'text-amber-400' : 'text-neutral-500 hover:text-white'}`}
                    >
                      <Star className="w-4 h-4" fill={plan.is_recommended ? "currentColor" : "none"} />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => startEdit(plan)}
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                    <div>
                      {plan.is_recommended && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-2 block">
                          Recommended Plan
                        </span>
                      )}
                      <h3 className="text-3xl font-light text-white tracking-tight">{isEditing ? (editForm.name || 'New Plan') : plan.name}</h3>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                        {plan.is_contact_sales ? 'Custom Pricing' : `₦${Number(isEditing ? (editForm.monthly_price || 0) : plan.monthly_price).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 text-sm flex-1">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Plan Name</label>
                        <Input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="space-y-2 flex-1">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Tier Price (₦)</label>
                          <Input
                            type="number"
                            value={editForm.monthly_price || 0}
                            onChange={(e) => setEditForm({ ...editForm, monthly_price: Number(e.target.value) })}
                            disabled={editForm.is_contact_sales || false}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2 h-11 pb-2 sm:pb-3">
                          <input 
                            type="checkbox"
                            id="is_contact_sales"
                            checked={editForm.is_contact_sales || false}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEditForm({ 
                                ...editForm, 
                                is_contact_sales: checked,
                                monthly_price: checked ? 0 : (editForm.monthly_price || 0)
                              })
                            }}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                          <label htmlFor="is_contact_sales" className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold cursor-pointer select-none">
                            Contact for Price
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Storage Limit (MB)</label>
                        <Input
                          type="number"
                          value={editForm.storage_limit_mb !== undefined ? editForm.storage_limit_mb : 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm({ 
                              ...editForm, 
                              storage_limit_mb: val 
                            })
                          }}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Uploads Limit (Number of Products)</label>
                        <Input
                          type="number"
                          value={editForm.listing_limit || 0}
                          onChange={(e) => setEditForm({ ...editForm, listing_limit: Math.round(Number(e.target.value)) })}
                          className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button onClick={() => handleSave(plan.id, 'consumer')} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase tracking-wider text-xs rounded-none">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
                        </Button>
                        <Button onClick={() => cancelEdit('consumer')} disabled={isSaving} variant="outline" className="border-neutral-800 text-neutral-400 hover:bg-neutral-800 rounded-none">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-none">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-2"><HardDrive className="w-3.5 h-3.5"/> Storage Limit</span>
                          <span className="text-neutral-300 font-bold">{plan.storage_limit_mb < 1000 ? `${plan.storage_limit_mb} MB` : `${plan.storage_limit_mb / 1024} GB`}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-neutral-900 pt-2">
                          <span className="text-neutral-500 flex items-center gap-2"><Box className="w-3.5 h-3.5"/> Uploads (Products) Limit</span>
                          <span className="text-neutral-300 font-bold">{plan.listing_limit} products</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`} />
                      <span className="text-[9px] uppercase tracking-widest font-bold text-neutral-500">
                        {plan.is_active ? 'Production Ready' : 'Development'}
                      </span>
                    </div>
                    <span className="text-[9px] text-neutral-600 font-mono">ID: {plan.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : activeTab === 'developer_tiers' ? (
        /* ==================== DEVELOPER TIERS TAB ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {developerTiers.map((tier) => {
            const isEditing = editingDeveloperId === tier.id
            const isSaving = savingDeveloperId === tier.id

            return (
              <div 
                key={tier.id}
                className={`bg-neutral-900/20 border transition-all duration-300 p-8 flex flex-col justify-between relative ${
                  isEditing ? 'border-white bg-neutral-900 shadow-[0_0_40px_rgba(255,255,255,0.03)]' : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Border Glow for Growth recommended */}
                {tier.name === 'Growth' && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />
                )}

                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      {tier.name === 'Growth' && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-pulse" /> Platform Recommended
                        </span>
                      )}
                      <h3 className="text-2xl font-light text-white tracking-tight">{tier.name} Tier</h3>
                    </div>

                    {!isEditing && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startDeveloperEdit(tier)}
                        className="h-8 w-8 text-neutral-400 hover:text-white rounded-none border border-neutral-800/40"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="border-t border-neutral-800/60 pt-6 space-y-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-neutral-600" /> Base Monthly Price (₦)
                          </label>
                          <Input
                            type="number"
                            value={editDeveloperForm.base_monthly_price}
                            onChange={(e) => setEditDeveloperForm(prev => ({ ...prev, base_monthly_price: Number(e.target.value) }))}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                            min={0}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold flex items-center gap-1">
                            <BarChart2 className="w-3.5 h-3.5 text-neutral-600" /> Included Calls
                          </label>
                          <Input
                            type="number"
                            value={editDeveloperForm.included_calls}
                            onChange={(e) => setEditDeveloperForm(prev => ({ ...prev, included_calls: Number(e.target.value) }))}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                            min={0}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-neutral-600" /> Overage Call Fee (₦)
                          </label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={editDeveloperForm.overage_call_fee}
                            onChange={(e) => setEditDeveloperForm(prev => ({ ...prev, overage_call_fee: Number(e.target.value) }))}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                            min={0}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleSaveDeveloperConfig(tier.id)}
                            disabled={isSaving}
                            className="flex-1 bg-white text-black hover:bg-neutral-200 h-10 rounded-none text-xs uppercase tracking-wider font-bold"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" /> Save Config
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={cancelDeveloperEdit}
                            disabled={isSaving}
                            variant="outline"
                            className="border-neutral-800 hover:bg-neutral-900 h-10 rounded-none text-xs uppercase tracking-wider text-neutral-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 text-sm">
                        <div className="flex items-baseline text-white">
                          <span className="text-4xl font-light tracking-tight">₦{Number(tier.base_monthly_price).toLocaleString()}</span>
                          <span className="ml-2 text-[10px] text-neutral-500 uppercase tracking-widest">/ month</span>
                        </div>

                        <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-none">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500">API Calls Cap</span>
                            <span className="text-neutral-300 font-bold">{Number(tier.included_calls).toLocaleString()} /mo</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-neutral-950 pt-2">
                            <span className="text-neutral-500">Overage Call Fee</span>
                            <span className="text-emerald-400 font-bold">₦{Number(tier.overage_call_fee).toFixed(4)} ea</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-800/40 mt-6 pt-4 text-[9px] text-neutral-600 font-mono flex justify-between">
                  <span>Architecture Verified</span>
                  <span>ID: {tier.id.slice(0, 8)}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ==================== SPACE REGISTRY FEES TAB ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {registryLoading ? (
            <div className="col-span-full py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
          ) : registryItems.length === 0 ? (
            <div className="col-span-full py-24 text-center border border-dashed border-neutral-800 text-neutral-500">
              No space types registered.
            </div>
          ) : (
            registryItems.map((item) => {
              const isEditing = editingRegistrySlug === item.slug
              return (
                <div 
                  key={item.id}
                  className={`bg-neutral-900/20 border transition-all duration-300 p-8 flex flex-col justify-between relative ${
                    isEditing ? 'border-white bg-neutral-900' : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold font-mono">
                          slug: {item.slug}
                        </span>
                        <h3 className="text-xl font-light text-white tracking-tight mt-1">{item.name}</h3>
                      </div>
                      
                      {!isEditing && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startRegistryEdit(item)}
                          className="h-8 w-8 text-neutral-400 hover:text-white rounded-none border border-neutral-800/40"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-neutral-800/50 pt-6 space-y-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Contact Agent Fee (₦)
                            </label>
                            <Input
                              type="number"
                              value={registryForm.contact_fee}
                              onChange={(e) => setRegistryForm(prev => ({ ...prev, contact_fee: Number(e.target.value) }))}
                              className="bg-black border-neutral-800 rounded-none h-11 text-white"
                              min={0}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={() => handleRegistrySave(item.slug)}
                              disabled={savingRegistry}
                              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-none text-xs uppercase tracking-wider font-bold"
                            >
                              {savingRegistry ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" /> Save Fee
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={cancelRegistryEdit}
                              disabled={savingRegistry}
                              variant="outline"
                              className="border-neutral-800 hover:bg-neutral-900 h-10 rounded-none text-xs uppercase tracking-wider text-neutral-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>
                            <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Contact Fee</span>
                            <p className="text-lg font-medium text-white mt-1">
                              {Number(item.contact_fee) > 0 ? `₦${Number(item.contact_fee).toLocaleString()}` : 'Free'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-neutral-800/40 mt-6 pt-4 text-[9px] text-neutral-500 font-mono flex justify-between">
                    <span>Registered Type</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <div className="flex justify-center pt-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 font-bold animate-pulse italic">
          Changes are synced in real-time to the public platform
        </p>
      </div>
    </div>
  )
}
