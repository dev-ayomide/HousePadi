'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Save, 
  Image as ImageIcon,
  LayoutTemplate,
  Type,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { getAboutContent, updateAboutContent, AboutContent } from '@/app/actions/about-actions'
import { TeamManagementSection } from '@/components/admin/team-management-section'
import { Users } from 'lucide-react'

export default function AboutPageCMS() {
  const [activeTab, setActiveTab] = useState<'hero' | 'mission' | 'team'>('hero')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<Partial<AboutContent>>({
    hero_headline: '',
    hero_subheadline: '',
    org_title: '',
    org_description: '',
    org_supporting_text: ''
  })
  const { toast } = useToast()

  const fetchContent = useCallback(async () => {
    setLoading(true)
    const result = await getAboutContent()
    if (result.success && result.data) {
      setContent(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const handleSave = async () => {
    setSaving(true)
    const result = await updateAboutContent(content.id, {
      hero_headline: content.hero_headline,
      hero_subheadline: content.hero_subheadline,
      org_title: content.org_title,
      org_description: content.org_description,
      org_supporting_text: content.org_supporting_text
    })
    
    if (result.success) {
      toast({ title: 'Content Saved Successfully' })
      await fetchContent()
    } else {
      toast({ title: 'Error Saving Content', description: result.error, variant: 'destructive' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">About Page Content</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Corporate Narrative Control
          </p>
        </div>
        
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Publish All Changes
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Navigation for Sections */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600 px-4 mb-4">Content Blocks</p>
          {[
            { id: 'hero', label: 'Hero Section', icon: LayoutTemplate },
            { id: 'mission', label: 'Organization', icon: Type },
            { id: 'team', label: 'Team Management', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-wider uppercase font-medium transition-all text-left ${
                  activeTab === tab.id
                    ? 'text-white bg-neutral-900/50 border-l-2 border-white'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/20 border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* CMS Editor Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-neutral-900/20 border border-neutral-800 p-8">
            
            {activeTab === 'hero' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2 border-b border-neutral-800 pb-4">
                  <h2 className="text-xl font-light text-white">Hero Section Configuration</h2>
                  <p className="text-xs text-neutral-500">The first impression of the About page.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Headline (H1)</label>
                    <Input 
                      value={content.hero_headline || ''}
                      onChange={(e) => setContent({ ...content, hero_headline: e.target.value })}
                      className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Sub-headline</label>
                    <Textarea 
                      value={content.hero_subheadline || ''}
                      onChange={(e) => setContent({ ...content, hero_subheadline: e.target.value })}
                      className="rounded-none bg-black border-neutral-800 text-white min-h-[100px] resize-y focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mission' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2 border-b border-neutral-800 pb-4">
                  <h2 className="text-xl font-light text-white">Organization Details</h2>
                  <p className="text-xs text-neutral-500">Core values and platform objectives.</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Section Title</label>
                    <Input 
                      value={content.org_title || ''}
                      onChange={(e) => setContent({ ...content, org_title: e.target.value })}
                      className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Main Description</label>
                    <Textarea 
                      value={content.org_description || ''}
                      onChange={(e) => setContent({ ...content, org_description: e.target.value })}
                      className="rounded-none bg-black border-neutral-800 text-white min-h-[100px] resize-y focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Supporting Text Block</label>
                    <Textarea 
                      value={content.org_supporting_text || ''}
                      onChange={(e) => setContent({ ...content, org_supporting_text: e.target.value })}
                      className="rounded-none bg-black border-neutral-800 text-white min-h-[100px] resize-y focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'team' && <TeamManagementSection />}
            
          </div>
        </div>
      </div>
    </div>
  )
}
