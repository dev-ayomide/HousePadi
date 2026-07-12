'use client'

import { useEffect, useState } from 'react'
import { 
  Globe, 
  Smartphone, 
  Apple, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { getSiteSettings, updateMultipleSettings } from '@/app/actions/settings-actions'

export default function LinkManagementPage() {
  const [links, setLinks] = useState<Record<string, string>>({
    google_play_link: '',
    google_play_coming_soon: 'false',
    apple_app_store_link: '',
    apple_app_store_coming_soon: 'false',
    facebook_link: '',
    twitter_link: '',
    instagram_link: '',
    linkedin_link: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadSettings() {
      const result = await getSiteSettings()
      if (result.success) {
        setLinks(prev => ({ ...prev, ...result.data }))
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const result = await updateMultipleSettings(links)
    if (result.success) {
      toast({ title: "Configuration Updated", description: "All site-wide links have been synchronized." })
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1200px] mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Link Management</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Platform-wide External Routing
          </p>
        </div>
        
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-8 text-xs font-bold uppercase tracking-widest transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Apply Global Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* App Stores */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 border-b border-neutral-900 pb-4">
            <Smartphone className="w-5 h-5 text-neutral-500" />
            <h2 className="text-xl font-light text-white">Application Distribution</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Google Play Store</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={links.google_play_coming_soon === 'true'}
                      onChange={(e) => setLinks({ ...links, google_play_coming_soon: e.target.checked ? 'true' : 'false' })}
                      className="w-3 h-3 accent-white"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Coming Soon</span>
                  </label>
                </div>
                <Apple className="w-4 h-4 text-neutral-800" />
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
                <Input 
                  value={links.google_play_link}
                  onChange={(e) => setLinks({ ...links, google_play_link: e.target.value })}
                  disabled={links.google_play_coming_soon === 'true'}
                  placeholder="https://play.google.com/..."
                  className="pl-10 rounded-none bg-neutral-900/20 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Apple App Store</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={links.apple_app_store_coming_soon === 'true'}
                      onChange={(e) => setLinks({ ...links, apple_app_store_coming_soon: e.target.checked ? 'true' : 'false' })}
                      className="w-3 h-3 accent-white"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Coming Soon</span>
                  </label>
                </div>
                <Apple className="w-4 h-4 text-neutral-800" />
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
                <Input 
                  value={links.apple_app_store_link}
                  onChange={(e) => setLinks({ ...links, apple_app_store_link: e.target.value })}
                  disabled={links.apple_app_store_coming_soon === 'true'}
                  placeholder="https://apps.apple.com/..."
                  className="pl-10 rounded-none bg-neutral-900/20 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Networks */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 border-b border-neutral-900 pb-4">
            <ExternalLink className="w-5 h-5 text-neutral-500" />
            <h2 className="text-xl font-light text-white">Social Ecosystem</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Facebook className="w-3 h-3 text-neutral-600" />
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Facebook</label>
              </div>
              <Input 
                value={links.facebook_link}
                onChange={(e) => setLinks({ ...links, facebook_link: e.target.value })}
                className="rounded-none bg-neutral-900/20 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Twitter className="w-3 h-3 text-neutral-600" />
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Twitter / X</label>
              </div>
              <Input 
                value={links.twitter_link}
                onChange={(e) => setLinks({ ...links, twitter_link: e.target.value })}
                className="rounded-none bg-neutral-900/20 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Instagram className="w-3 h-3 text-neutral-600" />
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Instagram</label>
              </div>
              <Input 
                value={links.instagram_link}
                onChange={(e) => setLinks({ ...links, instagram_link: e.target.value })}
                className="rounded-none bg-neutral-900/20 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Linkedin className="w-3 h-3 text-neutral-600" />
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">LinkedIn</label>
              </div>
              <Input 
                value={links.linkedin_link}
                onChange={(e) => setLinks({ ...links, linkedin_link: e.target.value })}
                className="rounded-none bg-neutral-900/20 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-neutral-950 border border-neutral-900 p-8 flex items-start gap-6">
        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-neutral-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-white uppercase tracking-wider">Global Synchronization</h4>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-2xl">
            Updates to these links will propagate across the public interface (Header, Footer, CTA sections) immediately upon application. Ensure all URLs are prefixed with https:// to maintain security standards.
          </p>
        </div>
      </div>
    </div>
  )
}
