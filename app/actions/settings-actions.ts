'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getSiteSettings() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')

    if (error) throw error
    
    // Convert to object for easier access
    const settings = data.reduce((acc: any, item) => {
      acc[item.key] = item.value
      return acc
    }, {})

    return { success: true, data: settings }
  } catch (err: any) {
    console.error('Get Settings Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateSiteSetting(key: string, value: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })

    if (error) throw error
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Update Setting Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateMultipleSettings(settings: Record<string, string>) {
  try {
    const supabase = createAdminClient()
    
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('site_settings')
      .upsert(updates)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Update Multiple Settings Error:', err)
    return { success: false, error: err.message }
  }
}
