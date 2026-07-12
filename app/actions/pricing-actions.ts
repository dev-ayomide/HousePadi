'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'



export async function updateRegistryFees(slug: string, contactFee: number, viewingFee: number = 0) {
  try {
    const adminClient = createAdminClient()
    
    const { error } = await adminClient
      .from('listing_type_registry')
      .update({
        contact_fee: contactFee,
        viewing_fee: 0,
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug)

    if (error) throw error

    revalidatePath('/admin/cms/pricing')
    revalidatePath('/explore')
    return { success: true }
  } catch (err: any) {
    console.error('Update Registry Fees Error:', err)
    return { success: false, error: err.message }
  }
}
