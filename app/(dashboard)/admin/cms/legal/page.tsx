'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Save, 
  Loader2,
  FileText,
  ShieldCheck,
  Eye,
  Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { getSiteSettings, updateSiteSetting } from '@/app/actions/settings-actions'

const DEFAULT_AR_PRIVACY = `# HousePadi AR Privacy Policy

Last updated: May 30, 2026

This Privacy Policy describes how HousePadi AR collects, uses, and shares your personal information when you use our mobile application to view immersive real estate listings.

## 1. Information We Collect
We collect device metadata, spatial calibration info (AR session parameters), location coordinates (to locate nearby staging listings), and camera access feeds (processed strictly on-device for spatial anchoring and rendering).

## 2. On-Device AR Processing
Camera access is required only to enable the Augmented Reality (AR) viewer. Camera feed data is processed locally in real-time and is never uploaded, stored, or shared with third parties.

## 3. Data Storage & Sharing
Saved bookmarks, preferences, and analytics are synced securely with Supabase. We do not sell or monetize individual tracking details. Contact us at concierge@housepadi.example for data requests.`

export default function LegalCMSPage() {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'ar_privacy'>('terms')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState({
    terms_content: '',
    privacy_content: '',
    ar_privacy_content: '',
  })
  const [previewMode, setPreviewMode] = useState<boolean>(false)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const result = await getSiteSettings()
    if (result.success && result.data) {
      setContent({
        terms_content: result.data.terms_content || '',
        privacy_content: result.data.privacy_content || '',
        ar_privacy_content: result.data.ar_privacy_content || DEFAULT_AR_PRIVACY,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    const key = 
      activeTab === 'terms' 
        ? 'terms_content' 
        : activeTab === 'privacy' 
        ? 'privacy_content' 
        : 'ar_privacy_content'
    const value = 
      activeTab === 'terms' 
        ? content.terms_content 
        : activeTab === 'privacy' 
        ? content.privacy_content 
        : content.ar_privacy_content
    
    const result = await updateSiteSetting(key, value)
    
    if (result.success) {
      toast({ 
        title: 
          activeTab === 'terms' 
            ? 'Terms & Conditions Published' 
            : activeTab === 'privacy' 
            ? 'Privacy Policy Published' 
            : 'HousePadi AR Privacy Policy Published',
        description: 'Changes are now live on the public site.'
      })
      await fetchSettings()
    } else {
      toast({ 
        title: 'Publishing Failed', 
        description: result.error, 
        variant: 'destructive' 
      })
    }
    setSaving(false)
  }

  // Simple Markdown-like custom preview renderer
  const renderPreview = (text: string) => {
    if (!text) return <p className="text-neutral-600 italic text-xs">No content provided yet.</p>
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-medium text-white mt-4 mb-2">{line.replace('### ', '')}</h3>
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-base font-light text-white mt-6 mb-3 border-b border-neutral-800 pb-1">{line.replace('## ', '')}</h2>
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-light text-white mt-6 mb-4">{line.replace('# ', '')}</h1>
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-3" />
      }
      return <p key={idx} className="text-xs text-neutral-400 leading-relaxed mb-3">{line}</p>
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  const currentText = 
    activeTab === 'terms' 
      ? content.terms_content 
      : activeTab === 'privacy' 
      ? content.privacy_content 
      : content.ar_privacy_content
  const wordCount = currentText ? currentText.trim().split(/\s+/).filter(Boolean).length : 0
  const charCount = currentText ? currentText.length : 0

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Legal Configurations</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            System Level Terms & Privacy Control
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setPreviewMode(!previewMode)}
            variant="outline"
            className="border-neutral-800 hover:bg-neutral-900 text-white rounded-none h-12 px-5 text-xs font-bold uppercase tracking-widest transition-all"
          >
            {previewMode ? <Edit3 className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Publish Current Section
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Navigation for Sections */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600 px-4 mb-4">Legal Documents</p>
          {[
            { id: 'terms', label: 'Terms & Conditions', icon: FileText },
            { id: 'privacy', label: 'Privacy Policy (Portal)', icon: ShieldCheck },
            { id: 'ar_privacy', label: 'Privacy Policy (HousePadi AR App)', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-xs tracking-wider uppercase font-medium transition-all text-left ${
                  activeTab === tab.id
                    ? 'text-white bg-neutral-900/50 border-l-2 border-white'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/20 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* CMS Editor Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
            
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-xl font-light text-white">
                  {activeTab === 'terms' 
                    ? 'Terms & Conditions Editor' 
                    : activeTab === 'privacy' 
                    ? 'Privacy Policy Editor' 
                    : 'HousePadi AR Privacy Policy Editor'}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Use markdown syntax (`#` for main headers, `##` for subheadings).
                </p>
              </div>
              <div className="text-right text-[10px] uppercase tracking-widest text-neutral-600 font-bold">
                {wordCount} words // {charCount} chars
              </div>
            </div>

            {previewMode ? (
              <div className="bg-black/40 border border-neutral-800 p-6 min-h-[400px] font-sans prose prose-invert max-w-none">
                {renderPreview(currentText)}
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea 
                  value={currentText}
                  onChange={(e) => {
                    if (activeTab === 'terms') {
                      setContent({ ...content, terms_content: e.target.value })
                    } else if (activeTab === 'privacy') {
                      setContent({ ...content, privacy_content: e.target.value })
                    } else {
                      setContent({ ...content, ar_privacy_content: e.target.value })
                    }
                  }}
                  placeholder={
                    activeTab === 'terms' 
                      ? 'Enter Terms & Conditions text...' 
                      : activeTab === 'privacy' 
                      ? 'Enter Privacy Policy text...' 
                      : 'Enter HousePadi AR Privacy Policy text...'
                  }
                  className="rounded-none bg-black border-neutral-800 text-white min-h-[450px] resize-y p-4 text-xs font-mono leading-relaxed focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}
