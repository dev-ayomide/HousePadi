'use client'

import { useState, useEffect } from 'react'
import { getDeveloperApiKeys, generateApiKey, deleteApiKey, getBillingTiers, upgradeApiKeyTier, ApiKeyData, BillingTier, updateApiKeyDomain, initializeApiKeyUpgradePayment, verifyApiKeyUpgradePayment } from '@/app/actions/api-key-actions'
import { KeyRound, ShieldCheck, Loader2, Plus, Copy, Check, Trash2, Code, Layers, AlertCircle, ArrowUpCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function AgentDeveloperConsole() {
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  
  // Key Generation State
  const [clientName, setClientName] = useState('')
  const [allowedDomain, setAllowedDomain] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showGenModal, setShowGenModal] = useState(false)
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Edit Domain State
  const [selectedKeyForDomain, setSelectedKeyForDomain] = useState<ApiKeyData | null>(null)
  const [editAllowedDomain, setEditAllowedDomain] = useState('')
  const [savingDomain, setSavingDomain] = useState(false)

  // Upgrade Tiers State
  const [billingTiers, setBillingTiers] = useState<BillingTier[]>([])
  const [selectedKeyForUpgrade, setSelectedKeyForUpgrade] = useState<ApiKeyData | null>(null)
  const [upgradingTierId, setUpgradingTierId] = useState<string | null>(null)
  const [upgradingKey, setUpgradingKey] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isVerify = params.get('payment_verify') === 'true'
    const ref = params.get('reference')
    const keyId = params.get('key_id')
    const tierId = params.get('tier_id')

    if (isVerify && ref && keyId && tierId) {
      verifyPayment(ref, keyId, tierId)
    } else {
      loadData()
    }
  }, [])

  async function verifyPayment(ref: string, keyId: string, tierId: string) {
    setVerifyingPayment(true)
    try {
      const res = await verifyApiKeyUpgradePayment(ref, keyId, tierId)
      if (res.success) {
        toast.success('Payment verified! Your API Key has been upgraded.')
      } else {
        toast.error(res.error || 'Payment verification failed.')
      }
    } catch (err) {
      toast.error('Network error verifying payment.')
    } finally {
      setVerifyingPayment(false)
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
      loadData()
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const [keysRes, tiersRes] = await Promise.all([
        getDeveloperApiKeys(),
        getBillingTiers()
      ])

      if (keysRes.success && keysRes.data) {
        setKeys(keysRes.data)
      }
      if (tiersRes.success && tiersRes.data) {
        setBillingTiers(tiersRes.data)
      }
    } catch (err) {
      toast.error('Network error loading developer workspace.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName) return

    setGenerating(true)
    try {
      const res = await generateApiKey(clientName, undefined, allowedDomain)
      if (res.success && res.rawKey) {
        setGeneratedRawKey(res.rawKey)
        setClientName('')
        setAllowedDomain('')
        setShowGenModal(true)
        // Reload keys
        const reloadRes = await getDeveloperApiKeys()
        if (reloadRes.success && reloadRes.data) {
          setKeys(reloadRes.data)
        }
      } else {
        toast.error(res.error || 'Failed to generate API Key.')
      }
    } catch (err) {
      toast.error('Connection error generating credentials.')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKeyForDomain) return

    setSavingDomain(true)
    try {
      const res = await updateApiKeyDomain(selectedKeyForDomain.id, editAllowedDomain)
      if (res.success) {
        toast.success('Domain restrictions updated.')
        setSelectedKeyForDomain(null)
        setEditAllowedDomain('')
        // Reload keys
        const reloadRes = await getDeveloperApiKeys()
        if (reloadRes.success && reloadRes.data) {
          setKeys(reloadRes.data)
        }
      } else {
        toast.error(res.error || 'Failed to update domain restriction.')
      }
    } catch (err) {
      toast.error('Network error updating domain restriction.')
    } finally {
      setSavingDomain(false)
    }
  }

  const handleRevokeKey = async (keyId: string, clientName: string) => {
    if (!confirm(`Revoking "${clientName}" will permanently break any embeds utilizing this key. Proceed?`)) {
      return
    }

    try {
      const res = await deleteApiKey(keyId)
      if (res.success) {
        toast.success('API Key revoked successfully.')
        setKeys(prev => prev.filter(k => k.id !== keyId))
      } else {
        toast.error(res.error || 'Failed to delete key.')
      }
    } catch (err) {
      toast.error('Failed to communicate deletion request.')
    }
  }

  const handleUpgradeTier = async () => {
    if (!selectedKeyForUpgrade || !upgradingTierId) return

    setUpgradingKey(true)
    try {
      const res = await initializeApiKeyUpgradePayment(selectedKeyForUpgrade.id, upgradingTierId)
      if (res.success) {
        if (res.instant) {
          toast.success('Pricing tier updated successfully!')
          setSelectedKeyForUpgrade(null)
          loadData()
        } else if (res.authorization_url) {
          toast.loading('Generating virtual account for payment...')
          window.location.href = res.authorization_url
        }
      } else {
        toast.error(res.error || 'Upgrade initialization failed.')
      }
    } catch (err) {
      toast.error('Network error upgrading subscription.')
    } finally {
      setUpgradingKey(false)
    }
  }

  const handleCopyKey = () => {
    if (generatedRawKey) {
      navigator.clipboard.writeText(generatedRawKey)
      setCopied(true)
      toast.success('API key copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://housepadi.example'

  if (verifyingPayment) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-black text-white flex-col gap-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Verifying payment...</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Developer Portal
          </h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Generate credentials to integrate 3D/AR iframe viewers for custom GLB models on external domains
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Key Creation */}
        <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
          <div className="space-y-2 border-b border-neutral-800 pb-4">
            <h3 className="text-lg font-light text-white tracking-tight">Create API Key</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Self-Service Automated Onboarding</p>
          </div>

          <form onSubmit={handleGenerateKey} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="clientName" className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                Client / Integration Name *
              </label>
              <Input
                id="clientName"
                placeholder="e.g., Widget Embed, Portal API"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-black border-neutral-800 text-white rounded-none h-11 text-sm focus-visible:ring-1 focus-visible:ring-neutral-700"
                disabled={generating}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="allowedDomain" className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                Allowed Domain (Optional)
              </label>
              <Input
                id="allowedDomain"
                placeholder="e.g., website.com"
                value={allowedDomain}
                onChange={(e) => setAllowedDomain(e.target.value)}
                className="bg-black border-neutral-800 text-white rounded-none h-11 text-sm focus-visible:ring-1 focus-visible:ring-neutral-700"
                disabled={generating}
              />
              <p className="text-[9px] text-neutral-500 font-mono leading-normal">
                Restricts key usage to this domain and subdomains (e.g. locks to `domain.com` allows `sub.domain.com`).
              </p>
            </div>

            <Button
              type="submit"
              disabled={generating || !clientName}
              className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest h-11 rounded-none flex items-center justify-center gap-2 transition-all"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Generate Key
                </>
              )}
            </Button>
          </form>

          <div className="bg-neutral-950 border border-neutral-900/60 p-4 flex gap-3 text-[10px] text-neutral-500 leading-relaxed font-light">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>By default, generated tokens belong to the <strong>Free</strong> tier. To scale performance limits, click the upgrade button next to your key.</span>
          </div>
        </div>

        {/* Right: Existing Keys Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Active Developer Tokens ({keys.length})
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-800 bg-neutral-900/5 text-neutral-500 text-xs">
              No developer keys generated yet. Use the sidebar creation form to issue your first credential.
            </div>
          ) : (
            <div className="space-y-6">
              {keys.map((key) => {
                const callsPct = Math.min(100, (key.current_period_calls_count / key.included_calls) * 100)

                return (
                  <div 
                    key={key.id}
                    className="bg-neutral-950/40 border border-neutral-800 p-6 flex flex-col justify-between space-y-6 transition-all hover:border-neutral-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-base font-medium text-white">{key.name}</h4>
                          <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded-none ${
                            key.tier_name === 'Scale' ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
                            key.tier_name === 'Growth' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                            'bg-neutral-900 border border-neutral-800 text-neutral-500'
                          }`}>
                            {key.tier_name}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 font-mono">ID: {key.id}</p>
                        
                        <div className="flex items-center gap-2 pt-1 text-[10px] font-mono">
                          <span className="text-neutral-500 uppercase tracking-widest text-[8px] font-bold">Allowed Domain:</span>
                          {key.allowed_domain ? (
                            <span className="text-emerald-400 font-bold">{key.allowed_domain}</span>
                          ) : (
                            <span className="text-neutral-600 italic">Unrestricted (Wildcard)</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => {
                            setSelectedKeyForDomain(key)
                            setEditAllowedDomain(key.allowed_domain || '')
                          }}
                          variant="ghost"
                          className="h-9 rounded-none border border-neutral-800/40 hover:bg-neutral-900 text-neutral-300 hover:text-white text-[10px] font-bold uppercase tracking-wider px-3"
                        >
                          <Globe className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Domain Lock
                        </Button>

                        <Button
                          onClick={() => {
                            setSelectedKeyForUpgrade(key)
                            setUpgradingTierId(null)
                          }}
                          variant="ghost"
                          className="h-9 rounded-none border border-neutral-800/40 hover:bg-neutral-900 text-neutral-300 hover:text-white text-[10px] font-bold uppercase tracking-wider px-3"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Upgrade Tier
                        </Button>
                        
                        <Button
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-none border border-neutral-800/40"
                          title="Delete Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="border-t border-white/5 pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-semibold font-mono">
                          <span className="text-neutral-500 uppercase tracking-widest text-[9px]">API Calls / Embed Loads</span>
                          <span className="text-neutral-300">{key.current_period_calls_count} / {key.included_calls}</span>
                        </div>
                        <div className="h-1 bg-neutral-900 overflow-hidden">
                          <div 
                            className={`h-full ${callsPct >= 90 ? 'bg-red-500' : callsPct >= 75 ? 'bg-amber-500' : 'bg-emerald-400'}`}
                            style={{ width: `${callsPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Snippet box */}
                    <div className="bg-neutral-950 border border-neutral-900 p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                        <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5 text-neutral-600" /> HTML Iframe Integration</span>
                        <button
                          onClick={() => {
                            const snippet = `<iframe src="${hostUrl}/embed?glb=YOUR_GLB_URL&UseJoystick=true&apiKey=${key.id}" width="100%" height="600px" frameborder="0" allow="xr-spatial-tracking"></iframe>`
                            navigator.clipboard.writeText(snippet)
                            toast.success('Snippet copied to clipboard.')
                          }}
                          className="text-neutral-400 hover:text-white transition-colors"
                        >
                          Copy Template
                        </button>
                      </div>
                      <code className="block text-[10px] font-mono text-neutral-400 break-all leading-normal bg-black/40 p-2.5 border border-white/[0.02]">
                        {`<iframe src="${hostUrl}/embed?glb=YOUR_GLB_URL&UseJoystick=true&apiKey=YOUR_API_KEY" width="100%" height="600px" frameborder="0" allow="xr-spatial-tracking"></iframe>`}
                      </code>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1. Generate Key Success Dialog */}
      <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
        <DialogContent className="sm:max-w-[460px] bg-neutral-950/80 backdrop-blur-xl border border-white/5 text-white p-8 rounded-none">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-2 mx-auto">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl font-light text-center tracking-tight">
              API Key Generated Successfully
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 text-center font-normal leading-relaxed">
              Copy this token now. For security purposes, this key is encrypted and will not be displayed again.
            </DialogDescription>
          </DialogHeader>

          {generatedRawKey && (
            <div className="space-y-6 pt-4">
              <div className="relative">
                <Input
                  value={generatedRawKey}
                  readOnly
                  className="bg-neutral-900 border-neutral-850 h-12 text-xs font-mono text-emerald-400 pr-12 select-all rounded-none"
                />
                <button
                  onClick={handleCopyKey}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors h-8 w-8 flex items-center justify-center border border-neutral-850 bg-neutral-950/60"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <Button
                onClick={() => setShowGenModal(false)}
                className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none"
              >
                I Have Copied & Saved It
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Upgrade Tier Dialog */}
      <Dialog open={!!selectedKeyForUpgrade} onOpenChange={(open) => {
        if (!open) {
          setSelectedKeyForUpgrade(null)
          setUpgradingTierId(null)
        }
      }}>
        <DialogContent className="sm:max-w-[480px] bg-neutral-950/80 backdrop-blur-xl border border-white/5 text-white p-8 rounded-none">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-2 mx-auto">
              <Layers className="w-6 h-6 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl font-light text-center tracking-tight">
              Developer Subscription Tiers
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 text-center font-normal leading-relaxed">
              Select the pricing tier to scale your API call rates and monthly limits.
            </DialogDescription>
          </DialogHeader>

          {selectedKeyForUpgrade && (
            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                {billingTiers.map((tier) => {
                  const isCurrent = selectedKeyForUpgrade.tier_name === tier.name
                  return (
                    <div 
                      key={tier.id}
                      onClick={() => !isCurrent && setUpgradingTierId(tier.id)}
                      className={`p-4 border text-left cursor-pointer transition-all ${
                        isCurrent ? 'border-neutral-800 bg-neutral-900/10 opacity-60 cursor-not-allowed' :
                        upgradingTierId === tier.id ? 'border-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.02)]' :
                        'border-neutral-850 hover:border-neutral-800 bg-neutral-950/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                            {tier.name}
                            {isCurrent && <span className="text-[8px] uppercase font-bold tracking-widest text-neutral-500">(Active Plan)</span>}
                          </h4>
                          <p className="text-[10px] text-neutral-450 mt-1">
                            {tier.included_calls.toLocaleString()} API Calls / month
                          </p>
                        </div>
                        <div className="text-sm font-bold text-emerald-400">₦{Number(tier.base_monthly_price).toLocaleString()}/mo</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpgradeTier}
                  disabled={!upgradingTierId || upgradingKey}
                  className="flex-1 bg-white text-black hover:bg-neutral-200 h-11 rounded-none text-xs font-bold uppercase tracking-wider"
                >
                  {upgradingKey ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-black" />
                  ) : (
                    'Secure Checkout'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedKeyForUpgrade(null)
                    setUpgradingTierId(null)
                  }}
                  variant="outline"
                  className="border-neutral-850 hover:bg-neutral-900 h-11 rounded-none text-xs uppercase text-neutral-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Domain Lock Dialog */}
      <Dialog open={!!selectedKeyForDomain} onOpenChange={(open) => !open && setSelectedKeyForDomain(null)}>
        <DialogContent className="sm:max-w-[460px] bg-neutral-950/80 backdrop-blur-xl border border-white/5 text-white p-8 rounded-none">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-2 mx-auto">
              <Globe className="w-6 h-6 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl font-light text-center tracking-tight">
              Domain Lock Restriction
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 text-center font-normal leading-relaxed">
              Restrict this API Key to a specific domain. Requests from unauthorized domains will be rejected.
            </DialogDescription>
          </DialogHeader>

          {selectedKeyForDomain && (
            <form onSubmit={handleUpdateDomain} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label htmlFor="editDomainInput" className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                  Allowed Domain Name
                </label>
                <Input
                  id="editDomainInput"
                  placeholder="e.g., website.com (leave empty to remove lock)"
                  value={editAllowedDomain}
                  onChange={(e) => setEditAllowedDomain(e.target.value)}
                  className="bg-black border-neutral-800 text-white rounded-none h-11 text-sm focus-visible:ring-1 focus-visible:ring-neutral-700"
                  disabled={savingDomain}
                />
                <p className="text-[9px] text-neutral-500 font-mono leading-relaxed mt-1">
                  Locks embeds to this domain and all its subdomains (e.g. locks to `domain.com` allows `sub.domain.com`). Leave blank to set unrestricted wildcard access.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={savingDomain}
                  className="flex-1 bg-white text-black hover:bg-neutral-200 h-11 rounded-none text-xs font-bold uppercase tracking-wider"
                >
                  {savingDomain ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setSelectedKeyForDomain(null)}
                  variant="outline"
                  className="border-neutral-850 hover:bg-neutral-900 h-11 rounded-none text-xs uppercase text-neutral-400"
                  disabled={savingDomain}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
