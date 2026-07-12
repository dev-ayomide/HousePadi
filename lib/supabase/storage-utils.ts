import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side supabase client for storage operations
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const BUCKET_NAME = 'team-members'

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  console.log(`[Supabase Storage] Starting upload: ${path}`, file.name)
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    console.error('[Supabase Storage] Upload error:', error)
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  console.log(`[Supabase Storage] Upload successful: ${publicUrl}`)
  return publicUrl
}

/**
 * Deletes a file from Supabase Storage
 */
export async function deleteFile(pathOrUrl: string): Promise<void> {
  if (!pathOrUrl) return
  
  console.log(`[Supabase Storage] Attempting to delete: ${pathOrUrl}`)
  
  try {
    let path = pathOrUrl
    
    // If it's a full URL, extract the path after the bucket name
    if (pathOrUrl.includes('/storage/v1/object/public/')) {
      const parts = pathOrUrl.split(`${BUCKET_NAME}/`)
      if (parts.length > 1) {
        path = parts[1]
      }
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) throw error
    console.log(`[Supabase Storage] Deletion successful: ${path}`)
  } catch (error) {
    console.warn('[Supabase Storage] Delete warning (ignoring):', error)
  }
}
