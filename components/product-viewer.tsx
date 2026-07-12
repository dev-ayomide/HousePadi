'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

function GLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function FBXModel({ url }: { url: string }) {
  const fbx = useLoader(FBXLoader, url)
  const copiedFbx = useMemo(() => fbx.clone(true), [fbx])
  return <primitive object={copiedFbx} />
}

function OBJModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url)
  const copiedObj = useMemo(() => obj.clone(true), [obj])
  return <primitive object={copiedObj} />
}

function ModelLoader({ url }: { url: string }) {
  const extension = url.split('.').pop()?.toLowerCase() || ''

  if (extension === 'gltf' || extension === 'glb') {
    return <GLTFModel url={url} />
  }

  if (extension === 'fbx') {
    return <FBXModel url={url} />
  }

  if (extension === 'obj') {
    return <OBJModel url={url} />
  }

  // Fallback to GLTF if unknown or USDZ (since USDZ isn't natively supported in standard R3F without specialized loaders)
  // For USDZ, usually iOS handles it natively in AR Quick Look. In browser, we might just fail gracefully or show a placeholder.
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
        Loading 3D Product...
      </p>
    </div>
  )
}

export function ProductViewer({ url, className = '' }: { url: string, className?: string }) {
  return (
    <div className={`relative w-full h-full bg-neutral-950 ${className}`}>
      <Suspense fallback={<Loader />}>
        <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
          
          <Suspense fallback={null}>
            <Center>
              <ModelLoader url={url} />
            </Center>
          </Suspense>
          
          <OrbitControls 
            makeDefault
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            enablePan={false}
            enableZoom={true}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}
