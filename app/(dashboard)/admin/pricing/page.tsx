'use client'

import { useState, useEffect } from 'react'
import { getBillingTiers, updateBillingTierConfig, BillingTier } from '@/app/actions/api-key-actions'
import { Settings, Pencil, Save, X, Loader2, DollarSign, BarChart2, ShieldCheck, Sparkles, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function AdminApiPricingPage() {
  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    base_monthly_price: 0,
    included_calls: 0,
    overage_call_fee: 0
  })

  useEffect(() => {
    loadTiers()
  }, [])

  async function loadTiers() {
    setLoading(true)
    try {
      const res = await getBillingTiers()
      if (res.success && res.data) {
        setTiers(res.data)
      } else {
        toast.error(res.error || 'Failed to load billing configurations.')
      }
    } catch (err) {
      toast.error('Network error loading pricing architectures.')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (tier: BillingTier) => {
    setEditingId(tier.id)
    setEditForm({
      base_monthly_price: Number(tier.base_monthly_price),
      included_calls: Number(tier.included_calls),
      overage_call_fee: Number(tier.overage_call_fee)
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleSaveConfig = async (tierId: string) => {
    setSavingId(tierId)
    try {
      const res = await updateBillingTierConfig(tierId, editForm)
      if (res.success) {
        toast.success('Billing configurations updated successfully.')
        setTiers(prev => prev.map(t => t.id === tierId ? { ...t, ...editForm } : t))
        setEditingId(null)
      } else {
        toast.error(res.error || 'Failed to save configuration.')
      }
    } catch (err) {
      toast.error('Failed to communicate pricing updates.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Platform Pricing Setup
          </h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Configure dynamic API billing tiers, baseline call quotas, and overage rates
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {tiers.map((tier) => {
            const isEditing = editingId === tier.id
            const isSaving = savingId === tier.id

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
                        onClick={() => startEdit(tier)}
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
                            <DollarSign className="w-3.5 h-3.5 text-neutral-600" /> Base Monthly Price ($)
                          </label>
                          <Input
                            type="number"
                            value={editForm.base_monthly_price}
                            onChange={(e) => setEditForm(prev => ({ ...prev, base_monthly_price: Number(e.target.value) }))}
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
                            value={editForm.included_calls}
                            onChange={(e) => setEditForm(prev => ({ ...prev, included_calls: Number(e.target.value) }))}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                            min={0}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-neutral-600" /> Overage Call Fee ($)
                          </label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={editForm.overage_call_fee}
                            onChange={(e) => setEditForm(prev => ({ ...prev, overage_call_fee: Number(e.target.value) }))}
                            className="bg-black border-neutral-800 rounded-none h-11 text-white text-sm"
                            min={0}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleSaveConfig(tier.id)}
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
                            onClick={cancelEdit}
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
                          <span className="text-4xl font-light tracking-tight">${Number(tier.base_monthly_price).toFixed(2)}</span>
                          <span className="ml-2 text-[10px] text-neutral-500 uppercase tracking-widest">/ month</span>
                        </div>

                        <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-none">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500">API Calls Cap</span>
                            <span className="text-neutral-300 font-bold">{Number(tier.included_calls).toLocaleString()} /mo</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-neutral-950 pt-2">
                            <span className="text-neutral-500">Overage Call Fee</span>
                            <span className="text-emerald-400 font-bold">${Number(tier.overage_call_fee).toFixed(4)} ea</span>
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
      )}

      {/* Safety Notice */}
      <div className="bg-neutral-950 border border-neutral-900 p-8 flex items-start gap-6 max-w-4xl">
        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-neutral-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-white uppercase tracking-wider">Dynamic Gating Middleware Notice</h4>
          <p className="text-xs text-neutral-600 leading-relaxed font-light">
            Limits updated here propagate across the `/embed` and `/api/v1/embed/meter` routing verification triggers instantly. Active keys exceeding updated counts will be dynamically rate-limited with an HTTP 429 status code.
          </p>
        </div>
      </div>

    </div>
  )
}
