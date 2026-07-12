'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { HousePadiViewer } from '@/components/explore/housepadi-viewer'
import { Loader2, ArrowLeft } from 'lucide-react'

function ViewerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const url = searchParams.get('url') || ''
  const title = searchParams.get('title') || '3D Space Viewer'
  const useJoystickParam = 
    searchParams.get('UseJoystick') ?? 
    searchParams.get('useJoystick') ?? 
    searchParams.get('use-joystick') ?? 
    searchParams.get('use_joystick') ?? 
    'true'
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

  if (!url) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-neutral-950 border border-white/5 p-8 backdrop-blur-xl relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/40" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white mb-2">No 3D Model Path Provided</h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mb-6">
            Please make sure you have specified a valid scan file path.
          </p>
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[10px] text-neutral-400 hover:text-white uppercase tracking-widest font-bold border border-white/10 px-4 py-2 bg-neutral-900/40 hover:bg-neutral-900 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-neutral-950 p-0 m-0">
      <HousePadiViewer 
        url={url} 
        title={title} 
        showJoystick={useJoystickParam !== 'false'}
        allowPortrait={allowPortraitParam !== 'false'}
        defaultViewpointsCollapsed={collapseViewpointsParam !== 'false'}
        onClose={() => {
          try {
            window.close()
          } catch (e) {
            router.back()
          }
        }} 
      />
    </div>
  )
}

export default function ViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    }>
      <ViewerContent />
    </Suspense>
  )
}
