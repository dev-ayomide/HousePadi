'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function getConsumerProfile(userId: string) {
  try {
    const adminClient = createAdminClient()
    
    // Attempt to fetch consumer profile
    let { data: profile, error } = await adminClient
      .from('consumer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      
    if (error) throw error
    
    // Auto-create profile if not yet created (lazy initialization)
    if (!profile) {
      let email = ''
      
      // Query global profiles table
      const { data: globalProf } = await adminClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle()
        
      if (globalProf) {
        email = globalProf.email
      } else {
        // Query main auth table as fallback
        const { data: authUser } = await adminClient
          .auth
          .admin
          .getUserById(userId)
          .catch(() => ({ data: { user: null } }))
          
        if (authUser?.user) {
          email = authUser.user.email || ''
        }
      }
      
      const { data: newProfile, error: insertError } = await adminClient
        .from('consumer_profiles')
        .insert([
          {
            user_id: userId,
            full_name: globalProf?.full_name || (email ? email.split('@')[0] : 'User'),
            phone_number: '',
            avatar_url: ''
          }
        ])
        .select()
        .single()
        
      if (insertError) throw insertError
      profile = newProfile
    }
    
    return { success: true, data: profile }
  } catch (err: any) {
    console.error('getConsumerProfile error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateConsumerProfile(
  userId: string,
  fullName: string,
  phoneNumber: string,
  avatarUrl: string
) {
  try {
    const adminClient = createAdminClient()
    const { data: profile, error } = await adminClient
      .from('consumer_profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        avatar_url: avatarUrl
      })
      .eq('user_id', userId)
      .select()
      .single()
      
    if (error) throw error
    
    // Also update global profile for search/compatibility
    await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        avatar_url: avatarUrl
      })
      .eq('id', userId)

    return { success: true, data: profile }
  } catch (err: any) {
    console.error('updateConsumerProfile error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteConsumerAccount(userId: string) {
  try {
    const adminClient = createAdminClient()
    
    // 1. Delete consumer profile (cascades to all user details/favorites/collections)
    await adminClient
      .from('consumer_profiles')
      .delete()
      .eq('user_id', userId)
      
    // 2. Delete from global profiles
    await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId)
      
    // 3. Delete from Auth system
    await adminClient
      .auth
      .admin
      .deleteUser(userId)
      
    // 4. Sign out standard Supabase session
    const clientSupabase = await createClient()
    await clientSupabase.auth.signOut()
    
    return { success: true }
  } catch (err: any) {
    console.error('deleteConsumerAccount error:', err)
    return { success: false, error: err.message }
  }
}
