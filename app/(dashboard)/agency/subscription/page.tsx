'use client'

import { useState, useEffect, Suspense } from 'react'
import { getAgencySubscriptionUsage, getSubscriptionPlans, initializePlanUpgrade, getAgencyBillingHistory, SubscriptionPlan, verifyPlanUpgrade } from '@/app/actions/subscription-actions'
import { Layers, HardDrive, Users, CheckSquare, Loader2, ArrowRight, CreditCard, Sparkles, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

function AgencySubscriptionContent() {
  const [usageData, setUsageData] = useState<any>(null)
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upgradingId, setUpgradingId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const success = searchParams.get('upgrade_success')
    const txId = searchParams.get('tx_id')
    if (success === 'true' && txId) {
      const verify = async () => {
        const res = await verifyPlanUpgrade(txId)
        if (res.success) {
          toast.success('Upgrade completed successfully!')
        } else {
          toast.error(res.error || 'Failed to verify upgrade.')
        }
        router.replace('/agency/subscription')
        loadData()
      }
      verify()
    }
  }, [searchParams, router])

  async function loadData() {
    setLoading(true)
    const [usageRes, plansRes, historyRes] = await Promise.all([
      getAgencySubscriptionUsage(),
      getSubscriptionPlans(),
      getAgencyBillingHistory()
    ])

    if (usageRes.success) setUsageData(usageRes.data)
    if (plansRes.success) setAllPlans(plansRes.data || [])
    if (historyRes.success) setHistory(historyRes.data || [])

    setLoading(false)
  }

  const handleUpgrade = async (planId: string) => {
    setUpgradingId(planId)
    const res = await initializePlanUpgrade(planId)
    if (res.success) {
      if (res.instant) {
        toast.success('Plan upgraded instantly!')
        await loadData()
      } else if (res.authorization_url) {
        toast.success('Redirecting to secure gateway...')
        window.location.href = res.authorization_url
      }
    } else {
      toast.error(res.error || 'Failed to initialize upgrade.')
    }
    setUpgradingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  if (!usageData) {
    return (
      <div className="p-10 text-center text-neutral-400">
        Failed to load subscription data.
      </div>
    )
  }

  const currentPlan = usageData.plan as SubscriptionPlan
  const usage = usageData.usage
  
  // Calculate percentages
  const storagePercent = Math.min(100, Math.round((usage.storageBytes / (1000*1000)) / currentPlan.storage_limit_mb * 100))
  const agentsPercent = Math.min(100, Math.round((usage.agents / currentPlan.agent_limit) * 100))
  const listingsPercent = Math.min(100, Math.round((usage.listings / currentPlan.listing_limit) * 100))

  const availableUpgrades = allPlans.filter(p => p.is_active && p.display_order > currentPlan.display_order)

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Agency Subscription
          </h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Manage your agency plan, view usage metrics, and upgrade to unlock more features.
          </p>
        </div>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-neutral-900/40 border border-neutral-800 p-8 space-y-6">
          <div>
            <h2 className="text-xs text-neutral-500 uppercase tracking-widest font-bold mb-1">Current Plan</h2>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-light tracking-tight text-white">{currentPlan.name}</span>
              {usageData.subscription.status === 'active' && (
                <span className="mb-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase tracking-wider font-bold border border-emerald-500/20">Active</span>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-neutral-800 space-y-6">
            {/* Storage Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                <span className="text-neutral-400 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5"/> Storage</span>
                <span className="text-neutral-200">{(usage.storageBytes / (1000*1000*1000)).toFixed(2)} GB / {currentPlan.storage_limit_mb < 1000 ? `${currentPlan.storage_limit_mb} MB` : `${currentPlan.storage_limit_mb / 1000} GB`}</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${storagePercent}%` }} />
              </div>
            </div>

            {/* Agents Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                <span className="text-neutral-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> Agents</span>
                <span className="text-neutral-200">{usage.agents} / {currentPlan.agent_limit}</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${agentsPercent}%` }} />
              </div>
            </div>

            {/* Listings Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                <span className="text-neutral-400 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5"/> Listings</span>
                <span className="text-neutral-200">{usage.listings} / {currentPlan.listing_limit}</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${listingsPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Available Upgrades</h2>
          {availableUpgrades.length === 0 ? (
            <div className="p-8 border border-neutral-800 bg-neutral-900/20 text-center">
              <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <p className="text-neutral-300 text-sm">You are on the highest available tier.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableUpgrades.map(plan => (
                <div key={plan.id} className="border border-neutral-800 hover:border-emerald-500/50 bg-neutral-900/20 transition-all p-8 flex flex-col relative group">
                  {plan.display_order === 2 && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-2xl font-light text-white">{plan.name}</h3>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                      {plan.is_contact_sales ? 'Custom Pricing' : 'One-Time Payment'}
                    </p>
                  </div>

                  <div className="space-y-3 flex-1 mb-8">
                    <div className="flex justify-between text-xs border-b border-neutral-800/50 pb-2">
                      <span className="text-neutral-500">Storage</span>
                      <span className="text-white font-bold">{plan.storage_limit_mb < 1000 ? `${plan.storage_limit_mb} MB` : `${plan.storage_limit_mb / 1000} GB`}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-neutral-800/50 pb-2">
                      <span className="text-neutral-500">Agents</span>
                      <span className="text-white font-bold">{plan.agent_limit}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-neutral-800/50 pb-2">
                      <span className="text-neutral-500">Listings</span>
                      <span className="text-white font-bold">{plan.listing_limit}</span>
                    </div>
                    {plan.has_product_placement && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold pt-2">
                        <CheckSquare className="w-3.5 h-3.5" /> Product Placement Enabled
                      </div>
                    )}
                  </div>

                  {plan.is_contact_sales ? (
                    <Button 
                      variant="outline" 
                      className="w-full bg-transparent border-white text-white hover:bg-white hover:text-black rounded-none h-11 text-xs uppercase tracking-widest font-bold"
                      onClick={() => window.location.href = 'mailto:sales@housepadi.example'}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Tier Price</span>
                        <span className="text-lg font-light text-emerald-400">₦{Number(plan.monthly_price).toLocaleString()}</span>
                      </div>
                      <Button 
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgradingId === plan.id}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black rounded-none h-11 text-xs uppercase tracking-widest font-bold"
                      >
                        {upgradingId === plan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Upgrade Plan <ArrowRight className="w-4 h-4 ml-2" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="space-y-6 pt-6 border-t border-neutral-800">
        <h2 className="text-xs text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2">
          <Receipt className="w-4 h-4" /> Billing History
        </h2>
        
        {history.length === 0 ? (
          <div className="p-8 border border-neutral-800 border-dashed text-center text-neutral-500 text-sm">
            No past transactions found.
          </div>
        ) : (
          <div className="border border-neutral-800 bg-neutral-900/20 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-500">
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {history.map((tx) => (
                  <tr key={tx.id} className="text-neutral-300">
                    <td className="px-6 py-4">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {tx.previous_plan ? `${(tx.previous_plan as any).name} → ` : 'Initial '}{(tx.new_plan as any)?.name}
                    </td>
                    <td className="px-6 py-4">₦{Number(tx.amount_paid).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[9px] uppercase tracking-wider font-bold border ${
                        tx.status === 'SUCCESSFUL' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                        tx.status === 'FAILED' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                        'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 font-mono text-[10px]">{tx.paystack_reference || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

export default function AgencySubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    }>
      <AgencySubscriptionContent />
    </Suspense>
  )
}
