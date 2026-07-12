'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

export async function getArticles(publishedOnly = true) {
  try {
    const supabase = publishedOnly ? await createClient() : createAdminClient()

    let query = supabase
      .from('articles')
      .select('id, title, slug, thumbnail_url, status, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (publishedOnly) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('getArticles error:', error)
    return { success: false, error: error.message }
  }
}

export async function getArticleBySlug(slug: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, content, thumbnail_url, status, created_at, profiles(full_name)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('getArticleBySlug error:', error)
    return { success: false, error: error.message }
  }
}

export async function getArticleByIdAdmin(id: string) {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('getArticleByIdAdmin error:', error)
    return { success: false, error: error.message }
  }
}

export async function saveArticle(
  formData: FormData,
  content: string,
  thumbnailUrl: string | null,
  articleId?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const title = formData.get('title') as string
    const status = formData.get('status') as string || 'draft'
    
    // Create base slug
    let slug = slugify(title)
    
    const adminClient = createAdminClient()

    // Ensure unique slug
    if (!articleId) {
      const { data: existing } = await adminClient
        .from('articles')
        .select('id')
        .eq('slug', slug)
        
      if (existing && existing.length > 0) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`
      }
    }

    const articleData: any = {
      title,
      content,
      status,
      updated_at: new Date().toISOString()
    }

    if (thumbnailUrl !== undefined) {
      articleData.thumbnail_url = thumbnailUrl
    }

    let result
    if (articleId) {
      const { data, error } = await adminClient
        .from('articles')
        .update(articleData)
        .eq('id', articleId)
        .select()
        .single()
        
      if (error) throw error
      result = data
    } else {
      articleData.slug = slug
      articleData.author_id = user.id
      
      const { data, error } = await adminClient
        .from('articles')
        .insert(articleData)
        .select()
        .single()
        
      if (error) throw error
      result = data
    }

    revalidatePath('/resources')
    revalidatePath(`/resources/${result.slug}`)
    revalidatePath('/admin/cms/resources')
    
    return { success: true, data: result }
  } catch (error: any) {
    console.error('saveArticle error:', error)
    return { success: false, error: error.message || 'Failed to save article' }
  }
}

export async function deleteArticle(id: string) {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('articles')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/resources')
    revalidatePath('/admin/cms/resources')
    return { success: true }
  } catch (error: any) {
    console.error('deleteArticle error:', error)
    return { success: false, error: error.message }
  }
}
