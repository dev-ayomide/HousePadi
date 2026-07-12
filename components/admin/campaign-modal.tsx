'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCampaign } from '@/app/actions/campaign-actions'
import { Copy, Check, Ticket } from 'lucide-react'

export function CampaignModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [campaignCode, setCampaignCode] = useState('')
  const [type, setType] = useState<'USERS_COUNT' | 'TIME_BASED'>('USERS_COUNT')
  const [maxUsers, setMaxUsers] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const data: any = {
        campaign_code: campaignCode,
        campaign_type: type
      }

      if (type === 'USERS_COUNT' && maxUsers) {
        data.max_users = parseInt(maxUsers, 10)
      } else if (type === 'TIME_BASED' && expiresAt) {
        data.expires_at = new Date(expiresAt).toISOString()
      }

      const res = await createCampaign(data)
      
      if (res.success) {
        const url = `${window.location.origin}/claim/${campaignCode}`
        setGeneratedUrl(url)
        if (onSuccess) onSuccess()
      } else {
        alert(res.error || 'Failed to create campaign')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state on close
      setTimeout(() => {
        setCampaignCode('')
        setType('USERS_COUNT')
        setMaxUsers('')
        setExpiresAt('')
        setGeneratedUrl('')
        setCopied(false)
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-neutral-200 rounded-none text-xs uppercase font-bold tracking-widest px-6 h-12 flex items-center gap-2">
          <Ticket className="w-4 h-4" /> Start New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border border-neutral-800 text-white sm:max-w-[425px] rounded-none">
        <DialogHeader>
          <DialogTitle className="text-sm uppercase tracking-widest font-light text-neutral-400">
            {generatedUrl ? 'Campaign Created' : 'Start New Campaign'}
          </DialogTitle>
        </DialogHeader>

        {generatedUrl ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-neutral-500">Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={generatedUrl} 
                  readOnly 
                  className="bg-neutral-900 border-neutral-800 rounded-none text-neutral-300 focus-visible:ring-0"
                />
                <Button 
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-transparent border-neutral-800 hover:bg-neutral-900 rounded-none h-10 w-10"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenChange(false)}
              className="w-full bg-white text-black hover:bg-neutral-200 rounded-none text-xs uppercase font-bold tracking-widest"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-xs uppercase tracking-widest text-neutral-500">Campaign Code</Label>
              <Input
                id="code"
                value={campaignCode}
                onChange={(e) => setCampaignCode(e.target.value)}
                placeholder="e.g. launch2026"
                required
                className="bg-neutral-900 border-neutral-800 rounded-none text-white focus-visible:ring-neutral-700 focus-visible:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-neutral-500">Campaign Type</Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-800 rounded-none text-white focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-black border-neutral-800 text-white rounded-none">
                  <SelectItem value="USERS_COUNT" className="focus:bg-neutral-900 focus:text-white rounded-none cursor-pointer">Users Count (Limit based)</SelectItem>
                  <SelectItem value="TIME_BASED" className="focus:bg-neutral-900 focus:text-white rounded-none cursor-pointer">Time-based (Expiration)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'USERS_COUNT' && (
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="text-xs uppercase tracking-widest text-neutral-500">Max Users Limit</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="1"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  placeholder="e.g. 100"
                  required
                  className="bg-neutral-900 border-neutral-800 rounded-none text-white focus-visible:ring-neutral-700 focus-visible:ring-1"
                />
              </div>
            )}

            {type === 'TIME_BASED' && (
              <div className="space-y-2">
                <Label htmlFor="expiresAt" className="text-xs uppercase tracking-widest text-neutral-500">Expiration Date & Time</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-800 rounded-none text-white focus-visible:ring-neutral-700 focus-visible:ring-1"
                />
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black hover:bg-neutral-200 rounded-none text-xs uppercase font-bold tracking-widest h-12"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
