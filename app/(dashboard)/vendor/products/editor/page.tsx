'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Canvas, ThreeEvent, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, Line, Environment } from '@react-three/drei'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import * as THREE from 'three'
import { 
  Box, 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  Eye, 
  Ruler, 
  Scale, 
  Info,
  Sparkles,
  Layers,
  Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// Product Data Definition
interface ProductData {
  id: string
  name: string
  model_url: string
  category: string
  price: number
  scale_factor?: number
  vendor_id: string
}

// 3D Model primitive wrapper
function Model({ url, onSceneClick, onTransformExtracted }: { url: string; onSceneClick: (point: THREE.Vector3) => void, onTransformExtracted?: (scale: number) => void }) {
  const { scene } = useGLTF(url)
  const extractedRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (extractedRef.current === scene.uuid) return
    let transformRoot = scene.getObjectByName('Proxima_Transform_Root')
    if (transformRoot && onTransformExtracted) {
       extractedRef.current = scene.uuid
       onTransformExtracted(transformRoot.scale.x)
       // Reset the root transform scale so the React wrapper <group> takes over control
       transformRoot.position.set(0, 0, 0)
       transformRoot.rotation.set(0, 0, 0)
       transformRoot.scale.set(1, 1, 1)
       transformRoot.updateMatrixWorld(true)
    }
  }, [scene, onTransformExtracted])

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  return (
    <primitive 
      object={scene} 
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSceneClick(e.point)
      }}
    />
  )
}

// Holographic Human Reference Model
function HumanReference({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.castShadow = true
          mesh.receiveShadow = false
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach(mat => {
              mat.transparent = true
              mat.opacity = 0.65
              if ('color' in mat) {
                (mat as any).color.set('#10b981') // Holographic emerald green color
              }
            })
          }
        }
      })
    }
  }, [scene])

  return <primitive object={scene} position={[0, 0, 0]} />
}

// Calibration Overlay for Measurement Mode
function CalibrationOverlay({ points, measuredDistance }: { points: THREE.Vector3[], measuredDistance: number }) {
  if (points.length === 0) return null;

  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
          <pointLight color="#3b82f6" intensity={2} distance={2} />
        </mesh>
      ))}
      
      {points.length === 2 && (
        <>
          <Line 
            points={[points[0], points[1]]} 
            color="#3b82f6" 
            lineWidth={3} 
          />
          <Html position={points[0].clone().lerp(points[1], 0.5).add(new THREE.Vector3(0, 0.1, 0))} center zIndexRange={[100, 0]}>
            <div className="bg-blue-950/90 border border-blue-500/50 text-blue-200 font-mono text-[10px] px-3 py-1.5 rounded-none whitespace-nowrap shadow-lg select-none pointer-events-none uppercase tracking-widest">
              Distance: {measuredDistance.toFixed(3)}m
            </div>
          </Html>
        </>
      )}
    </group>
  )
}

// Camera reset controller component to return to origin
function CameraResetController({ triggerCount, orbitRef }: { triggerCount: number; orbitRef: React.MutableRefObject<any> }) {
  const { camera } = useThree()
  const prevTriggerRef = useRef(triggerCount)
  const targetPos = useRef<THREE.Vector3 | null>(null)
  const targetCam = useRef<THREE.Vector3 | null>(null)
  const active = useRef(false)

  useEffect(() => {
    if (triggerCount > prevTriggerRef.current) {
      prevTriggerRef.current = triggerCount
      targetPos.current = new THREE.Vector3(0, 0.5, 0) // Look at model center
      targetCam.current = new THREE.Vector3(0, 1.5, 3) // Camera pulled back
      active.current = true
    }
  }, [triggerCount])

  useEffect(() => {
    const controls = orbitRef.current
    if (controls) {
      const onStart = () => { active.current = false }
      controls.addEventListener('start', onStart)
      return () => controls.removeEventListener('start', onStart)
    }
  }, [orbitRef])

  useFrame(() => {
    if (!active.current || !targetPos.current || !targetCam.current || !orbitRef.current) return

    const controls = orbitRef.current
    controls.target.lerp(targetPos.current, 0.08)
    camera.position.lerp(targetCam.current, 0.08)

    if (
      controls.target.distanceTo(targetPos.current) < 0.05 &&
      camera.position.distanceTo(targetCam.current) < 0.05
    ) {
      controls.target.copy(targetPos.current)
      camera.position.copy(targetCam.current)
      active.current = false
    }
    controls.update()
  })

  return null
}

