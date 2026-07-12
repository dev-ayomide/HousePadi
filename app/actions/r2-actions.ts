'use server'

import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'housepadi'
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
})

export async function generatePresignedUrl(fileName: string, contentType: string) {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials are not configured.')
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    
    // Construct the public URL where the file will be accessible
    const publicUrl = `${R2_PUBLIC_URL}/${fileName}`

    return { success: true, signedUrl, publicUrl }
  } catch (error: any) {
    console.error('Error generating presigned URL:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteFromR2(fileUrl: string) {
  try {
    if (!R2_ACCOUNT_ID || !R2_PUBLIC_URL) return { success: false }

    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`
    const key = fileUrl.replace(baseUrl, '')
    const decodedKey = decodeURIComponent(key)
    
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: decodedKey,
    })

    await s3Client.send(command)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting from R2:', error)
    return { success: false, error: error.message }
  }
}

export async function getAgencyStorageUsage(agencyId: string) {
  try {
    if (!R2_ACCOUNT_ID) return 0
    
    let totalSize = 0
    const prefixes = [`models/${agencyId}/`, `thumbnails/${agencyId}/`]
    
    for (const prefix of prefixes) {
      let isTruncated = true
      let continuationToken = undefined

      while (isTruncated) {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })

        const response = await s3Client.send(command)
        
        if (response.Contents) {
          totalSize += response.Contents.reduce((acc, item) => acc + (item.Size || 0), 0)
        }

        isTruncated = response.IsTruncated ?? false
        continuationToken = response.NextContinuationToken
      }
    }

    return totalSize
  } catch (error) {
    console.error('Error fetching agency storage usage:', error)
    return 0
  }
}

export async function getR2BucketSize() {
  try {
    if (!R2_ACCOUNT_ID) return 0
    
    let totalSize = 0
    let isTruncated = true
    let continuationToken = undefined

    while (isTruncated) {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      })

      const response = await s3Client.send(command)
      
      if (response.Contents) {
        totalSize += response.Contents.reduce((acc, item) => acc + (item.Size || 0), 0)
      }

      isTruncated = response.IsTruncated ?? false
      continuationToken = response.NextContinuationToken
    }

    return totalSize
  } catch (error) {
    console.error('Error fetching R2 bucket size:', error)
    return 0
  }
}

export async function uploadToR2(file: File, userId: string): Promise<{ success: boolean, url?: string, path?: string, error?: string }> {
  try {
    if (!R2_ACCOUNT_ID || !R2_PUBLIC_URL) throw new Error('R2 not configured')

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const path = `uploads/${userId}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    return {
      success: true,
      url: `${R2_PUBLIC_URL}/${path}`,
      path,
    }
  } catch (error: any) {
    console.error('Error uploading to R2:', error)
    return { success: false, error: error.message }
  }
}

export async function bakePOIsIntoGLB(
  propertyId: string, 
  pois: any[], 
  tableName: string = 'apartments', 
  modelScale: number = 1.0,
  modelPosition: [number, number, number] = [0, 0, 0],
  modelRotation: [number, number, number] = [0, 0, 0]
) {
  try {
    if (!R2_ACCOUNT_ID || !R2_PUBLIC_URL) {
      throw new Error('R2 credentials are not configured.')
    }

    const supabase = await createClient()
    const { data: property, error: fetchErr } = await supabase
      .from(tableName)
      .select('model_url')
      .eq('id', propertyId)
      .single()

    if (fetchErr || !property || !property.model_url) {
      throw new Error('Could not find listing or its associated 3D scan.')
    }

    const modelUrl = property.model_url

    // 1. Fetch original GLB buffer
    const response = await fetch(modelUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch original GLB file from storage: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const glbBuffer = Buffer.from(arrayBuffer)

    // 2. Parse and bake POIs (Scenario A: locator nodes / Empties)
    const magic = glbBuffer.readUInt32LE(0)
    if (magic !== 0x46546C67) {
      throw new Error("Invalid GLB file: Magic signature does not match glTF.")
    }

    const jsonChunkLength = glbBuffer.readUInt32LE(12)
    const jsonChunkType = glbBuffer.readUInt32LE(16)

    if (jsonChunkType !== 0x4E4F534A) {
      throw new Error("Invalid GLB file: Chunk 0 is not JSON.")
    }

    const jsonOffset = 20
    const jsonString = glbBuffer.toString("utf8", jsonOffset, jsonOffset + jsonChunkLength)
    const gltf = JSON.parse(jsonString)

    // 2. Locate BIN chunk body and extract it
    const binChunkHeaderOffset = jsonOffset + jsonChunkLength
    let binBodyBuffer = Buffer.alloc(0)
    let binBodyLength = 0

    if (binChunkHeaderOffset < glbBuffer.length) {
      const binChunkLength = glbBuffer.readUInt32LE(binChunkHeaderOffset)
      const binChunkType = glbBuffer.readUInt32LE(binChunkHeaderOffset + 4)
      if (binChunkType === 0x004E4942) {
        binBodyBuffer = glbBuffer.subarray(binChunkHeaderOffset + 8, binChunkHeaderOffset + 8 + binChunkLength)
        binBodyLength = binChunkLength
      }
    }

    // 3. Check if we've already baked POIs into this GLB
    const existingPoiMeshIndex = gltf.meshes ? gltf.meshes.findIndex((m: any) => m.name === "POI_Marker_Mesh") : -1;
    const isAlreadyBaked = existingPoiMeshIndex !== -1;

    let combinedBinBody = binBodyBuffer;
    let combinedBinBodyLength = binBodyLength;
    let poiMeshIndex = existingPoiMeshIndex;

    if (!isAlreadyBaked) {
      // Create new physical 3D mesh binary data: Octahedron Crystal Marker
      // Vertices: 6 vertices * 3 floats = 18 floats = 72 bytes
      const vertexArray = new Float32Array([
        0.0,   0.08,  0.0,   // 0: Top vertex
        0.0,  -0.08,  0.0,   // 1: Bottom vertex
        0.0,   0.0,   0.08,  // 2: Front vertex
        0.0,   0.0,  -0.08,  // 3: Back vertex
       -0.08,  0.0,   0.0,   // 4: Left vertex
        0.08,  0.0,   0.0    // 5: Right vertex
      ])
      const vertexBuffer = Buffer.from(vertexArray.buffer, vertexArray.byteOffset, vertexArray.byteLength)

      // Indices: 8 triangular faces * 3 indices = 24 indices = 48 bytes (UNSIGNED_SHORT)
      const indexArray = new Uint16Array([
        0, 2, 4,
        0, 5, 2,
        0, 4, 3,
        0, 3, 5,
        1, 4, 2,
        1, 2, 5,
        1, 3, 4,
        1, 5, 3
      ])
      const indexBuffer = Buffer.from(indexArray.buffer, indexArray.byteOffset, indexArray.byteLength)

      const markerBinary = Buffer.concat([vertexBuffer, indexBuffer])
      
      // Combine original BIN body with our octahedral marker mesh binary data
      combinedBinBody = Buffer.concat([binBodyBuffer, markerBinary])
      combinedBinBodyLength = combinedBinBody.length

      // Pad the BIN body to a multiple of 4 bytes (required by glTF spec)
      const binRemainder = combinedBinBodyLength % 4
      if (binRemainder !== 0) {
        const paddingLength = 4 - binRemainder
        combinedBinBody = Buffer.concat([combinedBinBody, Buffer.alloc(paddingLength, 0x00)])
        combinedBinBodyLength += paddingLength
      }

      // Update GLTF JSON structure with our new mesh, bufferViews, accessors, and material
      if (!gltf.accessors) gltf.accessors = []
      if (!gltf.bufferViews) gltf.bufferViews = []
      if (!gltf.meshes) gltf.meshes = []
      if (!gltf.buffers) gltf.buffers = [{ byteLength: 0 }]
      if (!gltf.materials) gltf.materials = []

      const originalBinBodyLength = binBodyLength
      const originalBufferViewsLength = gltf.bufferViews.length
      const originalAccessorsLength = gltf.accessors.length
      const originalMeshesLength = gltf.meshes.length
      const originalMaterialsLength = gltf.materials.length

      // Update main buffer length
      gltf.buffers[0].byteLength = combinedBinBodyLength

      // Push bufferViews for vertex coordinates and indices
      gltf.bufferViews.push(
        {
          buffer: 0,
          byteOffset: originalBinBodyLength,
          byteLength: 72,
          target: 34962 // WebGL ARRAY_BUFFER
        },
        {
          buffer: 0,
          byteOffset: originalBinBodyLength + 72,
          byteLength: 48,
          target: 34963 // WebGL ELEMENT_ARRAY_BUFFER
        }
      )

      // Push accessors describing coordinates and indices formatting
      gltf.accessors.push(
        {
          bufferView: originalBufferViewsLength,
          byteOffset: 0,
          componentType: 5126, // WebGL FLOAT
          count: 6,
          type: "VEC3",
          max: [0.08, 0.08, 0.08],
          min: [-0.08, -0.08, -0.08]
        },
        {
          bufferView: originalBufferViewsLength + 1,
          byteOffset: 0,
          componentType: 5123, // WebGL UNSIGNED_SHORT
          count: 24,
          type: "SCALAR"
        }
      )

      // Push a glowing Emerald-Green PBR material for visual pop
      gltf.materials.push({
        name: "POI_Marker_Material",
        pbrMetallicRoughness: {
          baseColorFactor: [0.062, 0.725, 0.505, 1.0], // Emerald Green (#10b981)
          metallicFactor: 0.1,
          roughnessFactor: 0.3
        },
        emissiveFactor: [0.062, 0.725, 0.505], // Emissive glow in VR/Blender
        doubleSided: true
      })

      // Push the octahedral marker mesh definition
      gltf.meshes.push({
        name: "POI_Marker_Mesh",
        primitives: [
          {
            attributes: {
              POSITION: originalAccessorsLength
            },
            indices: originalAccessorsLength + 1,
            material: originalMaterialsLength
          }
        ]
      })

      poiMeshIndex = originalMeshesLength;
    }

    // 3.5 Handle Proxima_Transform_Root for Spatial Corrections
    if (!gltf.nodes) gltf.nodes = []
    
    // Convert Euler to Quaternion (XYZ order)
    const [x, y, z] = modelRotation
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2)
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2)
    const quaternion = [
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3
    ]

    let transformRootIndex = gltf.nodes.findIndex((n: any) => n.name === 'Proxima_Transform_Root')
    const defaultSceneIndex = gltf.scene !== undefined ? gltf.scene : 0
    if (!gltf.scenes) gltf.scenes = [{ nodes: [] }]
    const sceneObj = gltf.scenes[defaultSceneIndex]
    if (!sceneObj.nodes) sceneObj.nodes = []

    if (transformRootIndex === -1) {
      // Create new root transform node
      transformRootIndex = gltf.nodes.length
      // Find original scene nodes that are NOT our transform root
      const originalRootNodes = sceneObj.nodes.filter((idx: number) => idx !== transformRootIndex)
      
      gltf.nodes.push({
        name: 'Proxima_Transform_Root',
        translation: modelPosition,
        rotation: quaternion,
        scale: [modelScale, modelScale, modelScale],
        children: [...originalRootNodes]
      })
      sceneObj.nodes = [transformRootIndex]
    } else {
      // Update existing
      gltf.nodes[transformRootIndex].translation = modelPosition
      gltf.nodes[transformRootIndex].rotation = quaternion
      gltf.nodes[transformRootIndex].scale = [modelScale, modelScale, modelScale]
    }

    // 4. Handle POI nodes: update existing or create new
    // Find all existing POI nodes
    const existingPoiNodeIndices: number[] = []
    gltf.nodes.forEach((node: any, index: number) => {
      if (node.mesh === poiMeshIndex) {
        existingPoiNodeIndices.push(index)
      }
    })

    const newIndices: number[] = []
    pois.forEach((poi, index) => {
      if (index < existingPoiNodeIndices.length) {
        // Reuse existing node
        const nodeIndex = existingPoiNodeIndices[index]
        gltf.nodes[nodeIndex].name = poi.name
        gltf.nodes[nodeIndex].translation = [poi.position[0], poi.position[1], poi.position[2]]
        newIndices.push(nodeIndex)
      } else {
        // Create new node
        const nodeIndex = gltf.nodes.length
        newIndices.push(nodeIndex)
        gltf.nodes.push({
          name: poi.name,
          translation: [poi.position[0], poi.position[1], poi.position[2]],
          mesh: poiMeshIndex
        })
      }
    })

    // Parent the active POI nodes to the Transform Root
    const transformRootNode = gltf.nodes[transformRootIndex]
    if (!transformRootNode.children) transformRootNode.children = []
    
    // Remove all previously known POI nodes from the transform root
    transformRootNode.children = transformRootNode.children.filter((nodeIndex: number) => !existingPoiNodeIndices.includes(nodeIndex))
    
    // Add the currently active POI nodes back
    transformRootNode.children.push(...newIndices)

    // Stringify and pad JSON
    let newJsonString = JSON.stringify(gltf)
    let newJsonByteLength = Buffer.byteLength(newJsonString, "utf8")
    
    const jsonRemainder = newJsonByteLength % 4
    if (jsonRemainder !== 0) {
      const paddingLength = 4 - jsonRemainder
      newJsonString += " ".repeat(paddingLength)
      newJsonByteLength += paddingLength
    }

    // 5. Re-assemble pristine binary GLB package
    const headerSize = 12
    const jsonChunkHeaderSize = 8
    const binChunkHeaderSize = 8
    
    const newJsonChunkTotalSize = jsonChunkHeaderSize + newJsonByteLength
    const newBinChunkTotalSize = binChunkHeaderSize + combinedBinBodyLength
    
    let newTotalLength = headerSize + newJsonChunkTotalSize + newBinChunkTotalSize

    const resultBuffer = Buffer.alloc(newTotalLength)

    // Write GLB Magic, Version, and total length
    resultBuffer.writeUInt32LE(0x46546C67, 0)
    resultBuffer.writeUInt32LE(2, 4)
    resultBuffer.writeUInt32LE(newTotalLength, 8)

    // Write Chunk 0 JSON Header
    resultBuffer.writeUInt32LE(newJsonByteLength, 12)
    resultBuffer.writeUInt32LE(0x4E4F534A, 16)
    resultBuffer.write(newJsonString, 20, "utf8")

    // Write Chunk 1 BIN Header
    const binHeaderOffset = 20 + newJsonByteLength
    resultBuffer.writeUInt32LE(combinedBinBodyLength, binHeaderOffset)
    resultBuffer.writeUInt32LE(0x004E4942, binHeaderOffset + 4)

    // Copy combined BIN body in
    combinedBinBody.copy(resultBuffer, binHeaderOffset + 8)

    // 3. Upload new baked scan back to Cloudflare R2 with a unique timestamped key to bust CDN/browser caches
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`
    const rawOldKey = modelUrl.replace(baseUrl, '')
    const oldKey = decodeURIComponent(rawOldKey)
    const newKey = `scans/${propertyId}-${Date.now()}.glb`
    const newUrl = `${R2_PUBLIC_URL}/${newKey}`

    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: newKey,
      Body: resultBuffer,
      ContentType: 'model/gltf-binary',
    })
    await s3Client.send(uploadCommand)

    const { error: updateErr } = await supabase
      .from(tableName)
      .update({
        model_url: newUrl,
        pois: pois,
        scale_factor: modelScale,
        transform_metadata: { position: modelPosition, rotation: modelRotation, scale: modelScale }
      })
      .eq('id', propertyId)

    if (updateErr) {
      if (
        updateErr.message?.includes('scale_factor') || 
        updateErr.message?.includes('transform_metadata') || 
        updateErr.message?.includes('column')
      ) {
        const { error: fallbackErr } = await supabase
          .from(tableName)
          .update({
            model_url: newUrl,
            pois: pois
          })
          .eq('id', propertyId)
        
        if (fallbackErr) {
          throw new Error(`Failed to update database metadata: ${fallbackErr.message}`)
        }
        
        if (oldKey && oldKey !== newKey) {
          const deleteOldCommand = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: oldKey,
          })
          await s3Client.send(deleteOldCommand).catch(err => {
            console.warn(`Failed to delete old scan file (${oldKey}) from R2 storage:`, err)
          })
        }
        return { success: true, path: newKey, url: newUrl, error: 'MISSING_SCALE_COLUMN' }
      }

      // If DB update fails, attempt to clean up the newly uploaded file to avoid orphaned storage files
      const deleteNewCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: newKey,
      })
      await s3Client.send(deleteNewCommand).catch(e => console.warn('Failed to clean up newly uploaded file after DB failure:', e))
      throw new Error(`Failed to update database metadata: ${updateErr.message}`)
    }

    // 5. Success! Safely delete the old cached scan file from Cloudflare R2 to save storage
    if (oldKey && oldKey !== newKey) {
      const deleteOldCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: oldKey,
      })
      await s3Client.send(deleteOldCommand).catch(err => {
        console.warn(`Failed to delete old scan file (${oldKey}) from R2 storage:`, err)
      })
    }

    return { success: true, path: newKey, url: newUrl }
  } catch (error: any) {
    console.error('Error baking POIs into GLB:', error)
    return { success: false, error: error.message }
  }
}

export async function getHumanModelUrl() {
  return `${R2_PUBLIC_URL}/character/Human.glb`
}

export async function bakeProductTransformIntoGLB(
  productId: string, 
  modelScale: number = 1.0
) {
  try {
    if (!R2_ACCOUNT_ID || !R2_PUBLIC_URL) {
      throw new Error('R2 credentials are not configured.')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch product details
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('model_url, vendor_id')
      .eq('id', productId)
      .single()

    if (fetchErr || !product || !product.model_url) {
      throw new Error('Could not find product or its associated 3D model.')
    }

    if (product.vendor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this product')
    }

    const modelUrl = product.model_url

    // 1. Fetch original GLB buffer
    const response = await fetch(modelUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch original GLB file from storage: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const glbBuffer = Buffer.from(arrayBuffer)

    // 2. Parse and bake transforms
    const magic = glbBuffer.readUInt32LE(0)
    if (magic !== 0x46546C67) {
      throw new Error("Invalid GLB file: Magic signature does not match glTF.")
    }

    const jsonChunkLength = glbBuffer.readUInt32LE(12)
    const jsonChunkType = glbBuffer.readUInt32LE(16)

    if (jsonChunkType !== 0x4E4F534A) {
      throw new Error("Invalid GLB file: Chunk 0 is not JSON.")
    }

    const jsonOffset = 20
    const jsonString = glbBuffer.toString("utf8", jsonOffset, jsonOffset + jsonChunkLength)
    const gltf = JSON.parse(jsonString)

    // Locate BIN chunk body and extract it
    const binChunkHeaderOffset = jsonOffset + jsonChunkLength
    let binBodyBuffer = Buffer.alloc(0)
    let binBodyLength = 0

    if (binChunkHeaderOffset < glbBuffer.length) {
      const binChunkLength = glbBuffer.readUInt32LE(binChunkHeaderOffset)
      const binChunkType = glbBuffer.readUInt32LE(binChunkHeaderOffset + 4)
      if (binChunkType === 0x004E4942) {
        binBodyBuffer = glbBuffer.subarray(binChunkHeaderOffset + 8, binChunkHeaderOffset + 8 + binChunkLength)
        binBodyLength = binChunkLength
      }
    }

    // 3. Handle Proxima_Transform_Root for Spatial Corrections (identity position and rotation, updated scale)
    if (!gltf.nodes) gltf.nodes = []
    
    // Default position and rotation (identity)
    const modelPosition = [0, 0, 0]
    const quaternion = [0, 0, 0, 1] // identity quaternion

    let transformRootIndex = gltf.nodes.findIndex((n: any) => n.name === 'Proxima_Transform_Root')
    const defaultSceneIndex = gltf.scene !== undefined ? gltf.scene : 0
    if (!gltf.scenes) gltf.scenes = [{ nodes: [] }]
    const sceneObj = gltf.scenes[defaultSceneIndex]
    if (!sceneObj.nodes) sceneObj.nodes = []

    if (transformRootIndex === -1) {
      // Create new root transform node
      transformRootIndex = gltf.nodes.length
      const originalRootNodes = sceneObj.nodes.filter((idx: number) => idx !== transformRootIndex)
      
      gltf.nodes.push({
        name: 'Proxima_Transform_Root',
        translation: modelPosition,
        rotation: quaternion,
        scale: [modelScale, modelScale, modelScale],
        children: [...originalRootNodes]
      })
      sceneObj.nodes = [transformRootIndex]
    } else {
      // Update existing (position & rotation remain untouched/identity, only scale is updated)
      gltf.nodes[transformRootIndex].scale = [modelScale, modelScale, modelScale]
    }

    // Stringify and pad JSON
    let newJsonString = JSON.stringify(gltf)
    let newJsonByteLength = Buffer.byteLength(newJsonString, "utf8")
    
    const jsonRemainder = newJsonByteLength % 4
    if (jsonRemainder !== 0) {
      const paddingLength = 4 - jsonRemainder
      newJsonString += " ".repeat(paddingLength)
      newJsonByteLength += paddingLength
    }

    // Re-assemble binary GLB package
    const headerSize = 12
    const jsonChunkHeaderSize = 8
    const binChunkHeaderSize = 8
    
    const newJsonChunkTotalSize = jsonChunkHeaderSize + newJsonByteLength
    const newBinChunkTotalSize = binChunkHeaderSize + binBodyLength
    
    let newTotalLength = headerSize + newJsonChunkTotalSize + newBinChunkTotalSize

    const resultBuffer = Buffer.alloc(newTotalLength)

    // Write GLB Magic, Version, and total length
    resultBuffer.writeUInt32LE(0x46546C67, 0)
    resultBuffer.writeUInt32LE(2, 4)
    resultBuffer.writeUInt32LE(newTotalLength, 8)

    // Write Chunk 0 JSON Header
    resultBuffer.writeUInt32LE(newJsonByteLength, 12)
    resultBuffer.writeUInt32LE(0x4E4F534A, 16)
    resultBuffer.write(newJsonString, 20, "utf8")

    // Write Chunk 1 BIN Header
    const binHeaderOffset = 20 + newJsonByteLength
    resultBuffer.writeUInt32LE(binBodyLength, binHeaderOffset)
    resultBuffer.writeUInt32LE(0x004E4942, binHeaderOffset + 4)

    // Copy BIN body in
    binBodyBuffer.copy(resultBuffer, binHeaderOffset + 8)

    // Upload new baked model back to Cloudflare R2
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`
    const rawOldKey = modelUrl.replace(baseUrl, '')
    const oldKey = decodeURIComponent(rawOldKey)
    const newKey = `models/${user.id}-${Date.now()}.glb`
    const newUrl = `${R2_PUBLIC_URL}/${newKey}`

    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: newKey,
      Body: resultBuffer,
      ContentType: 'model/gltf-binary',
    })
    await s3Client.send(uploadCommand)

    // Update the products table
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        model_url: newUrl,
        scale_factor: modelScale,
        model_size_bytes: resultBuffer.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (updateErr) {
      // Cleanup uploaded file on DB update error
      const deleteNewCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: newKey,
      })
      await s3Client.send(deleteNewCommand).catch(e => console.warn('Failed to clean up new file:', e))
      throw new Error(`Failed to update database metadata: ${updateErr.message}`)
    }

    // Success! Safely delete the old cached model file from R2
    if (oldKey && oldKey !== newKey) {
      const deleteOldCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: oldKey,
      })
      await s3Client.send(deleteOldCommand).catch(err => {
        console.warn(`Failed to delete old model file (${oldKey}) from R2:`, err)
      })
    }

    return { success: true, path: newKey, url: newUrl }
  } catch (error: any) {
    console.error('Error baking product transform into GLB:', error)
    return { success: false, error: error.message }
  }
}
