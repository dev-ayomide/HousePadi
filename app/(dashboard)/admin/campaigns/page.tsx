'use client'

import { useEffect, useState } from 'react'
import { getCampaigns, toggleCampaignActive } from '@/app/actions/campaign-actions'
import { CampaignModal } from '@/components/admin/campaign-modal'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const loadCampaigns = async () => {
    setLoading(true)
    const res = await getCampaigns()
    if (res.success) {
      setCampaigns(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleCampaignActive(id, !currentStatus)
    if (res.success) {
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c))
    }
  }

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/claim/${code}`
    navigator.clipboard.writeText(url)
    toast.success(`Copied link: ${url}`)
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2000)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-[0.1em] uppercase text-white mb-2">Credit Campaigns</h1>
          <p className="text-sm text-neutral-400">Manage promotional credit campaigns and links.</p>
        </div>
        <CampaignModal onSuccess={loadCampaigns} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-neutral-500">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-neutral-500 col-span-full">No campaigns found. Start one above.</p>
        ) : (
          campaigns.map((c) => (
            <Card key={c.id} className="bg-black border border-neutral-800 rounded-none overflow-hidden relative">
              <CardHeader className="border-b border-neutral-900 bg-neutral-950/50 pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-light tracking-widest text-white uppercase flex items-center gap-3">
                    {c.campaign_code}
                    <button 
                      onClick={() => handleCopyLink(c.campaign_code)}
                      className={`p-1.5 hover:bg-neutral-800 rounded-md transition-colors ${
                        copiedCode === c.campaign_code ? 'text-green-500' : 'text-neutral-500 hover:text-white'
                      }`}
                      title={copiedCode === c.campaign_code ? "Copied!" : "Copy Claim Link"}
                    >
                      {copiedCode === c.campaign_code ? (
                        <Check className="w-4 h-4 animate-scale-in" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </CardTitle>
                  <Switch 
                    checked={c.is_active} 
                    onCheckedChange={() => handleToggle(c.id, c.is_active)}
                  />
                </div>
                <CardDescription className="text-xs uppercase tracking-widest text-neutral-500 flex gap-2 pt-2">
                  <Badge variant="outline" className="rounded-none border-neutral-800 bg-black text-neutral-400 text-[10px]">
                    {c.campaign_type === 'USERS_COUNT' ? 'User Limit' : 'Time Based'}
                  </Badge>
                  {c.is_active ? (
                    <Badge className="rounded-none bg-green-500/10 text-green-400 hover:bg-green-500/20 text-[10px]">Active</Badge>
                  ) : (
                    <Badge className="rounded-none bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px]">Inactive</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {c.campaign_type === 'USERS_COUNT' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Max Users</span>
                    <span className="text-white font-mono">{c.max_users || 'Unlimited'}</span>
                  </div>
                )}
                {c.campaign_type === 'TIME_BASED' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Expires At</span>
                    <span className="text-white font-mono text-xs">
                      {c.expires_at ? new Date(c.expires_at).toLocaleString() : 'Never'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">Created</span>
                  <span className="text-neutral-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
