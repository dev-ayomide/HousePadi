'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/agency/settings')
    revalidatePath('/agent/settings')
    
    return { success: true }
  } catch (err: any) {
    console.error('Update Profile Avatar Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateProfileMetadata(userId: string, data: any) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/agency/settings')
    revalidatePath('/agent/settings')
    
    return { success: true }
  } catch (err: any) {
    console.error('Update Profile Metadata Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteVendorAccount(userId: string) {
  try {
    const supabase = createAdminClient()
    
    // Check if the user is a vendor before deleting
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      
    if (profile?.role !== 'product_vendor' && profile?.role !== 'PRODUCT_VENDOR') {
      return { success: false, error: 'Only vendor accounts can be deleted through this action.' }
    }

    // Delete the user from Supabase Auth.
    // Thanks to ON DELETE CASCADE constraints, this will automatically delete:
    // - public.profiles
    // - public.vendor_profiles
    // - public.products
    // - public.vendor_transactions (if cascaded)
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Delete Vendor Account Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteDeveloperAccount(userId: string) {
  try {
    const supabase = createAdminClient()
    
    // Check if the user is a developer before deleting
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      
    if (profile?.role !== 'DEVELOPER') {
      return { success: false, error: 'Only developer accounts can be deleted through this action.' }
    }

    // Delete the user from Supabase Auth.
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Delete Developer Account Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteAgentAccount(userId: string) {
  try {
    const supabase = createAdminClient()
    
    // Check if the user is an agent before deleting
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_personal, agency_id')
      .eq('id', userId)
      .single()
      
    if (profile?.role !== 'AGENT') {
      return { success: false, error: 'Only agent accounts can be deleted through this action.' }
    }

    // If the agent is registered as an independent/personal agent, delete their personal/shadow agency too
    if (profile.is_personal && profile.agency_id) {
      const { data: agencyProfile } = await supabase
        .from('profiles')
        .select('role, is_personal')
        .eq('id', profile.agency_id)
        .single()
        
      if (agencyProfile?.role === 'AGENCY' && agencyProfile.is_personal) {
        const { error: agencyDeleteError } = await supabase.auth.admin.deleteUser(profile.agency_id)
        if (agencyDeleteError) {
          console.error('Error deleting shadow agency user:', agencyDeleteError)
        }
      }
    }

    // Delete the agent user from Supabase Auth.
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Delete Agent Account Error:', err)
    return { success: false, error: err.message }
  }
}


