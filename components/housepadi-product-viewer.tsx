'use client'

import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei'
import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import { Loader2, Maximize2, Minimize2, Smartphone, Box } from 'lucide-react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { toast } from 'sonner'

// =========================================================
// Asset Loaders
// =========================================================

function GLTFModel({ url, modelRef }: { url: string, modelRef: React.MutableRefObject<THREE.Object3D | null> }) {
  const { scene } = useGLTF(url)
  useEffect(() => {
    if (scene && modelRef) {
      modelRef.current = scene
    }
  }, [scene, modelRef])
  return <primitive object={scene} />
}

function FBXModel({ url, modelRef }: { url: string, modelRef: React.MutableRefObject<THREE.Object3D | null> }) {
  const fbx = useLoader(FBXLoader, url)
  const copiedFbx = useMemo(() => fbx.clone(true), [fbx])
  useEffect(() => {
    if (copiedFbx && modelRef) {
      modelRef.current = copiedFbx
    }
  }, [copiedFbx, modelRef])
  return <primitive object={copiedFbx} />
}

function OBJModel({ url, modelRef }: { url: string, modelRef: React.MutableRefObject<THREE.Object3D | null> }) {
  const obj = useLoader(OBJLoader, url)
  const copiedObj = useMemo(() => obj.clone(true), [obj])
  useEffect(() => {
    if (copiedObj && modelRef) {
      modelRef.current = copiedObj
    }
  }, [copiedObj, modelRef])
  return <primitive object={copiedObj} />
}

function ModelLoader({ url, modelRef }: { url: string, modelRef: React.MutableRefObject<THREE.Object3D | null> }) {
  const extension = url.split('.').pop()?.toLowerCase() || ''

  if (extension === 'gltf' || extension === 'glb') return <GLTFModel url={url} modelRef={modelRef} />
  if (extension === 'fbx') return <FBXModel url={url} modelRef={modelRef} />
  if (extension === 'obj') return <OBJModel url={url} modelRef={modelRef} />

  if (extension === 'usdz') {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#333" wireframe />
      </mesh>
    )
  }
  return null
}

function Loader() {
  return (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 z-20">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
        Loading 3D Asset...
      </p>
    </div>
  )
}

// =========================================================
// WebXR AR Manager
// =========================================================
function ARManager({ active, onSessionStarted, onSessionEnded }: {
  active: boolean, onSessionStarted: (session: any) => void, onSessionEnded: () => void
}) {
  const { gl } = useThree()
  const onSessionStartedRef = useRef(onSessionStarted)
  const onSessionEndedRef = useRef(onSessionEnded)

  useEffect(() => {
    onSessionStartedRef.current = onSessionStarted
    onSessionEndedRef.current = onSessionEnded
  }, [onSessionStarted, onSessionEnded])

  useEffect(() => {
    if (!active) return

    let xrSession: any = null

    const startAR = async () => {
      try {
        if (!navigator.xr) return
        const overlayElement = document.querySelector('.housepadi-product-root')
        
        const sessionInit: any = {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['local', 'local-floor']
        }

        if (overlayElement) {
          sessionInit.optionalFeatures.push('dom-overlay')
          sessionInit.domOverlay = { root: overlayElement }
        }
        
        xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit)
        gl.xr.enabled = true
        await gl.xr.setSession(xrSession)
        onSessionStartedRef.current(xrSession)

        xrSession.addEventListener('end', () => {
          onSessionEndedRef.current()
        })
      } catch (err) {
        toast.error('Failed to initialize AR session.')
        onSessionEndedRef.current()
      }
    }

    startAR()

    return () => {
      if (xrSession) xrSession.end().catch(() => {})
    }
  }, [active, gl])

  return null
}

