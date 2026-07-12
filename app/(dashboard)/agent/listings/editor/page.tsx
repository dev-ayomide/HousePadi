'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Canvas, ThreeEvent, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, TransformControls, Environment, Line } from '@react-three/drei'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import * as THREE from 'three'
import { 
  Box, 
  Trash2, 
  Edit3, 
  Save, 
  ArrowLeft, 
  MapPin, 
  Loader2, 
  CheckCircle, 
  Eye, 
  Code,
  Compass,
  Layers,
  Sparkles,
  Plus,
  ChevronRight,
  Ruler,
  Scale
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'

// POI Type Definition
interface POIData {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  type: 'poi'
}

// Listing Data Definition
interface ListingData {
  id: string
  name: string
  model_url: string
  pois: POIData[]
  status: string
  tableName: 'apartments' | 'event_centers' | 'public_space'
  model_scale?: number
  scale_factor?: number
  transform_metadata?: any
}

// POI Naming Auto-formatter
export function formatPOIName(input: string): string {
  let name = input.trim().replace(/[^a-zA-Z0-9\s_]/g, '')
  const words = name.split(/[\s_]+/)
  if (words.length > 0 && words[0].toLowerCase() === 'poi') {
    words[0] = 'POI'
  }
  const formattedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1))
  name = formattedWords.join('_')
  
  if (!name.startsWith('POI_')) {
    name = `POI_${name}`
  }
  return name
}

// 3D Model primitive wrapper
function Model({ url, onSceneClick, onTransformExtracted }: { url: string; onSceneClick: (point: THREE.Vector3) => void, onTransformExtracted?: (pos: [number,number,number], rot: [number,number,number], scale: number) => void }) {
  const { scene } = useGLTF(url)

  const extractedRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (extractedRef.current === scene.uuid) return
    let transformRoot = scene.getObjectByName('Proxima_Transform_Root')
    if (transformRoot && onTransformExtracted) {
       extractedRef.current = scene.uuid
       onTransformExtracted(
          [transformRoot.position.x, transformRoot.position.y, transformRoot.position.z],
          [transformRoot.rotation.x, transformRoot.rotation.y, transformRoot.rotation.z],
          transformRoot.scale.x
       )
       // Reset the root transform to identity so the React wrapper <group> takes over control
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
          <sphereGeometry args={[0.08, 16, 16]} />
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
          <Html position={points[0].clone().lerp(points[1], 0.5).add(new THREE.Vector3(0, 0.2, 0))} center zIndexRange={[100, 0]}>
            <div className="bg-blue-950/90 border border-blue-500/50 text-blue-200 font-mono text-[10px] px-3 py-1.5 rounded-none whitespace-nowrap shadow-lg select-none pointer-events-none uppercase tracking-widest">
              Distance: {measuredDistance.toFixed(3)}m
            </div>
          </Html>
        </>
      )}
    </group>
  )
}

// Scene controller component to capture camera details and spawn node in front of view
function SceneController({ triggerCount, onAddAtPosition }: { triggerCount: number; onAddAtPosition: (pos: [number, number, number]) => void }) {
  const { camera } = useThree()
  const prevTriggerRef = useRef(triggerCount)

  useEffect(() => {
    if (triggerCount > prevTriggerRef.current) {
      prevTriggerRef.current = triggerCount
      
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      
      const spawnPosition = new THREE.Vector3()
      // Position the node ~1.8 units in front of the camera
      spawnPosition.copy(camera.position).addScaledVector(direction, 1.8)
      
      onAddAtPosition([spawnPosition.x, spawnPosition.y, spawnPosition.z])
    }
  }, [triggerCount, camera, onAddAtPosition])

  return null
}

