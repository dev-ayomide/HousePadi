'use client'

import { useState } from 'react'
import { Save, Shield, Database, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function PlatformSettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="p-10 max-w-[1000px] mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Platform Configuration</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            System Level Parameters
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {saveSuccess && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 animate-in fade-in">
              Configuration Saved
            </span>
          )}
          <Button 
            onClick={handleSave}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Save className="w-4 h-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Storage Settings */}
        <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <Database className="w-5 h-5 text-neutral-500" />
            <h2 className="text-xl font-light text-white">Storage Architecture</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Max Asset Upload Size (MB)</label>
              <Input 
                type="number" 
                defaultValue="500" 
                className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
              <p className="text-[10px] text-neutral-600 mt-1">Applies to all .fbx and .glb files.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Global Storage Threshold (TB)</label>
              <Input 
                type="number" 
                defaultValue="10" 
                className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>
          </div>
        </div>

        {/* Security & API Settings */}
        <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <Shield className="w-5 h-5 text-neutral-500" />
            <h2 className="text-xl font-light text-white">Security & Gateway</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">API Rate Limit (Req/Min)</label>
              <Input 
                type="number" 
                defaultValue="1000" 
                className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Session Timeout (Hours)</label>
              <Input 
                type="number" 
                defaultValue="24" 
                className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>
          </div>
        </div>

        {/* Communication Routing */}
        <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <Mail className="w-5 h-5 text-neutral-500" />
            <h2 className="text-xl font-light text-white">Communication Routing</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">System Email Identity</label>
              <Input 
                type="email" 
                defaultValue="system@housepadi.example" 
                className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Moderation Alerts Email</label>
              <Input 
                type="email" 
                defaultValue="moderator@housepadi.example" 
                className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border border-red-900/30 bg-red-950/10">
          <h3 className="text-xs uppercase tracking-widest font-bold text-red-500 mb-2">Danger Zone</h3>
          <p className="text-xs text-neutral-500 mb-4">Actions here can result in permanent platform data loss.</p>
          <Button variant="outline" className="border-red-900/50 text-red-500 hover:bg-red-950/50 hover:text-red-400 rounded-none h-10 text-xs uppercase tracking-widest">
            Purge Orphaned Assets
          </Button>
        </div>
      </div>
    </div>
  )
}
