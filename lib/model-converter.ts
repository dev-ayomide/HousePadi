import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

export async function convertModelToGLB(file: File): Promise<File> {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  // If already GLB/GLTF, return as-is
  if (extension === 'glb' || extension === 'gltf') {
    return file
  }

  // Define supported loaders
  if (!['fbx', 'obj', 'usdz'].includes(extension)) {
    throw new Error(`Unsupported model format: ${extension}`)
  }

  return new Promise(async (resolve, reject) => {
    try {
      const url = URL.createObjectURL(file)
      let scene: THREE.Group | THREE.Scene | null = null

      if (extension === 'fbx') {
        const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
        const loader = new FBXLoader()
        scene = await loader.loadAsync(url)
      } else if (extension === 'obj') {
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
        const loader = new OBJLoader()
        scene = await loader.loadAsync(url)
      } else if (extension === 'usdz') {
        const { USDZLoader } = await import('three/examples/jsm/loaders/USDZLoader.js')
        const loader = new USDZLoader()
        scene = await loader.loadAsync(url)
      }

      if (!scene) {
        throw new Error('Failed to parse 3D model')
      }

      const exporter = new GLTFExporter()
      
      exporter.parse(
        scene,
        (gltf) => {
          if (gltf instanceof ArrayBuffer) {
            const blob = new Blob([gltf], { type: 'model/gltf-binary' })
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'))
            const newFile = new File([blob], `${baseName}.glb`, { type: 'model/gltf-binary' })
            URL.revokeObjectURL(url)
            resolve(newFile)
          } else {
            URL.revokeObjectURL(url)
            reject(new Error('Exported GLTF is not an ArrayBuffer'))
          }
        },
        (error) => {
          URL.revokeObjectURL(url)
          reject(error)
        },
        { binary: true }
      )

    } catch (error) {
      reject(error)
    }
  })
}