// Camera snap controller component with smooth cinematic interpolation
function CameraSnapController({ 
  selectedPoi, 
  triggerCount,
  orbitRef,
  modelPosition,
  modelRotation,
  modelScale
}: { 
  selectedPoi: POIData | undefined
  triggerCount: number
  orbitRef: React.MutableRefObject<any>
  modelPosition: [number, number, number]
  modelRotation: [number, number, number]
  modelScale: number
}) {
  const { camera } = useThree()
  const targetPos = useRef<THREE.Vector3 | null>(null)
  const targetCam = useRef<THREE.Vector3 | null>(null)
  const active = useRef(false)
  const prevTriggerRef = useRef(triggerCount)

  useEffect(() => {
    if (selectedPoi && triggerCount > prevTriggerRef.current) {
      prevTriggerRef.current = triggerCount
      const localPos = new THREE.Vector3(...selectedPoi.position)
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(...modelPosition),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation)),
        new THREE.Vector3(modelScale, modelScale, modelScale)
      )
      
      const worldPos = localPos.clone().applyMatrix4(transform)
      targetPos.current = worldPos
      
      // Elevated offset to frame the POI beautifully (in world space)
      targetCam.current = new THREE.Vector3(worldPos.x, worldPos.y + 1.2, worldPos.z + 2.2)
      active.current = true
    } else {
      if (!selectedPoi) {
        active.current = false
      }
      prevTriggerRef.current = triggerCount
    }
  }, [triggerCount, selectedPoi, modelPosition, modelRotation, modelScale])

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

    // Smoothly interpolate camera target and position
    controls.target.lerp(targetPos.current, 0.08)
    camera.position.lerp(targetCam.current, 0.08)

    // Complete interpolation when target and position are extremely close
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
      targetPos.current = new THREE.Vector3(0, 1, 0) // Look at avatar chest
      targetCam.current = new THREE.Vector3(0, 2.5, 5) // Camera pulled back slightly
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
    const speed = 7 * delta // 7 units per second for smooth panning

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0 // Keep movement horizontal for W/S
    
    // Fallback if looking straight down/up
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

// Custom pulsing spatial marker with floating label
interface POIMarkerProps {
  name: string
  isSelected: boolean
  onClick: () => void
}

function POIMarker({ name, isSelected, onClick }: POIMarkerProps) {
  const haloRef = useRef<THREE.Mesh>(null)

  // Subtle pulsing scale & opacity in useFrame is handled standardly
  // To avoid R3F performance overhead, we use standard clean glassmorphism labels and core glowing spheres
  return (
    <group>
      {/* Click target core */}
      <mesh onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial 
          color={isSelected ? "#10b981" : "#ffffff"} 
          toneMapped={false}
        />
      </mesh>
      
      {/* Outer ring outline */}
      <mesh>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial 
          color={isSelected ? "#10b981" : "#737373"} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating 2D spatial label */}
      <Html 
        distanceFactor={7} 
        position={[0, 0.28, 0]} 
        center
        className="pointer-events-none select-none"
      >
        <div className={`px-2.5 py-1 backdrop-blur-md border rounded-none whitespace-nowrap text-[9px] uppercase tracking-widest font-mono transition-all duration-300 ${
          isSelected 
            ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-400 font-bold" 
            : "bg-black/90 border-neutral-800 text-neutral-400"
        }`}>
          {name}
        </div>
      </Html>
    </group>
  )
}

