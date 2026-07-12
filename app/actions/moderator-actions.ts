'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface ModeratorData {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
  is_approved: boolean
  suspended: boolean
}

export async function getModerators() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'MODERATOR')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data as ModeratorData[] }
  } catch (err: any) {
    console.error('Get Moderators Error:', err)
    return { success: false, error: err.message }
  }
}

export async function toggleModeratorApproval(id: string, currentStatus: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !currentStatus })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/moderators')
    return { success: true, newStatus: !currentStatus }
  } catch (err: any) {
    console.error('Toggle Approval Error:', err)
    return { success: false, error: err.message }
  }
}

export async function toggleModeratorSuspension(id: string, currentStatus: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ suspended: !currentStatus })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/moderators')
    return { success: true, newStatus: !currentStatus }
  } catch (err: any) {
    console.error('Toggle Suspension Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteModerator(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/moderators')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Moderator Error:', err)
    return { success: false, error: err.message }
  }
}

function generateRandomPassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let retVal = ""
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n))
  }
  return retVal
}

export async function addModerator(member: { full_name: string, email: string }) {
  try {
    const supabase = createAdminClient()
    const password = generateRandomPassword()
    
    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: member.full_name }
    })

    if (authError || !authData.user) throw authError || new Error('Auth user creation failed')

    // 2. Synchronize the Profile using UPSERT
    // This ensures that even if a trigger didn't create the profile yet, we create it now.
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: member.email,
        full_name: member.full_name,
        role: 'MODERATOR',
        is_approved: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (upsertError) throw upsertError

    revalidatePath('/admin/moderators')
    return { success: true, password }
  } catch (err: any) {
    console.error('Add Moderator Error:', err)
    return { success: false, error: err.message }
  }
}
