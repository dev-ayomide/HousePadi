import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/app/actions/r2-actions'

// The config export is deprecated in App Router. 
// For Vercel, use vercel.json or route segment configs if supported.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload to Cloudflare R2
    const uploadResult = await uploadToR2(file, user.id)

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 500 }
      )
    }

    // Save metadata to Supabase
    const { data, error } = await supabase
      .from('content_items')
      .insert({
        user_id: user.id,
        title,
        description,
        file_url: uploadResult.url,
        file_path: uploadResult.path,
        file_type: file.type,
        file_size: file.size,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      fileUrl: uploadResult.url,
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
