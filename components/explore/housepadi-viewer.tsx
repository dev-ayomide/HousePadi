'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef, Component } from 'react'
import type { ReactNode } from 'react'
import { Loader2, Compass, Move, MapPin, Keyboard, Sparkles, X, ChevronRight, Smartphone, Eye, ChevronDown, ChevronUp, Maximize, Minimize, Hand, RotateCw, TriangleAlert } from 'lucide-react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { toast } from 'sonner'

// =========================================================
// 1. Asset Loader Component
// =========================================================
function SpatialAsset({ 
  url, 
  onPoisLoaded, 
  teleportRef,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  controlsRef,
  modelRef
}: { 
  url: string
  onPoisLoaded: (list: any[]) => void
  teleportRef: React.MutableRefObject<((pos: THREE.Vector3) => void) | null>
  position?: [number, number, number]
  scale?: [number, number, number]
  controlsRef?: React.RefObject<any>
  modelRef?: React.MutableRefObject<THREE.Object3D | null>
}) {
  const { scene } = useGLTF(url)
  const { camera } = useThree()
  const hasInitialized = useRef(false)

  // Assign GLTF scene to modelRef
  useEffect(() => {
    if (scene && modelRef) {
      modelRef.current = scene
    }
  }, [scene, modelRef])

  // Scan hierarchy for POI markers
  useEffect(() => {
    if (!scene) return
    const list: any[] = []

    scene.traverse((child) => {
      if (child.name && child.name.startsWith('POI_')) {
        const pos = new THREE.Vector3()
        child.getWorldPosition(pos)

        // Make name readable (e.g. POI_MasterBedroom -> Master Bedroom)
        let readableName = child.name.substring(4)
        readableName = readableName.replace(/([A-Z])/g, ' $1').trim()

        list.push({
          id: child.name,
          name: readableName,
          position: pos,
          description: `High-fidelity 3D viewport targeting the ${readableName}.`,
          images: []
        })
      }
    })

    // Fallback hotspots for models with no embedded POI markers — derived from the
    // model's actual bounding box (not fixed world coordinates) so both the point AND
    // the camera stay inside the geometry, regardless of the model's real-world scale.
    if (list.length === 0) {
      const box = new THREE.Box3().setFromObject(scene)
      if (isFinite(box.min.x) && isFinite(box.max.x) && !box.isEmpty()) {
        const floorY = box.min.y
        const centerX = (box.min.x + box.max.x) / 2
        const depth = box.max.z - box.min.z
        const midZ = (box.min.z + box.max.z) / 2
        const inset = Math.min(depth * 0.2, 1.5)
        // The init/teleport code parks the camera up to 2m behind (+z of) each point,
        // so the near point needs extra headroom or the camera exits through the wall.
        const camBack = 2.1
        const nearZ = Math.max(box.max.z - inset - camBack, midZ)
        const farZ = box.min.z + inset

        list.push(
          { id: 'POI_Entrance', name: 'Main Entrance', position: new THREE.Vector3(centerX, floorY, nearZ), description: 'Front entry threshold to the virtual space.', images: [] },
          { id: 'POI_Central', name: 'Central Area', position: new THREE.Vector3(centerX, floorY, midZ), description: 'Central area connecting the space.', images: [] },
          { id: 'POI_Interior', name: 'Far Interior', position: new THREE.Vector3(centerX, floorY, farZ), description: 'Rear section of the virtual space.', images: [] }
        )
      }
    }

    // Ensure all hotspots in the list contain 'POI'
    const poiList = list.filter(item => item.id.includes('POI'))
    onPoisLoaded(poiList)
    
    // Teleport camera to first POI on load (only once)
    if (!hasInitialized.current && list.length > 0 && position[0] === 0 && position[2] === 0) {
      const first = list[0].position
      const camPos = new THREE.Vector3(first.x, first.y + 1.6, first.z + 2)
      const lookTarget = new THREE.Vector3(first.x, first.y + 1.6, first.z)
      camera.position.copy(camPos)
      camera.lookAt(lookTarget)
      
      if (controlsRef && controlsRef.current) {
        controlsRef.current.target.copy(lookTarget)
        controlsRef.current.update()
      }
      hasInitialized.current = true
    }
  }, [scene, onPoisLoaded, camera, position[0], position[1], position[2], controlsRef])

  // Set up shared ref for camera teleportation
  useEffect(() => {
    teleportRef.current = (pos: THREE.Vector3) => {
      const camPos = new THREE.Vector3(pos.x, pos.y + 1.6, pos.z + 1.5)
      const lookTarget = new THREE.Vector3(pos.x, pos.y + 1.6, pos.z)
      camera.position.copy(camPos)
      camera.lookAt(lookTarget)
      
      if (controlsRef && controlsRef.current) {
        controlsRef.current.target.copy(lookTarget)
        controlsRef.current.update()
      }
    }
  }, [camera, teleportRef, controlsRef])

  return <primitive object={scene} position={position} scale={scale} castShadow receiveShadow />
}