// Keyboard controller for WASDQE spatial navigation
function KeyboardCameraController({ orbitRef }: { orbitRef: React.MutableRefObject<any> }) {
  const { camera } = useThree()
  const keys = useRef<{ [key: string]: boolean }>({})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      keys.current[e.key.toLowerCase()] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      keys.current[e.key.toLowerCase()] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!orbitRef.current) return
    
    const controls = orbitRef.current
    const speed = 4 * delta // 4 units per second for smooth panning

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0 // Keep movement horizontal
    
    if (forward.lengthSq() < 0.001) {
       forward.set(0, 0, -1).applyQuaternion(camera.quaternion)
       forward.y = 0
    }
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, camera.up).normalize()

    const movement = new THREE.Vector3()

    if (keys.current['w']) movement.add(forward)
    if (keys.current['s']) movement.sub(forward)
    if (keys.current['d']) movement.add(right)
    if (keys.current['a']) movement.sub(right)
    if (keys.current['e']) movement.y += 1
    if (keys.current['q']) movement.y -= 1

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(speed)
      camera.position.add(movement)
      controls.target.add(movement)
      controls.update()
    }
  })

  return null
}

function VendorProductSpatialEditorContent() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')
  const router = useRouter()
  const { toast } = useToast()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<ProductData | null>(null)
  
  const [resetViewTrigger, setResetViewTrigger] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Model Scale & Guide States
  const [modelScale, setModelScale] = useState<number>(1.0)
  const [humanModelUrl, setHumanModelUrl] = useState<string | null>(null)
  const [showHumanRef, setShowHumanRef] = useState(true)

  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationPoints, setCalibrationPoints] = useState<THREE.Vector3[]>([])
  const [measuredDistance, setMeasuredDistance] = useState(0)
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false)
  const [realDistanceStr, setRealDistanceStr] = useState('')
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'ft'>('m')

  const handleResetCalibration = () => {
    setModelScale(1.0)
    toast({
      title: 'Calibration Reset',
      description: 'Model scale factor restored to 1.0x.',
    })
  }

  const handleApplyCalibration = () => {
    let realDist = parseFloat(realDistanceStr)
    if (isNaN(realDist) || realDist <= 0) return

    // Convert to meters if feet is selected
    if (distanceUnit === 'ft') {
      realDist = realDist * 0.3048
    }

    if (measuredDistance > 0) {
      const scaleFactor = realDist / measuredDistance
      const newScale = Math.max(0.0001, Math.min(5.0, modelScale * scaleFactor))
      
      setModelScale(newScale)
      
      toast({
        title: 'Scale Calibrated Successfully',
        description: `Model scaled uniformly by a factor of ${scaleFactor.toFixed(3)}.`,
      })
    }

    setCalibrationModalOpen(false)
    setIsCalibrating(false)
    setCalibrationPoints([])
    setRealDistanceStr('')
  }

  // Fetch Human Model URL
  useEffect(() => {
    async function fetchHumanUrl() {
      try {
        const { getHumanModelUrl } = await import('@/app/actions/r2-actions')
        const url = await getHumanModelUrl()
        setHumanModelUrl(url)
      } catch (err) {
        console.error('Error fetching human model url:', err)
      }
    }
    fetchHumanUrl()
  }, [])

  // Refs for camera / transform controls
  const orbitRef = useRef<any>(null)

  // Panel Collapse States
  const [metadataCollapsed, setMetadataCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMetadataCollapsed(true)
      setInspectorCollapsed(true)
    }
  }, [])

  // Fetch product details
  useEffect(() => {
    if (!productId || !mounted) return

    async function loadProduct() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (error || !data) {
          throw new Error('Product not found or you do not have permission.')
        }

        if (data.vendor_id !== user.id) {
          toast({
            title: 'Permission Denied',
            description: 'You do not own this product.',
            variant: 'destructive'
          })
          router.push('/vendor/products')
          return
        }

        if (!data.model_url) {
          toast({
            title: 'No 3D Model Found',
            description: 'This product does not have an associated 3D model. Please upload one first.',
            variant: 'destructive'
          })
          router.push('/vendor/products')
          return
        }

        setProduct({
          id: data.id,
          name: data.name,
          model_url: data.model_url,
          category: data.category,
          price: data.price,
          scale_factor: data.scale_factor,
          vendor_id: data.vendor_id
        })

        if (data.scale_factor !== undefined && data.scale_factor !== null) {
          setModelScale(Number(data.scale_factor) || 1.0)
        } else {
          setModelScale(1.0)
        }
      } catch (err: any) {
        console.error('Error loading product details:', err)
        toast({
          title: 'Error loading asset',
          description: err.message || 'Failed to retrieve product spatial metadata.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId, mounted])

  const handleSceneClick = (point?: THREE.Vector3) => {
    if (isCalibrating && point) {
      if (calibrationPoints.length < 2) {
        const newPoints = [...calibrationPoints, point]
        setCalibrationPoints(newPoints)
        
        if (newPoints.length === 2) {
          const dist = newPoints[0].distanceTo(newPoints[1])
          setMeasuredDistance(dist)
          setCalibrationModalOpen(true)
        }
      }
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto opacity-40" />
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-mono">Loading Immersive Product Editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen w-full flex flex-col bg-black overflow-hidden font-sans text-white select-none">
      
      {/* 1. Spatial Editor Header HUD */}
      <header className="h-20 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/vendor/products')}
            className="p-2 border border-neutral-800 hover:border-neutral-600 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all rounded-none"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> PRODUCT SPATIAL CALIBRATOR
              </span>
            </div>
            <h1 className="text-lg font-light tracking-tight text-white">{product?.name || '3D Model Layer'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Baking Status</span>
            <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
              {isSaving ? 'Compiling & Syncing...' : 'Awaiting Finalization'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border border-neutral-800 bg-neutral-950 p-1 mr-2 gap-1 shrink-0">
              <Button
                onClick={() => setMetadataCollapsed(prev => !prev)}
                variant="ghost"
                className={`h-9 px-3 rounded-none text-[10px] uppercase tracking-widest font-mono transition-all ${
                  !metadataCollapsed 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
                title="Toggle Product Metadata Panel"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Metadata
              </Button>
              <Button
                onClick={() => setInspectorCollapsed(prev => !prev)}
                variant="ghost"
                className={`h-9 px-3 rounded-none text-[10px] uppercase tracking-widest font-mono transition-all ${
                  !inspectorCollapsed 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
                title="Toggle Scale Inspector"
              >
                <Code className="w-3.5 h-3.5 mr-1.5" /> Calibrator
              </Button>
            </div>
            <Button 
              onClick={async () => {
                if (!productId) return

                if (product) {
                  const initialScale = product.scale_factor !== undefined && product.scale_factor !== null
                    ? Number(product.scale_factor) || 1.0
                    : 1.0;

                  const isScaleUnchanged = modelScale === initialScale;
                  
                  if (isScaleUnchanged) {
                    toast({
                      title: 'No Changes',
                      description: 'Model scale factor is unchanged. Skipping save.',
                    })
                    router.push('/vendor/products')
                    router.refresh()
                    return
                  }
                }

                setIsSaving(true)
                try {
                  toast({
                    title: 'Compiling Spatial Geometry',
                    description: 'Applying scaling matrix and rebuilding the 3D model...',
                  })
                  
                  const { bakeProductTransformIntoGLB } = await import('@/app/actions/r2-actions')
                  const bakeResult = await bakeProductTransformIntoGLB(
                    productId, 
                    modelScale
                  )
                  
                  if (!bakeResult.success) {
                    throw new Error(bakeResult.error || 'Compilation returned a failure status.')
                  }

                  toast({
                    title: 'Baking & Sync Completed',
                    description: 'Your product model scale was successfully baked and saved to the database!',
                  })
                  
                  router.push('/vendor/products')
                  router.refresh()
                } catch (err: any) {
                  console.error('Finalization failed:', err)
                  toast({
                    title: 'Baking & Sync Failed',
                    description: err.message || 'An unexpected failure occurred during layout finalization.',
                    variant: 'destructive'
                  })
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none text-black rounded-none text-xs font-bold uppercase tracking-widest px-8 h-11 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 w-full flex overflow-hidden min-h-0 relative">
        
        {/* 2. Left Metadata Panel */}
        <aside className={`border-neutral-900 bg-neutral-950 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
          metadataCollapsed 
            ? "w-0 border-r-0 opacity-0 pointer-events-none" 
            : "w-80 opacity-100 border-r"
        } absolute lg:relative inset-y-0 left-0 z-30 h-full lg:h-auto`}>
          <div className="p-5 border-b border-neutral-900 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Product Details
            </span>
            <button 
              onClick={() => setMetadataCollapsed(true)}
              className="p-1 text-neutral-500 hover:text-white transition-colors"
              title="Collapse Panel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Category</span>
              <p className="text-sm font-light text-neutral-300">{product?.category}</p>
            </div>
            
            <div className="space-y-1 border-t border-neutral-900 pt-4">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Base Price</span>
              <p className="text-lg font-light text-emerald-400 font-mono">₦{product?.price ? Number(product.price).toLocaleString() : '0'}</p>
            </div>

            <div className="space-y-1 border-t border-neutral-900 pt-4">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Baked Scale Factor</span>
              <p className="text-sm font-mono text-neutral-300">
                {product?.scale_factor !== undefined && product?.scale_factor !== null
                  ? `${product.scale_factor.toFixed(4)}x`
                  : '1.0000x (Default)'
                }
              </p>
            </div>

            <div className="border border-neutral-900 bg-neutral-950 p-4 mt-6 flex gap-3 text-neutral-500 leading-relaxed text-[10px] uppercase tracking-wide">
              <Info className="w-4 h-4 shrink-0 text-neutral-400" />
              <div>
                <p className="font-bold text-neutral-400">Scale Metric</p>
                <p className="mt-1">In real-world scaling, 1 unit is mapped directly to 1 meter. Real-world size calibration ensures your product displays correctly in 3D views and AR spaces.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* 3. Center Cinematic 3D Viewport */}
        <main className="flex-1 h-full bg-neutral-950 relative overflow-hidden flex flex-col justify-end">
          
          {/* Spatial Grid Design Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', 
              backgroundSize: '20px 20px' 
            }} 
          />

          {/* Floating Viewport Actions HUD */}
          <div className="absolute top-6 right-6 z-10 flex gap-3 pointer-events-auto">
            <Button
              onClick={() => {
                setResetViewTrigger(prev => prev + 1)
              }}
              className="bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 text-white rounded-none text-[10px] uppercase tracking-widest font-mono h-10 px-4 transition-all flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" /> Reset View
            </Button>
          </div>

          {/* Viewport Grid Lines */}
          <div className="absolute top-1/2 left-6 -translate-y-1/2 flex flex-col gap-8 pointer-events-none z-10 opacity-30">
            <div className="w-px h-16 bg-neutral-600" />
            <div className="w-px h-16 bg-neutral-600" />
          </div>
          <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-8 pointer-events-none z-10 opacity-30">
            <div className="w-px h-16 bg-neutral-600" />
            <div className="w-px h-16 bg-neutral-600" />
          </div>

          {/* Canvas Wrapper */}
          <div className="w-full h-full">
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 4], fov: 45 }}>
              <ambientLight intensity={0.7} />
              <directionalLight 
                position={[10, 20, 10]} 
                intensity={1.2} 
                castShadow 
                shadow-mapSize-width={2048} 
                shadow-mapSize-height={2048}
                shadow-bias={-0.0001}
              />
              <Suspense fallback={null}>
                <Environment preset="city" />

                {/* 1. Human Scale Reference Model */}
                {humanModelUrl && showHumanRef && (
                  <HumanReference url={humanModelUrl} />
                )}

                {/* 2. Scaled Environmental Model Group */}
                <group 
                  position={[0, 0, 0]} 
                  rotation={[0, 0, 0]} 
                  scale={[modelScale, modelScale, modelScale]}
                >
                  <group>
                    {product?.model_url && (
                      <Model 
                        url={product.model_url} 
                        onSceneClick={handleSceneClick} 
                        onTransformExtracted={(scale) => {
                          setModelScale(scale)
                        }}
                      />
                    )}
                  </group>
                </group>

                {isCalibrating && (
                  <CalibrationOverlay 
                    points={calibrationPoints} 
                    measuredDistance={measuredDistance} 
                  />
                )}
                
                <CameraResetController 
                  triggerCount={resetViewTrigger}
                  orbitRef={orbitRef}
                />
                
                {/* Free-roam keyboard panning (WASDQE) */}
                <KeyboardCameraController orbitRef={orbitRef} />
              </Suspense>
              
              <OrbitControls ref={orbitRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
            </Canvas>
          </div>

          {/* Interactive Navigation HUD */}
          <div className="absolute bottom-6 left-6 bg-neutral-950/80 border border-neutral-900 px-4 py-2 text-[9px] font-mono tracking-widest uppercase text-neutral-500 z-10 flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-neutral-600" /> WebGL Render: Active
          </div>

        </main>

        {/* 4. Right Selected Details Sidebar */}
        <aside className={`border-neutral-900 bg-neutral-950 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
          inspectorCollapsed 
            ? "w-0 border-l-0 opacity-0 pointer-events-none" 
            : "w-80 opacity-100 border-l"
        } absolute lg:relative inset-y-0 right-0 z-30 h-full lg:h-auto`}>
          <div className="p-5 border-b border-neutral-900 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold flex items-center gap-2">
              <Code className="w-3.5 h-3.5" /> Scale Calibrator
            </span>
            <button 
              onClick={() => setInspectorCollapsed(true)}
              className="p-1 text-neutral-500 hover:text-white transition-colors"
              title="Collapse Panel"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="border border-neutral-900 bg-neutral-950/60 p-4 space-y-4 rounded-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-405" /> Uniform Scale
                </span>
                <div className="flex items-center relative">
                  <Input 
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="5.0"
                    value={modelScale}
                    onChange={(e) => {
                       let val = parseFloat(e.target.value);
                       if (!isNaN(val)) {
                           if (val > 5.0) val = 5.0;
                           setModelScale(val);
                       }
                    }}
                    onBlur={(e) => {
                       let val = parseFloat(e.target.value);
                       if (!isNaN(val)) {
                           val = Math.max(0.0001, Math.min(5.0, val));
                           setModelScale(val);
                       }
                    }}
                    className="w-24 bg-emerald-950/40 border-emerald-900/30 text-emerald-400 font-mono text-[10px] h-6 px-1.5 py-0 text-right rounded-none outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 pr-5"
                  />
                  <span className="absolute right-1.5 text-[10px] font-mono text-emerald-500/70 pointer-events-none">x</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <p className="text-[9px] text-neutral-500 uppercase tracking-wide leading-relaxed">
                  Measure a known real-world distance in the model scan to automatically calculate the correct uniform scale factor.
                </p>
                <Button
                  onClick={() => {
                    if (isCalibrating) {
                      setIsCalibrating(false)
                      setCalibrationPoints([])
                    } else {
                      setIsCalibrating(true)
                      setCalibrationPoints([])
                      toast({
                        title: 'Calibration Mode Active',
                        description: 'Click on the first point of your measurement.',
                      })
                    }
                  }}
                  variant={isCalibrating ? "secondary" : "default"}
                  className={`w-full h-9 text-[10px] rounded-none uppercase tracking-widest font-mono transition-all flex items-center gap-2 ${
                    isCalibrating 
                      ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50 hover:bg-blue-900/60' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" /> 
                  {isCalibrating ? 'Cancel Calibration' : 'Start Calibration'}
                </Button>
              </div>

              {/* Guide Model Visibility Toggle */}
              <div className="flex items-center justify-between border-t border-neutral-900 pt-3">
                <span className="text-[9px] uppercase tracking-wider text-neutral-400">Human Scale Guide</span>
                <Button
                  onClick={() => setShowHumanRef(prev => !prev)}
                  variant="ghost"
                  className={`h-7 px-3 rounded-none text-[8px] uppercase tracking-widest font-mono border transition-all ${
                    showHumanRef
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/40'
                      : 'text-neutral-500 hover:text-white border-neutral-900 hover:bg-neutral-900'
                  }`}
                >
                  {showHumanRef ? 'Visible' : 'Hidden'}
                </Button>
              </div>

              {/* Range Slider & Fine Controls */}
              <div className="space-y-3 pt-3 border-t border-neutral-900">
                <div className="flex items-center justify-between gap-2.5">
                  <Button
                    onClick={() => setModelScale(prev => Math.max(0.0001, parseFloat((prev - 0.01).toFixed(4))))}
                    variant="outline"
                    className="h-8 w-8 p-0 border-neutral-800 hover:bg-neutral-900 text-white rounded-none font-mono text-xs"
                    title="Scale Down 0.01"
                  >
                    -
                  </Button>
                  <input
                    type="range"
                    min="0.0001"
                    max="5"
                    step="0.0001"
                    value={modelScale}
                    onChange={(e) => setModelScale(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 bg-neutral-900 h-1 cursor-pointer appearance-none rounded"
                  />
                  <Button
                    onClick={() => setModelScale(prev => Math.min(5, parseFloat((prev + 0.01).toFixed(4))))}
                    variant="outline"
                    className="h-8 w-8 p-0 border-neutral-800 hover:bg-neutral-900 text-white rounded-none font-mono text-xs"
                    title="Scale Up 0.01"
                  >
                    +
                  </Button>
                </div>
                <div className="flex justify-between text-[8px] font-mono text-neutral-600 uppercase tracking-widest px-1">
                  <span>0.0001x</span>
                  <span>5.0x</span>
                </div>
              </div>

              {/* Micro-Adjustment Precision Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={() => setModelScale(prev => Math.max(0.0001, parseFloat((prev - 0.001).toFixed(4))))}
                  variant="outline"
                  className="h-7 text-[8px] border-neutral-900 hover:bg-neutral-950 text-neutral-400 rounded-none uppercase tracking-widest font-mono"
                  title="Precise Scale Down 0.001"
                >
                  -0.001 Precision
                </Button>
                <Button
                  onClick={() => setModelScale(prev => Math.min(5, parseFloat((prev + 0.001).toFixed(4))))}
                  variant="outline"
                  className="h-7 text-[8px] border-neutral-900 hover:bg-neutral-950 text-neutral-400 rounded-none uppercase tracking-widest font-mono"
                  title="Precise Scale Up 0.001"
                >
                  +0.001 Precision
                </Button>
              </div>

              {/* Reset Scale Button */}
              <div className="pt-2 border-t border-neutral-900">
                <Button
                  onClick={handleResetCalibration}
                  variant="outline"
                  className="w-full h-8 text-[9px] border-neutral-900 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900/50 text-neutral-500 rounded-none uppercase tracking-widest font-mono transition-all"
                >
                  Reset Scale
                </Button>
              </div>
            </div>

            <div className="p-4 border border-neutral-900 bg-neutral-950/30 text-[10px] text-neutral-600 leading-relaxed uppercase tracking-wider space-y-2">
              <span className="font-bold text-neutral-500">Spatial Controls:</span>
              <p>1. Rotate model view: Left Click + Drag</p>
              <p>2. Pan camera: Right Click + Drag</p>
              <p>3. Move camera: Use W, A, S, D, Q, E keys</p>
              <p>4. Measure: Click "Start Calibration" and click two distinct endpoints on the model</p>
            </div>
          </div>
        </aside>

      </div>

      {/* Immersive Saving Done Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black z-[999999] flex flex-col items-center justify-center space-y-6 select-none animate-in fade-in duration-300">
          <div className="relative flex items-center justify-center">
            {/* Spinning glowing ring */}
            <div className="absolute w-24 h-24 border-t-2 border-r-2 border-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            <div className="absolute w-20 h-20 border-b-2 border-l-2 border-emerald-500/30 rounded-full animate-spin-reverse" />
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          
          <div className="text-center space-y-3 max-w-sm px-6 animate-pulse">
            <h2 className="text-sm font-mono tracking-[0.3em] text-emerald-400 uppercase font-bold">
              Baking Product Transform
            </h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              Applying the scaling matrix and writing persistent metadata directly to the GLB binary buffer. Please do not close this window.
            </p>
          </div>
        </div>
      )}

      {/* 5. Calibration Distance Input Modal */}
      <Dialog open={calibrationModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCalibrationModalOpen(false)
          setIsCalibrating(false)
          setCalibrationPoints([])
        }
      }}>
        <DialogContent className="bg-neutral-950 border border-neutral-900 rounded-none max-w-md p-6 font-sans text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-widest text-emerald-400 uppercase flex items-center gap-2">
              <Ruler className="w-4 h-4" /> Real-World Distance
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-1 pt-1 bg-blue-950/20 p-3 border border-blue-900/50">
              <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold block">Measured 3D Distance</span>
              <span className="text-[12px] font-mono text-blue-200 block truncate">
                {measuredDistance.toFixed(3)} meters
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Actual Distance</label>
              <div className="flex gap-2">
                <Input 
                  required
                  autoFocus
                  type="number"
                  step="0.01"
                  value={realDistanceStr}
                  onChange={e => setRealDistanceStr(e.target.value)}
                  placeholder="e.g. 1.2"
                  className="bg-black border-neutral-800 text-white rounded-none h-11 text-xs focus-visible:ring-1 focus-visible:ring-emerald-700 flex-1 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyCalibration()
                  }}
                />
                <select 
                  value={distanceUnit}
                  onChange={(e) => setDistanceUnit(e.target.value as 'm' | 'ft')}
                  className="bg-black border border-neutral-800 text-white rounded-none h-11 px-3 text-xs uppercase tracking-widest focus-visible:ring-1 focus-visible:ring-emerald-700 cursor-pointer"
                >
                  <option value="m">Meters (m)</option>
                  <option value="ft">Feet (ft)</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-neutral-900 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setCalibrationModalOpen(false)
                setIsCalibrating(false)
                setCalibrationPoints([])
              }}
              className="border-neutral-800 hover:bg-neutral-900 rounded-none text-xs uppercase tracking-widest h-11"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleApplyCalibration}
              disabled={!realDistanceStr || isNaN(parseFloat(realDistanceStr)) || parseFloat(realDistanceStr) <= 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold uppercase tracking-widest h-11 px-6 disabled:opacity-50"
            >
              Apply Scale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VendorProductSpatialEditor() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto opacity-40" />
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-mono">Loading Immersive Product Editor...</p>
        </div>
      </div>
    }>
      <VendorProductSpatialEditorContent />
    </Suspense>
  )
}
