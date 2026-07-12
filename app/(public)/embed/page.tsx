'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { HousePadiViewer } from '@/components/explore/housepadi-viewer'
import { Loader2, ShieldAlert, KeyRound, Globe } from 'lucide-react'

function EmbedContent() {
  const searchParams = useSearchParams()
  
  const glbUrl = searchParams.get('glb') || ''
  const apiKey = searchParams.get('apiKey') || ''
  const useJoystickParam = 
    searchParams.get('UseJoystick') ?? 
    searchParams.get('useJoystick') ?? 
    searchParams.get('use-joystick') ?? 
    searchParams.get('use_joystick') ?? 
    'true' // defaults to 'true'
  const allowPortraitParam = 
    searchParams.get('allowPortrait') ?? 
    searchParams.get('allow_portrait') ?? 
    searchParams.get('allow-portrait') ?? 
    'true'
  const collapseViewpointsParam = 
    searchParams.get('collapseViewpoints') ?? 
    searchParams.get('collapse_viewpoints') ?? 
    searchParams.get('collapse-viewpoints') ?? 
    'true'

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function verifyAndLoad() {
      if (!apiKey) {
        setErrorMsg('Developer Authentication Required: Please append "?apiKey=hp_dev_YOUR_KEY" to your iframe source URL.')
        setLoading(false)
        return
      }

      if (!glbUrl) {
        setErrorMsg('Missing GLB Resource: Please append "?glb=https://example.com/model.glb" to your iframe source URL.')
        setLoading(false)
        return
      }

      try {
        // Meter the call via API key
        const meterRes = await fetch('/api/v1/embed/meter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            apiKey,
            origin: typeof document !== 'undefined' ? document.referrer : ''
          })
        })

        const meterData = await meterRes.json()
        if (!meterRes.ok || !meterData.success) {
          setErrorMsg(meterData.error || 'API Key verification failed.')
          setLoading(false)
          return
        }

        setLoading(false)
      } catch (err: any) {
        setErrorMsg('Network error validating embed session.')
        setLoading(false)
      }
    }

    verifyAndLoad()
  }, [glbUrl, apiKey])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Initializing Viewer Embed...</p>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.03),transparent_60%)] pointer-events-none" />
        <div className="max-w-md w-full bg-neutral-950/80 border border-white/5 p-8 backdrop-blur-xl relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/40" />
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white mb-2">Embed Loading Suspended</h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mb-6">{errorMsg}</p>
          <div className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold border-t border-white/5 pt-4 flex items-center justify-center gap-1">
            <KeyRound className="w-3.5 h-3.5" /> HousePadi Developer Security
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-neutral-950 p-0 m-0">
      <HousePadiViewer
        url={glbUrl} 
        title="Immersive Space" 
        onClose={() => {}}
        showJoystick={useJoystickParam !== 'false'}
        allowPortrait={allowPortraitParam !== 'false'}
        defaultViewpointsCollapsed={collapseViewpointsParam !== 'false'}
      />
    </div>
  )
}

export default function EmbedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    }>
      <EmbedContent />
    </Suspense>
  )
}