function SpatialModelEditorContent() {
  const searchParams = useSearchParams()
  const listingId = searchParams.get('id')
  const router = useRouter()
  const { toast } = useToast()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [listing, setListing] = useState<ListingData | null>(null)
  
  // Editor States
  const [pois, setPois] = useState<POIData[]>([])
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  
  // Placement State
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false)
  const [tempPosition, setTempPosition] = useState<[number, number, number] | null>(null)
  const [poiInputName, setPoiInputName] = useState('')

  // Trigger spawning node in front of viewport camera
  const [addNodeTrigger, setAddNodeTrigger] = useState(0)
  const [resetViewTrigger, setResetViewTrigger] = useState(0)
  const [focusTrigger, setFocusTrigger] = useState(0)
  
  const [activeNode, setActiveNode] = useState<THREE.Object3D | null>(null)

  const handleTriggerAddNode = () => {
    setAddNodeTrigger(prev => prev + 1)
  }
  
  // Save State
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string>('Unsaved')

  // Model Scale & Guide States
  const [modelScale, setModelScale] = useState<number>(1.0)
  const [modelPosition, setModelPosition] = useState<[number, number, number]>([0, 0, 0])
  const [modelRotation, setModelRotation] = useState<[number, number, number]>([0, 0, 0])
  const [humanModelUrl, setHumanModelUrl] = useState<string | null>(null)
  const [showHumanRef, setShowHumanRef] = useState(true)
  const [showSqlMigrationDialog, setShowSqlMigrationDialog] = useState(false)

  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationPoints, setCalibrationPoints] = useState<THREE.Vector3[]>([])
  const [measuredDistance, setMeasuredDistance] = useState(0)
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false)
  const [realDistanceStr, setRealDistanceStr] = useState('')
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'ft'>('m')

  const handleResetCalibration = () => {
    setModelPosition([0, 0, 0])
    setModelRotation([0, 0, 0])
    setModelScale(1.0)
    toast({
      title: 'Calibration Reset',
      description: 'Spatial transforms restored to original state.',
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

  // Keyboard listener for focusing node on 'F' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key.toLowerCase() === 'f') {
        if (selectedPoiId) {
          setFocusTrigger(prev => prev + 1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPoiId])

  // Refs for camera / transform controls
  const orbitRef = useRef<any>(null)
  const transformRef = useRef<any>(null)

  // Sidebar Collapse States (Collapsible to preserve workspace on crowded / mobile screens)
  const [outlinerCollapsed, setOutlinerCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setOutlinerCollapsed(true)
      setInspectorCollapsed(true)
    }
  }, [])

  // Fetch listing details
  useEffect(() => {
    if (!listingId || !mounted) return

    async function loadListing() {
      try {
        const supabase = createClient()
        
        // Query all 3 tables with select('*') for schema resilience
        const [apt, evt, pub] = await Promise.all([
          supabase.from('apartments').select('*').eq('id', listingId).maybeSingle(),
          supabase.from('event_centers').select('*').eq('id', listingId).maybeSingle(),
          supabase.from('public_space').select('*').eq('id', listingId).maybeSingle()
        ])

        let data = null;
        let tableName: 'apartments' | 'event_centers' | 'public_space' = 'apartments';

        if (apt.data) {
          data = apt.data;
          tableName = 'apartments';
        } else if (evt.data) {
          data = evt.data;
          tableName = 'event_centers';
        } else if (pub.data) {
          data = pub.data;
          tableName = 'public_space';
        }

        if (!data) {
          throw new Error('Listing not found or you do not have permission.')
        }

        if (!data.model_url) {
          toast({
            title: 'No 3D Model Found',
            description: 'This listing does not have an associated 3D model asset. Please upload one first.',
            variant: 'destructive'
          })
          router.push('/agent/listings')
          return
        }

        const parsedPois = Array.isArray(data.pois) ? (data.pois as POIData[]) : []

        setListing({
          id: data.id,
          name: data.name,
          model_url: data.model_url,
          pois: parsedPois,
          status: data.status,
          tableName,
          model_scale: data.model_scale,
          scale_factor: data.scale_factor,
          transform_metadata: data.transform_metadata
        })
        setPois(parsedPois)
        if (data.transform_metadata !== undefined && data.transform_metadata !== null) {
          let tm = data.transform_metadata;
          if (typeof tm === 'string') {
            try { tm = JSON.parse(tm); } catch (e) {}
          }
          if (typeof tm === 'object' && tm !== null && !Array.isArray(tm)) {
             setModelPosition(tm.position || [0,0,0])
             setModelRotation(tm.rotation || [0,0,0])
             setModelScale(Number(tm.scale) || 1.0)
          } else {
             // Fallback for old numeric values
             setModelScale(1.0 / (Number(tm) || 1.0))
          }
        } else if (data.scale_factor !== undefined && data.scale_factor !== null) {
          setModelScale(Number(data.scale_factor) || 1.0)
        } else if (data.model_scale !== undefined && data.model_scale !== null) {
          setModelScale(Number(data.model_scale) || 1.0)
        } else {
          setModelScale(1.0)
        }
      } catch (err: any) {
        console.error('Error loading listing details:', err)
        toast({
          title: 'Error loading asset',
          description: err.message || 'Failed to retrieve property spatial metadata.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadListing()
  }, [listingId, mounted])


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
      return
    }

    setSelectedPoiId(null)
  }

  // Confirm and Create POI Node
  const handleConfirmPlacement = () => {
    if (!tempPosition || !poiInputName.trim()) return

    const formattedName = formatPOIName(poiInputName)
    const newPoi: POIData = {
      id: `poi_${Date.now()}`,
      name: formattedName,
      position: tempPosition,
      rotation: [0, 0, 0],
      type: 'poi'
    }

    const updatedPois = [...pois, newPoi]
    setPois(updatedPois)
    setSelectedPoiId(newPoi.id)
    setIsPlacementModalOpen(false)
    setTempPosition(null)
    setPoiInputName('')
    
    toast({
      title: 'Spatial Node Created',
      description: `Added "${formattedName}" to architectural hierarchy.`,
    })
  }

  // Update POI coordinates
  const updatePoiPosition = (id: string, newPos: [number, number, number]) => {
    setPois(prev => prev.map(p => p.id === id ? { ...p, position: newPos } : p))
  }

  // Update POI name
  const renamePoi = (id: string, newName: string) => {
    const formatted = formatPOIName(newName)
    setPois(prev => prev.map(p => p.id === id ? { ...p, name: formatted } : p))
    toast({
      title: 'Node Renamed',
      description: `Hierarchy node changed to "${formatted}".`
    })
  }

  // Delete POI node
  const deletePoi = (id: string) => {
    setPois(prev => prev.filter(p => p.id !== id))
    if (selectedPoiId === id) setSelectedPoiId(null)
    toast({
      title: 'Node Deleted',
      description: 'POI removed from listing metadata hierarchy.',
      variant: 'destructive'
    })
  }



  const selectedPoi = pois.find(p => p.id === selectedPoiId)

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto opacity-40" />
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-mono">Loading Immersive Spatial Editor...</p>
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
            onClick={() => router.push('/agent/listings')}
            className="p-2 border border-neutral-800 hover:border-neutral-600 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all rounded-none"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SPATIAL ANNOTATION EDITOR
              </span>
            </div>
            <h1 className="text-lg font-light tracking-tight text-white">{listing?.name || '3D Architecture Layer'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicators */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Baking Status</span>
            <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
              {isSaving ? 'Compiling & Syncing...' : 'Awaiting Finalization'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Persistent Workspace Layout Switcher (Always reachable, never covered by sidebars) */}
            <div className="flex border border-neutral-800 bg-neutral-950 p-1 mr-2 gap-1 shrink-0">
              <Button
                onClick={() => setOutlinerCollapsed(prev => !prev)}
                variant="ghost"
                className={`h-9 px-3 rounded-none text-[10px] uppercase tracking-widest font-mono transition-all ${
                  !outlinerCollapsed 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
                title="Toggle Spatial Outliner Hierarchy"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Hierarchy
              </Button>
              <Button
                onClick={() => setInspectorCollapsed(prev => !prev)}
                variant="ghost"
                className={`h-9 px-3 rounded-none text-[10px] uppercase tracking-widest font-mono transition-all ${
                  !inspectorCollapsed 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
                title="Toggle Node Inspector"
              >
                <Code className="w-3.5 h-3.5 mr-1.5" /> Inspector
              </Button>
            </div>
            <Button 
              onClick={async () => {
                if (!listingId) return

                if (listing) {
                  const initialModelScale = listing.scale_factor !== undefined && listing.scale_factor !== null
                    ? Number(listing.scale_factor) || 1.0
                    : listing.model_scale !== undefined && listing.model_scale !== null
                      ? Number(listing.model_scale) || 1.0
                      : 1.0;

                  const isPoisUnchanged = JSON.stringify(pois) === JSON.stringify(listing.pois || []);
                  const isScaleUnchanged = modelScale === initialModelScale;
                  
                  let initialPos = [0, 0, 0];
                  let initialRot = [0, 0, 0];
                  if (listing.transform_metadata && typeof listing.transform_metadata === 'object' && !Array.isArray(listing.transform_metadata)) {
                    initialPos = listing.transform_metadata.position || [0,0,0];
                    initialRot = listing.transform_metadata.rotation || [0,0,0];
                  }
                  
                  const isPosUnchanged = modelPosition[0] === initialPos[0] && modelPosition[1] === initialPos[1] && modelPosition[2] === initialPos[2];
                  const isRotUnchanged = modelRotation[0] === initialRot[0] && modelRotation[1] === initialRot[1] && modelRotation[2] === initialRot[2];

                  if (isPoisUnchanged && isScaleUnchanged && isPosUnchanged && isRotUnchanged) {
                    toast({
                      title: 'No Changes',
                      description: 'Spatial configuration is unchanged. Skipping save.',
                    })
                    router.push('/agent/listings')
                    router.refresh()
                    return
                  }
                }

                setIsSaving(true)
                try {
                  toast({
                    title: 'Compiling Spatial Geometry',
                    description: 'Baking glowing crystal octahedral markers and generating cache-busted .glb file...',
                  })
                  
                  const { bakePOIsIntoGLB } = await import('@/app/actions/r2-actions')
                  const bakeResult = await bakePOIsIntoGLB(
                    listingId, 
                    pois, 
                    listing?.tableName || 'apartments', 
                    modelScale,
                    modelPosition,
                    modelRotation
                  )
                  
                  if (!bakeResult.success) {
                    throw new Error(bakeResult.error || 'Compilation returned a failure status.')
                  }

                  if (bakeResult.error === 'MISSING_SCALE_COLUMN') {
                    setShowSqlMigrationDialog(true)
                    return
                  }

                  toast({
                    title: 'Baking & Sync Completed',
                    description: 'Your model was successfully baked, cache-busted, and updated for all dashboards!',
                  })
                  
                  router.push('/agent/listings')
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
        
        {/* 2. Left Outliner Panel (Virtual 3D Hierarchy) */}
        <aside className={`border-neutral-900 bg-neutral-950 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
          outlinerCollapsed 
            ? "w-0 border-r-0 opacity-0 pointer-events-none" 
            : "w-80 opacity-100 border-r"
        } absolute lg:relative inset-y-0 left-0 z-30 h-full lg:h-auto`}>
          <div className="p-5 border-b border-neutral-900 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Spatial Outliner
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-600 bg-neutral-900 px-2 py-0.5">{pois.length} nodes</span>
              <button 
                onClick={() => setOutlinerCollapsed(true)}
                className="p-1 text-neutral-500 hover:text-white transition-colors"
                title="Collapse Panel"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-neutral-900 bg-neutral-950">
            <Button
              onClick={handleTriggerAddNode}
              className="w-full bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest h-11 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Spatial Node
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {pois.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Compass className="w-8 h-8 text-neutral-700 animate-spin-slow" />
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Empty Outliner Hierarchy</p>
                  <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-wider leading-relaxed">
                    Click "+ Add Spatial Node" to place a point of interest in front of the camera, then drag to reposition.
                  </p>
                </div>
              </div>
            ) : (
              pois.map((poi) => (
                <div 
                  key={poi.id}
                  onClick={() => setSelectedPoiId(poi.id)}
                  className={`group w-full px-4 py-3 flex items-center justify-between border cursor-pointer transition-all duration-200 ${
                    selectedPoiId === poi.id 
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                      : "bg-neutral-900/30 border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MapPin className={`w-3.5 h-3.5 ${selectedPoiId === poi.id ? "text-emerald-400" : "text-neutral-600"}`} />
                    <span className="text-xs font-mono truncate">{poi.name}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        const newName = prompt('Enter new node name:', poi.name)
                        if (newName) renamePoi(poi.id, newName)
                      }}
                      className="p-1 text-neutral-500 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        deletePoi(poi.id)
                      }}
                      className="p-1 text-neutral-500 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-neutral-900 bg-neutral-950/50 text-[10px] text-neutral-600 leading-relaxed uppercase tracking-wider space-y-1">
            <span className="font-bold text-neutral-500">Spatial Instructions:</span>
            <p>1. Orbit: Click + Drag mouse</p>
            <p>2. Pan: Right Click + Drag</p>
            <p>3. Annotate: Click "+ Add Spatial Node"</p>
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
                setSelectedPoiId(null)
                setResetViewTrigger(prev => prev + 1)
              }}
              className="bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 text-white rounded-none text-[10px] uppercase tracking-widest font-mono h-10 px-4 transition-all flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" /> Reset View
            </Button>
            <Button
              onClick={handleTriggerAddNode}
              className="bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 text-white rounded-none text-[10px] uppercase tracking-widest font-mono h-10 px-4 transition-all flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" /> Spawn Node at Viewport
            </Button>
          </div>

          {/* Viewport Crosshair Center HUD */}
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
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 8, 12], fov: 45 }}>
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
                  position={modelPosition} 
                  rotation={modelRotation} 
                  scale={[modelScale, modelScale, modelScale]}
                >
                  <group>
                    {listing?.model_url && (
                      <Model 
                        url={listing.model_url} 
                        onSceneClick={handleSceneClick} 
                        onTransformExtracted={(pos, rot, scale) => {
                          setModelPosition(pos)
                          setModelRotation(rot)
                          setModelScale(scale)
                        }}
                      />
                    )}
                  </group>

                  {/* Render POIs inside the scaled group so they transform together */}
                  {pois.map((poi) => {
                    const isSelected = selectedPoiId === poi.id
                    return (
                      <group 
                        key={poi.id} 
                        position={poi.position}
                        ref={isSelected ? setActiveNode : undefined}
                      >
                        <POIMarker 
                          name={poi.name} 
                          isSelected={isSelected} 
                          onClick={() => setSelectedPoiId(poi.id)} 
                        />
                      </group>
                    )
                  })}
                </group>

                {/* Independent Gizmo Controller - Rendered outside scaled group so it never shrinks */}
                {activeNode && selectedPoiId && (
                  <TransformControls
                    object={activeNode}
                    mode="translate"
                    size={0.75}
                    onMouseUp={(e) => {
                       if (orbitRef.current) orbitRef.current.enabled = true;
                       if (activeNode) {
                          updatePoiPosition(selectedPoiId, [activeNode.position.x, activeNode.position.y, activeNode.position.z]);
                       }
                    }}
                    onMouseDown={() => {
                       if (orbitRef.current) orbitRef.current.enabled = false;
                    }}
                  />
                )}

                {isCalibrating && (
                  <CalibrationOverlay 
                    points={calibrationPoints} 
                    measuredDistance={measuredDistance} 
                  />
                )}

                <SceneController 
                  triggerCount={addNodeTrigger} 
                  onAddAtPosition={(pos) => {
                    // Convert world coordinates to local coordinates of scaled/translated group
                    const inverseTransform = new THREE.Matrix4().compose(
                      new THREE.Vector3(...modelPosition),
                      new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation)),
                      new THREE.Vector3(modelScale, modelScale, modelScale)
                    ).invert()

                    const worldPos = new THREE.Vector3(...pos)
                    worldPos.applyMatrix4(inverseTransform)

                    setTempPosition([worldPos.x, worldPos.y, worldPos.z])
                    setPoiInputName('')
                    setIsPlacementModalOpen(true)
                  }}
                />

                <CameraSnapController 
                  selectedPoi={selectedPoi} 
                  triggerCount={focusTrigger}
                  orbitRef={orbitRef} 
                  modelPosition={modelPosition}
                  modelRotation={modelRotation}
                  modelScale={modelScale}
                />
                
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

          {/* Interactive Navigation Compass HUD */}
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
              <Code className="w-3.5 h-3.5" /> Node Inspector
            </span>
            <button 
              onClick={() => setInspectorCollapsed(true)}
              className="p-1 text-neutral-500 hover:text-white transition-colors"
              title="Collapse Panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Real-world Scale Calibration System */}
            <div className="border border-neutral-900 bg-neutral-950/60 p-4 space-y-4 rounded-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-450 font-bold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" /> Spatial Calibration
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
                    className="w-24 bg-emerald-950/40 border-emerald-900/30 text-emerald-450 font-mono text-[10px] h-6 px-1.5 py-0 text-right rounded-none outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 pr-5"
                  />
                  <span className="absolute right-1.5 text-[10px] font-mono text-emerald-500/70 pointer-events-none">x</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <p className="text-[9px] text-neutral-500 uppercase tracking-wide leading-relaxed">
                  Measure a known real-world distance in the scan to automatically calculate the correct uniform scale factor.
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

              {/* Manual Position Controls */}
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <span className="text-[9px] uppercase tracking-wider text-neutral-400">Position Offset (X, Y, Z)</span>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((axis) => (
                    <Input 
                      key={axis}
                      type="number"
                      step="0.1"
                      value={Number(modelPosition[axis].toFixed(3))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        const newPos = [...modelPosition] as [number, number, number]
                        newPos[axis] = val
                        setModelPosition(newPos)
                      }}
                      className="bg-black border-neutral-900 text-white font-mono text-xs rounded-none h-8 px-2 text-center"
                    />
                  ))}
                </div>
              </div>

              {/* Manual Rotation Controls */}
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <span className="text-[9px] uppercase tracking-wider text-neutral-400">Rotation (Pitch, Yaw, Roll)</span>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((axis) => (
                    <Input 
                      key={axis}
                      type="number"
                      step="0.05"
                      value={Number(modelRotation[axis].toFixed(3))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        const newRot = [...modelRotation] as [number, number, number]
                        newRot[axis] = val
                        setModelRotation(newRot)
                      }}
                      className="bg-black border-neutral-900 text-white font-mono text-xs rounded-none h-8 px-2 text-center"
                    />
                  ))}
                </div>
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
              <div className="space-y-3 pt-1 border-t border-neutral-900">
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
                  className="h-7 text-[8px] border-neutral-900 hover:bg-neutral-905 text-neutral-450 rounded-none uppercase tracking-widest font-mono"
                  title="Precise Scale Down 0.001"
                >
                  -0.001 Precision
                </Button>
                  <Button
                  onClick={() => setModelScale(prev => Math.min(5, parseFloat((prev + 0.001).toFixed(4))))}
                  variant="outline"
                  className="h-7 text-[8px] border-neutral-900 hover:bg-neutral-905 text-neutral-450 rounded-none uppercase tracking-widest font-mono"
                  title="Precise Scale Up 0.001"
                >
                  +0.001 Precision
                </Button>
              </div>

              {/* Reset Calibration Button */}
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

            {selectedPoi ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Node ID</label>
                  <p className="text-xs font-mono text-neutral-400 bg-neutral-900/50 p-2.5 border border-neutral-900">{selectedPoi.id}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Formal Tag Name</label>
                  <Input 
                    value={selectedPoi.name}
                    onChange={(e) => {
                      setPois(prev => prev.map(p => p.id === selectedPoi.id ? { ...p, name: e.target.value } : p))
                    }}
                    onBlur={(e) => {
                      renamePoi(selectedPoi.id, e.target.value)
                    }}
                    className="bg-black border-neutral-800 text-white rounded-none h-11 text-xs font-mono focus-visible:ring-1 focus-visible:ring-neutral-700"
                  />
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mt-1">Converts automatically to POI_Format</p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Spatial Vector Positions</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <span className="text-[8px] text-neutral-600 font-mono uppercase block">X-Vector</span>
                      <Input 
                        type="number"
                        step="0.01"
                        value={Number(selectedPoi.position[0].toFixed(3))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          updatePoiPosition(selectedPoi.id, [val, selectedPoi.position[1], selectedPoi.position[2]])
                        }}
                        className="bg-black border-neutral-900 text-white font-mono text-xs rounded-none h-10 px-2 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] text-neutral-600 font-mono uppercase block">Y-Vector</span>
                      <Input 
                        type="number"
                        step="0.01"
                        value={Number(selectedPoi.position[1].toFixed(3))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          updatePoiPosition(selectedPoi.id, [selectedPoi.position[0], val, selectedPoi.position[2]])
                        }}
                        className="bg-black border-neutral-900 text-white font-mono text-xs rounded-none h-10 px-2 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] text-neutral-600 font-mono uppercase block">Z-Vector</span>
                      <Input 
                        type="number"
                        step="0.01"
                        value={Number(selectedPoi.position[2].toFixed(3))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          updatePoiPosition(selectedPoi.id, [selectedPoi.position[0], selectedPoi.position[1], val])
                        }}
                        className="bg-black border-neutral-900 text-white font-mono text-xs rounded-none h-10 px-2 text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mt-2 leading-relaxed">
                    Translate spatial positions using the 3D gizmo or enter vector values manually above.
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-900">
                  <Button 
                    onClick={() => deletePoi(selectedPoi.id)}
                    variant="destructive"
                    className="w-full h-11 text-xs uppercase tracking-widest rounded-none"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Hierarchy Node
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Eye className="w-8 h-8 text-neutral-800" />
                <div>
                  <p className="text-xs text-neutral-500 font-medium">No Node Selected</p>
                  <p className="text-[10px] text-neutral-700 uppercase tracking-widest leading-relaxed mt-1">
                    Select a POI from the left outliner or click directly on a 3D marker to inspect.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick HUD guide */}
          <div className="p-5 border-t border-neutral-900 bg-neutral-950/30 text-[10px] text-neutral-500 leading-relaxed uppercase tracking-wider space-y-1">
            <span className="font-bold text-neutral-400">Gizmo Legend:</span>
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-red-500 block" /> Red: Translate X Axis</p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-green-500 block" /> Green: Translate Y Axis</p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-blue-500 block" /> Blue: Translate Z Axis</p>
          </div>
        </aside>

      </div>

      {/* 5. Spatial Naming Dialogue Overlay */}
      <Dialog open={isPlacementModalOpen} onOpenChange={setIsPlacementModalOpen}>
        <DialogContent className="bg-neutral-950 border border-neutral-900 rounded-none max-w-md p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-widest text-neutral-400 uppercase">
              New Spatial Annotation Point
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">POI Name / Tag</label>
              <Input 
                required
                autoFocus
                value={poiInputName}
                onChange={e => setPoiInputName(e.target.value)}
                placeholder="e.g. Master Bedroom"
                className="bg-black border-neutral-800 text-white rounded-none h-12 text-xs focus-visible:ring-1 focus-visible:ring-neutral-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmPlacement()
                }}
              />
              <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-mono">
                Stored Format: {poiInputName ? formatPOIName(poiInputName) : 'POI_Example'}
              </p>
            </div>
            
            {tempPosition && (
              <div className="space-y-1 pt-1 bg-neutral-900/20 p-3 border border-neutral-900/50">
                <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Raycast Intersect Vector</span>
                <span className="text-[10px] font-mono text-neutral-400 block truncate">
                  X: {tempPosition[0].toFixed(4)} | Y: {tempPosition[1].toFixed(4)} | Z: {tempPosition[2].toFixed(4)}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-neutral-900 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsPlacementModalOpen(false)
                setTempPosition(null)
              }}
              className="border-neutral-800 hover:bg-neutral-900 rounded-none text-xs uppercase tracking-widest h-11"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleConfirmPlacement}
              disabled={!poiInputName.trim()}
              className="bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest h-11 px-6 disabled:opacity-50"
            >
              Add Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Immersive Processing & Syncing Done Overlay */}
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
              Baking Spatial Model
            </h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              Applying transformation matrices and writing persistent metadata directly to the GLB binary buffer. Please do not close this window.
            </p>
          </div>
        </div>
      )}

      {/* 6. Calibration Distance Input Modal */}
      <Dialog open={calibrationModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCalibrationModalOpen(false)
          setIsCalibrating(false)
          setCalibrationPoints([])
        }
      }}>
        <DialogContent className="bg-neutral-950 border border-neutral-900 rounded-none max-w-md p-6 font-sans">
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
                  placeholder="e.g. 3.5"
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

      {/* SQL Migration Instruction Dialog */}
      <Dialog open={showSqlMigrationDialog} onOpenChange={setShowSqlMigrationDialog}>
        <DialogContent className="sm:max-w-[500px] bg-neutral-950 border border-neutral-900 text-white rounded-none p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light tracking-tight text-red-500">Database Migration Required</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs mt-2 leading-relaxed">
              The <strong>scale_factor</strong> and <strong>transform_metadata</strong> columns do not exist yet in your database tables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              Please copy the SQL command below, navigate to your <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query</strong>, paste it, and click <strong>Run</strong>:
            </p>

            <pre className="bg-black border border-neutral-850 p-4 text-[10px] font-mono text-emerald-400 overflow-x-auto rounded-none select-all whitespace-pre">
{`ALTER TABLE public.apartments DROP COLUMN IF EXISTS transform_metadata;
ALTER TABLE public.event_centers DROP COLUMN IF EXISTS transform_metadata;
ALTER TABLE public.public_space DROP COLUMN IF EXISTS transform_metadata;

ALTER TABLE public.apartments ADD COLUMN transform_metadata numeric DEFAULT 1.0;
ALTER TABLE public.apartments ADD COLUMN scale_factor numeric DEFAULT 1.0;

ALTER TABLE public.event_centers ADD COLUMN transform_metadata numeric DEFAULT 1.0;
ALTER TABLE public.event_centers ADD COLUMN scale_factor numeric DEFAULT 1.0;

ALTER TABLE public.public_space ADD COLUMN transform_metadata numeric DEFAULT 1.0;
ALTER TABLE public.public_space ADD COLUMN scale_factor numeric DEFAULT 1.0;`}
            </pre>

            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
              After running this script, click Acknowledge below. Your spatial coordinates and nodes were saved successfully, but you must run this query to persist the scale factor.
            </p>
          </div>

          <div className="pt-4 border-t border-neutral-900 flex justify-end">
            <Button 
              onClick={() => {
                setShowSqlMigrationDialog(false)
                router.push('/agent/listings')
                router.refresh()
              }}
              className="bg-white text-black hover:bg-neutral-200 rounded-none text-[10px] uppercase tracking-widest font-bold h-10 px-6"
            >
              Acknowledge & Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SpatialModelEditor() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto opacity-40" />
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-mono">Loading Immersive Spatial Editor...</p>
        </div>
      </div>
    }>
      <SpatialModelEditorContent />
    </Suspense>
  )
}