// =========================================================
// 2. Exploration Keyboard & Joystick Controller
// =========================================================
function ExplorationController({
  joystickVector,
  keyboardActive,
  enabled = true,
  controlsRef
}: {
  joystickVector: { x: number; y: number }
  keyboardActive: boolean
  enabled?: boolean
  controlsRef?: React.RefObject<any>
}) {
  const { camera, scene } = useThree()
  const keysPressed = useRef<{ [key: string]: boolean }>({})
  const raycaster = useRef(new THREE.Raycaster())

  // Keyboard Event Listeners
  useEffect(() => {
    if (!keyboardActive || !enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysPressed.current[key] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current[key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [keyboardActive, enabled])

  // Movement Frame loop (60 FPS)
  useFrame((_, delta) => {
    if (!enabled) return

    const speed = 3.5 // meters per second
    const bufferDistance = 0.65 // collision boundary check distance

    // Gather inputs
    const key = keysPressed.current
    let moveX = 0
    let moveZ = 0

    if (key['w'] || key['arrowup']) moveZ += 1
    if (key['s'] || key['arrowdown']) moveZ -= 1
    if (key['d'] || key['arrowright']) moveX += 1
    if (key['a'] || key['arrowleft']) moveX -= 1

    moveX += joystickVector.x
    moveZ += joystickVector.y

    if (moveX === 0 && moveZ === 0) return

    // Calculate local horizontal movement vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    right.normalize()

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveZ)
      .addScaledVector(right, moveX)
      .normalize()

    // Collision Raycasting Check
    raycaster.current.set(camera.position, moveDir)
    
    // Intersect scene meshes, filtering out POI markers
    const intersects = raycaster.current.intersectObjects(scene.children, true)
    let isBlocked = false

    if (intersects.length > 0) {
      const collisionObstacles = intersects.filter(i => {
        const isPoi = i.object.name.startsWith('POI_')
        const isHelper = i.object.type.includes('Helper')
        return !isPoi && !isHelper && i.distance < bufferDistance
      })
      if (collisionObstacles.length > 0) {
        isBlocked = true
      }
    }

    if (!isBlocked) {
      const moveStep = moveDir.clone().multiplyScalar(speed * delta)
      camera.position.add(moveStep)
      if (controlsRef && controlsRef.current) {
        controlsRef.current.target.add(moveStep)
        controlsRef.current.update()
      }
    }
  })

  return null
}

// =========================================================
// 2.5. First-Person Look Controls (Rotates Camera around Axis)
// =========================================================
function FirstPersonLookControls({ 
  enabled = true,
  lookVector
}: { 
  enabled?: boolean
  lookVector?: { x: number; y: number }
}) {
  const { camera, gl } = useThree()
  const pitch = useRef(0)
  const yaw = useRef(0)
  const isDragging = useRef(false)
  const activePointerId = useRef<number | null>(null)
  const previousPointer = useRef({ x: 0, y: 0 })
  const lastQuaternion = useRef(new THREE.Quaternion())

  // Initialize pitch and yaw from current camera rotation
  useEffect(() => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    pitch.current = euler.x
    yaw.current = euler.y
    lastQuaternion.current.copy(camera.quaternion)
  }, [camera])

  useEffect(() => {
    if (!enabled) return

    const domElement = gl.domElement

    const handlePointerDown = (e: PointerEvent) => {
      // Mouse: left-button only. Touch/pen: drag anywhere on the canvas to look around.
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // Only track one pointer — the first finger to touch the scene. This keeps the
      // walk-joystick finger (a separate pointer) from corrupting the look drag.
      if (isDragging.current) return
      isDragging.current = true
      activePointerId.current = e.pointerId
      previousPointer.current = { x: e.clientX, y: e.clientY }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || e.pointerId !== activePointerId.current) return

      const deltaX = e.clientX - previousPointer.current.x
      const deltaY = e.clientY - previousPointer.current.y

      previousPointer.current = { x: e.clientX, y: e.clientY }

      // Rotation sensitivity — touch drags get a slightly higher gain for comfortable reach
      const sensitivity = e.pointerType === 'mouse' ? 0.002 : 0.0028
      yaw.current -= deltaX * sensitivity
      pitch.current -= deltaY * sensitivity

      // Clamp pitch to prevent looking too far up/down (-85deg to 85deg)
      const maxPitch = Math.PI / 2 - 0.05
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current))
    }

    const handlePointerUp = (e: PointerEvent) => {
      // Ignore lifts from other fingers (e.g. the walk joystick) so they don't cut the look drag.
      if (e.pointerId !== activePointerId.current) return
      isDragging.current = false
      activePointerId.current = null
    }

    domElement.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [enabled, gl])

  useFrame((_, delta) => {
    if (!enabled) return

    // Update rotation using look joystick vector
    if (lookVector && (lookVector.x !== 0 || lookVector.y !== 0)) {
      const lookSpeed = 1.8 // Rotation speed modifier
      yaw.current -= lookVector.x * lookSpeed * delta
      pitch.current += lookVector.y * lookSpeed * delta // Inverted Y-axis

      // Clamp pitch to prevent looking too far up/down (-85deg to 85deg)
      const maxPitch = Math.PI / 2 - 0.05
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current))
    }

    // If camera quaternion was modified externally (e.g., by lookAt in teleport)
    if (camera.quaternion.angleTo(lastQuaternion.current) > 0.01) {
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
      pitch.current = euler.x
      yaw.current = euler.y
      lastQuaternion.current.copy(camera.quaternion)
    }

    const euler = new THREE.Euler(0, 0, 0, 'YXZ')
    euler.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler)
    lastQuaternion.current.copy(camera.quaternion)
  })

  return null
}

// =========================================================
// 3. WebXR AR Manager (Natively manages session)
// =========================================================
function ARManager({
  active,
  onSessionStarted,
  onSessionEnded
}: {
  active: boolean
  onSessionStarted: (session: any) => void
  onSessionEnded: () => void
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
        
        // Target current UI root to render DOM overlays on top of immersive WebXR feed
        const overlayElement = document.querySelector('.housepadi-viewer-root')
        
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
        console.error('AR session initialization failed:', err)
        toast.error('Failed to initialize AR session.')
        onSessionEndedRef.current()
      }
    }

    startAR()

    return () => {
      if (xrSession) {
        xrSession.end().catch(() => {})
      }
    }
  }, [active, gl])

  return null
}

// =========================================================
// 4. WebXR Hit-Testing Controller
// =========================================================
function ARHitTestController({
  session,
  onPlace
}: {
  session: any
  onPlace: (pos: THREE.Vector3) => void
}) {
  const { gl } = useThree()
  const reticleRef = useRef<THREE.Mesh>(null)
  const hitTestSource = useRef<any>(null)
  const localSpace = useRef<any>(null)
  const onPlaceRef = useRef(onPlace)

  useEffect(() => {
    onPlaceRef.current = onPlace
  }, [onPlace])

  useEffect(() => {
    if (!session) return

    session.requestReferenceSpace('viewer').then((viewerSpace: any) => {
      session.requestHitTestSource({ space: viewerSpace }).then((source: any) => {
        hitTestSource.current = source
      })
    })

    session.requestReferenceSpace('local-floor')
      .then((space: any) => {
        localSpace.current = space
      })
      .catch(() => {
        session.requestReferenceSpace('local').then((space: any) => {
          localSpace.current = space
        }).catch((err: any) => {
          console.error('Failed to resolve reference space:', err)
        })
      })

    const onSelect = () => {
      if (reticleRef.current && reticleRef.current.visible) {
        onPlaceRef.current(reticleRef.current.position.clone())
      }
    }

    session.addEventListener('select', onSelect)

    return () => {
      session.removeEventListener('select', onSelect)
    }
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
          reticleRef.current.position.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
          )
          reticleRef.current.quaternion.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
          )
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

// =========================================================
// 5. Desktop AR Simulator Fallback
// =========================================================
function DesktopARSimulator({ onPlace }: { onPlace: (pos: THREE.Vector3) => void }) {
  const { camera, pointer } = useThree()
  const reticleRef = useRef<THREE.Mesh>(null)
  const planeRef = useRef<THREE.Mesh>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const onPlaceRef = useRef(onPlace)

  useEffect(() => {
    onPlaceRef.current = onPlace
  }, [onPlace])

  useFrame(() => {
    if (!reticleRef.current || !planeRef.current) return

    raycaster.current.setFromCamera(pointer, camera)
    const intersects = raycaster.current.intersectObject(planeRef.current)
    if (intersects.length > 0) {
      reticleRef.current.visible = true
      reticleRef.current.position.copy(intersects[0].point)
    } else {
      reticleRef.current.visible = false
    }
  })

  const handleClick = () => {
    if (reticleRef.current && reticleRef.current.visible) {
      onPlaceRef.current(reticleRef.current.position.clone())
    }
  }

  return (
    <>
      <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      
      <gridHelper args={[40, 40, '#222222', '#111111']} position={[0, 0.001, 0]} />
      
      <mesh ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.15, 0.18, 32]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
    </>
  )
}

