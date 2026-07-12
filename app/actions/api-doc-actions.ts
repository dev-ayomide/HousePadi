'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ApiDoc {
  id: string
  title: string
  content: string
  section_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export async function getApiDocs(includeUnpublished = false) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('api_documentation')
      .select('*')
      .order('section_order', { ascending: true })

    if (!includeUnpublished) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching API docs:', error)
      return { success: false, error: 'Failed to retrieve API documentation.' }
    }

    return { success: true, data: data as ApiDoc[] }
  } catch (err: any) {
    console.error('getApiDocs exception:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}

export async function createApiDoc(doc: Partial<ApiDoc>) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('api_documentation')
      .insert({
        title: doc.title || 'New Section',
        content: doc.content || '',
        section_order: doc.section_order || 0,
        is_published: doc.is_published ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating API doc:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ApiDoc }
  } catch (err: any) {
    console.error('createApiDoc exception:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}

export async function updateApiDoc(id: string, updates: Partial<ApiDoc>) {
  try {
    const adminClient = createAdminClient()
    
    const safeUpdates = { ...updates }
    delete safeUpdates.id
    delete safeUpdates.created_at
    safeUpdates.updated_at = new Date().toISOString()

    const { data, error } = await adminClient
      .from('api_documentation')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating API doc:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ApiDoc }
  } catch (err: any) {
    console.error('updateApiDoc exception:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}

export async function deleteApiDoc(id: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('api_documentation')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting API doc:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('deleteApiDoc exception:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}
