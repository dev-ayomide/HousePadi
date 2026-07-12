'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface AboutContent {
  id: string
  hero_headline: string
  hero_subheadline: string
  org_title: string
  org_description: string
  org_supporting_text: string
  org_images: any[]
}

export interface TeamMember {
  id: string
  name: string
  role: string
  about: string
  image_url: string | null
  handle: string | null
  status: string | null
  is_visible: boolean
  display_order: number
}

// ABOUT CONTENT ACTIONS
export async function getAboutContent() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('about_page_content')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return { success: true, data: data as AboutContent }
  } catch (err: any) {
    console.error('Get About Content Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateAboutContent(id: string | undefined, content: Partial<Omit<AboutContent, 'id'>>) {
  try {
    const supabase = createAdminClient()
    let error
    
    if (id) {
      const { error: updateError } = await supabase
        .from('about_page_content')
        .update(content)
        .eq('id', id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('about_page_content')
        .insert([content])
      error = insertError
    }

    if (error) throw error
    revalidatePath('/about')
    revalidatePath('/admin/cms/about')
    return { success: true }
  } catch (err: any) {
    console.error('Update About Content Error:', err)
    return { success: false, error: err.message }
  }
}

// TEAM MEMBERS ACTIONS
export async function getTeamMembers(visibleOnly = false) {
  try {
    const supabase = createAdminClient()
    let query = supabase.from('team_members').select('*').order('display_order', { ascending: true })
    
    if (visibleOnly) {
      query = query.eq('is_visible', true)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data: data as TeamMember[] }
  } catch (err: any) {
    console.error('Get Team Members Error:', err)
    return { success: false, error: err.message }
  }
}

export async function createTeamMember(member: Omit<TeamMember, 'id'>) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('team_members').insert([member])
    if (error) throw error
    
    revalidatePath('/about')
    revalidatePath('/admin/cms/team')
    return { success: true }
  } catch (err: any) {
    console.error('Create Team Member Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateTeamMember(id: string, member: Partial<Omit<TeamMember, 'id'>>) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('team_members').update(member).eq('id', id)
    if (error) throw error
    
    revalidatePath('/about')
    revalidatePath('/admin/cms/team')
    return { success: true }
  } catch (err: any) {
    console.error('Update Team Member Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteTeamMember(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) throw error
    
    revalidatePath('/about')
    revalidatePath('/admin/cms/team')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Team Member Error:', err)
    return { success: false, error: err.message }
  }
}

export async function toggleTeamMemberVisibility(id: string, currentVisibility: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('team_members').update({ is_visible: !currentVisibility }).eq('id', id)
    if (error) throw error
    
    revalidatePath('/about')
    revalidatePath('/admin/cms/about') // Revalidate the consolidated about page
    return { success: true }
  } catch (err: any) {
    console.error('Toggle Visibility Error:', err)
    return { success: false, error: err.message }
  }
}

export async function reorderTeamMembers(orders: { id: string, display_order: number }[]) {
  try {
    const supabase = createAdminClient()
    
    // Using a simple loop for updates as Supabase doesn't have a built-in bulk update for different values easily without RPC
    for (const item of orders) {
      const { error } = await supabase
        .from('team_members')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
      
      if (error) throw error
    }
    
    revalidatePath('/about')
    revalidatePath('/admin/cms/about')
    return { success: true }
  } catch (err: any) {
    console.error('Reorder Team Members Error:', err)
    return { success: false, error: err.message }
  }
}