// =========================================================
// WebXR Hit-Testing Controller
// =========================================================
function ARHitTestController({ session, onPlace }: { session: any, onPlace: (pos: THREE.Vector3) => void }) {
  const { gl } = useThree()
  const reticleRef = useRef<THREE.Mesh>(null)
  const hitTestSource = useRef<any>(null)
  const localSpace = useRef<any>(null)
  const onPlaceRef = useRef(onPlace)

  useEffect(() => { onPlaceRef.current = onPlace }, [onPlace])

  useEffect(() => {
    if (!session) return
    session.requestReferenceSpace('viewer').then((viewerSpace: any) => {
      session.requestHitTestSource({ space: viewerSpace }).then((source: any) => {
        hitTestSource.current = source
      })
    })

    session.requestReferenceSpace('local-floor').then((space: any) => {
      localSpace.current = space
    }).catch(() => {
      session.requestReferenceSpace('local').then((space: any) => {
        localSpace.current = space
      })
    })

    const onSelect = () => {
      if (reticleRef.current && reticleRef.current.visible) {
        onPlaceRef.current(reticleRef.current.position.clone())
      }
    }
    session.addEventListener('select', onSelect)
    return () => session.removeEventListener('select', onSelect)
  }, [session])

  useFrame(() => {
    const xr = gl.xr
    const frame = xr.getFrame()
    if (hitTestSource.current && frame && localSpace.current && reticleRef.current) {
      const hitTestResults = frame.getHitTestResults(hitTestSource.current)
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0]
        const pose = hit.getPose(localSpace.current)
        if (pose) {
          reticleRef.current.visible = true
          reticleRef.current.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z)
          reticleRef.current.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w)
        }
      } else {
        reticleRef.current.visible = false
      }
    }
  })

  return (
    <mesh ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.15, 0.18, 32]} />
      <meshBasicMaterial color="#10b981" />
    </mesh>
  )
}

class ModelErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// =========================================================
// Main HousePadi Product Viewer
// =========================================================
export function HousePadiProductViewer({ url, title, className = '' }: { url: string, title?: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [arSupported, setArSupported] = useState(false)
  const [arActive, setArActive] = useState(false)
  const [arSession, setArSession] = useState<any>(null)
  const [portalPos, setPortalPos] = useState<THREE.Vector3 | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [exportingUsdz, setExportingUsdz] = useState(false)
  const [hasContextLost, setHasContextLost] = useState(false)

  const modelSceneRef = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => setArSupported(supported))
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const android = /android/i.test(navigator.userAgent)
    setIsIOS(ios)
    setIsAndroid(android)
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      }
    }
  }

  const handleIOSAR = async () => {
    if (!modelSceneRef.current) {
      toast.error("3D model is not fully loaded yet.")
      return
    }
    setExportingUsdz(true)
    const toastId = toast.loading("Generating AR experience for iOS...")
    try {
      const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')
      const exporter = new USDZExporter()
      const arrayBuffer = await exporter.parseAsync(modelSceneRef.current, { quickLookCompatible: true })
      const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' })
      const usdzUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = usdzUrl
      link.rel = 'ar'
      link.download = `${title || 'product'}.usdz`
      const img = document.createElement('img')
      img.alt = 'AR Model'
      link.appendChild(img)
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(usdzUrl)
      }, 2000)
      toast.dismiss(toastId)
      toast.success("AR Quick Look launched!")
    } catch (err) {
      toast.dismiss(toastId)
      toast.error("Failed to generate iOS AR model.")
    } finally {
      setExportingUsdz(false)
    }
  }

  const handleAndroidAR = () => {
    // Only GLTF/GLB supported natively by Scene Viewer
    const extension = url.split('.').pop()?.toLowerCase() || ''
    if (extension !== 'gltf' && extension !== 'glb') {
      toast.error('Android AR Quick Look requires .gltf or .glb models.')
      return
    }
    
    // Convert relative URL to absolute URL if necessary
    const absoluteUrl = new URL(url, window.location.origin).href
    const fallbackUrl = encodeURIComponent(window.location.href)
    
    // Scene Viewer Intent URL
    const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteUrl)}&mode=ar_only&title=${encodeURIComponent(title || 'Product')}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${fallbackUrl};end;`
    
    window.location.href = intentUrl
  }

  if (hasContextLost) {
    return (
      <div className={`housepadi-product-root relative bg-neutral-950 flex flex-col items-center justify-center p-6 text-center border border-neutral-800 ${className} ${isFullscreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-full h-full'}`}>
        <Box className="w-12 h-12 text-red-500 opacity-80 mb-4" />
        <h3 className="text-sm font-bold text-white tracking-tight uppercase">GPU Limit Exceeded</h3>
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-2 max-w-[80%] leading-relaxed">
          This highly detailed 3D model contains too many high-resolution textures for your current device's graphics processor.
        </p>
        {isIOS && (
          <button
            onClick={() => toast.info("AR relies on the 3D model being loaded first. Please try on a desktop device.")}
            className="mt-6 h-10 px-6 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest transition-all border border-emerald-500/30 flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" /> AR Unavailable
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`housepadi-product-root relative bg-neutral-950 overflow-hidden font-sans border border-neutral-800 ${className} ${isFullscreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-full h-full'}`}>
      
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-end items-start pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-neutral-900/80 border border-white/10 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all shadow-lg backdrop-blur-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom AR Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        {isIOS ? (
          <button
            onClick={handleIOSAR}
            disabled={exportingUsdz}
            className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {exportingUsdz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            {exportingUsdz ? "Generating..." : "View in AR"}
          </button>
        ) : arSupported ? (
          !arActive ? (
            <button
              onClick={() => setArActive(true)}
              className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Enter AR
            </button>
          ) : !portalPos ? (
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 border border-white/10 text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Point camera at floor to place product
            </div>
          ) : null
        ) : isAndroid ? (
          <button
            onClick={handleAndroidAR}
            className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" /> View in AR
          </button>
        ) : (
          <button
            disabled
            title="AR mode requires an iOS or Android device, or a browser with WebXR immersive-ar support."
            className="h-10 px-6 bg-neutral-900 border border-white/5 text-neutral-500 text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-50"
          >
            <Smartphone className="w-4 h-4" /> View in AR
          </button>
        )}
      </div>

      {/* Main 3D Canvas */}
      <ModelErrorBoundary fallback={
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 z-20">
          <Box className="w-8 h-8 text-red-500 opacity-80" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold">
            Model Unavailable
          </p>
        </div>
      }>
        <Suspense fallback={<Loader />}>
          <Canvas 
            camera={{ position: [0, 2, 5], fov: 45 }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setHasContextLost(true);
              });
            }}
          >
            <color attach="background" args={['#0a0a0a']} />
            
            {/* Added multiple directional lights to compensate for lack of Environment map */}
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 10]} intensity={1.5} />
            <directionalLight position={[-10, 10, -10]} intensity={1} />
            <directionalLight position={[0, -10, 0]} intensity={0.5} />

            <Suspense fallback={null}>
              {!arActive && (
                <Center>
                  <ModelLoader url={url} modelRef={modelSceneRef} />
                </Center>
              )}

              {arActive && (
                <>
                  <ARManager 
                    active={arActive} 
                    onSessionStarted={setArSession}
                    onSessionEnded={() => {
                      setArActive(false)
                      setArSession(null)
                      setPortalPos(null)
                    }}
                  />
                  {arSession && !portalPos && (
                    <ARHitTestController session={arSession} onPlace={(pos) => setPortalPos(pos)} />
                  )}
                  {portalPos && (
                    <group position={portalPos}>
                      <ModelLoader url={url} modelRef={modelSceneRef} />
                    </group>
                  )}
                </>
              )}
            </Suspense>

            <OrbitControls 
              makeDefault
              minPolarAngle={0}
              maxPolarAngle={Math.PI / 1.75}
              enablePan={false}
              enableZoom={true}
            />
          </Canvas>
        </Suspense>
      </ModelErrorBoundary>
    </div>
  )
}