// =========================================================
// 6. Holographic Portal Doorway Mesh
// =========================================================
function PortalArchway({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      {/* Left Post */}
      <mesh position={[-0.8, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.2, 0.08]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      {/* Right Post */}
      <mesh position={[0.8, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.2, 0.08]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      {/* Top Post */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[1.68, 0.08, 0.08]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      {/* Holographic Glowing Field */}
      <mesh position={[0, 1.1, 0]}>
        <planeGeometry args={[1.6, 2.2]} />
        <meshBasicMaterial 
          color="#10b981" 
          transparent 
          opacity={0.15} 
          wireframe
        />
      </mesh>
    </group>
  )
}

// =========================================================
// 7. Loading Indicator
// =========================================================
function Loader() {
  return (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-6 z-20">
      {/* Glow effect background */}
      <div className="absolute w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Circular Progress Indicator with VR headset */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border border-emerald-950/40" />
        <div className="absolute inset-0 rounded-full border border-transparent border-t-emerald-400 animate-spin" />
        
        {/* Inner VR Headset Icon */}
        <svg className="w-8 h-8 text-neutral-300 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="6" width="20" height="12" rx="3" />
          <circle cx="7" cy="12" r="2.5" />
          <circle cx="17" cy="12" r="2.5" />
          <path d="M10 12h4" />
          <path d="M12 6v3" />
        </svg>
      </div>

      <p className="text-[10px] font-mono tracking-[0.25em] text-emerald-400 font-bold uppercase animate-pulse">
        Loading 3D Space...
      </p>
    </div>
  )
}

// =========================================================
// 7.05. Local IBL Environment — replaces drei's <Environment preset="city">,
// whose external HDR fetch (potsdamer_platz_1k.hdr) was intermittently failing
// and crashing the scene. RoomEnvironment is generated procedurally on the GPU,
// so metallic/glossy GLB materials still get real reflections — analytic lights
// alone leave metalness≈1 surfaces black — with zero network dependency.
// =========================================================
function LocalEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture
    return () => {
      if (scene.environment === envTexture) scene.environment = null
      envTexture.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  return null
}

// =========================================================
// 7.1. Viewport Resizer — forces the WebGL canvas to re-measure to its
// container after fullscreen / orientation changes. R3F's ResizeObserver
// usually handles this, but the fullscreen/rotation transition can leave the
// renderer at a stale size (content clipped on one edge); reading the real
// container size and calling setSize fixes that deterministically.
// =========================================================
function ViewportResizer() {
  const gl = useThree((s) => s.gl)
  const setSize = useThree((s) => s.setSize)

  useEffect(() => {
    const applySize = () => {
      const parent = gl.domElement.parentElement
      if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
        setSize(parent.clientWidth, parent.clientHeight)
      }
    }
    // Re-measure immediately and again after the transition settles.
    const onChange = () => {
      applySize()
      setTimeout(applySize, 250)
      setTimeout(applySize, 600)
    }
    window.addEventListener('orientationchange', onChange)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      window.removeEventListener('orientationchange', onChange)
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [gl, setSize])

  return null
}

// =========================================================
// 7.2. Model Error Boundary — catches load failures thrown inside <Canvas>
// (WebGL context creation, GLB fetch rejection, HDR environment fetch) so a
// flaky network reload recovers instead of white-screening the whole viewer.
// =========================================================
class ModelErrorBoundary extends Component<
  { children: ReactNode; onError: () => void; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[HousePadi] 3D scene failed to load:', error)
    this.props.onError()
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// Shown during the brief auto-retry window (DOM only — the Canvas is unmounted here).
function SceneReconnecting() {
  return (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 z-20">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
        Reconnecting Neural Mesh...
      </p>
    </div>
  )
}

// Shown after auto-retries are exhausted — manual retry (DOM only).
function SceneErrorOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-5 z-20 p-8 text-center select-none">
      <div className="w-14 h-14 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center">
        <TriangleAlert className="w-6 h-6 text-amber-400" />
      </div>
      <div className="space-y-2 max-w-xs">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white">Scene Couldn&apos;t Load</h3>
        <p className="text-xs text-neutral-400 font-light leading-relaxed">
          The 3D model failed to load. This is usually a slow or dropped connection — check your network and try again.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] uppercase font-bold tracking-widest transition-all"
      >
        <RotateCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )
}

// =========================================================
// 8. Main Immersive Viewer Component
// =========================================================
interface HousePadiViewerProps {
  url: string
  title?: string
  onClose?: () => void
  showJoystick?: boolean
  allowPortrait?: boolean
  defaultViewpointsCollapsed?: boolean
}

export function HousePadiViewer({ 
  url, 
  title, 
  onClose, 
  showJoystick = true, 
  allowPortrait = true,
  defaultViewpointsCollapsed = true
}: HousePadiViewerProps) {
  const [viewMode, setViewMode] = useState<'360' | 'AR'>('360')
  const [arSupported, setArSupported] = useState(false)
  const [arActive, setArActive] = useState(false)
  const [arSession, setArSession] = useState<any>(null)
  
  const [pois, setPois] = useState<any[]>([])
  const [activePoi, setActivePoi] = useState<string>('')
  
  const [portalPos, setPortalPos] = useState<THREE.Vector3 | null>(null)
  const [fadeOpacity, setFadeOpacity] = useState(0)

  // Sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(showJoystick)
  const [viewpointsCollapsed, setViewpointsCollapsed] = useState(defaultViewpointsCollapsed)

  // Mobile bottom-sheet + fullscreen nudge state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [fullscreenNudgeDismissed, setFullscreenNudgeDismissed] = useState(false)

  // iOS Safari has no Fullscreen API on non-<video> elements, so requestFullscreen
  // silently does nothing there. This CSS pseudo-fullscreen (fixed inset-0) is the
  // fallback that actually fills the viewport on those devices.
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)

  // Swipe tracking for the mobile bottom sheet (drag the handle up/down to toggle)
  const sheetTouchStartY = useRef<number | null>(null)
  const sheetTouchDeltaY = useRef(0)

  // 3D scene load resilience: remount key, failure flag, and auto-retry bookkeeping
  const [sceneKey, setSceneKey] = useState(0)
  const [sceneLoadFailed, setSceneLoadFailed] = useState(false)
  const sceneAutoRetries = useRef(0)
  const sceneRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Screen Orientation & Fullscreen states
  const [isMobile, setIsMobile] = useState(false)
  const [isPortraitMobile, setIsPortraitMobile] = useState(false)
  const [isFullscreenEnabled, setIsFullscreenEnabled] = useState(false)

  // Mobile joystick state
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 })
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const moveTouchId = useRef<number | null>(null)

  const fadeOverlayRef = useRef<HTMLDivElement>(null)
  const teleportCamera = useRef<((pos: THREE.Vector3) => void) | null>(null)
  const modelSceneRef = useRef<THREE.Object3D | null>(null)
  
  // OrbitControls Ref for synchronization
  const controlsRef = useRef<any>(null)

  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [exportingUsdz, setExportingUsdz] = useState(false)

  // Called by the error boundary when the 3D scene throws. Auto-retries a few
  // times (clearing the cached rejection so the GLB refetches), then surfaces a
  // manual retry. Timer is tracked so it can't fire after the viewer closes.
  const handleSceneError = () => {
    if (sceneAutoRetries.current < 2) {
      sceneAutoRetries.current += 1
      if (sceneRetryTimer.current) clearTimeout(sceneRetryTimer.current)
      sceneRetryTimer.current = setTimeout(() => {
        try { useGLTF.clear(url) } catch { /* noop */ }
        setSceneKey((k) => k + 1)
      }, 1200)
    } else {
      setSceneLoadFailed(true)
    }
  }

  const handleSceneRetry = () => {
    sceneAutoRetries.current = 0
    setSceneLoadFailed(false)
    try { useGLTF.clear(url) } catch { /* noop */ }
    setSceneKey((k) => k + 1)
  }

  // Clear any pending auto-retry timer on unmount
  useEffect(() => {
    return () => {
      if (sceneRetryTimer.current) clearTimeout(sceneRetryTimer.current)
    }
  }, [])

  // Reset load state if the model URL changes
  useEffect(() => {
    sceneAutoRetries.current = 0
    setSceneLoadFailed(false)
    setSceneKey((k) => k + 1)
  }, [url])

  // Check immersive-ar compatibility and viewport orientation on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setArSupported(supported)
      })
    }

    const checkViewport = () => {
      const mobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent)
      setIsMobile(mobile)
      setIsPortraitMobile(mobile && window.innerHeight > window.innerWidth)
    }

    // iOS Detection for Safari and Chrome
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const android = /android/i.test(navigator.userAgent)
    setIsIOS(ios)
    setIsAndroid(android)

    checkViewport()
    window.addEventListener('resize', checkViewport)
    window.addEventListener('orientationchange', checkViewport)
    return () => {
      window.removeEventListener('resize', checkViewport)
      window.removeEventListener('orientationchange', checkViewport)
    }
  }, [])

  // Dynamic USDZ conversion handler for Apple AR Quick Look
  const handleIOSAR = async () => {
    if (!modelSceneRef.current) {
      toast.error("3D model is not fully loaded yet. Please wait.")
      return
    }

    setExportingUsdz(true)
    const toastId = toast.loading("Generating AR experience for iOS...")

    try {
      const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')
      const exporter = new USDZExporter()

      // Exporter outputs a USDZ ArrayBuffer. quickLookCompatible resolves Apple specs
      const arrayBuffer = await exporter.parseAsync(modelSceneRef.current, {
        quickLookCompatible: true
      })

      const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' })
      const usdzUrl = URL.createObjectURL(blob)

      // Create temporary AR Quick Look link structure
      const link = document.createElement('a')
      link.href = usdzUrl
      link.rel = 'ar'
      link.download = `${title || 'space'}.usdz`

      // Apple Safari/Chrome checks for active elements inside link for validation
      const img = document.createElement('img')
      img.alt = 'AR Model'
      link.appendChild(img)

      document.body.appendChild(link)
      link.click()

      // Cleanup target URL resources
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(usdzUrl)
      }, 2000)

      toast.dismiss(toastId)
      toast.success("AR Quick Look launched successfully!")
    } catch (err) {
      console.error("USDZ Export failed:", err)
      toast.dismiss(toastId)
      toast.error("Failed to generate iOS AR model.")
    } finally {
      setExportingUsdz(false)
    }
  }

  // Dynamic Android Scene Viewer Handler
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
    const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteUrl)}&mode=ar_only&title=${encodeURIComponent(title || 'Property')}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${fallbackUrl};end;`
    
    window.location.href = intentUrl
  }

  // Listen to fullscreen changes to update cover splash display state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement
      setIsFullscreenEnabled(isCurrentlyFullscreen)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const enterImmersiveMode = async () => {
    const container = document.querySelector('.housepadi-viewer-root') as HTMLElement | null
    // NB: the DOM lib types requestFullscreen as always-present, but iOS Safari omits
    // it on ordinary elements — check at runtime and fall back to CSS pseudo-fullscreen.
    const requestFn =
      (container?.requestFullscreen as (() => Promise<void>) | undefined) ||
      ((container as any)?.webkitRequestFullscreen as (() => Promise<void>) | undefined)

    if (!container || typeof requestFn !== 'function') {
      setPseudoFullscreen(true)
      return
    }

    try {
      await requestFn.call(container)
      setIsFullscreenEnabled(true)

      // Attempt locking orientation to landscape (best-effort; unsupported on iOS/desktop).
      // Isolated so its rejection can't undo the fullscreen we just entered.
      if (!allowPortrait && screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock('landscape')
        } catch {
          /* orientation lock unsupported — fullscreen still applied */
        }
      }
    } catch (err) {
      console.warn('Fullscreen request rejected:', err)
      // Native request rejected — degrade to pseudo-fullscreen so the tap still does something.
      setPseudoFullscreen(true)
    }
  }

  const exitImmersiveMode = async () => {
    if (pseudoFullscreen) {
      setPseudoFullscreen(false)
      return
    }
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        }
      }
    } catch {
      // Ignore
    }
    setIsFullscreenEnabled(false)
  }

  const handleClose = async () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        }
      }
    } catch (err) {
      // Ignore
    }
    setPseudoFullscreen(false)
    if (onClose) onClose()
  }

  const handleViewInSpace = () => {
    if (isIOS) {
      handleIOSAR()
    } else if (arSupported) {
      setViewMode('AR')
      setArActive(true)
    } else if (isAndroid) {
      handleAndroidAR()
    } else {
      setViewMode('AR')
      toast.info('Switching to Desktop AR Simulator')
    }
  }

  // Post Message handlers for parent frame integration (Iframe Embed)
  useEffect(() => {
    if (pois.length > 0) {
      try {
        window.parent.postMessage({ type: 'POI_LOADED', hotspots: pois }, '*')
      } catch (err) {
        console.error('Failed to dispatch POI_LOADED postMessage:', err)
      }
    }
  }, [pois])

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data
      if (!data) return

      if (data.type === 'TELEPORT_TO_POI' && data.poiId) {
        const target = pois.find(p => p.id === data.poiId)
        if (target) {
          handlePoiClick(target)
        }
      } else if (data.type === 'TOGGLE_MODE' && data.mode) {
        if (data.mode === '360' || data.mode === 'AR') {
          setViewMode(data.mode)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    try {
      window.parent.postMessage({ type: 'VIEWER_READY' }, '*')
    } catch (err) {
      // Ignored if same-window
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [pois, viewMode, portalPos])

  // Cinematic Teleportation Transition
  const handlePoiClick = (poi: any) => {
    setActivePoi(poi.id)
    try {
      window.parent.postMessage({ type: 'POI_CLICKED', poiId: poi.id }, '*')
    } catch (err) {
      // Ignored if same-window
    }
    
    gsap.to(fadeOverlayRef.current, {
      opacity: 1,
      duration: 0.35,
      ease: 'power2.inOut',
      onComplete: () => {
        // If in AR mode, we translate the offset position relative to the portal
        if (viewMode === 'AR' && portalPos) {
          const relativeTarget = poi.position.clone()
          // Position relative to portal location
          if (teleportCamera.current) {
            teleportCamera.current(new THREE.Vector3(
              portalPos.x + relativeTarget.x,
              portalPos.y,
              portalPos.z - 2 + relativeTarget.z
            ))
          }
        } else {
          if (teleportCamera.current) {
            teleportCamera.current(poi.position)
          }
        }
        
        gsap.to(fadeOverlayRef.current, {
          opacity: 0,
          duration: 0.5,
          delay: 0.1,
          ease: 'power2.inOut'
        })
      }
    })
  }

  // Handle portal placement
  const handlePortalPlacement = (pos: THREE.Vector3) => {
    setPortalPos(pos)
    toast.success('Holographic entrance portal initialized at 1:1 scale.')
  }

  // Custom Touch virtual joystick callbacks
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    moveTouchId.current = touch.identifier
    setJoystickActive(true)
    setJoystickPos({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (moveTouchId.current === null) return
    const touch = Array.from(e.touches).find(t => t.identifier === moveTouchId.current)
    if (!touch) return
    
    const maxRadius = 45
    const deltaX = touch.clientX - joystickPos.x
    const deltaY = touch.clientY - joystickPos.y
    const distance = Math.min(maxRadius, Math.hypot(deltaX, deltaY))
    const angle = Math.atan2(deltaY, deltaX)
    
    const posX = Math.cos(angle) * distance
    const posY = Math.sin(angle) * distance

    setJoystickVector({
      x: posX / maxRadius,
      y: -posY / maxRadius
    })

    const handle = document.getElementById('joystick-handle')
    if (handle) {
      handle.style.transform = `translate(${posX}px, ${posY}px)`
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const hasEnded = Array.from(e.changedTouches).some(t => t.identifier === moveTouchId.current)
    if (hasEnded) {
      moveTouchId.current = null
      setJoystickActive(false)
      setJoystickVector({ x: 0, y: 0 })
      const handle = document.getElementById('joystick-handle')
      if (handle) {
        handle.style.transform = 'translate(0px, 0px)'
      }
    }
  }

  // Bottom-sheet swipe gesture — drag the handle/peek up to expand, down to collapse
  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartY.current = e.touches[0].clientY
    sheetTouchDeltaY.current = 0
  }

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (sheetTouchStartY.current === null) return
    sheetTouchDeltaY.current = e.touches[0].clientY - sheetTouchStartY.current
  }

  const handleSheetTouchEnd = () => {
    const dy = sheetTouchDeltaY.current
    const threshold = 40 // px of intent before we toggle
    if (dy < -threshold) setMobileSheetOpen(true)
    else if (dy > threshold) setMobileSheetOpen(false)
    sheetTouchStartY.current = null
    sheetTouchDeltaY.current = 0
  }

  return (
    <div className={`housepadi-viewer-root relative bg-neutral-950 flex select-none overflow-hidden font-sans border border-neutral-800 ${
      pseudoFullscreen
        ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] border-0'
        : 'w-full h-full'
    }`}>
      
      {/* Exit affordance while in CSS pseudo-fullscreen (iOS) — native fullscreen is
          dismissed by the browser's own gesture, so only the pseudo path needs this. */}
      {isMobile && pseudoFullscreen && (
        <div className="md:hidden absolute z-30 flex items-center animate-in fade-in slide-in-from-top-2 duration-300" style={{ top: 'calc(1rem + env(safe-area-inset-top))', left: '1rem' }}>
          <button
            onClick={exitImmersiveMode}
            className="flex items-center gap-1.5 pl-3 pr-2.5 py-2 bg-neutral-950/80 border border-white/10 backdrop-blur-md text-white rounded-full shadow-lg active:scale-95 transition-transform"
            title="Exit fullscreen"
          >
            <Minimize className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Exit Fullscreen</span>
          </button>
        </div>
      )}

      {/* Optional, dismissable fullscreen nudge for the default portrait-allowed case —
          the "Rotation Required" / "Immersive Launch" screens below only fire when the
          caller opts into allowPortrait=false, so most viewers need this instead. */}
      {isMobile && allowPortrait && !isFullscreenEnabled && !pseudoFullscreen && !fullscreenNudgeDismissed && (
        <div className="md:hidden absolute top-4 left-4 z-30 flex items-center animate-in fade-in slide-in-from-top-2 duration-300">
          <button
            onClick={enterImmersiveMode}
            className="flex items-center gap-1.5 pl-3 pr-2.5 py-2 bg-neutral-950/80 border border-white/10 backdrop-blur-md text-white rounded-full shadow-lg active:scale-95 transition-transform"
            title="Enter fullscreen for a bigger view"
          >
            <Maximize className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Fullscreen</span>
          </button>
          <button
            onClick={() => setFullscreenNudgeDismissed(true)}
            className="ml-1 p-1.5 bg-neutral-950/80 border border-white/10 backdrop-blur-md text-neutral-500 hover:text-white rounded-full shadow-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Premium Rotate Warning Overlay */}
      {isMobile && isPortraitMobile && !allowPortrait && (
        <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="max-w-md space-y-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="w-16 h-16 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center animate-bounce">
                <Smartphone className="w-8 h-8 text-emerald-400 rotate-90" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-semibold uppercase tracking-widest text-white">Rotation Required</h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                For the best spatial experience, please rotate your device to landscape mode.
              </p>
            </div>
            
            <button
              onClick={enterImmersiveMode}
              className="px-6 py-3.5 bg-emerald-500 text-black hover:bg-emerald-600 text-[10px] uppercase font-bold tracking-widest transition-all w-full rounded-none shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Force Landscape & Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Immersive Launch Screen for Mobile Devices */}
      {isMobile && !allowPortrait && !isPortraitMobile && !isFullscreenEnabled && (
        <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-2xl z-40 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="max-w-md space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="w-16 h-16 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center">
                <Compass className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-semibold uppercase tracking-widest text-white">{title || '3D Virtual Space'}</h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                {allowPortrait 
                  ? "This interactive 3D environment is optimized for immersive exploration."
                  : "This interactive 3D environment is optimized for fullscreen landscape exploration."}
              </p>
            </div>
            
            <button
              onClick={enterImmersiveMode}
              className="px-6 py-3.5 bg-emerald-500 text-black hover:bg-emerald-600 text-[10px] uppercase font-bold tracking-widest transition-all w-full rounded-none shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Enter Immersive Space
            </button>
          </div>
        </div>
      )}

      {/* Cinematic Teleport Fade Overlay */}
      <div 
        ref={fadeOverlayRef}
        style={{ opacity: fadeOpacity }}
        className="absolute inset-0 bg-black pointer-events-none z-30 opacity-0" 
      />

      {/* Collapsible Persistent HUD Hotspots Sidebar */}
      {showJoystick && (
        <aside className={`h-full border-r border-white/5 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-between z-10 relative transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
          sidebarOpen ? 'w-[280px] md:w-[320px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-end items-center">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  title="Collapse Sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider truncate">{title || '3D Space Viewer'}</h3>
              
              {/* View Mode Toggle Tab System */}
              {showJoystick && (
                <div className="flex border border-white/10 p-0.5 bg-black/40 rounded-none w-full">
                  <button
                    onClick={() => setViewMode('360')}
                    className={`flex-1 h-9 text-[10px] uppercase font-bold tracking-widest transition-all ${
                      viewMode === '360' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    360 Walk
                  </button>
                  <button
                    disabled={!isIOS && !arSupported}
                    onClick={() => setViewMode('AR')}
                    title={(!isIOS && !arSupported) ? "AR Portal requires an iOS device or WebXR support." : "Switch to AR Portal"}
                    className={`flex-1 h-9 text-[10px] uppercase font-bold tracking-widest transition-all ${
                      viewMode === 'AR' 
                        ? 'bg-white text-black' 
                        : (!isIOS && !arSupported)
                          ? 'text-neutral-700 cursor-not-allowed opacity-40'
                          : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    AR Portal
                  </button>
                </div>
              )}
            </div>

            {/* AR Mode State Description */}
            {viewMode === 'AR' && (
              <div className="bg-neutral-950/40 border border-white/5 p-4 space-y-3">
                <h4 className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> AR Calibration
                </h4>
                <p className="text-[10px] text-neutral-500 font-light leading-relaxed">
                  {isIOS ? (
                    <span>iOS Device detected. Apple Quick Look AR is supported. Click the button below to generate a 3D USDZ model on-the-fly and place it in your room.</span>
                  ) : !arSupported ? (
                    <span className="text-amber-400/80 font-normal">AR mode not supported on this browser/device. Running in Desktop Simulator mode.</span>
                  ) : !portalPos ? (
                    <span>Device ready. Click &quot;Enter WebXR AR&quot; below to launch camera feed and place the entrance.</span>
                  ) : (
                    <span>1:1 real-world scaling applied. Walk through the portal threshold or use hotspots to browse.</span>
                  )}
                </p>
              </div>
            )}

            {/* Hotspots selection */}
            {pois.length > 0 && (
              <div className="space-y-3">
                <button 
                  onClick={() => setViewpointsCollapsed(!viewpointsCollapsed)}
                  className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-white/5 pb-2 hover:text-white transition-colors"
                  title={viewpointsCollapsed ? "Expand Viewpoints" : "Collapse Viewpoints"}
                >
                  <span>Viewpoints</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${viewpointsCollapsed ? '-rotate-90 text-neutral-600' : 'text-neutral-400'}`} />
                </button>
                
                {!viewpointsCollapsed && (
                  <div className="space-y-2 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 pr-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {pois.map((poi) => (
                      <button
                        key={poi.id}
                        onClick={() => handlePoiClick(poi)}
                        disabled={viewMode === 'AR' && !portalPos}
                        className={`w-full text-left p-3.5 border transition-all duration-300 flex items-center justify-between group disabled:opacity-30 disabled:cursor-not-allowed ${
                          activePoi === poi.id
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]'
                            : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="space-y-1.5 max-w-[90%]">
                          <span className="text-xs font-medium tracking-tight block">{poi.name}</span>
                          <p className="text-[10px] text-neutral-500 font-light truncate group-hover:text-neutral-400 transition-colors">
                            {poi.description}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                          activePoi === poi.id ? 'text-emerald-400' : 'text-neutral-600'
                        }`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exploratory controls guide */}
          <div className="p-6 border-t border-white/5 bg-neutral-900/10 space-y-4">
            {viewMode === 'AR' && isIOS ? (
              <button
                onClick={handleIOSAR}
                disabled={exportingUsdz}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-black text-xs font-bold uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2"
              >
                {exportingUsdz ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating USDZ...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Launch iOS AR
                  </>
                )}
              </button>
            ) : viewMode === 'AR' && arSupported && !arActive ? (
              <button
                onClick={() => setArActive(true)}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-widest transition-all rounded-none"
              >
                Enter WebXR AR
              </button>
            ) : viewMode === 'AR' && !arSupported && !arActive ? (
              <button
                disabled
                title="AR mode requires an iOS device or a browser/device with WebXR immersive-ar support."
                className="w-full h-12 bg-neutral-900 border border-white/5 text-neutral-500 text-xs font-bold uppercase tracking-widest transition-all rounded-none cursor-not-allowed opacity-50 flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" /> AR Unsupported
              </button>
            ) : viewMode === 'AR' && isAndroid ? (
              <button
                onClick={handleAndroidAR}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Launch Android AR
              </button>
            ) : (
              <>
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">
                  {showJoystick ? 'Exploration Controls' : 'Navigation Controls'}
                </p>
                <div className="space-y-2.5 text-[10px] text-neutral-400 font-light uppercase tracking-wider">
                  {viewMode === 'AR' && !portalPos ? (
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400 font-medium">Click on floor grid to place Portal</span>
                    </div>
                  ) : showJoystick ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-neutral-600" /> <span>WASD / Arrows to Walk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Move className="w-4 h-4 text-neutral-600" /> <span>Click + Drag to Look</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-neutral-600" /> <span>Select Hotspots to Jump</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Move className="w-4 h-4 text-neutral-600" /> <span>Left Click + Drag to Orbit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                        <span>Right Click + Drag to Pan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                        <span>Scroll to Zoom</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-neutral-600" /> <span>Select Hotspots to Jump</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {/* Main Canvas WebGL Viewport */}
      <main className="flex-1 h-full relative bg-neutral-950">
        
        {/* Sidebar Toggle Button */}
        {showJoystick && (
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 left-4 p-2.5 bg-neutral-950/80 border border-white/10 hover:bg-neutral-900 text-white rounded-none z-20 transition-all duration-300 shadow-lg flex items-center justify-center gap-1.5"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <Compass className={`w-4 h-4 ${sidebarOpen ? 'text-emerald-400 animate-pulse' : 'text-neutral-400'}`} />
            <span className="text-[9px] uppercase tracking-wider font-bold">
              {sidebarOpen ? "Hide Panel" : "Viewpoints"}
            </span>
          </button>
        )}

        {/* Top-Right Control Group */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {viewMode === '360' ? (
            <button
              onClick={handleViewInSpace}
              className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>View in Space</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setArActive(false)
                setArSession(null)
                setPortalPos(null)
                setViewMode('360')
              }}
              className="h-10 px-4 bg-neutral-900/80 border border-white/10 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 backdrop-blur-sm"
            >
              <Eye className="w-4 h-4" />
              <span>View in 3D</span>
            </button>
          )}

          {onClose && (
            <button 
              onClick={handleClose}
              className="h-10 w-10 bg-neutral-950/80 border border-white/10 hover:bg-neutral-900 text-white rounded-none transition-colors shadow-lg flex items-center justify-center"
              title="Exit Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {sceneLoadFailed ? (
          <SceneErrorOverlay onRetry={handleSceneRetry} />
        ) : (
        <ModelErrorBoundary key={sceneKey} onError={handleSceneError} fallback={<SceneReconnecting />}>
        <Suspense fallback={<Loader />}>
          <Canvas camera={{ fov: 75, near: 0.1, far: 100 }} shadows>
            <ViewportResizer />
            {/* Procedural IBL replaces the network-fetched HDR; light values match the
                original Environment-era tuning the scenes were authored against. */}
            <LocalEnvironment />
            {/* Paint the canvas's own background in 360 mode instead of relying on the
                transparent canvas showing the page CSS behind it. Skipped in AR so the
                camera passthrough stays visible. */}
            {viewMode === '360' && <color attach="background" args={['#0a0a0a']} />}
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow shadow-bias={-0.0001} />
            
            {/* 360 WALK MODE */}
            {viewMode === '360' && (
              <>
                <SpatialAsset 
                  url={url} 
                  onPoisLoaded={setPois} 
                  teleportRef={teleportCamera} 
                  controlsRef={controlsRef}
                  modelRef={modelSceneRef}
                />
                
                {showJoystick ? (
                  <>
                    <ExplorationController 
                      joystickVector={joystickVector}
                      keyboardActive={true}
                      controlsRef={controlsRef}
                    />

                    <FirstPersonLookControls enabled={viewMode === '360'} />
                  </>
                ) : (
                  <OrbitControls 
                    ref={controlsRef}
                    enableZoom={true}
                    enablePan={true}
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={0.8}
                  />
                )}
              </>
            )}

            {/* AR PORTAL MODE */}
            {viewMode === 'AR' && (
              <>
                {/* Native WebXR AR Manager */}
                <ARManager 
                  active={arActive} 
                  onSessionStarted={setArSession}
                  onSessionEnded={() => {
                    setArActive(false)
                    setArSession(null)
                    setPortalPos(null)
                  }}
                />

                {/* Hit testing floor scanners */}
                {arActive && arSession && !portalPos && (
                  <ARHitTestController 
                    session={arSession} 
                    onPlace={handlePortalPlacement} 
                  />
                )}

                {/* Desktop simulation fallback if device lacks WebXR */}
                {!arActive && !portalPos && (
                  <DesktopARSimulator onPlace={handlePortalPlacement} />
                )}

                {/* Placed Portal Arch */}
                {portalPos && <PortalArchway position={portalPos} />}

                {/* 1:1 Scaled GLB Model positioned behind the Portal */}
                {portalPos && (
                  <>
                    <SpatialAsset 
                      url={url} 
                      onPoisLoaded={setPois} 
                      teleportRef={teleportCamera}
                      position={[portalPos.x, portalPos.y, portalPos.z - 2]}
                      scale={[1, 1, 1]} // 1:1 real-world scaling
                      controlsRef={controlsRef}
                      modelRef={modelSceneRef}
                    />
                    
                    <ExplorationController 
                      joystickVector={joystickVector}
                      keyboardActive={true}
                      controlsRef={controlsRef}
                    />

                    <OrbitControls 
                      ref={controlsRef}
                      enableZoom={false}
                      enablePan={false}
                      enableDamping
                      dampingFactor={0.05}
                      rotateSpeed={0.8}
                    />
                  </>
                )}
              </>
            )}
          </Canvas>
        </Suspense>
        </ModelErrorBoundary>
        )}

        {/* Mobile Movement Joystick — single walk stick; look is handled by dragging the scene */}
        {viewMode === '360' && (isMobile || isIOS) && showJoystick && (
          <div className="absolute bottom-48 left-5 md:bottom-24 md:left-16 z-20 pointer-events-none">
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-28 h-28 md:w-36 md:h-36 bg-neutral-900/50 border border-white/10 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-auto touch-none shadow-xl"
            >
              <div
                id="joystick-handle"
                className="w-[46px] h-[46px] md:w-[50px] md:h-[50px] bg-white/10 border border-white/20 rounded-full transition-transform duration-75 pointer-events-none shadow-inner"
              />
            </div>
            <p className="mt-1.5 text-center text-[8px] uppercase tracking-widest text-white/40 font-bold md:hidden">Walk</p>
          </div>
        )}

        {/* ============================================================ */}
        {/* Mobile Bottom Sheet — replaces the desktop sidebar in portrait */}
        {/* ============================================================ */}
        <div className="md:hidden">
          {/* Dim backdrop only when fully expanded */}
          {mobileSheetOpen && (
            <div
              onClick={() => setMobileSheetOpen(false)}
              className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
            />
          )}

          <div
            className={`absolute inset-x-0 bottom-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.8)] flex flex-col transition-[max-height] duration-300 ease-out ${
              mobileSheetOpen ? 'max-h-[78vh]' : 'max-h-[164px]'
            }`}
          >
            {/* Grab handle — tap to toggle, or swipe up/down to expand/collapse */}
            <button
              onClick={() => setMobileSheetOpen(!mobileSheetOpen)}
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              className="w-full flex items-center justify-center pt-3 pb-3 shrink-0 touch-none"
              aria-label={mobileSheetOpen ? 'Collapse panel' : 'Expand panel'}
            >
              <span className="w-10 h-1.5 rounded-full bg-white/30" />
            </button>

            {!mobileSheetOpen ? (
              /* ---------- COLLAPSED PEEK: quick-jump viewpoint rail ---------- */
              <div
                className="px-4 pt-0.5 pb-[calc(1rem+env(safe-area-inset-bottom))]"
                onTouchStart={handleSheetTouchStart}
                onTouchMove={handleSheetTouchMove}
                onTouchEnd={handleSheetTouchEnd}
              >
                <button
                  onClick={() => setMobileSheetOpen(true)}
                  className="w-full flex items-center justify-between mb-2.5"
                >
                  <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-emerald-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" /> Jump to viewpoint
                  </span>
                  <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-neutral-500 font-bold">
                    Menu <ChevronUp className="w-3.5 h-3.5" />
                  </span>
                </button>

                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-neutral-800 snap-x">
                  {pois.map((poi) => (
                    <button
                      key={poi.id}
                      onClick={() => handlePoiClick(poi)}
                      disabled={viewMode === 'AR' && !portalPos}
                      className={`snap-start shrink-0 px-4 py-2.5 rounded-full border text-xs font-medium tracking-tight whitespace-nowrap transition-all active:scale-95 disabled:opacity-30 ${
                        activePoi === poi.id
                          ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_16px_-4px_rgba(16,185,129,0.6)]'
                          : 'bg-white/5 border-white/10 text-neutral-300'
                      }`}
                    >
                      {poi.name}
                    </button>
                  ))}
                  {pois.length === 0 && (
                    <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold py-2.5">Loading viewpoints…</span>
                  )}
                </div>

                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[8px] uppercase tracking-widest text-white/30 font-bold">
                  <Hand className="w-3 h-3" /> Drag scene to look • Joystick to walk
                </p>
              </div>
            ) : (
              /* ---------- EXPANDED: full controls ---------- */
              <div className="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Immersive Space
                    </p>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider truncate mt-1">{title || '3D Space Viewer'}</h3>
                  </div>
                  <button
                    onClick={() => setMobileSheetOpen(false)}
                    className="shrink-0 p-1.5 text-neutral-500 hover:text-white transition-colors"
                    aria-label="Close panel"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex border border-white/10 p-0.5 bg-black/40 w-full mb-5">
                  <button
                    onClick={() => setViewMode('360')}
                    className={`flex-1 h-10 text-[10px] uppercase font-bold tracking-widest transition-all ${
                      viewMode === '360' ? 'bg-white text-black' : 'text-neutral-500'
                    }`}
                  >
                    360 Walk
                  </button>
                  <button
                    disabled={!isIOS && !arSupported}
                    onClick={() => setViewMode('AR')}
                    className={`flex-1 h-10 text-[10px] uppercase font-bold tracking-widest transition-all ${
                      viewMode === 'AR'
                        ? 'bg-white text-black'
                        : (!isIOS && !arSupported)
                          ? 'text-neutral-700 opacity-40'
                          : 'text-neutral-500'
                    }`}
                  >
                    AR Portal
                  </button>
                </div>

                {/* Viewpoint list */}
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-white/5 pb-2 mb-3">Viewpoints</p>
                <div className="space-y-2 mb-5">
                  {pois.map((poi) => (
                    <button
                      key={poi.id}
                      onClick={() => { handlePoiClick(poi); setMobileSheetOpen(false) }}
                      disabled={viewMode === 'AR' && !portalPos}
                      className={`w-full text-left p-3.5 border transition-all flex items-center justify-between group disabled:opacity-30 ${
                        activePoi === poi.id
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-white/5 border-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="space-y-1 max-w-[90%]">
                        <span className="text-sm font-medium tracking-tight block">{poi.name}</span>
                        <p className="text-[10px] text-neutral-500 font-light truncate">{poi.description}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${activePoi === poi.id ? 'text-emerald-400' : 'text-neutral-600'}`} />
                    </button>
                  ))}
                </div>

                {/* AR launch (contextual) */}
                {viewMode === 'AR' && isIOS ? (
                  <button
                    onClick={handleIOSAR}
                    disabled={exportingUsdz}
                    className="w-full h-14 bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_8px_28px_-6px_rgba(16,185,129,0.6)] ring-1 ring-emerald-300/40 active:scale-[0.98] transition-transform"
                  >
                    {exportingUsdz ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generating USDZ…</>) : (<><Smartphone className="w-4 h-4" /> Launch iOS AR</>)}
                  </button>
                ) : viewMode === 'AR' && isAndroid ? (
                  <button onClick={handleAndroidAR} className="w-full h-14 bg-emerald-400 text-neutral-950 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_8px_28px_-6px_rgba(16,185,129,0.6)] ring-1 ring-emerald-300/40 active:scale-[0.98] transition-transform">
                    <Smartphone className="w-4 h-4" /> Launch Android AR
                  </button>
                ) : viewMode === 'AR' && arSupported && !arActive ? (
                  <button onClick={() => setArActive(true)} className="w-full h-14 bg-emerald-400 text-neutral-950 text-sm font-bold uppercase tracking-widest shadow-[0_8px_28px_-6px_rgba(16,185,129,0.6)] ring-1 ring-emerald-300/40 active:scale-[0.98] transition-transform">
                    Enter WebXR AR
                  </button>
                ) : (
                  <div className="border border-white/5 bg-white/[0.02] p-4 space-y-2.5 text-[10px] text-neutral-400 font-light uppercase tracking-wider">
                    <div className="flex items-center gap-2"><Hand className="w-4 h-4 text-neutral-600" /> <span>Drag the scene to look around</span></div>
                    <div className="flex items-center gap-2"><Move className="w-4 h-4 text-neutral-600" /> <span>Use the joystick to walk</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-neutral-600" /> <span>Tap a viewpoint to jump</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Monospace overlay elements */}

        {/* Bottom-Left Location Box */}
        <div className="absolute bottom-6 left-6 z-10 bg-neutral-950/90 border border-white/5 px-4 py-2.5 shadow-lg select-none">
          <span className="text-[10px] font-mono tracking-widest text-white font-bold uppercase">
            {title && title !== 'Immersive Space' && title !== '3D Space Viewer' 
              ? title 
              : url ? url.split('/').pop()?.split('.')[0]?.replace(/[-_]/g, ' ') || 'Belgian' 
              : 'Belgian'}
          </span>
        </div>

        {/* Bottom-Right Powered Box */}
        <div className="absolute bottom-6 right-6 z-10 bg-neutral-950/90 border border-white/5 px-4 py-2.5 shadow-lg flex items-center gap-2 select-none">
          <span className="text-[9px] font-mono tracking-widest text-neutral-400 font-bold uppercase">Powered by HousePadi</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        </div>
      </main>
    </div>
  )
}
