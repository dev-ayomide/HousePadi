'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, RefreshCw, Building2, Mail, Phone, Loader2, KeyRound, ShieldCheck, UserPlus, ListOrdered, Copy, Check, Globe, HardDrive } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { onboardAgency } from '@/app/actions/onboard-agency'

interface Plan {
  id: string
  name: string
  is_contact_sales: boolean
}

export function OnboardAgencyModal({ plans, onSuccess }: { plans: Plan[], onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Generate a random secure password
  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const all = uppercase + lowercase + numbers
    
    let pass = ''
    pass += uppercase[Math.floor(Math.random() * uppercase.length)]
    pass += lowercase[Math.floor(Math.random() * lowercase.length)]
    pass += numbers[Math.floor(Math.random() * numbers.length)]
    
    for (let i = 0; i < 7; i++) {
      pass += all[Math.floor(Math.random() * all.length)]
    }
    
    const finalPass = pass.split('').sort(() => 0.5 - Math.random()).join('')
    setPassword(finalPass)
    setCopied(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    toast({
      title: "Copied",
      description: "Access key copied to clipboard.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (open) {
      generatePassword()
      if (plans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plans[0].id)
      }
    }
  }, [open, plans, selectedPlanId])

  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const isEnterprise = selectedPlan?.is_contact_sales

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.append('password', password)

    const result = await onboardAgency(formData)

    if (result.success) {
      toast({
        title: "Agency Onboarded Successfully",
        description: "The platform infrastructure has been provisioned.",
      })
      setOpen(false)
      if (onSuccess) onSuccess()
    } else {
      toast({
        title: "Onboarding Failed",
        description: result.error,
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Onboard Agency
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] bg-[#050505]/95 backdrop-blur-2xl border border-neutral-800 p-0 rounded-none overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-8 border-b border-neutral-800 bg-black/40">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-neutral-400" />
                Agency Provisioning
              </DialogTitle>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 mt-2">
                Operational Control & Infrastructure Setup
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Primary Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                Agency Identity
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input 
                  name="name" 
                  required 
                  placeholder="Legal Organization Name" 
                  className="pl-10 h-12 bg-black border-neutral-800 rounded-none focus-visible:ring-1 focus-visible:ring-white/20 text-white placeholder:text-neutral-700 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                Primary Contact
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="admin@agency.com" 
                  className="pl-10 h-12 bg-black border-neutral-800 rounded-none focus-visible:ring-1 focus-visible:ring-white/20 text-white placeholder:text-neutral-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Secondary Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input 
                  name="phone" 
                  type="tel" 
                  placeholder="+X XXX XXX XXXX" 
                  className="pl-10 h-12 bg-black border-neutral-800 rounded-none focus-visible:ring-1 focus-visible:ring-white/20 text-white placeholder:text-neutral-700 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                Digital Presence
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input 
                  name="website_url" 
                  type="url" 
                  placeholder="https://agency-website.com" 
                  className="pl-10 h-12 bg-black border-neutral-800 rounded-none focus-visible:ring-1 focus-visible:ring-white/20 text-white placeholder:text-neutral-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SLA Info */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Service Level Agreement
            </label>
            <select 
              name="tierId" 
              required
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full h-12 px-3 bg-black border border-neutral-800 rounded-none focus:outline-none focus:ring-1 focus:ring-white/20 text-white text-xs uppercase tracking-widest appearance-none cursor-pointer"
            >
              {plans.length > 0 ? (
                plans.map(plan => (
                  <option key={plan.id} value={plan.id} className="bg-black py-2">
                    {plan.name}
                  </option>
                ))
              ) : (
                <option disabled>Loading Plans...</option>
              )}
            </select>
          </div>

          {/* Enterprise Customization */}
          {isEnterprise && (
            <div className="p-6 border border-neutral-800 bg-white/[0.02] space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">Custom Enterprise Parameters</p>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                    <ListOrdered className="w-3 h-3" /> Listing Limit
                  </label>
                  <Input 
                    name="custom_listing_limit" 
                    type="number" 
                    defaultValue={100}
                    className="h-10 bg-black border-neutral-800 rounded-none text-white text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                    <UserPlus className="w-3 h-3" /> Agent Limit
                  </label>
                  <Input 
                    name="custom_agent_limit" 
                    type="number" 
                    defaultValue={20}
                    className="h-10 bg-black border-neutral-800 rounded-none text-white text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                    <HardDrive className="w-3 h-3" /> Storage (GB)
                  </label>
                  <Input 
                    name="custom_storage_limit_gb" 
                    type="number" 
                    defaultValue={50}
                    className="h-10 bg-black border-neutral-800 rounded-none text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Key */}
          <div className="space-y-3 pt-6 border-t border-neutral-800">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 flex items-center justify-between">
              Auto-Generated Access Key
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-neutral-600 hover:text-white flex items-center gap-1 transition-colors text-[9px] uppercase tracking-widest"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            </label>
            <div className="relative group flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
                <Input 
                  value={password}
                  readOnly
                  className="pl-10 h-14 bg-neutral-900/30 border-neutral-800 rounded-none text-white font-mono tracking-[0.3em] text-xl text-center"
                />
              </div>
              <Button 
                type="button"
                onClick={copyToClipboard}
                className="h-14 w-14 bg-neutral-800 hover:bg-neutral-700 rounded-none border border-neutral-700 flex items-center justify-center transition-all"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-white" />}
              </Button>
            </div>
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest text-center">
              This key will be transmitted via encrypted onboarding dispatch.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-8 flex justify-end gap-6 border-t border-neutral-900">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
              className="rounded-none text-neutral-500 hover:text-white hover:bg-transparent h-12 px-6 text-xs tracking-widest uppercase transition-all"
            >
              Abort
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-12 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : 'Execute Onboarding'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
