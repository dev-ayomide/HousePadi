'use client'

import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  Stage, 
  useGLTF, 
  PerspectiveCamera,
  Environment,
  Bounds,
  Float,
  Html,
  useProgress
} from '@react-three/drei'
import { Suspense, useState, useEffect, useRef } from 'react'
import { Loader2, Maximize2, Minimize2, RotateCcw, Box } from 'lucide-react'

function Model({ url, scale = 1.0 }: { url: string; scale?: number }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} castShadow receiveShadow scale={[scale, scale, scale]} />
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 min-w-[200px]">
        <div className="w-full h-1 bg-neutral-900 overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">
          Syncing Neural Mesh {Math.round(progress)}%
        </p>
      </div>
    </Html>
  )
}

interface ModelViewerProps {
  url: string
  title?: string
  scale?: number
}

export function ModelViewer({ url, title, scale = 1.0 }: ModelViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative bg-black overflow-hidden border border-neutral-800 transition-all duration-500 w-full h-full"
    >
      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Visualizing System</p>
          <h3 className="text-sm font-medium text-white tracking-tight">{title || '3D Spatial Asset'}</h3>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-neutral-900/50 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Control Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-4 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/5 pointer-events-auto">
        <div className="flex flex-col items-center justify-center">
          <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-1">Navigation</p>
          <div className="flex gap-6 text-[9px] uppercase tracking-widest text-neutral-400 font-medium">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-neutral-700" /> Orbit</span>
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-neutral-700" /> Zoom</span>
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-neutral-700" /> Pan</span>
          </div>
        </div>
      </div>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={<Loader />}>
          <Stage environment="city" intensity={0.5} shadows={{ type: 'contact', opacity: 0.7, blur: 2 }} adjustCamera={1.5}>
            <Model url={url} scale={Number(scale) || 1.0} />
          </Stage>
        </Suspense>
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
      </Canvas>
      
      {/* HUD Elements */}
      <div className="absolute top-1/2 left-6 -translate-y-1/2 flex flex-col gap-8 pointer-events-none">
        <div className="w-px h-12 bg-neutral-800" />
        <div className="w-px h-12 bg-neutral-800" />
      </div>
      <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-8 pointer-events-none">
        <div className="w-px h-12 bg-neutral-800" />
        <div className="w-px h-12 bg-neutral-800" />
      </div>
    </div>
  )
}
